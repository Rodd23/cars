---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance (accessibility, focus, forms, animation, typography, layout, performance, UX copy). Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  source: https://github.com/vercel-labs/agent-skills (skills/web-design-guidelines)
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Vercel's Web Interface Guidelines.

Local adaptation: the rules are pinned in [guidelines.md](guidelines.md), copied from
`https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`
on 2026-11-07 and reviewed. Do not fetch the remote file; update the pinned copy only
when the user asks, after reviewing the diff.

## How It Works

1. Read [guidelines.md](guidelines.md).
2. Read the specified files (or ask the user for files/pattern).
3. Check against all rules. Adapt Tailwind-style names (`focus-visible:ring-*`) to this project's CSS Modules, and skip Next.js/SSR-only rules (hydration) for the Vite SPA.
4. Output findings in the terse `file:line` format defined in guidelines.md.

Project notes: UI copy is pt-BR, so the "Title Case" and English copy rules do not apply; keep the rest (active voice, specific labels, errors with next step).
