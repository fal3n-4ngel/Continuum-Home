# Artificial Intelligence Agent Directives

The following instructions define explicit behavioral constraints for autonomous coding agents (e.g., Cursor, Copilot, Antigravity) operating within the Continuum Home repository.

## Framework Constraints

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Architectural Standards

### UI Component Guidelines
- **Modals and Dialogs:** Native browser execution blocks (`alert()`, `prompt()`, `confirm()`) are strictly prohibited.
- Implement custom, styled React/HTML modal popups and themed dialogs.
- **Portal Rendering:** Ensure modal backdrops cover the entire viewport (including absolute-positioned sidebars and navigation interfaces) by utilizing React Portals (`createPortal`). Target `document.body` to correctly break out of parent stacking contexts and CSS animation boundaries.
