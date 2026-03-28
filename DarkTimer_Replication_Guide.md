# DarkTimer - Replication Guide

This document provides a detailed blueprint of the **DarkTimer** application to allow replicating its exact features, architecture, and behavior into a React + Tauri project (with potential mobile app variants). 

## 1. Overview and Core Concept
DarkTimer is a "Utilitarian Darkroom Tool" intended for analog photography film development. It combines a manual timer, an AI recipe finder (using Google Gemini), a local recipe library, and customizable defaults into a rugged, minimalist, dark-themed UI.

---

## 2. Design System & Aesthetics
**Theme:** "Utilitarian Darkroom." Minimalist, text-heavy, strictly dark-mode with red accents simulating safe-light elements.

*   **Colors:**
    *   Background: `#000000` (Pure Black)
    *   Panels: `#0a0a0a` (Very dark gray)
    *   Borders: `#1a1a1a`
    *   Accent: `#ff0000` (Pure Red)
    *   Text (Primary): `#ffffff` (White)
    *   Text (Muted/Labels): `#888888` (UI Gray)
*   **Typography:**
    *   Sans-serif: `Inter` (used for main UI text and headings)
    *   Monospace: `JetBrains Mono` (used for timers, labels, uppercase utility buttons, and parameters)
*   **Styling Rules:** 
    *   Components use sharp borders (`border border-[#1a1a1a]`).
    *   Inputs have no background (`bg-transparent`), a bottom border or full border, and acquire a red border on focus.
    *   Labels are predominantly tiny, uppercase, tracking-wide, and monospaced (`text-[10px] uppercase tracking-[0.2em] text-[#888888]`).
    *   Effects: Minimal use of a "red glow" (`text-shadow: 0 0 8px rgba(255,0,0,0.4)`) during active agitation phases.

---

## 3. Core Data Structures

### `DevPhase`
Represents a single step in the development process.
*   `name`: string (e.g., "Developer", "Stop Bath")
*   `duration`: number (in seconds)
*   `agitation`: string (optional text instructions, e.g., "Agitate 5s every 60s")

### `DevRecipe` / `Preset` 
Represents a complete development configuration.
*   `id`: string (for saved presets)
*   `film`: string
*   `developer`: string
*   `dilution`: string
*   `iso`: number
*   `temp`: string
*   `phases`: array of `DevPhase`
*   `notes`: string (Markdown supported)
*   `source`: string (optional, e.g., "Massive Dev Chart")

### `UserSettings`
Global application settings saved locally.
*   `defaultStopBath`: number (default: 30s)
*   `defaultFixer`: number (default: 300s)
*   `defaultWash`: number (default: 600s)
*   `agitationDuration`: number (default: 5s)
*   `agitationInterval`: number (default: 60s)

---

## 4. Application Views (Main Navigation)
The app operates mainly on a tabbed single-page architecture, switching between `manual`, `ai`, `library`, `settings`, and the `timer` views. 

The **Header** contains:
*   Logo/Title: "DARKTIMER" (clickable, resets active timer/view).
*   Tab Buttons: `Manual`, `AI Assistant`, `Library`, and `Settings` (represented by an icon). Active states are highlighted with a white text color and a red bottom border.

### A. Manual Mode (`ManualTimerForm`)
Allows the user to manually build a recipe.
*   **Inputs:** Film Stock, Developer, Dilution.
*   **Phases Builder:** 
    *   Initializes with defaults: Developer (6 min), Stop Bath, Fixer, and Wash (seeded from UserSettings).
    *   Users can add or remove phases.
    *   Each row allows editing: Phase Name, Minutes, Seconds, and Agitation text.
*   **Actions:** 
    *   `Save to Library`: Validates and saves the current configuration to local storage.
    *   `Start Session`: Directly initializes the Timer view with the current configuration without saving it permanently.

