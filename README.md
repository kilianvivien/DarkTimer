# DarkTimer

A utilitarian darkroom timer for analog film development. Look up development recipes via AI, build custom multi-phase workflows, and run guided timers with agitation cues — all in a minimal dark-mode interface built for mobile and desktop.

**[Live demo → darktimer.vercel.app](https://darktimer.vercel.app)**

---

## Features

### AI Recipe Finder
Query development times for any film/developer combination using Google Gemini. The AI cross-references published data (including the Massive Dev Chart) and returns up to three recipe options with phases, temperatures, and notes. Results are automatically saved to your Library.

### Manual Recipe Builder
Build fully custom multi-phase development workflows from scratch. Add or remove phases (Developer, Stop Bath, Fixer, Wash, or anything custom), set durations in minutes and seconds, and add per-phase agitation notes.

### Interactive Timer
Guided countdown with:
- **Agitation alerts** — visual (red glow + border flash) and audio (440 Hz beep) cues at the start of each agitation cycle
- **Phase-end audio** — 880 Hz beep when a phase completes, timer pauses before advancing
- **Web Notifications** — optional browser notifications for agitation and phase-end events, configurable in Settings
- **Phase queue** — upcoming phases and their durations shown at a glance
- Controls: Start/Pause, Reset phase, Skip phase, Mute audio

### Recipe Library
Save and reuse your development presets locally. One tap to jump straight into a timer session from any saved recipe.

### Settings
- Default phase durations: Stop Bath, Fixer, Wash
- Agitation cycle: interval (how often) and duration (how long)
- Gemini API key management (stored only in your browser's localStorage, never sent to any server)
- Notifications toggle (requires browser permission)

---

## Stack

React 19 · Vite 6 · TypeScript · Tailwind CSS v4 · Framer Motion · Tauri v2

---

## Getting Started

**Prerequisites:** Node.js 18+, a [Gemini API key](https://aistudio.google.com/apikey)

```bash
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000), go to **Settings**, and paste your Gemini API key to enable the AI Assistant. No `.env` file needed — the key is stored in your browser.

### Desktop app (Tauri)

**Additional prerequisite:** [Rust](https://rustup.rs)

```bash
npm run tauri:dev      # development
npm run tauri:build    # package for distribution
```

---

## License

MIT — see [LICENSE](LICENSE)
