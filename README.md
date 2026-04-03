# CodeVisualizer

CodeVisualizer is a VS Code extension for turning source code into interactive diagrams. It helps you inspect function control flow, visualize project dependencies, and optionally add AI-generated labels to flowchart nodes.

## What It Does

- Generates function-level flowcharts from supported languages.
- Opens diagrams in the sidebar or a dedicated panel.
- Visualizes codebase dependency relationships for selected folders.
- Supports optional AI labels through OpenAI, Gemini, Groq, Ollama, and Anthropic.
- Refreshes diagrams as code changes when auto-refresh is enabled.

## Current Feature Scope

### Function Flowcharts

Function flowcharts are available for:

- Python
- JavaScript
- TypeScript
- Java
- C
- C++
- Rust
- Go

### Codebase Dependency Visualization

Codebase dependency graphs currently extract dependencies for:

- JavaScript and TypeScript
- Python

Other file types may be discovered and shown in the graph, but dependency extraction is currently implemented for the languages above.

### AI Labels

AI labels are optional and apply to function flowcharts. They can generate shorter or more human-readable labels for nodes in the rendered diagram.

## Commands

The extension contributes these primary commands:

- `CodeVisualizer: Generate Flowchart`
- `CodeVisualizer: Open Flowchart in New Window`
- `CodeVisualizer: Open Flowchart to the Side`
- `CodeVisualizer: Open Flowchart in New Column`
- `CodeVisualizer: Maximize Flowchart Panel`
- `CodeVisualizer: Refresh Flowchart`
- `CodeVisualizer: Export Flowchart`
- `CodeVisualizer: Enable AI Labels`
- `CodeVisualizer: Change AI Model`
- `CodeVisualizer: Reset AI Cache`
- `Visualize Codebase Flow`

Note: the export command is registered in the extension, but the implementation is still a placeholder.

## Installation

### From VS Code Marketplace

1. Open VS Code.
2. Go to Extensions.
3. Search for `CodeVisualizer`.
4. Install the extension.

### From Source

```bash
git clone https://github.com/DucPhamNgoc08/CodeVisualizer.git
cd CodeVisualizer
npm install
npm run compile
```

To debug the extension locally, open the project in VS Code and press `F5`.

## Usage

### Generate a Function Flowchart

1. Open a supported source file.
2. Place the cursor in the editor.
3. Run `CodeVisualizer: Generate Flowchart` or `CodeVisualizer: Open Flowchart in New Window`.
4. Interact with the rendered diagram in the sidebar or panel.

The editor context menu shows `Generate Flowchart` only when text is selected.

### Visualize a Codebase

1. Right-click a folder in the Explorer.
2. Run `Visualize Codebase Flow`.
3. Review the dependency graph in the generated webview panel.

You can also run the same command from the Command Palette to analyze the current workspace root.

### Enable AI Labels

1. Run `CodeVisualizer: Enable AI Labels`.
2. Choose the provider and model.
3. Add the required API key if the provider needs one.
4. Generate a flowchart again to see updated labels.

## Settings

The extension exposes these main settings:

- `codevisualizer.theme`
- `codevisualizer.autoGenerate`
- `codevisualizer.autoRefresh`
- `codevisualizer.panel.defaultPosition`
- `codevisualizer.panel.retainWhenHidden`
- `codevisualizer.panel.enableFindWidget`
- `codevisualizer.export.format`
- `codevisualizer.llm.enabled`
- `codevisualizer.llm.provider`
- `codevisualizer.llm.model`
- `codevisualizer.llm.apiKey`
- `codevisualizer.llm.style`
- `codevisualizer.llm.language`

## Privacy Notes

- Source analysis happens locally inside the extension.
- AI labels are opt-in and disabled by default.
- When AI labels are enabled, label text is sent to the selected provider.
- API keys are stored through VS Code secret storage.
- The webview currently loads Mermaid and SVG pan/zoom assets from a CDN, so full offline operation is not guaranteed.

## Development

### Requirements

- Node.js
- npm
- VS Code 1.105.0 or newer

### Useful Scripts

```bash
npm run compile
npm run watch
npm run lint
npm run test
```

### Project Structure

- `src/extension.ts`: extension activation and command registration
- `src/view/`: sidebar and panel webview providers
- `src/core/`: parsing, analysis, dependency graph generation, LLM integration, and utilities
- `src/ir/`: intermediate representation used for flowchart generation
- `standalone/`: standalone web assets and local server helpers

## Known Limitations

- `Export Flowchart` is not implemented yet.
- Codebase dependency analysis for Python is limited and may miss common local imports.
- The extension activates on startup, so parser initialization cost is paid even before a visualization command is used.

## License

This project is licensed under the MIT License. See `LICENSE` for details.