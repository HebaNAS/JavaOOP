import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.lang.reflect.Field;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Arena — the bridge between your Java code and the 3D game world.
 *
 * Every method here does two things:
 *   1. Affects the game world (spawn, move, damage, heal)
 *   2. Prints a ##JQ trace line so the browser can animate it
 *
 * You never need to read or understand this class. The backend auto-injects
 * calls into your methods so writing pure OOP is enough.
 */
public class Arena {

  // ──────────── Reflection helpers ────────────

  private static String readName(Object o) {
    if (o == null) return "?";
    String s = readString(o, "name");
    if (s != null) return s;
    s = readString(o, "characterName");
    if (s != null) return s;
    return o.getClass().getSimpleName() + "@" + System.identityHashCode(o);
  }

  private static String readString(Object o, String field) {
    try {
      Field f = findField(o.getClass(), field);
      if (f == null) return null;
      f.setAccessible(true);
      Object v = f.get(o);
      return v == null ? null : v.toString();
    } catch (Exception e) { return null; }
  }

  private static int readInt(Object o, String... names) {
    for (String n : names) {
      try {
        Field f = findField(o.getClass(), n);
        if (f == null) continue;
        f.setAccessible(true);
        Object v = f.get(o);
        if (v instanceof Number) return ((Number) v).intValue();
      } catch (Exception e) { /* skip */ }
    }
    return -1;
  }

  private static boolean writeInt(Object o, int value, String... names) {
    for (String n : names) {
      try {
        Field f = findField(o.getClass(), n);
        if (f == null) continue;
        f.setAccessible(true);
        f.setInt(o, value);
        return true;
      } catch (Exception e) { /* skip */ }
    }
    return false;
  }

  private static Field findField(Class<?> cls, String name) {
    while (cls != null && cls != Object.class) {
      try { return cls.getDeclaredField(name); } catch (NoSuchFieldException e) { cls = cls.getSuperclass(); }
    }
    return null;
  }

  private static String cls(Object o) {
    String c = o.getClass().getSimpleName();
    if (c.equals("Mage") || c.equals("Warrior") || c.equals("Archer") || c.equals("Healer")) return c;
    Class<?> p = o.getClass().getSuperclass();
    while (p != null && p != Object.class) {
      String s = p.getSimpleName();
      if (s.equals("Mage") || s.equals("Warrior") || s.equals("Archer") || s.equals("Healer")) return s;
      p = p.getSuperclass();
    }
    return "Warrior";
  }

  // ──────────── Snapshot helpers (called by injected prefix code) ────────────

  /** Read current health-like field. Returns 0 when no field is found so the
   *  injected prefix never causes a compile or runtime error. */
  public static int snapshotHealth(Object o) {
    if (o == null) return 0;
    int v = readInt(o, "health", "hp", "hitPoints");
    return v < 0 ? 0 : v;
  }

  /** Read current shield-like boolean. Returns false if no field is found —
   *  treated as "wasn't shielded before". */
  public static boolean snapshotShield(Object o) {
    if (o == null) return false;
    String[] names = { "shielded", "isDefending", "defending", "isShielded" };
    for (String n : names) {
      try {
        Field f = findField(o.getClass(), n);
        if (f == null) continue;
        f.setAccessible(true);
        return f.getBoolean(o);
      } catch (Exception e) { /* try next */ }
    }
    return false;
  }

  // ──────────── Spawn-cell allocation ────────────
  //
  // Students write `this.y -= 1` in moveUp() and expect the character to
  // move "up one tile". If x/y start at 0 (Java default) that would send
  // them to grid (-1) — off the map. So on summon we pick a sensible
  // cell from the spawn roster and write it BACK into the student's
  // object via reflection. Their arithmetic then operates on real grid
  // coordinates without them ever thinking about the mapping.

  // Player spawns are on the LEFT half of the grid (col < 7); enemy spawns
  // are on the RIGHT (col >= 7). Frontend uses col >= 7 to set isEnemy.
  // Must stay in sync with frontend's TraceParser SPAWNS_LEFT / SPAWNS_RIGHT.
  private static final int[][] SPAWNS_LEFT  = { {3,3}, {3,5}, {2,4}, {4,2} };
  private static final int[][] SPAWNS_RIGHT = { {8,4}, {8,6}, {9,3}, {7,7} };
  private static int playerSpawnIdx = 0;
  private static int enemySpawnIdx  = 0;

