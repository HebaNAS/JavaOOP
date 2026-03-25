import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ─── Database setup ───
const db = new Database(join(__dirname, '..', 'data.db'))
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    created_at INTEGER DEFAULT (unixepoch())
  );
  CREATE TABLE IF NOT EXISTS progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    chapter_id INTEGER NOT NULL,
    completed_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(user_id, chapter_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`)

// ─── Auto-create user if missing ───
function ensureUser(userId: string) {
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId)
  if (!existing) {
    db.prepare('INSERT INTO users (id) VALUES (?)').run(userId)
  }
}

// ─── GET progress ───
app.get('/api/progress/:userId', (req, res) => {
  const { userId } = req.params
  ensureUser(userId)
  const rows = db.prepare('SELECT chapter_id FROM progress WHERE user_id = ? ORDER BY chapter_id').all(userId) as { chapter_id: number }[]
  const completed = rows.map((r) => r.chapter_id)
  res.json({ completedChapters: completed })
})

// ─── POST complete chapter ───
app.post('/api/progress/:userId/complete', (req, res) => {
  const { userId } = req.params
  const { chapterId } = req.body

  if (typeof chapterId !== 'number' || chapterId < 0 || chapterId > 14) {
    return res.status(400).json({ error: 'Invalid chapterId' })
  }

  ensureUser(userId)

  // Validate: previous chapter must be completed (except chapter 0)
  if (chapterId > 0) {
    const prev = db.prepare('SELECT id FROM progress WHERE user_id = ? AND chapter_id = ?').get(userId, chapterId - 1)
    if (!prev) {
      return res.status(403).json({ error: `Complete chapter ${chapterId - 1} first` })
    }
  }

  db.prepare('INSERT OR IGNORE INTO progress (user_id, chapter_id) VALUES (?, ?)').run(userId, chapterId)
  const rows = db.prepare('SELECT chapter_id FROM progress WHERE user_id = ? ORDER BY chapter_id').all(userId) as { chapter_id: number }[]
  res.json({ completedChapters: rows.map((r) => r.chapter_id) })
})

// ─── GET chapters (locked info) ───
app.get('/api/chapters', (req, res) => {
  const userId = req.query.userId as string
  let completed: number[] = []
  if (userId) {
    const rows = db.prepare('SELECT chapter_id FROM progress WHERE user_id = ?').all(userId) as { chapter_id: number }[]
    completed = rows.map((r) => r.chapter_id)
  }

  const chapters = Array.from({ length: 15 }, (_, i) => {
    const unlocked = i === 0 || completed.includes(i - 1)
    return {
      id: i,
      title: `Chapter ${i + 1}`,
      unlocked,
      completed: completed.includes(i),
    }
  })

  res.json({ chapters })
})

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
