#!/usr/bin/env node
//WARN: this is not the cmd file! is just a js code to the user to read how everything works! remember to use ./ahtml on your terminal

const fs = require('fs');
const path = require('path');
const https = require('https');

const VERSION = "1.0.0";
const args = process.argv.slice(2);

/**
 * Helper to download files (Non-blocking)
 */
function downloadFile(url) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', (err) => {
            console.error(`[Error] Download failed: ${err.message}`);
            resolve(``);
        });
    });
}

/**
 * Core Compiler Logic
 * @param {string} filePath - Path to file
 * @param {Object} passedVars - Variables sent via 'send'
 * @param {boolean} isMain - If this is the root file
 */
async function processFile(filePath, passedVars = {}, isMain = false) {
    if (!fs.existsSync(filePath)) {
        console.warn(`[Warn] File not found: ${filePath}`);
        return ``;
    }

    let raw = fs.readFileSync(filePath, 'utf8');
    let scopeVars = { ...passedVars };

    // 1. Parse <!vars> block
    const varsMatch = raw.match(/<!vars>([\s\S]*?)<!\/vars>/);
    if (varsMatch) {
        try {
            const localVars = JSON.parse(`{${varsMatch[1].trim()}}`);
            scopeVars = { ...scopeVars, ...localVars };
        } catch (e) {
            console.error(`[Error] Invalid <!vars> JSON in ${filePath}`);
        }
    }

    // 2. Extract Config (Only for Main)
    let config = {};
    if (isMain) {
        const configMatch = raw.match(/<!config>([\s\S]*?)<!\/config>/);
        if (configMatch) {
            try {config = JSON.parse(`{${configMatch[1].trim()}}`)
    } catch (e) {
        console.error(`[Error] Syntax JSON error in <!config>`);
        return {};
    }
            }
        
        // Validate requiredFiles
        if (config.requiredFiles) {
            config.requiredFiles.forEach(f => {
                if (!fs.existsSync(path.join(path.dirname(filePath), f))) {
                    console.error(`[Fatal] Required file missing: ${f}`);
                    process.exit(1);
                }
            });
        }
    }

    // 3. Extract Content
    const contentMatch = raw.match(/<!htmlContent>([\s\S]*?)<!\/htmlContent>/);
    let body = contentMatch ? contentMatch[1].trim() : raw;
if (!contentMatch) {
    body = body.replace(/<!vars>[\s\S]*?<!\/vars>/g, "");
    body = body.replace(/<!config>[\s\S]*?<!\/config>/g, "");
}

    // 4. Handle <!exports(var)> -> Injects from parent
    body = body.replace(/<!exports\((.*?)\)>/g, (m, varName) => {
        return scopeVars[varName.trim()] || ``;
    });

    // 5. Handle <!string(var)> -> Local vars
    body = body.replace(/<!string\((.*?)\)>/g, (m, varName) => {
        return scopeVars[varName.trim()] || ``;
    });

    // 6. Handle File Tags & Attributes
    const tagRegex = /<!(src|out|\$)?\((.*?)\)(?:,\s*send\((.*?)\))?>/g;
    const matches = [...body.matchAll(tagRegex)];
    
    for (const match of matches) {
        const [fullTag, type, target, sendList] = match;
        const cleanTarget = target.trim();
        let replacement = "";

        // Prepare sent variables
        let varsToSend = {};
        if (sendList) {
            sendList.split(',').forEach(v => {
                const vName = v.trim();
                if (scopeVars[vName] !== undefined) varsToSend[vName] = scopeVars[vName];
            });
        }

        if (type === 'out') {
            replacement = await downloadFile(cleanTarget);
        } else if (type === '$') {
            const keyObj = config.keys?.find(k => k.key === cleanTarget);
            if (keyObj) {
                const p = path.join(path.dirname(filePath), keyObj.path);
                replacement = fs.readFileSync(p, 'utf8');
            }
        } else if (type === 'src') {
            // Must have send, handles Child AHTML logic
            const childPath = path.join(path.dirname(filePath), cleanTarget);
            if (config.allowChildAHTML || isMain) {
                replacement = await processFile(childPath, varsToSend, false);
            } else {
                replacement = fs.readFileSync(childPath, 'utf8');
            }
        } else {
            // Default <! (file) > - No send allowed
            const childPath = path.join(path.dirname(filePath), cleanTarget);
            replacement = fs.readFileSync(childPath, 'utf8');
        }

        body = body.split(fullTag).join(replacement);
    }

    // 7. Handle <!imports(var) from (file)>
    const importRegex = /<!imports\((.*?)\) from \((.*?)\)>/g;
    const importMatches = [...body.matchAll(importRegex)];
    for (const m of importMatches) {
        const [full, varName, fileName] = m;
        const fPath = path.join(path.dirname(filePath), fileName.trim());
        // We process the file specifically to find its "sends"
        const fContent = fs.readFileSync(fPath, 'utf8');
        const sendMatch = fContent.match(new RegExp(`<!sends\\s*\\((${varName.trim()})\\)>`));
        // Simple mock for sends: for now we just find the specific tag
        body = body.split(full).join(``);
    }

    if (isMain) {
        const outName = config.outFile || "index.html";
        fs.writeFileSync(outName, body);
        console.log(`[Build] Success: ${outName}`);
    }

    return body;
}