  /** Heuristic: does this character's name suggest an enemy? Names like
   *  "Grok", "boss", "Dreadlord" land on the right side; everyone else on
   *  the left. Students don't need to think about sides — naming a foe
   *  with an enemy-like word is the convention the chapter copy uses. */
  private static boolean looksLikeEnemy(String name) {
    if (name == null) return false;
    String n = name.toLowerCase();
    String[] markers = {
      "enemy", "foe", "boss", "grok", "dread", "evil", "dark", "shadow",
      "villain", "orc", "goblin", "demon", "skeleton", "monster", "beast",
      "ogre", "troll", "dragon", "necro", "wraith", "fiend",
    };
    for (String m : markers) if (n.contains(m)) return true;
    return false;
  }

  // ──────────── Idempotency / dedup ────────────
  //
  // Auto-injection of Arena.* in every recognised method means a super.X()
  // call would emit the parent's animation, then the override's. Dedup
  // swallows back-to-back duplicates within a tight window so the rendered
  // damage covers BOTH bodies' effects in one event.

  private static final Set<Integer> SUMMONED = new HashSet<>();
  private static final Map<String, Long> LAST_EMIT = new HashMap<>();
  private static final long DEDUP_WINDOW_NS = 50_000_000L; // 50 ms

  private static boolean shouldSuppress(String key) {
    long now = System.nanoTime();
    Long last = LAST_EMIT.get(key);
    LAST_EMIT.put(key, now);
    return last != null && (now - last) < DEDUP_WINDOW_NS;
  }

  // ──────────── Object registry (used by the REPL for keypress invocation) ────────────

  static final Map<String, Object> REGISTRY = new HashMap<>();

  // ──────────── Trace emission ────────────

  private static synchronized void emit(String... parts) {
    StringBuilder sb = new StringBuilder("##JQ");
    for (String p : parts) { sb.append('\t').append(p == null ? "" : p); }
    System.out.println(sb.toString());
    System.out.flush();
  }

  // ──────────── Public API ────────────

  /** Spawn a character. Reads name/health/attackPower from the object, picks
   *  a spawn cell, writes col/row back into x/y, and registers the object
   *  for later REPL lookup. Idempotent per instance.
   *
   *  IMPORTANT: when a subclass constructor calls super(), the parent's
   *  auto-injected summon would fire BEFORE the subclass has assigned its
   *  own fields (e.g. Mage.mana). We detect that case via the call stack
   *  and skip — the subclass's own injected summon (which fires last) is
   *  the one that emits the spawn trace. */
  public static void summon(Object obj) {
    if (obj == null) { emit("warn", "summon called with null"); return; }

    // Skip super-constructor invocations so subclass fields aren't lost.
    StackTraceElement[] trace = Thread.currentThread().getStackTrace();
    if (trace.length >= 3) {
      StackTraceElement caller = trace[2];
      if ("<init>".equals(caller.getMethodName())
          && !caller.getClassName().equals(obj.getClass().getName())) {
        return;   // super() chain; wait for the actual class's constructor
      }
    }

    if (!SUMMONED.add(System.identityHashCode(obj))) return;
    String name = readName(obj);
    String kind = cls(obj);
    int hp = readInt(obj, "health", "hp", "hitPoints");
    int atk = readInt(obj, "attackPower", "attack", "atk", "damage", "power");
    int mana = readInt(obj, "mana", "mp");
    int def = readInt(obj, "defense", "def", "armor");
    int arrows = readInt(obj, "arrowCount", "arrows");
    if (hp < 0) hp = 100;
    if (atk < 0) atk = 15;

    boolean enemy = looksLikeEnemy(name);
    int[] cell;
    if (enemy) {
      cell = SPAWNS_RIGHT[enemySpawnIdx % SPAWNS_RIGHT.length];
      enemySpawnIdx++;
    } else {
      cell = SPAWNS_LEFT[playerSpawnIdx % SPAWNS_LEFT.length];
      playerSpawnIdx++;
    }
    int col = cell[0], row = cell[1];
    writeInt(obj, col, "x", "col");
    writeInt(obj, row, "y", "row");

    REGISTRY.put(name, obj);

    emit("spawn", name, kind,
      String.valueOf(hp), String.valueOf(atk),
      String.valueOf(Math.max(0, mana)), String.valueOf(Math.max(0, def)),
      String.valueOf(Math.max(0, arrows)),
      String.valueOf(col), String.valueOf(row));
  }

