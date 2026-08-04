# Artificial Intelligence Agent Directives

The following instructions define explicit behavioral constraints for autonomous coding agents (e.g., Cursor, Copilot, Antigravity) operating within the Continuum Home repository.

## Framework Constraints

<!-- BEGIN:nextjs-agent-rules -->
### Next.js Strict Environment

This project utilizes Next.js 16 (App Router + Turbopack), which introduces breaking changes to APIs, file conventions, and component structure compared to older datasets.
- Prior to executing code mutations, agents **must** consult the localized documentation at `node_modules/next/dist/docs/`.
- Heed all deprecation notices strictly. Do not utilize legacy `pages/` router patterns or outdated `@next/font` imports.
<!-- END:nextjs-agent-rules -->

## Architectural Standards

### UI Component Guidelines
- **Modals and Dialogs:** Native browser execution blocks (`alert()`, `prompt()`, `confirm()`) are strictly prohibited.
- Implement custom, styled React/HTML modal popups and themed dialogs.
- **Portal Rendering:** Ensure modal backdrops cover the entire viewport (including absolute-positioned sidebars and navigation interfaces) by utilizing React Portals (`createPortal`). Target `document.body` to correctly break out of parent stacking contexts and CSS animation boundaries.
