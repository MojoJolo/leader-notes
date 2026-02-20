# Leader Notes

A lightweight, unobtrusive note-taking app for tech leads, engineering managers, and anyone who needs to capture raw meeting notes and have them formatted automatically by AI.

## Vision

Throw unformatted text into a small editor during standups, 1:1s, or team meetings. The app formats and summarises your notes into a readable output, and lets you ask questions about them — all without interrupting your flow.

---

## Architecture

```
leader-notes/
├── electron/               # Electron main-process code (Node.js / CommonJS)
│   ├── main.cjs            # App entry point: window creation and IPC handlers
│   ├── preload.cjs         # Context bridge — exposes a safe API to the renderer
│   ├── db.cjs              # SQLite persistence layer (better-sqlite3)
│   └── ai/
│       ├── index.cjs       # AI provider factory (swap provider here)
│       ├── provider.cjs    # Abstract base class: summarize() and ask()
│       └── codex-cli.cjs   # Concrete provider: delegates to OpenAI Codex CLI
├── src/                    # React renderer (Vite + JSX)
│   ├── main.jsx            # React entry point
│   ├── App.jsx             # Root component — all UI state and logic
│   ├── App.css             # Component-scoped styles
│   └── index.css           # Global reset and typography
├── public/                 # Static assets
├── index.html              # HTML shell loaded by Vite
├── vite.config.js          # Vite build config
├── eslint.config.js        # ESLint flat config
└── package.json
```

### Process model

| Process | Runtime | Entry point |
|---------|---------|-------------|
| Main | Node.js (Electron) | `electron/main.cjs` |
| Renderer | Chromium (React) | `src/main.jsx` via Vite |

The two processes communicate exclusively via **IPC**. The renderer never imports Node modules directly; `preload.cjs` exposes a typed `window.electronAPI` object through Electron's `contextBridge`.

---

## Key Modules

### `electron/main.cjs`

Bootstraps the `BrowserWindow` and registers all IPC handlers:

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `toggle-expand` | renderer → main | Resize window between compact (500×400) and expanded (1050×750) |
| `summarize` | renderer → main | Ask AI to format/summarise notes |
| `ask` | renderer → main | Ask a free-form question about notes |
| `db:get-sessions` | renderer → main | Load all sessions with their notes |
| `db:create-session` | renderer → main | Create a new named session |
| `db:add-note` | renderer → main | Append a note to a session |
| `db:update-summary` | renderer → main | Persist AI-generated summary to DB |

In **development** (`app.isPackaged === false`) the window loads `http://localhost:5173` (Vite dev server) and opens DevTools. In a **packaged build** it loads `dist/index.html` and DevTools are closed.

### `electron/preload.cjs`

Exposes `window.electronAPI` to the renderer via `contextBridge`. This is the only safe way for renderer code to call main-process functionality. Adding a new IPC channel requires updating both `main.cjs` (handler) and `preload.cjs` (exposure).

### `electron/db.cjs`

Thin wrapper around `better-sqlite3`. The database file is stored in the platform-specific user data directory (`app.getPath("userData")`).

**Schema:**

```sql
CREATE TABLE sessions (
  id         INTEGER PRIMARY KEY,       -- Date.now() timestamp used as ID
  name       TEXT    NOT NULL DEFAULT 'Session',
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  summary    TEXT                        -- nullable, filled by AI
);

CREATE TABLE notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id),
  content    TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

WAL mode is enabled for better concurrent read performance.

### `electron/ai/`

A small provider abstraction so the AI backend can be swapped without touching the rest of the app.

- **`provider.cjs`** — Abstract base class defining `summarize(notes)` and `ask(notes, question)`.
- **`codex-cli.cjs`** — Concrete implementation that shells out to the [OpenAI Codex CLI](https://github.com/openai/codex). Prompts are sent via stdin; the response is written to a temp file and read back.
- **`index.cjs`** — Instantiates the active provider. Change the `require` here to switch providers.

To add a new AI provider (e.g. direct OpenAI API, Ollama, etc.):
1. Create `electron/ai/my-provider.cjs` extending `AIProvider`.
2. Implement `summarize(notes)` and `ask(notes, question)`.
3. Update `electron/ai/index.cjs` to `new MyProvider()`.

### `src/App.jsx`

Single-component React app. Key state:

| State | Type | Purpose |
|-------|------|---------|
| `sessions` | `Session[]` | All sessions loaded from DB |
| `activeSessionId` | `number \| null` | Session currently being written to |
| `selectedSessionId` | `number \| null` | Session displayed in the summary panel |
| `expanded` | `boolean` | Window size mode |
| `summariesBySessionId` | `Record<id, string>` | In-memory cache of AI summaries |
| `text` | `string` | Current textarea content |
| `askQuestion` | `string` | In-progress question text |
| `askAnswer` | `string` | Last AI answer |
| `askOpen` | `boolean` | Whether the ask input is visible |

**Session lifecycle:**
1. User types a note and presses Enter / Submit.
2. If no active session exists, a new one is created with a random adjective-noun name and persisted to DB.
3. The note is appended to the session in both React state and DB.
4. If the window is in expanded mode, an AI summary is requested immediately and cached.

**Expand/collapse toggle:** Calls `electronAPI.toggleExpand()` which resizes the native window. When expanding, if the current session has notes but no summary, one is requested automatically.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [OpenAI Codex CLI](https://github.com/openai/codex) installed and authenticated (`codex` must be on your `PATH`)

### Development

```bash
npm install
npm run dev          # starts Vite dev server + Electron concurrently
```

### Production build

```bash
npm run build        # produces dist/
npm start            # runs Electron against the built dist/
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server and Electron together |
| `npm run dev:web` | Vite dev server only (browser preview) |
| `npm run dev:electron` | Electron only (waits for Vite to be ready) |
| `npm run build` | Build renderer to `dist/` |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the Vite build in a browser |
| `npm start` | Start Electron against the built `dist/` |

---

## Dependencies

| Package | Role |
|---------|------|
| `react` / `react-dom` | UI framework |
| `react-markdown` | Renders AI markdown output |
| `better-sqlite3` | Synchronous SQLite driver for Electron main process |
| `electron` | Cross-platform desktop shell |
| `vite` + `@vitejs/plugin-react` | Fast dev server and bundler |
| `concurrently` | Runs Vite and Electron in parallel during dev |
| `wait-on` | Delays Electron start until Vite is ready |