### B. AI Assistant (`FilmSearch`)
Queries the Gemini API to find standard times for a given film and developer combination.
*   **Inputs:** Film, Developer, Dilution, ISO, Temp.
*   **Process:** 
    *   Calls Gemini API (prompt asks for a structured JSON with max 3 options).
    *   Expected phases are Dev, Stop Bath, Fixer, Wash.
*   **Results List:**
    *   Displays cards with Film name, ISO, Temp, Dev + Dilution, source, and total developer duration.
    *   Actions per card: Start Session (click on the card body) or Save to Library (a separate "+" icon button).

### C. Library (`PresetLibrary`)
Manages locally saved recipes.
*   Stored in `localStorage` under `darktimer_presets`.
*   Displays a vertical list of saved presets.
*   **Card details:** Film, ISO, Developer, Dilution, Temp.
*   **Hover state:** Reveals a "Play" button (to start the timer) and a "Trash" button (to delete the preset).

### D. Settings (`SettingsMenu`)
Configures the App's default behaviors, saved in `localStorage` (`darktimer_settings`).
*   **Default Durations (sec):** Stop Bath, Fixer, Wash.
*   **Agitation Cycle:**
    *   `Duration`: How long to agitate for (e.g., 5s).
    *   `Interval`: Frequency of agitation (e.g., every 60s).
*   Saving updates the global state overrides default phase durations in Manual Mode and affects timer calculations globally.

---

## 5. The Timer Engine (`Timer` View)
This is the core functional view when a development session is active.

### Layout
*   **Left Column (Recipe Details):** Displays active recipe's Film, Developer, Dilution, ISO, Temp, Source, and Markdown-rendered notes. Includes an "Exit Session" button.
*   **Right Column/Centered Panel (The Timer):** 
    *   Displays current Phase (e.g., "Phase 1/4", "Developer").
    *   Massive Monospace Countdown (MM:SS).
    *   Linear Progress Bar (Red normally, flashes White during agitation).
    *   Next phases preview (listing upcoming phases and their durations).
    *   Controls: Mute Toggle, Reset Current Phase, Play/Pause, Skip Phase.

### Agitation Logic (Crucial for Reproduction)
*   **Trigger:** Agitation logic applies *only* if the current phase's name includes the string `'dev'` (e.g. "Developer") *or* if the phase explicitly contains agitation notes.
*   **Math:** `elapsed = currentPhase.duration - timeLeft;`
    `cycleTime = elapsed % settings.agitationInterval;`
    `isAgitating = cycleTime < settings.agitationDuration;`
*   **Visual cues:** When `isAgitating` is true, the timer gains a red glow, border turns to accent red, and a tiny "AGITATING" label appears above the timer. The progress bar temporarily becomes white.
*   **Audio cues:** 
    *   When an agitation cycle *starts*, it plays a 440Hz beep for 0.2s.
    *   When a *phase ends*, it plays an 880Hz beep for 0.5s.
    *   The user can mute all Audio using the Bell icon.

## 6. Tauri / Mobile Specific Modifications
If porting to Tauri (Desktop) and standard Mobile:
1.  **Storage Engine:** Transition `localStorage` to Tauri's persistent file store plugin (or SQLite) for desktop, and async storage/Capacitor preferences for Mobile, to ensure durability.
2.  **Audio Engine:** The browser `AudioContext` oscillator is sufficient for desktop Tauri, but for mobile (iOS/Android), you may need to use native audio APIs or Web Audio tightly coupled with user gestures to bypass silent mode restrictions.
3.  **Background Processing:** Timers easily fall out of sync or suspend on mobile. Use `setInterval` carefully. Rely on storing `startTime` and `targetEndTime` via `Date.now()`, verifying the delta on every tick to accommodate app backgrounding/suspension. Send native push notifications when a phase or agitation cycle requires user attention in the background.
4.  **Hardware integration:** Consider adding features like preventing screen sleep (Wake Lock API / Tauri Plugins) while the timer operates.
