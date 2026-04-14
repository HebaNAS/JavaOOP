import java.lang.reflect.Field;

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

  // ──────────── Trace emission ────────────

  private static void emit(String... parts) {
    StringBuilder sb = new StringBuilder("##JQ");
    for (String p : parts) { sb.append('\t').append(p == null ? "" : p); }
    System.out.println(sb.toString());
  }

  // ──────────── Public API ────────────

  /** Spawn a character on the arena. Reads name/health/attackPower from the object. */
  public static void summon(Object obj) {
    if (obj == null) { emit("warn", "summon called with null"); return; }
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
    emit("move", readName(who), String.valueOf(col), String.valueOf(row));
  }

  /** Attack: play animation and subtract attacker.attackPower from target.health. */
  public static void attack(Object attacker, Object target) {
    if (attacker == null || target == null) { emit("warn", "attack called with null"); return; }
    int dmg = readInt(attacker, "attackPower", "attack", "atk", "damage", "power");
    if (dmg < 0) dmg = 10;
    int hp = readInt(target, "health", "hp");
    if (hp >= 0) writeInt(target, Math.max(0, hp - dmg), "health", "hp");
    emit("attack", readName(attacker), readName(target), String.valueOf(dmg), cls(attacker));
  }

  /** Cast a spell on a target (mage-style). */
  public static void cast(Object caster, Object target) {
    if (caster == null || target == null) return;
    int dmg = readInt(caster, "attackPower", "attack", "atk");
    if (dmg < 0) dmg = 20;
    int hp = readInt(target, "health", "hp");
    if (hp >= 0) writeInt(target, Math.max(0, hp - dmg), "health", "hp");
    emit("spell", readName(caster), readName(target), String.valueOf(dmg));
  }

  /** Shoot an arrow at a target (archer-style). */
  public static void shoot(Object archer, Object target) {
    if (archer == null || target == null) return;
    int dmg = readInt(archer, "attackPower", "attack", "atk");
    if (dmg < 0) dmg = 15;
    int hp = readInt(target, "health", "hp");
    if (hp >= 0) writeInt(target, Math.max(0, hp - dmg), "health", "hp");
    emit("shoot", readName(archer), readName(target), String.valueOf(dmg));
  }

  /** Heal a target by `amount`. */
  public static void heal(Object healer, Object target, int amount) {
    if (target == null) return;
    int hp = readInt(target, "health", "hp");
    int max = readInt(target, "maxHealth", "maxHp");
    if (max < 0) max = hp + amount; // no cap known
    if (hp >= 0) writeInt(target, Math.min(max, hp + amount), "health", "hp");
    emit("heal", readName(healer == null ? target : healer), readName(target), String.valueOf(amount));
  }

  /** Heal self. */
  public static void heal(Object target, int amount) { heal(target, target, amount); }

  /** Raise a shield (halves incoming damage for a few seconds). */
  public static void defend(Object who) {
    if (who == null) return;
    emit("defend", readName(who));
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
