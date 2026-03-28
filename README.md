# DarkTimer

A utilitarian darkroom timer for analog film development. Look up development recipes via AI, build custom multi-phase workflows, and run guided timers with agitation cues — all in a minimal dark-mode interface.

## Features

- **AI Recipe Finder** — query development times for any film/developer combination via Google Gemini
- **Manual Recipe Builder** — create custom multi-phase development workflows (Developer, Stop Bath, Fixer, Wash)
- **Interactive Timer** — countdown with per-phase agitation cues and audio beeps
- **Recipe Library** — save and reuse your development presets
- **Settings** — configure default phase durations and agitation cycles

## Stack

React 19 · Vite 6 · TypeScript · Tailwind CSS v4 · Tauri v2

## Getting Started

**Prerequisites:** Node.js, a [Gemini API key](https://aistudio.google.com/apikey)

```bash
npm install
cp .env.example .env.local
# add your GEMINI_API_KEY to .env.local
npm run dev
```

### Desktop app (Tauri)

**Additional prerequisite:** [Rust](https://rustup.rs)

```bash
npm run tauri:dev      # development
npm run tauri:build    # package for distribution
```
