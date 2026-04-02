# JavaOOPQuest — Technical Documentation

## Overview

JavaOOPQuest is a gamified educational web application for the course **F27SA Software Development 1** (SCQF Level 7, Year 1 undergraduate, no prerequisites). It covers the full course syllabus across 7 interactive units, a 3D OOP battle arena, and a competitive progression system.

Students write real Java code in a browser-based editor. The code is compiled and executed by a server-side `javac`/`java` compilation service, providing authentic compiler feedback without requiring any local JDK installation.

---

## Architecture

```
JavaOOPQuest/
├── frontend/               React 18 + Three.js (Vite)
│   ├── src/
│   │   ├── App.tsx         Root router + Battle Arena component
│   │   ├── api/
│   │   │   └── compiler.ts Frontend API client for POST /api/compile
│   │   ├── units/
│   │   │   ├── types.ts        Challenge & validation type definitions
│   │   │   ├── index.ts        Unit registry + routing
│   │   │   ├── HomePage.tsx    Home page with unit grid, stats, achievements, pro tips
│   │   │   ├── UnitPage.tsx    Shared unit layout (editor, output, visuals, validation)
│   │   │   ├── unit2/          The Alchemist's Lab (Variables & Types)
│   │   │   ├── unit3/          The Labyrinth (Control Flow)
│   │   │   ├── unit4/          The Deep Labyrinth (Complex Control Flow)
│   │   │   ├── unit5/          The Armoury (Arrays)
│   │   │   ├── unit6/          The Spell Workshop (Methods)
│   │   │   └── unit10/         The Shadow Realm (Exceptions & Strings)
│   │   ├── chapters/
│   │   │   └── chapters.ts     19 Battle Arena chapter definitions (Units 7-9)
│   │   ├── parser/
│   │   │   ├── JavaParser.ts   Regex-based Java parser (arena game logic)
│   │   │   └── ActionExecutor.ts  Converts parsed code to 3D game actions
│   │   ├── scene/              Three.js 3D world (terrain, lighting, day/night)
│   │   ├── characters/         GLTF character models and animations
│   │   ├── effects/            Visual effects (fireball, arrow, slash, heal)
│   │   ├── interaction/        Keyboard controller (method → key bindings)
│   │   ├── state/
│   │   │   ├── gameStore.ts    Runtime 3D game state (Zustand)
│   │   │   ├── chapterStore.ts Arena progress + XP (Zustand + localStorage)
│   │   │   ├── unitStore.ts    Unit progress, achievements, streaks (Zustand + localStorage)
│   │   │   └── classroomStore.ts  Classroom/team session state
│   │   ├── assets/
│   │   │   └── sounds.ts       Web Audio API synthesised sound effects
│   │   └── ui/                 React UI components (CodeEditor, XPBar, classroom, etc.)
│   ├── public/models/          KayKit 3D character models (GLTF)
│   ├── vite.config.ts          Vite config with API proxy
│   └── package.json
│
├── backend/                Express.js + SQLite
│   ├── src/
│   │   ├── server.ts       REST API (classroom, progress, compilation)
│   │   └── compiler.ts     Java compilation service (javac + java)
│   ├── data.db             SQLite database file
│   └── package.json
│
├── netlify.toml            Netlify deployment config
├── package.json            Monorepo workspace root
├── TECHNICAL.md            This file
└── STUDENT_README.md       Student-facing guide
```

---

## Compilation Service

### How it works

The backend endpoint `POST /api/compile` accepts Java source code, automatically wraps it if necessary, compiles it with `javac`, executes it with `java`, and returns the result.

### Auto-wrapping

Student code rarely includes `public static void main` or import statements. The compiler service analyses the code and wraps it:

| Student writes | Wrapper adds |
|---|---|
| Bare statements (`int x = 5;`) | `import java.util.*; import java.io.*;` + `public class Main { public static void main(String[] args) { ... } }` |
| Standalone methods | Moved inside `Main` class as `static` methods |
| Class definitions + loose statements | Classes placed at file scope, statements inside `main()` |
| Full program with `public class` + `main` | No wrapping — compiled as-is |

### Line number adjustment

