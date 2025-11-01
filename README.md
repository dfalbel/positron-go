# Positron Go

Positron Go is a [Positron](https://positron.posit.co/) extension that wires the [gonb](https://github.com/janpfeifer/gonb) kernel into Positron so you can run Go notebooks alongside your Python and R work.

## Features

- Detects when the extension is running inside Positron and surfaces Go-specific messaging
- Adds the command `Run Go sample in Positron` to quickly validate your gonb setup
- Uses the Positron runtime API to execute Go code through gonb without leaving the editor

## Prerequisites

- [Go](https://go.dev) 
- The [`gonb`](https://github.com/janpfeifer/gonb) Jupyter kernel installed and available on your PATH
- [Positron](https://positron.posit.co) 2025.6.x or newer

Verify that gonb is installed:

```bash
go install github.com/janpfeifer/gonb@latest && \
  go install golang.org/x/tools/cmd/goimports@latest && \
  go install golang.org/x/tools/gopls@latest

// it's actually `$HOME/go/bin/gonb` if that directory is not on your PATH 
gonb --version 
```

Install the positron-go extension.

## Development

- `npm run compile` – compile TypeScript to JavaScript.
- `npm run watch` – compile on change for rapid iteration.
- `npm run lint` – run ESLint with the repository rules.
- `npm run test` – execute the extension tests.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Press `F5` in VS Code/Positron to launch a development host.


## License

MIT – see [LICENSE](LICENSE).