  /** Move snapshot — emits only when (x,y) changed. */
  public static void move(Object who, int x, int y, int preX, int preY) {
    if (who == null) return;
    if (x == preX && y == preY) return;
    String name = readName(who);
    if (shouldSuppress("move:" + name + ":" + x + ":" + y)) return;
    emit("move", name, String.valueOf(x), String.valueOf(y));
  }

  /** Legacy move — kept for the fallback injection path (no snapshot). */
  public static void move(Object who, int col, int row) {
    if (who == null) return;
    String name = readName(who);
    if (shouldSuppress("move:" + name + ":" + col + ":" + row)) return;
    emit("move", name, String.valueOf(col), String.valueOf(row));
  }

  /** Attack — damage is the actual delta the body produced on target.health. */
  public static void attack(Object attacker, Object target, int preHealth) {
    if (attacker == null || target == null) { emit("warn", "attack called with null"); return; }
    String a = readName(attacker), t = readName(target);
    if (shouldSuppress("attack:" + a + ":" + t)) return;
    int post = readInt(target, "health", "hp", "hitPoints");
    int dmg = Math.max(0, preHealth - post);
    emit("attack", a, t, String.valueOf(dmg), cls(attacker));
  }

  /** Legacy attack — used when prefix snapshot couldn't be injected. */
  public static void attack(Object attacker, Object target) {
    if (attacker == null || target == null) { emit("warn", "attack called with null"); return; }
    String a = readName(attacker), t = readName(target);
    if (shouldSuppress("attack:" + a + ":" + t)) return;
    int dmg = readInt(attacker, "attackPower", "attack", "atk", "damage", "power");
    if (dmg < 0) dmg = 10;
    emit("attack", a, t, String.valueOf(dmg), cls(attacker));
  }

  /** Cast — same delta logic as attack, different visual. */
  public static void cast(Object caster, Object target, int preHealth) {
    if (caster == null || target == null) return;
    String c = readName(caster), t = readName(target);
    if (shouldSuppress("cast:" + c + ":" + t)) return;
    int post = readInt(target, "health", "hp", "hitPoints");
    int dmg = Math.max(0, preHealth - post);
    emit("spell", c, t, String.valueOf(dmg));
  }

  public static void cast(Object caster, Object target) {
    if (caster == null || target == null) return;
    String c = readName(caster), t = readName(target);
    if (shouldSuppress("cast:" + c + ":" + t)) return;
    int dmg = readInt(caster, "attackPower", "attack", "atk");
    if (dmg < 0) dmg = 20;
    emit("spell", c, t, String.valueOf(dmg));
  }

  /** Shoot — same delta logic. */
  public static void shoot(Object archer, Object target, int preHealth) {
    if (archer == null || target == null) return;
    String a = readName(archer), t = readName(target);
    if (shouldSuppress("shoot:" + a + ":" + t)) return;
    int post = readInt(target, "health", "hp", "hitPoints");
    int dmg = Math.max(0, preHealth - post);
    emit("shoot", a, t, String.valueOf(dmg));
  }

  public static void shoot(Object archer, Object target) {
    if (archer == null || target == null) return;
    String a = readName(archer), t = readName(target);
    if (shouldSuppress("shoot:" + a + ":" + t)) return;
    int dmg = readInt(archer, "attackPower", "attack", "atk");
    if (dmg < 0) dmg = 15;
    emit("shoot", a, t, String.valueOf(dmg));
  }

