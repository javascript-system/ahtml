# ahtml
A new lightweight language based on HTML that connects multiple files and compiles them into one. It’s not just for code; you can use it to organize .txt files or any other format into a single, centralized document.




# AHTML Compiler 🚀
> **The Structural Superpower for Vanilla HTML.**

[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

**AHTML** is a lightweight, zero-dependency compiler designed to bring **Componentization**, **Scoped Variables**, and **External Data Injection** to standard HTML. It transforms complex `.ahtml` structures into clean, production-ready `.html` files.

Think of it as the "TypeScript for HTML structure": the browser doesn't read it, but it makes your development workflow incredibly powerful by solving the "spaghetti HTML" problem.

---

## ✨ Key Features

* 📦 **Componentization:** Break your UI into reusable `.ahtml` fragments.
* 🔐 **Scoped Context:** Pass variables from parent to child without global leaks using `send()`.
* 🌐 **Remote Injection:** Fetch content from external URLs directly into your build via `<!out()>`.
* ⚙️ **Zero Runtime:** The compiler generates pure, optimized HTML. No heavy JS frameworks required on the client side.
* 🛠️ **Alias Mapping:** Centralize paths and assets in a global `<!config>` block.

---

## 🚀 Quick Start

### 1. Installation
Clone the repository and make the compiler executable:

    git clone https://github.com/seu-usuario/ahtml.git
    cd ahtml
    chmod +x ahtml

### 2. Create your first Component
**`components/button.ahtml`**
  ```html

    <!vars>
      "label": "Default Button",
      "theme": "primary"
    <!/vars>

    <button class="btn-<!string(theme)>">
      <!exports(label)>
    </button>
```
### 3. Create the Entry Point
**`index.ahtml`**
  ```html
    <!config>
      "outFile": "dist/index.html",
      "allowChildAHTML": true
    <!/config>

    <!htmlContent>
    <!DOCTYPE html>
    <html>
    <body>
      <h1>Welcome to AHTML</h1>
      
      <!src(components/button.ahtml), send(label: "Click Me!", theme: "success")>
      
      <!out(https://raw.githubusercontent.com/user/repo/main/footer.html)>
    </body>
    </html>
    <!/htmlContent>
```
### 4. Compile
Run the compiler targeting your main file:

    ./ahtml compile index.ahtml

---

## 📖 Documentation

### Structural Tags
| Tag | Scope | Description |
| :--- | :--- | :--- |
| `<!config>` | **Root Only** | Defines compiler behavior (output name, keys, safety checks). |
| `<!vars>` | **Local** | Declares a JSON dictionary of variables for the current file. |
| `<!htmlContent>` | **Optional** | Explicitly defines the renderable fragment, ignoring system blocks. |

### Data Flow & Injection
* **`<!string(name)>`**: Interpolates a variable from the current scope.
* **`<!exports(name)>`**: Declares a variable expected to be received from a parent.
* **`<!src(path), send(vars)>`**: Mounts a child file and injects data into its execution context.
* **`<!$(keyName)>`**: Injects a path or content based on the "keys" array in config.
* **`<!out(url)>`**: Performs a build-time HTTPS request to fetch remote HTML/Text.

---

## 🛠 Project Philosophy
AHTML was built for developers who love the simplicity of the web but hate the repetition of static HTML. It bridges the gap between basic sites and complex frameworks, providing a **mechanical necessity** for clean architecture without the overhead of a Virtual DOM or hydration.

---

## 🤝 Contributing
1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`).
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the Branch (`git push origin feature/AmazingFeature`).
5. Open a Pull Request.

---

**Developed with JS by [javascript-system]**
