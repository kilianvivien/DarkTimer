# DarkTimer

Darkroom timer app for analog film development. React 19 + Vite 6 + TypeScript + Tailwind CSS v4 + Tauri v2.

## Commands

```bash
npm run dev          # dev server on :3000
npm run build        # production build
npm run lint         # TypeScript type check
npm run test         # run tests (vitest)
npm run tauri:dev    # desktop app dev mode
npm run tauri:build  # desktop app build
```

## Architecture

- `src/components/` — UI components (timer, recipe builder, library, settings, AI assistant)
- `src/hooks/` — custom React hooks
- `src/services/` — AI provider integrations (Gemini, Mistral)
- `src/lib/` — utilities and IndexedDB storage (via `idb`)
- `src-tauri/` — Tauri desktop wrapper

## Key details

- State is local-only: recipes stored in IndexedDB, API keys in localStorage, nothing sent to a server
- AI recipe lookup uses Gemini (`@google/genai`) or Mistral; provider/keys configured in Settings UI
- Timer emits audio cues (440 Hz agitation, 880 Hz phase-end) and optional Web Notifications
- Deployed as PWA on Vercel and as a native desktop app via Tauri