Error messages from `javac` reference line numbers in the wrapped file. The service adjusts them back to the student's original code so errors like `Line 3: ';' expected` point to the correct line.

### Security

- Each compilation runs in a temporary directory (`/tmp/jq-<uuid>/`)
- 5-second timeout kills runaway processes (infinite loops)
- Output capped at 50KB
- Temp directory cleaned up after execution
- Code size limited to 50KB

### API

```
POST /api/compile
Content-Type: application/json

{
  "code": "System.out.println(\"hello\");",
  "stdin": "optional input for Scanner"
}

Response:
{
  "success": true,
  "output": "hello\n",
  "errors": "",
  "executionTime": 245
}
```

---

## Syllabus Coverage

| Unit | Title | Theme | Challenges | LOs |
|------|-------|-------|------------|-----|
| 2 | Fundamental Elements | The Alchemist's Lab | 8 | 1, 2 |
| 3 | Control Flow | The Labyrinth | 10 | 1, 2, 3 |
| 4 | Complex Control Flow | The Deep Labyrinth | 8 | 1, 2, 3 |
| 5 | Arrays | The Armoury | 8 | 1, 2, 3, 7 |
| 6 | Methods | The Spell Workshop | 10 | 1, 2, 5 |
| 7-9 | OOP (Classes, Inheritance, Using Objects) | The Battle Arena | 19 | 2, 3, 4, 5, 6, 7 |
| 10 | Exceptions & Strings | The Shadow Realm | 10 | 2, 3, 5, 7 |

**Total: 73 challenges** across all units.

### Bloom's Taxonomy Coverage

| Level | Mechanic | Where |
|-------|----------|-------|
| T1 Remembering | Syntax reference panel, hint system | All units |
| T2 Comprehending | Predict-the-output challenges | Units 3-6, 10 |
| T3 Applying | Write code to solve problems | All units (core) |
| T4 Analysing | Find-the-bug challenges | Units 3-6, 10 |
| T5 Evaluating | Real compiler feedback alongside game validation | Arena |
| T6 Creating | Open-ended challenges (Final Boss, Palindrome Gate) | Arena Ch.15, Unit 10 |

### LO8 (IDEs, Debugging, Version Control)

Addressed through daily rotating "Pro Tips" on the home page — 10 tips covering IntelliJ/VS Code, print debugging, breakpoints, Git commands, branching, commit messages, TDD, and IDE shortcuts.

---

## Validation Types

Each challenge uses one of these validation strategies:

| Type | How it works |
|------|-------------|
| `output` | Exact match of trimmed program output |
| `outputMatch` | Regex match against output |
| `compiles` | Code compiles successfully |
| `testCases` | Multiple stdin/expected-output pairs, all must pass |
| `custom` | Custom function receives CompileResult + code, returns pass/fail |
| `predict` | Student types predicted output; code is compiled separately to verify |
| `bugfix` | Student edits broken starter code; validated by compilation + expected output |

---

## Battle Arena — Dual Validation

The arena uses **two validation systems in parallel**:

1. **Regex parser** (instant, client-side): Extracts class definitions, methods, objects, and calls from the code structure. Drives the 3D game visualisation — spawning characters, triggering attacks, binding keyboard controls.

2. **Real Java compiler** (async, server-side): Sends the code to `POST /api/compile` and displays `javac` results in the console. Students see both game feedback AND authentic compilation output.

This means a student can pass a chapter's structural validation (parser) while still seeing compiler warnings/errors — teaching them the difference between "code that looks right" and "code that compiles."

---

## State Management

| Store | Persistence | Contents |
|-------|-------------|----------|
| `unitStore` | localStorage (`jq-unit-progress`) | Unit challenge progress, solutions, drafts, XP, achievements, streaks |
| `chapterStore` | localStorage | Arena chapter progress, solutions, drafts, XP, hints used |
| `gameStore` | In-memory only | Runtime 3D state (characters, effects, logs) |
| `classroomStore` | In-memory + API | Session/team/member state for classroom mode |

---

## Classroom Mode

### Flow