  /** Heal — amount is positive delta in target.health. */
  public static void heal(Object healer, Object target, int preHealth) {
    if (target == null) return;
    String h = readName(healer == null ? target : healer), t = readName(target);
    int post = readInt(target, "health", "hp", "hitPoints");
    int amt = Math.max(0, post - preHealth);
    if (shouldSuppress("heal:" + h + ":" + t + ":" + amt)) return;
    emit("heal", h, t, String.valueOf(amt));
  }

  /** Legacy heal — fallback when prefix wasn't injected. */
  public static void heal(Object target, int amount) {
    if (target == null) return;
    String t = readName(target);
    if (shouldSuppress("heal:" + t + ":" + t + ":" + amount)) return;
    emit("heal", t, t, String.valueOf(amount));
  }

  /** Defend — emits ONLY when shielded transitions false→true. The frontend
   *  shows the shield, and this class schedules its own auto-clear so the
   *  reset timer can't race with the dedup window. */
  public static void defend(Object who, boolean preShield) {
    if (who == null) return;
    if (preShield) return;                 // already shielded → no new event
    boolean now = snapshotShield(who);
    if (!now) return;                      // body didn't set the flag
    String n = readName(who);
    if (shouldSuppress("defend:" + n)) return;
    emit("defend", n);
    scheduleShieldReset(who, 3000);
  }

  /** Legacy defend — fallback when prefix wasn't injected. Always emits. */
  public static void defend(Object who) {
    if (who == null) return;
    String n = readName(who);
    if (shouldSuppress("defend:" + n)) return;
    emit("defend", n);
  }

  /** Show a message in the console panel (not a game action). */
  public static void say(String text) {
    if (text == null) text = "";
    emit("say", text);
  }

  /** Mark the start of a named round / phase (purely cosmetic log divider). */
  public static void phase(String label) {
    emit("phase", label == null ? "" : label);
  }

  // ──────────── Shield auto-reset (JVM-side timer) ────────────

  private static final ScheduledExecutorService SHIELD = Executors.newSingleThreadScheduledExecutor(r -> {
    Thread t = new Thread(r, "jq-shield"); t.setDaemon(true); return t;
  });

  private static void scheduleShieldReset(Object who, long ms) {
    SHIELD.schedule(() -> {
      try {
        Field f = findShieldField(who.getClass());
        if (f != null) {
          f.setAccessible(true);
          f.setBoolean(who, false);
        }
        emit("shieldExpired", readName(who));
      } catch (Exception ignore) { /* swallow — shield expiry is best-effort */ }
    }, ms, TimeUnit.MILLISECONDS);
  }

  private static Field findShieldField(Class<?> cls) {
    String[] names = { "shielded", "isDefending", "defending", "isShielded" };
    for (String n : names) {
      Field f = findField(cls, n);
      if (f != null) return f;
    }
    return null;
  }

  // ──────────── REPL (long-running session) ────────────
  //
  // After main() finishes setting up objects (and the auto-injected
  // Arena.summon calls populate REGISTRY), the wrapper appends Arena.repl()
  // as the last line of main(). repl() blocks reading commands from stdin
  // and dispatches them — keypresses in the browser become method calls on
  // the actual student objects, with all the body-level WYSIWYG that comes
  // from running their compiled code.
  //
  // Protocol — one tab-separated command per line:
  //   invoke\t<callerName>\t<methodName>[\t<argName>]
  //   enemyAttack\t<attackerName>\t<targetName>
  //   ping
  //   quit

  public static void repl() {
    emit("ready");
    try (BufferedReader in = new BufferedReader(new InputStreamReader(System.in))) {
      String line;
      while ((line = in.readLine()) != null) {
        if (line.isEmpty()) continue;
        String[] p = line.split("\t");
        try {
          switch (p[0]) {
            case "invoke":
              if (p.length < 3) { emit("warn", "invoke needs caller + method"); break; }
              dispatch(p[1], p[2], p.length > 3 ? p[3] : null);
              break;
            case "enemyAttack":
              if (p.length < 3) { emit("warn", "enemyAttack needs attacker + target"); break; }
              enemyAttack(p[1], p[2]);
              break;
            case "ping":
              emit("pong");
              break;
            case "quit":
              return;
            default:
              emit("warn", "unknown command " + p[0]);
          }
        } catch (Throwable ex) {
          // Reflection wraps the real exception thrown by the student's body
          // in InvocationTargetException — unwrap so the warning shows the
          // actual NPE / class cast / etc.
          Throwable cause = (ex instanceof InvocationTargetException && ex.getCause() != null)
            ? ex.getCause() : ex;
          emit("warn", cause.getClass().getSimpleName() + ": "
            + (cause.getMessage() == null ? "(no message)" : cause.getMessage()));
        }
      }
    } catch (IOException ignore) {
      // stdin closed → exit gracefully
    }
  }

