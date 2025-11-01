# Positron Extension Template

A template repository for creating VS Code extensions that integrate with [Positron](https://positron.posit.co/), the next-generation data science IDE from Posit.

## 🚀 Quick Start

Click the "Use this template" button on GitHub to create your own repository based on this template.

### Setup

1. Clone your new repository
2. Update `package.json`:
   - Change `name`, `displayName`, and `description`
   - Update `publisher` to your publisher name
   - Update `repository.url` to your repository URL
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start developing!

## 🏗️ Project Structure

```
positron-extension-template/
├── src/
│   ├── extension.ts      # Main extension entry point
│   └── test/            # Test files
│       ├── suite/       # Integration tests
│       ├── mocks/       # API mocks
│       └── helpers/     # Test utilities
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript configuration
├── .vscode-test.mjs     # VS Code test configuration
└── README.md            # This file
```

## 🔧 Development

### Running the Extension

1. Open this folder in VS Code or Positron
2. Press `F5` or run "Run Extension" from the Debug panel
3. A new window will open with your extension loaded
4. Run the command "Positron Extension Demo" from the Command Palette (`Ctrl/Cmd+Shift+P`)

### Available Scripts

- `npm run compile` - Compile TypeScript to JavaScript
- `npm run watch` - Watch for changes and recompile
- `npm run lint` - Run ESLint
- `npm run test` - Run test suite
- `npm run pretest` - Compile and lint before testing

### Testing

This template includes a lightweight testing setup for VS Code extensions:

- **Test Framework**: Mocha with TDD style
- **Mocking**: Sinon for API mocking
- **Test Runner**: Modern `@vscode/test-cli`
- **Coverage**: Tests extension activation, command registration, and API interactions

Run tests with:
```bash
npm test
```

The test suite includes:
- Extension activation and presence verification
- Command registration testing
- Basic Positron API mocking for isolated testing
- Graceful degradation when APIs are unavailable

## 📚 Positron API Examples

This template demonstrates key Positron APIs:

### Detecting Positron Environment

```typescript
import { tryAcquirePositronApi, inPositron } from "@posit-dev/positron";

// Check if running in Positron
if (inPositron) {
  console.log("Running in Positron!");
}

// Get Positron API
const positron = tryAcquirePositronApi();
if (positron) {
  // Use Positron-specific features
}
```

### Preview URLs in Viewer Pane

```typescript
positron.window.previewUrl(
  vscode.Uri.parse("https://example.com")
);
```

### Execute Code in Active Runtime

```typescript
// Execute Python code
positron.runtime.executeCode(
  "python",
  'print("Hello from extension!")',
  true  // focus console
);

// Execute R code
positron.runtime.executeCode(
  "r",
  'print("Hello from R!")',
  true
);
```

## 📖 Resources

- [Positron Documentation](https://positron.posit.co/)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [@posit-dev/positron npm package](https://www.npmjs.com/package/@posit-dev/positron)
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)

## Contributing

This is a template repository! Feel free to:
- Report issues or suggest improvements
- Submit PRs to enhance the template
- Share your extensions built with this template

## License

This template is available under the MIT License. See LICENSE file for details.

---

Built with ❤️ for the Positron community