1. Instructor creates session via `/instructor` panel (generates 4-character code)
2. Students join via Classroom Mode button on splash screen
3. Students form/join teams
4. Each student plays independently; team XP is pooled
5. Submit button posts chapter completion to backend
6. Leaderboard aggregates team total XP

### Backend Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/classroom/sessions` | Create session |
| GET | `/api/classroom/sessions/:code` | Validate session |
| GET | `/api/classroom/sessions/:code/teams` | List teams |
| POST | `/api/classroom/sessions/:code/teams` | Create team + auto-join |
| POST | `/api/classroom/teams/:teamId/join` | Join team |
| POST | `/api/classroom/submissions` | Submit chapter score |
| GET | `/api/classroom/sessions/:code/leaderboard` | Get rankings |

---

## Gamification

### XP System

| Challenge range | XP per challenge |
|-----------------|-----------------|
| Arena Ch. 1-5 | 100 |
| Arena Ch. 6-10 | 200 |
| Arena Ch. 11-15 | 300 |
| Arena Ch. 16-19 | 350 |
| Unit challenges | 50-125 (varies by difficulty) |
| Predict/Bugfix bonus | 75 |

### Achievements (10 badges)

| Badge | Trigger |
|-------|---------|
| First Brew | Complete any challenge |
| Unit Cleared | Complete all challenges in a unit |
| Bug Squasher | Fix a bugfix challenge |
| The Oracle | Predict output correctly |
| On a Roll | 3-day streak |
| Dedicated | 7-day streak |
| Rising Star | 500 XP total |
| Veteran | 2000 XP total |
| Grand Master | Challenge in every unit |
| Shadow Survivor | Complete Unit 10 |

### Streaks

Daily activity is recorded. Consecutive days increment the streak counter. Streaks of 3 and 7 days earn achievements.

---

## Visual & Audio System

Each unit has a themed visual component rendered as an SVG panel:

| Unit | Visual | Key animations |
|------|--------|---------------|
| 2 | Bubbling cauldron + flasks | Steam, liquid fill, drip, glow pulse, floating particles |
| 3 | Torch-lit corridor + doors | Flame flicker, smoke, door open, dust motes, footprints |
| 4 | Deep dungeon + runes | Water drips, mist drift, Norse runes, ice crystals, grid light-up |
| 5 | Forge + weapon rack | Embers, forge glow, bar growth, shimmer, hammer sparks |
| 6 | Spell scrolls + quill | Scroll unroll, magic circles, orbiting particles, text reveal |
| 10 | Shadow portal + cipher | Portal pulse, lightning, shield flash, shadow particles |

All sounds are synthesised using the Web Audio API — no audio files needed.

---

## Running Locally

### Prerequisites

- Node.js 18+
- JDK 11+ (for the compilation service)

### Development

```bash
# Terminal 1: Backend
cd backend
npm install
npx tsx src/server.ts

# Terminal 2: Frontend
cd frontend
npm install
npx vite
```

Open http://localhost:3000. The Vite dev server proxies `/api` requests to the backend on port 3001.

### Production Build

```bash
cd frontend
npm install && npx vite build
# Output: frontend/dist/
```

---

## Deployment

### Frontend (Netlify/Vercel)

| Setting | Value |
|---------|-------|
| Base directory | `frontend` |
| Build command | `npm install && npx vite build` |
| Publish directory | `frontend/dist` |
| Redirects | `/* → /index.html` (SPA) |

### Backend

The backend requires a server with Node.js and JDK. Options:

- **Self-hosted**: Docker container with Node.js + OpenJDK
- **University server**: Any Linux/Mac VM with JDK 11+
- **Railway/Render**: Free tier with Docker support

---

## Accessibility

- WCAG AAA contrast ratios for primary text (~15:1)
- Orange (not red) for errors — colourblind-friendly
- Icons + colour for all status indicators (never colour alone)
- Visible scrollbars (10px, styled for WebKit + Firefox)
- Keyboard accessible: Ctrl/Cmd+Enter to run code

---

## License

Copyright (c) 2026 Heba El-Shimy. All rights reserved.

3D character models (KayKit Adventurers) are licensed under CC0 by Kay Lousberg.
