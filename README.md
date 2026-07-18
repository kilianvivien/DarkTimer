# DarkTimer

A local-first darkroom timer for analog film development. Build or find a recipe, prepare each bath, and run a guided multi-phase timer with agitation cues from an installable PWA designed for phones and tablets.

**[Open DarkTimer → darktimer.vercel.app](https://darktimer.vercel.app)**

![DarkTimer screenshots showing the timer, AI assistant, and chemistry views](.github/assets/screenshots.png)

## Highlights

- **Darkroom-ready timer** — multi-phase countdowns, agitation reminders, phase-change cues, wake lock, fullscreen/immersive mode, and interrupted-session recovery.
- **Safelight theme** — switch the entire interface to a deep-red-on-black palette from the app header or timer controls.
- **Manual and assisted recipes** — build a recipe yourself, search the built-in development chart, reuse cached results offline, or optionally query Gemini or Mistral.
- **Local recipe library and history** — save presets and inspect completed, partial, or aborted timer sessions.
- **Chemistry tracking** — monitor developer and fixer age, capacity, and roll count, with optional developer-reuse compensation.
- **Installable and offline-capable** — runs as a PWA on iPhone, iPad, Android, and desktop browsers. Core timer and library features remain available without a connection.

## Timer

DarkTimer runs configurable development phases such as Developer, Stop Bath, Fixer, Blix, and Wash.

- Agitation modes for every 60 seconds, every 30 seconds, or stand development
- Visual flash, vibration, and 440 Hz agitation cues
- 880 Hz phase-end cues and optional Web Notifications
- Optional 0, 5, or 10 second countdown before each phase
- **Yolo Run** for automatic progression through the complete workflow
- Start/pause, reset phase, skip phase, mute, and agitation override controls
- Screen wake lock and landscape-friendly immersive timer layout
- Active-session persistence so an interrupted timer can be resumed
- Developer compensation based on a custom percentage or matching chemistry record

Browser capabilities vary. DarkTimer degrades gracefully when wake lock, vibration, fullscreen, or notifications are unavailable.

## Recipes and data

### Manual builder

Create B&W or Color/Slide recipes with film, developer, dilution, ISO, temperature, phase duration, and agitation settings. Recipes can be saved as reusable presets or started immediately.

### Recipe lookup

The Assistant checks DarkTimer's built-in development chart and local cache before making a live AI request. Gemini and Mistral are optional and use an API key supplied by the user. Returned recipes include structured phases, temperature, and notes that can be reviewed before starting.

AI-generated development times are starting points, not authoritative processing instructions. Confirm critical recipes against the film and chemistry manufacturers' current datasheets.

### Library, history, and Chems

- Save, edit, reuse, and delete recipe presets.
- Review timer sessions with status, timing, completed phases, compensation, and the recipe snapshot used for the run.
- Track developer and fixer batches by mix date, expiration, capacity, and roll count.
- Optionally increment a matched developer's roll count after a completed session.

## Privacy and offline behavior

DarkTimer has no user account or application backend. Recipes, settings, chemistry records, session history, active timers, and cached lookups are stored locally in IndexedDB.

API keys are sent directly from the browser to the selected provider and are never sent to a DarkTimer server. Keys can be kept for the current browser session only or saved in the local encrypted vault with a passphrase.

After the PWA assets have been cached, manual recipes, saved presets, chemistry tracking, history, and timers work offline. The Assistant can still use the built-in chart and previously cached results; a new live AI lookup requires a connection.

> On iOS, Safari tabs and Home Screen apps use separate storage. Recipes created in Safari do not automatically transfer to the installed PWA.

## Install as an app

DarkTimer can run directly in a browser, but installation gives the most app-like timer experience.

- **iPhone or iPad:** open the site in Safari, choose **Share → Add to Home Screen**, enable **Open as Web App**, then launch DarkTimer from the Home Screen.
- **Android or desktop Chromium:** use the browser's install action or choose **Install DarkTimer** from its menu.

The app detects available installation methods and provides platform-specific guidance after you have used it enough to establish local data.

## Local development

Prerequisite: a current Node.js LTS release and npm. An API key is not required for manual recipes or built-in chart results.

```bash
npm install
npm run dev
```

The development server runs at [localhost:3000](http://localhost:3000) and binds to the local network for testing on phones and tablets.

Useful commands:

```bash
npm run lint          # TypeScript checks
npm run test          # Run the Vitest suite once
npm run test:watch    # Run tests in watch mode
npm run build         # Create the production PWA in dist/
npm run preview       # Preview the production build
```

## Stack

React 19 · Vite 6 · TypeScript · Tailwind CSS v4 · Motion · IndexedDB · Vitest · vite-plugin-pwa

DarkTimer is a web-only PWA; there is no native desktop wrapper or server component.

## License

MIT — see [LICENSE](LICENSE).