  /** Reflectively invoke caller.method(arg?) on the student's compiled class.
   *  Tolerant of arity mismatch: if the keyboard sent a target but the
   *  student's method takes none (or vice versa), we still find the closest
   *  overload and call it appropriately. This lets `defend()` and
   *  `defend(Warrior)` both work when Q is pressed. */
  private static void dispatch(String callerName, String methodName, String argName) throws Exception {
    Object caller = REGISTRY.get(callerName);
    if (caller == null) { emit("warn", "unknown actor " + callerName); return; }
    Object arg = argName == null ? null : REGISTRY.get(argName);
    if (argName != null && arg == null) {
      emit("warn", "unknown target " + argName);
      return;
    }
    Method m = pickMethod(caller.getClass(), methodName, arg);
    if (m == null) {
      emit("warn", callerName + " has no method named " + methodName
        + ". Combat methods take 0 or 1 parameter (e.g. attack(Warrior t), defend()).");
      return;
    }
    m.setAccessible(true);
    int pc = m.getParameterCount();
    if (pc == 0) m.invoke(caller);
    else if (pc == 1) m.invoke(caller, arg);   // arg may be null if the controller didn't pass one
    else { emit("warn", methodName + " has too many parameters (" + pc + ") to invoke from a keypress"); return; }
  }

  /** Pick a method by name. Prefer the requested arity, then prefer an
   *  exact (assignable) parameter-type match. Fall back to the other arity
   *  so a no-arg keypress still hits a `defend(Warrior)` and an
   *  arg-bearing keypress still hits a `defend()`. */
  private static Method pickMethod(Class<?> cls, String name, Object arg) {
    int wantArity = arg == null ? 0 : 1;
    Method preferredArityBest = null;
    Method otherArityFallback = null;

    for (Method m : cls.getMethods()) {
      if (!m.getName().equals(name)) continue;
      int pc = m.getParameterCount();
      if (pc != 0 && pc != 1) continue;
      if (pc == wantArity) {
        if (pc == 0) return m;                                 // no-arg, perfect
        Class<?> p = m.getParameterTypes()[0];
        if (arg != null && p.isAssignableFrom(arg.getClass())) return m;   // exact-ish
        if (preferredArityBest == null) preferredArityBest = m;
      } else if (otherArityFallback == null) {
        otherArityFallback = m;
      }
    }
    if (preferredArityBest != null) return preferredArityBest;
    if (otherArityFallback != null) return otherArityFallback;

    // Last-ditch: declared methods (catches package-private overrides)
    for (Method m : cls.getDeclaredMethods()) {
      if (!m.getName().equals(name)) continue;
      int pc = m.getParameterCount();
      if (pc == 0 || pc == 1) return m;
    }
    return null;
  }

  /** Bypass student code — guarantees enemies always work. Reads attackPower
   *  off the attacker, halves if the target is currently shielded, applies
   *  the damage directly to target.health, emits a trace. */
  private static void enemyAttack(String aName, String tName) {
    Object a = REGISTRY.get(aName);
    Object t = REGISTRY.get(tName);
    if (a == null || t == null) { emit("warn", "enemyAttack missing actor"); return; }
    int atk = readInt(a, "attackPower", "attack", "atk", "damage", "power");
    if (atk < 0) atk = 10;
    boolean shielded = snapshotShield(t);
    int dmg = shielded ? Math.max(1, atk / 2) : atk;
    int hp = readInt(t, "health", "hp", "hitPoints");
    if (hp >= 0) writeInt(t, Math.max(0, hp - dmg), "health", "hp", "hitPoints");
    emit("enemyAttack", aName, tName, String.valueOf(dmg), shielded ? "1" : "0");
  }
}
