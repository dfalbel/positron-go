# Using this Template

This is a GitHub template repository. Follow these steps to create your own Positron extension:

## Quick Setup

1. Click the **"Use this template"** button at the top of this repository
2. Choose "Create a new repository"
3. Name your repository and make it public or private
4. Clone your new repository locally
5. Update the following files:
   - `package.json` - Update name, displayName, description, publisher, and repository URL
   - `LICENSE` - Replace `[Your Name]` with your actual name
   - `src/extension.ts` - Update the command ID to match your package.json
   - Delete this file (`.github/TEMPLATE_README.md`)

## First Steps After Creating Your Repository

```bash
# Install dependencies
npm install

# Run the extension in development mode
# Press F5 in VS Code/Positron
```

## Customization Checklist

- [ ] Update `package.json` metadata
- [ ] Update LICENSE copyright holder
- [ ] Rename command in `package.json` and `src/extension.ts`
- [ ] Add your own Positron API functionality
- [ ] Update README.md with your extension's documentation
- [ ] Add VS Code marketplace badges if publishing
- [ ] Configure GitHub Actions for CI/CD (optional)

## Resources

- [Creating VS Code Extensions](https://code.visualstudio.com/api/get-started/your-first-extension)
- [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Positron Documentation](https://positron.posit.co/)

Happy coding! 🚀