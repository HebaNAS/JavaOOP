import { getStore } from "@netlify/blobs";

// ─── Data Model (one blob per session) ───
interface Member {
  id: string;
  playerName: string;
  joinedAt: number;
}

interface Submission {
  xp: number;
  submittedAt: number;
}

interface Team {
  id: string;
  name: string;
  createdAt: number;
  members: Record<string, Member>;
  // memberId -> chapterIndex (as string) -> Submission
  submissions: Record<string, Record<string, Submission>>;
}

interface SessionData {
  id: string;
  code: string;
  name: string;
  archived: boolean;
  createdAt: number;
  teams: Record<string, Team>;
}

// ─── Helpers ───
function uuid() {
  return crypto.randomUUID();
}

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function err(message: string, status: number) {
  return json({ error: message }, status);
}

async function getSession(code: string): Promise<SessionData | null> {
  const store = getStore("sessions");
  return (await store.get(code.toUpperCase(), { type: "json" })) as SessionData | null;
}

async function putSession(session: SessionData): Promise<void> {
  const store = getStore("sessions");
  await store.setJSON(session.code, session);
}

// ─── Main Handler ───
export default async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname.replace("/api/classroom", "");
  const method = req.method;

  try {
    // POST /api/classroom/sessions — create session
    if (method === "POST" && path === "/sessions") {
      const body = await req.json();
      const { name, code: customCode } = body;
      if (!name || typeof name !== "string") {
        return err("Session name is required", 400);
      }

      let code = customCode?.toUpperCase().trim();
      if (code) {
        const existing = await getSession(code);
        if (existing) return err("Code already in use", 409);
      } else {
        // Generate unique code
        for (let i = 0; i < 10; i++) {
          code = generateCode();
          const existing = await getSession(code);
          if (!existing) break;
          if (i === 9) return err("Could not generate unique code", 500);
        }
      }

      const session: SessionData = {
        id: uuid(),
        code,
        name: name.trim(),
        archived: false,
        createdAt: Date.now(),
        teams: {},
      };
      await putSession(session);
      return json({ id: session.id, code: session.code, name: session.name });
    }

    // GET /api/classroom/sessions/:code — validate session
    const sessionMatch = path.match(/^\/sessions\/([^/]+)$/);
    if (method === "GET" && sessionMatch) {
      const session = await getSession(sessionMatch[1]);
      if (!session || session.archived)
        return err("Session not found", 404);
      return json({
        id: session.id,
        code: session.code,
        name: session.name,
        archived: session.archived,
      });
    }

    // DELETE /api/classroom/sessions/:code — archive session
    if (method === "DELETE" && sessionMatch) {
      const session = await getSession(sessionMatch[1]);
      if (!session || session.archived)
        return err("Session not found", 404);
      session.archived = true;
      await putSession(session);
      return json({ ok: true });
    }

    // POST /api/classroom/sessions/:code/reset — clear submissions
    const resetMatch = path.match(/^\/sessions\/([^/]+)\/reset$/);
    if (method === "POST" && resetMatch) {
      const session = await getSession(resetMatch[1]);
      if (!session || session.archived)
        return err("Session not found", 404);
      for (const team of Object.values(session.teams)) {
        team.submissions = {};
      }
      await putSession(session);
      return json({ ok: true });
    }

    // GET /api/classroom/sessions/:code/teams — list teams
    const teamsMatch = path.match(/^\/sessions\/([^/]+)\/teams$/);
    if (method === "GET" && teamsMatch) {
      const session = await getSession(teamsMatch[1]);
      if (!session || session.archived)
        return err("Session not found", 404);
      const teams = Object.values(session.teams).map((t) => ({
        id: t.id,
        name: t.name,
        memberCount: Object.keys(t.members).length,
        members: Object.values(t.members).map((m) => ({
          id: m.id,
          playerName: m.playerName,
        })),
      }));
      return json({ teams });
    }

    // POST /api/classroom/sessions/:code/teams — create team + auto-join
    if (method === "POST" && teamsMatch) {
      const body = await req.json();
      const { teamName, playerName } = body;
      if (!teamName || !playerName)
        return err("teamName and playerName are required", 400);

      const session = await getSession(teamsMatch[1]);
      if (!session || session.archived)
        return err("Session not found", 404);

      // Check duplicate team name
      const nameTaken = Object.values(session.teams).some(
        (t) => t.name.toLowerCase() === teamName.trim().toLowerCase()
      );
      if (nameTaken) return err("Team name already taken", 409);

      const teamId = uuid();
      const memberId = uuid();
      session.teams[teamId] = {
        id: teamId,
        name: teamName.trim(),
        createdAt: Date.now(),
        members: {
          [memberId]: {
            id: memberId,
            playerName: playerName.trim(),
            joinedAt: Date.now(),
          },
        },
        submissions: {},
      };
      await putSession(session);
      return json({
        team: { id: teamId, name: teamName.trim() },
        member: { id: memberId, playerName: playerName.trim() },
      });
    }

    // POST /api/classroom/teams/:teamId/join
    const joinMatch = path.match(/^\/teams\/([^/]+)\/join$/);
    if (method === "POST" && joinMatch) {
      const body = await req.json();
      const { playerName } = body;
      if (!playerName) return err("playerName is required", 400);

      // Find session containing this team
      const store = getStore("sessions");
      const { blobs } = await store.list();
      for (const blob of blobs) {
        const session = (await store.get(blob.key, {
          type: "json",
        })) as SessionData | null;
        if (!session || session.archived) continue;
        const team = session.teams[joinMatch[1]];
        if (team) {
          const memberId = uuid();
          team.members[memberId] = {
            id: memberId,
            playerName: playerName.trim(),
            joinedAt: Date.now(),
          };
          await putSession(session);
          return json({
            member: { id: memberId, playerName: playerName.trim() },
          });
        }
      }
      return err("Team not found", 404);
    }

    // POST /api/classroom/teams/:teamId/leave
    const leaveMatch = path.match(/^\/teams\/([^/]+)\/leave$/);
    if (method === "POST" && leaveMatch) {
      const body = await req.json();
      const { memberId } = body;
      if (!memberId) return err("memberId is required", 400);

      const store = getStore("sessions");
      const { blobs } = await store.list();
      for (const blob of blobs) {
        const session = (await store.get(blob.key, {
          type: "json",
        })) as SessionData | null;
        if (!session) continue;
        const team = session.teams[leaveMatch[1]];
        if (team && team.members[memberId]) {
          delete team.members[memberId];
          delete team.submissions[memberId];
          await putSession(session);
          return json({ ok: true });
        }
      }
      return json({ ok: true });
    }

    // POST /api/classroom/submissions
    if (method === "POST" && path === "/submissions") {
      const body = await req.json();
      const { memberId, teamId, chapterIndex, xp } = body;
      if (
        !memberId ||
        !teamId ||
        typeof chapterIndex !== "number" ||
        typeof xp !== "number"
      ) {
        return err("memberId, teamId, chapterIndex, and xp are required", 400);
      }

      const store = getStore("sessions");
      const { blobs } = await store.list();
      for (const blob of blobs) {
        const session = (await store.get(blob.key, {
          type: "json",
        })) as SessionData | null;
        if (!session) continue;
        const team = session.teams[teamId];
        if (team && team.members[memberId]) {
          if (!team.submissions[memberId]) team.submissions[memberId] = {};
          const chKey = String(chapterIndex);
          if (team.submissions[memberId][chKey]) {
            return err("Chapter already submitted", 409);
          }
          team.submissions[memberId][chKey] = {
            xp,
            submittedAt: Date.now(),
          };
          await putSession(session);
          return json({ ok: true });
        }
      }
      return err("Member does not belong to this team", 403);
    }

    // GET /api/classroom/sessions/:code/leaderboard
    const lbMatch = path.match(/^\/sessions\/([^/]+)\/leaderboard$/);
    if (method === "GET" && lbMatch) {
      const session = await getSession(lbMatch[1]);
      if (!session) return err("Session not found", 404);

      const teams = Object.values(session.teams).map((t) => {
        let totalXP = 0;
        let totalStars = 0;

        const members = Object.values(t.members).map((m) => {
          const subs = t.submissions[m.id] || {};
          const memberXP = Object.values(subs).reduce(
            (sum, s) => sum + s.xp,
            0
          );
          const memberStars = Object.keys(subs).length;
          totalXP += memberXP;
          totalStars += memberStars;
          return {
            playerName: m.playerName,
            xp: memberXP,
            stars: memberStars,
          };
        });

        members.sort((a, b) => b.xp - a.xp);

        return {
          id: t.id,
          name: t.name,
          totalXP,
          stars: totalStars,
          memberCount: Object.keys(t.members).length,
          members,
        };
      });

      teams.sort((a, b) => b.totalXP - a.totalXP);
      return json({ teams });
    }

    return err("Not found", 404);
  } catch (e: any) {
    console.error("Classroom API error:", e);
    return err("Internal server error", 500);
  }
};

export const config = {
  path: "/api/classroom/*",
};
