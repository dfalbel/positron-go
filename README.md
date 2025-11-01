# Positron Go

Positron Go is a [Positron](https://positron.posit.co/) extension that wires the [gonb](https://github.com/janpfeifer/gonb) kernel into Positron so you can run Go notebooks alongside your Python and R work.

## Features

- Detects when the extension is running inside Positron and surfaces Go-specific messaging
- Adds the command `Run Go sample in Positron` to quickly validate your gonb setup
- Uses the Positron runtime API to execute Go code through gonb without leaving the editor

## Prerequisites

- Go 1.21 or newer
- The `gonb` Jupyter kernel installed and available on your PATH
- Positron 2025.6.x or newer

Verify that gonb is installed:

```bash
go install github.com/janpfeifer/gonb@latest
gonb --version
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Press `F5` in VS Code/Positron to launch a development host.
3. In the new window open the Command Palette and run `Run Go sample in Positron`.
4. If Positron is able to find gonb you will see a `fmt.Println` message emitted from the Go runtime.

## Commands

- `Run Go sample in Positron`: Sends a hello-world Go snippet to the active Positron runtime using gonb. Useful for smoke testing your kernel installation.

## Development

- `npm run compile` – compile TypeScript to JavaScript.
- `npm run watch` – compile on change for rapid iteration.
- `npm run lint` – run ESLint with the repository rules.
- `npm run test` – execute the extension tests.

## License

MIT – see [LICENSE](LICENSE).
