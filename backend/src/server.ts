import express from 'express'
import cors from 'cors'
import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import crypto from 'crypto'
import { compileAndRun, checkJava } from './compiler.js'

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

  -- Classroom Mode tables
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    archived INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    UNIQUE(session_id, name)
  );
  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    player_name TEXT NOT NULL,
    joined_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (team_id) REFERENCES teams(id)
  );
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id TEXT NOT NULL,
    team_id TEXT NOT NULL,
    chapter_index INTEGER NOT NULL,
    xp INTEGER NOT NULL,
    submitted_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(member_id, chapter_index),
    FOREIGN KEY (member_id) REFERENCES members(id),
    FOREIGN KEY (team_id) REFERENCES teams(id)
  );
`)

function uuid() {
  return crypto.randomUUID()
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion
  let code = ''
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// ─── Auto-create user if missing ───
function ensureUser(userId: string) {
  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId)
  if (!existing) {
    db.prepare('INSERT INTO users (id) VALUES (?)').run(userId)
  }
}

// ═══════════════════════════════════════════════════
// EXISTING ENDPOINTS (progress, chapters)
// ═══════════════════════════════════════════════════

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

  if (typeof chapterId !== 'number' || chapterId < 0 || chapterId > 30) {
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

// ═══════════════════════════════════════════════════
// CLASSROOM MODE ENDPOINTS
// ═══════════════════════════════════════════════════

// ─── POST create session ───
app.post('/api/classroom/sessions', (req, res) => {
  const { name, code: customCode } = req.body
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'Session name is required' })
  }

  let code = customCode?.toUpperCase().trim()
  if (!code) {
    // Generate unique code with retry
    for (let i = 0; i < 10; i++) {
      code = generateCode()
      const existing = db.prepare('SELECT id FROM sessions WHERE code = ?').get(code)
      if (!existing) break
      if (i === 9) return res.status(500).json({ error: 'Could not generate unique code' })
    }
  } else {
    const existing = db.prepare('SELECT id FROM sessions WHERE code = ?').get(code)
    if (existing) return res.status(409).json({ error: 'Code already in use' })
  }

  const id = uuid()
  db.prepare('INSERT INTO sessions (id, code, name) VALUES (?, ?, ?)').run(id, code, name.trim())
  res.json({ id, code, name: name.trim() })
})

// ─── GET validate/lookup session ───
app.get('/api/classroom/sessions/:code', (req, res) => {
  const { code } = req.params
  const session = db.prepare('SELECT id, code, name, archived FROM sessions WHERE code = ? AND archived = 0').get(code.toUpperCase()) as any
  if (!session) return res.status(404).json({ error: 'Session not found' })
  res.json(session)
})

// ─── DELETE archive session ───
app.delete('/api/classroom/sessions/:code', (req, res) => {
  const { code } = req.params
  const result = db.prepare('UPDATE sessions SET archived = 1 WHERE code = ? AND archived = 0').run(code.toUpperCase())
  if (result.changes === 0) return res.status(404).json({ error: 'Session not found' })
  res.json({ ok: true })
})

// ─── POST reset session (clear submissions) ───
app.post('/api/classroom/sessions/:code/reset', (req, res) => {
  const { code } = req.params
  const session = db.prepare('SELECT id FROM sessions WHERE code = ? AND archived = 0').get(code.toUpperCase()) as any
  if (!session) return res.status(404).json({ error: 'Session not found' })

  db.prepare(`
    DELETE FROM submissions WHERE team_id IN (
      SELECT id FROM teams WHERE session_id = ?
    )
  `).run(session.id)
  res.json({ ok: true })
})

// ─── GET list teams in session ───
app.get('/api/classroom/sessions/:code/teams', (req, res) => {
  const { code } = req.params
  const session = db.prepare('SELECT id FROM sessions WHERE code = ? AND archived = 0').get(code.toUpperCase()) as any
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const teams = db.prepare('SELECT id, name FROM teams WHERE session_id = ? ORDER BY created_at').all(session.id) as any[]
  const result = teams.map((t) => {
    const members = db.prepare('SELECT id, player_name FROM members WHERE team_id = ? ORDER BY joined_at').all(t.id) as any[]
    return {
      id: t.id,
      name: t.name,
      memberCount: members.length,
      members: members.map((m) => ({ id: m.id, playerName: m.player_name })),
    }
  })

  res.json({ teams: result })
})

// ─── POST create team + auto-join ───
app.post('/api/classroom/sessions/:code/teams', (req, res) => {
  const { code } = req.params
  const { teamName, playerName } = req.body
  if (!teamName || !playerName) return res.status(400).json({ error: 'teamName and playerName are required' })

  const session = db.prepare('SELECT id FROM sessions WHERE code = ? AND archived = 0').get(code.toUpperCase()) as any
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const existing = db.prepare('SELECT id FROM teams WHERE session_id = ? AND name = ?').get(session.id, teamName.trim())
  if (existing) return res.status(409).json({ error: 'Team name already taken' })

  const teamId = uuid()
  const memberId = uuid()
  db.prepare('INSERT INTO teams (id, session_id, name) VALUES (?, ?, ?)').run(teamId, session.id, teamName.trim())
  db.prepare('INSERT INTO members (id, team_id, player_name) VALUES (?, ?, ?)').run(memberId, teamId, playerName.trim())

  res.json({
    team: { id: teamId, name: teamName.trim() },
    member: { id: memberId, playerName: playerName.trim() },
  })
})

// ─── POST join team ───
app.post('/api/classroom/teams/:teamId/join', (req, res) => {
  const { teamId } = req.params
  const { playerName } = req.body
  if (!playerName) return res.status(400).json({ error: 'playerName is required' })

  const team = db.prepare('SELECT id, name FROM teams WHERE id = ?').get(teamId) as any
  if (!team) return res.status(404).json({ error: 'Team not found' })

  const memberId = uuid()
  db.prepare('INSERT INTO members (id, team_id, player_name) VALUES (?, ?, ?)').run(memberId, teamId, playerName.trim())

  res.json({ member: { id: memberId, playerName: playerName.trim() } })
})

// ─── POST leave team ───
app.post('/api/classroom/teams/:teamId/leave', (req, res) => {
  const { teamId } = req.params
  const { memberId } = req.body
  if (!memberId) return res.status(400).json({ error: 'memberId is required' })

  db.prepare('DELETE FROM submissions WHERE member_id = ? AND team_id = ?').run(memberId, teamId)
  db.prepare('DELETE FROM members WHERE id = ? AND team_id = ?').run(memberId, teamId)
  res.json({ ok: true })
})

// ─── POST submit score ───
app.post('/api/classroom/submissions', (req, res) => {
  const { memberId, teamId, chapterIndex, xp } = req.body
  if (!memberId || !teamId || typeof chapterIndex !== 'number' || typeof xp !== 'number') {
    return res.status(400).json({ error: 'memberId, teamId, chapterIndex, and xp are required' })
  }
  if (chapterIndex < 0 || chapterIndex > 30) {
    return res.status(400).json({ error: 'Invalid chapterIndex' })
  }

  // Verify member belongs to team
  const member = db.prepare('SELECT id FROM members WHERE id = ? AND team_id = ?').get(memberId, teamId)
  if (!member) return res.status(403).json({ error: 'Member does not belong to this team' })

  try {
    db.prepare('INSERT INTO submissions (member_id, team_id, chapter_index, xp) VALUES (?, ?, ?, ?)').run(memberId, teamId, chapterIndex, xp)
    res.json({ ok: true })
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Chapter already submitted' })
    }
    throw e
  }
})

// ─── GET leaderboard ───
app.get('/api/classroom/sessions/:code/leaderboard', (req, res) => {
  const { code } = req.params
  const session = db.prepare('SELECT id FROM sessions WHERE code = ?').get(code.toUpperCase()) as any
  if (!session) return res.status(404).json({ error: 'Session not found' })

  const teams = db.prepare(`
    SELECT t.id, t.name,
      COALESCE(SUM(s.xp), 0) as totalXP,
      COUNT(DISTINCT s.id) as stars,
      COUNT(DISTINCT m.id) as memberCount
    FROM teams t
      LEFT JOIN members m ON m.team_id = t.id
      LEFT JOIN submissions s ON s.team_id = t.id
    WHERE t.session_id = ?
    GROUP BY t.id
    ORDER BY totalXP DESC
  `).all(session.id) as any[]

  const result = teams.map((t) => {
    const members = db.prepare(`
      SELECT m.player_name as playerName,
        COALESCE(SUM(s.xp), 0) as xp,
        COUNT(s.id) as stars
      FROM members m
        LEFT JOIN submissions s ON s.member_id = m.id
      WHERE m.team_id = ?
      GROUP BY m.id
      ORDER BY xp DESC
    `).all(t.id) as any[]

    return {
      id: t.id,
      name: t.name,
      totalXP: t.totalXP,
      stars: t.stars,
      memberCount: t.memberCount,
      members,
    }
  })

  res.json({ teams: result })
})

// ═══════════════════════════════════════════════════
// JAVA COMPILATION ENDPOINT
// ═══════════════════════════════════════════════════

app.post('/api/compile', async (req, res) => {
  const { code, stdin } = req.body
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'code is required' })
  }
  if (code.length > 50_000) {
    return res.status(400).json({ error: 'Code too long (50KB limit)' })
  }
  try {
    const result = await compileAndRun(code, stdin)
    res.json(result)
  } catch (err: any) {
    console.error('Compile error:', err)
    res.status(500).json({ error: 'Compilation service error' })
  }
})

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
  checkJava().then(({ ok, version }) => {
    if (ok) console.log(`  Java compiler: ${version}`)
    else console.warn('  !! Java not found — /api/compile will not work. Install JDK 11+.')
  })
})
