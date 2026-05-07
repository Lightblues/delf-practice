# delf

DELF B2 French exam practice app with AI-powered writing and speaking evaluation.

## Quick Reference
- **Dev**: `pnpm dev`
- **Build**: `pnpm build:mac` → `.dmg` installer
- **Resources**: `resources/data/` (index.json, answer.json per part; PDFs/MP3s via GitHub release)
- **User data**: `~/.ea/delf/`
- **Spec**: `.ea/spec/spec.md`

## Coding Style
- Compact and type-hinted
- Minimal docstrings (for public methods with complex logic only)
- Simple and clear, avoid over-engineering
- Language: English

## TypeScript Environment
- Package manager: `pnpm`
- Run scripts via `pnpm <script>`

## Git
- NEVER use `git commit` directly — code must be reviewed first
- Only use `gh` CLI tools after user approval
