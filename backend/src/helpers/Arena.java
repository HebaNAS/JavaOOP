import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * Arena — the bridge between your Java code and the 3D game world.
 *
 * Every method here does two things:
 *   1. Affects the game world (spawn, move, damage, heal)
 *   2. Prints a ##JQ trace line so the browser can animate it
 *
 * You never need to read or understand this class. Just CALL it:
 *
 *   Warrior hero = new Warrior("Aldric", 100, 25);
 *   Arena.summon(hero);              // makes hero appear on screen
 *   Arena.attack(hero, enemy);       // swings sword, deals damage, plays animation
 */
public class Arena {

  // ──────────── Reflection helpers ────────────

  private static String readName(Object o) {
    if (o == null) return "?";
    String s = readString(o, "name");
    if (s != null) return s;
    s = readString(o, "characterName");
    if (s != null) return s;
    // Fallback: identity hash
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
    // Known classes get animation parity; everything else is "Warrior"
    if (c.equals("Mage") || c.equals("Warrior") || c.equals("Archer") || c.equals("Healer")) return c;
    // Walk up parents
    Class<?> p = o.getClass().getSuperclass();
    while (p != null && p != Object.class) {
      String s = p.getSimpleName();
      if (s.equals("Mage") || s.equals("Warrior") || s.equals("Archer") || s.equals("Healer")) return s;
      p = p.getSuperclass();
    }
    return "Warrior";
  }

  // ──────────── Idempotency / dedup ────────────
  //
  // The backend auto-injects Arena.* calls at the end of every student
  // method. When a subclass method calls super.method(), the super's
  // injected Arena call fires first, then the override's injection
  // fires — we'd get the same animation twice. This dedup layer swallows
  // exact-match emissions that come back-to-back within a short window.

  private static final Set<Integer> SUMMONED = new HashSet<>();
  private static final Map<String, Long> LAST_EMIT = new HashMap<>();
  private static final long DEDUP_WINDOW_NS = 50_000_000L; // 50 ms

  private static boolean shouldSuppress(String key) {
    long now = System.nanoTime();
    Long last = LAST_EMIT.get(key);
    LAST_EMIT.put(key, now);
    return last != null && (now - last) < DEDUP_WINDOW_NS;
  }

  // ──────────── Trace emission ────────────

  private static void emit(String... parts) {
    StringBuilder sb = new StringBuilder("##JQ");
    for (String p : parts) { sb.append('\t').append(p == null ? "" : p); }
    System.out.println(sb.toString());
  }

  // ──────────── Public API ────────────

  /** Spawn a character on the arena. Reads name/health/attackPower from the object.
   *  Idempotent per object — calling repeatedly for the same instance is a no-op. */
  public static void summon(Object obj) {
    if (obj == null) { emit("warn", "summon called with null"); return; }
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
    emit("spawn", name, kind,
      String.valueOf(hp), String.valueOf(atk),
      String.valueOf(Math.max(0, mana)), String.valueOf(Math.max(0, def)),
      String.valueOf(Math.max(0, arrows)));
  }

  /** Move a character to a tile. */
  public static void move(Object who, int col, int row) {
    if (who == null) return;
    String name = readName(who);
    if (shouldSuppress("move:" + name + ":" + col + ":" + row)) return;
    emit("move", name, String.valueOf(col), String.valueOf(row));
  }

  /** Attack: play animation. Injection runs AFTER the student's body so
   *  target.health has already been updated; we emit the damage delta. */
  public static void attack(Object attacker, Object target) {
    if (attacker == null || target == null) { emit("warn", "attack called with null"); return; }
    String a = readName(attacker), t = readName(target);
    if (shouldSuppress("attack:" + a + ":" + t)) return;
    int dmg = readInt(attacker, "attackPower", "attack", "atk", "damage", "power");
    if (dmg < 0) dmg = 10;
    emit("attack", a, t, String.valueOf(dmg), cls(attacker));
  }

  /** Cast a spell on a target (mage-style). */
  public static void cast(Object caster, Object target) {
    if (caster == null || target == null) return;
    String c = readName(caster), t = readName(target);
    if (shouldSuppress("cast:" + c + ":" + t)) return;
    int dmg = readInt(caster, "attackPower", "attack", "atk");
    if (dmg < 0) dmg = 20;
    emit("spell", c, t, String.valueOf(dmg));
  }

  /** Shoot an arrow at a target (archer-style). */
  public static void shoot(Object archer, Object target) {
    if (archer == null || target == null) return;
    String a = readName(archer), t = readName(target);
    if (shouldSuppress("shoot:" + a + ":" + t)) return;
    int dmg = readInt(archer, "attackPower", "attack", "atk");
    if (dmg < 0) dmg = 15;
    emit("shoot", a, t, String.valueOf(dmg));
  }

  /** Heal a target by `amount`. */
  public static void heal(Object healer, Object target, int amount) {
    if (target == null) return;
    String h = readName(healer == null ? target : healer), t = readName(target);
    if (shouldSuppress("heal:" + h + ":" + t + ":" + amount)) return;
    emit("heal", h, t, String.valueOf(amount));
  }

  /** Heal self. */
  public static void heal(Object target, int amount) { heal(target, target, amount); }

  /** Raise a shield (halves incoming damage for a few seconds). */
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
}
