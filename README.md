# OOP Quest — Java Battle Arena

A 3D interactive game that teaches Java Object-Oriented Programming through gameplay. Students write Java code that directly controls characters in a Clash-of-Clans-style battlefield built with Three.js.

## Features

- **15 Chapters**: Classes, Constructors, Objects, Methods, Encapsulation, Inheritance, Polymorphism, Subclasses, Abstract Classes, Interfaces, Collections, Method Overloading, Static Members, Composition, Final Boss
- **3D Characters**: KayKit animated models (Knight, Mage, Ranger, Rogue) with idle, walk, attack, and death animations
- **Real Combat**: attack/defend/spell/shoot/heal with exact damage from `attackPower` values
- **Keyboard Control**: Define `moveUp()`, `moveDown()`, `moveLeft()`, `moveRight()` in Java to enable WASD. Define `attack()` for SPACE, `defend()` for Q, `castSpell()` for E, `heal()` for R
- **1:1 Code Mapping**: Constructor arguments map directly to character stats. `new Warrior("Aldric", 100, 25)` spawns a character named Aldric with HP=100 ATK=25
- **Enemy AI**: Enemies attack every 3 seconds. Use `defend()` to halve incoming damage
- **Day/Night Cycle**: Dynamic lighting with dawn, day, dusk, and night phases. Fire torches illuminate the battlefield at night
- **XP & Levels**: Earn XP per chapter (bonus for no hints). Level up from Novice to Legend
- **Sound Effects**: Synthesized audio for attacks, spells, heals, victories, and level-ups
- **Progress Persistence**: Auto-save drafts, saved solutions, and chapter progress in localStorage
- **Locked Chapters**: Each chapter unlocks only after completing the previous one
- **Java Syntax Reference**: Built-in collapsible reference panel with syntax examples

## Tech Stack

- **Frontend**: React 18, Three.js (React Three Fiber + Drei), TypeScript, Vite, Zustand, CodeMirror 6
- **Backend** (optional): Express, SQLite, Drizzle ORM
- **3D Models**: KayKit Adventurers (CC0 License)

## Run Locally

```bash
cd frontend
npm install
npx vite
```

Open http://localhost:3000

## Deploy

Deploy the `frontend/` directory to Netlify or Vercel:

| Setting | Value |
|---|---|
| Base directory | `frontend` |
| Build command | `npm install && npx vite build` |
| Publish directory | `dist` |

---

## License

Copyright (c) 2026 Heba El-Shimy. All rights reserved.

This software and its associated documentation are proprietary. No part of this project may be reproduced, distributed, or transmitted in any form or by any means without the prior written permission of the author.

3D character models (KayKit Adventurers) are licensed under CC0 by Kay Lousberg.