// Command Router
async function main() {
    const command = args[0];

    switch (command) {
        case 'help':
            console.log(`================================================================================
                         AHTML COMPILER v${VERSION}
================================================================================

USAGE:
  ahtml compile <file.ahtml>    Processes the entry point and generates output.
  ahtml version                 Displays current build version.
  ahtml help                    Opens this technical manual.

--------------------------------------------------------------------------------
1. ARCHITECTURAL BLOCKS (Structural Tags)
--------------------------------------------------------------------------------
<!config> ... <!/config>
  Scope: ROOT FILE ONLY. 
  Purpose: Global compiler instructions in JSON format.
  Attributes:
    - "outFile": string         (Name of the generated .html file)
    - "requiredFiles": array    (Fatal check for critical dependencies)
    - "allowChildAHTML": bool   (Enables recursive compilation of sub-files)
    - "keys": array             (Key-value pair mapping for the <!$(key)> tag)

<!vars> ... <!/vars>
  Scope: LOCAL.
  Purpose: Declares a JSON dictionary of variables available only to the 
           current file context. Prevents global namespace pollution.

<!htmlContent> ... <!/htmlContent>
  Scope: OPTIONAL.
  Purpose: Explicitly defines the renderable fragment. If present, the compiler 
           ignores everything outside these tags (except for config/vars).

--------------------------------------------------------------------------------
2. COMPONENT & ASSET INJECTION
--------------------------------------------------------------------------------
<!(path/to/file)>
  Static Injection: Performs a raw read/write of the target file into the current
  buffer. No variable processing is applied to the child.

<!src(file.ahtml), send(var1, var2)>
  Scoped Component: Imports a child AHTML file. Use 'send' to pass specific 
  local variables into the child's execution context.

<!out(https://url.com/asset)>
  External Resource: Performs a non-blocking HTTPS GET request to fetch and 
  inject remote content during build time.

<!$(keyName)>
  Alias Injection: Injects a file path or content based on the "keys" definition 
  within the global <!config> block.

--------------------------------------------------------------------------------
3. DATA BINDING & REQUISITION
--------------------------------------------------------------------------------
<!string(varName)>
  Standard Interpolation: Renders a variable from the current scope (either 
  declared in local <!vars> or received via 'send').

<!exports(varName)>
  Contract Declaration: Explicitly marks a variable as "received from parent". 
  Crucial for component documentation and debugging.

<!imports(var) from (file.ahtml)>
  Cross-File Pull: Requests a specific data export from a sibling file.
  The target file must implement a corresponding <!sends(var)> tag.

--------------------------------------------------------------------------------
4. COMPILER LOGIC & RULES
--------------------------------------------------------------------------------
- Encapsulation: Children cannot access parent variables by default (No leak).
- Recursion: Deeply nested <!src()> tags are supported if 'allowChildAHTML' is true.
- Build Order: Config Parsing -> Var Loading -> Tag Replacement -> Output Write.
================================================================================
`);
            break;
        case 'version':
            console.log(`AHTML Version: ${VERSION}`);
            break;
        case 'compile':
            if (!args[1]) return console.error("Error: Missing file path.");
            await processFile(path.resolve(args[1]), {}, true);
            break;
        default:
            console.log("Usage: ./ahtml compile <file.ahtml>. Type './ahtml help' for more.");
    }
}

main();
