import { ParseResult } from '../parser/JavaParser'

export interface Chapter {
  id: number
  title: string
  concept: string
  description: string
  hints: [string, string, string]
  starter: string
  validate: (p: ParseResult) => { pass: boolean; msg: string }
}

export const CHAPTERS: Chapter[] = [
  // ─── CHAPTER 1: Classes & Attributes ───
  {
    id: 1, title: 'Chapter 1: The Blueprint', concept: 'Classes & Attributes',
    description: 'Every warrior begins as an idea — a CLASS. Define a Warrior class with three attributes: name (String), health (int), and attackPower (int).',
    hints: [
      'Think of a class like an architect\'s blueprint. What properties does every warrior share? A name, vitality, and combat strength.',
      'A class is declared with \'class ClassName { }\'. Inside, list each property with its type first, then its name, ending with a semicolon.',
      'You need three lines inside the class. Text values use String, whole numbers use int. Each attribute: type name;',
    ],
    starter: '// A class is a blueprint for creating warriors\n// Define: name (String), health (int), attackPower (int)\n\nclass Warrior {\n    \n}',
    validate(p) {
      const c = p.classes.find((c) => c.name === 'Warrior')
      if (!c) return { pass: false, msg: "Create a class called 'Warrior'" }
      const n = c.attrs.map((a) => a.name)
      if (!n.includes('name')) return { pass: false, msg: "Add a 'name' attribute (String)" }
      if (!n.includes('health')) return { pass: false, msg: "Add a 'health' attribute (int)" }
      if (!n.includes('attackPower')) return { pass: false, msg: "Add an 'attackPower' attribute (int)" }
      return { pass: true, msg: 'Blueprint forged! Your Warrior class is ready.' }
    },
  },

  // ─── CHAPTER 2: Constructors ───
  {
    id: 2, title: 'Chapter 2: The Constructor', concept: 'Constructors',
    description: 'A constructor runs when a warrior is born. It takes parameters and uses \'this\' to assign them to the object\'s fields. Add a constructor to Warrior.',
    hints: [
      'A constructor is like a birth certificate — it runs once when an object is created and sets up its initial state. It has the same name as the class.',
      'Declared inside the class: ClassName(parameters) { body }. Use \'this.fieldName = parameterName\' for each value.',
      'Your constructor needs: String name, int health, int attackPower. In the body, use this.name = name, etc.',
    ],
    starter: 'class Warrior {\n    String name;\n    int health;\n    int attackPower;\n\n    // Add a constructor: Warrior(String name, int health, int attackPower)\n    // Use this.field = param to assign each one\n    \n}',
    validate(p) {
      const c = p.classes.find((c) => c.name === 'Warrior')
      if (!c) return { pass: false, msg: 'Keep your Warrior class!' }
      if (!c.ctor) return { pass: false, msg: 'Add a constructor: Warrior(parameters) { assignments }' }
      if (c.ctor.fieldMap.name === undefined) return { pass: false, msg: "Use 'this.name = name' inside the constructor" }
      if (c.ctor.fieldMap.health === undefined) return { pass: false, msg: "Use 'this.health = health' inside the constructor" }
      if (c.ctor.fieldMap.attackPower === undefined) return { pass: false, msg: "Use 'this.attackPower = attackPower'" }
      return { pass: true, msg: 'Constructor forged! Warriors can now be born with unique stats!' }
    },
  },

  // ─── CHAPTER 3: Objects ───
  {
    id: 3, title: 'Chapter 3: Summoning Warriors', concept: 'Objects — Instances',
    description: 'A class alone does nothing — you need OBJECTS. Use \'new\' to create two warriors. Give them your own names and stats!',
    hints: [
      'You\'ve built the blueprint. Now stamp out real warriors from it. Each one is an independent copy with its own stats.',
      'The \'new\' keyword creates an instance: ClassName varName = new ClassName(arg1, arg2, arg3);',
      'Create two warriors with different values. The first argument becomes their name in the arena!',
    ],
    starter: 'class Warrior {\n    String name;\n    int health;\n    int attackPower;\n\n    Warrior(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n}\n\n// Create TWO Warrior objects with your own names and stats!\n// Then call Arena.summon(obj) to make each one appear in the 3D world.\n//\n// Example:\n//   Warrior hero = new Warrior("Aldric", 100, 25);\n//   Arena.summon(hero);\n',
    validate(p) {
      const c = p.classes.find((c) => c.name === 'Warrior')
      if (!c) return { pass: false, msg: 'Keep your Warrior class!' }
      const ws = p.objects.filter((o) => o.className === 'Warrior')
      if (ws.length < 1) return { pass: false, msg: "Create a Warrior object using 'new'" }
      if (ws.length < 2) return { pass: false, msg: 'Good! Now create a second warrior with different stats.' }
      return { pass: true, msg: 'Two warriors materialise in the arena!' }
    },
  },

  // ─── CHAPTER 4: Methods ───
  {
    id: 4, title: 'Chapter 4: Battle Cry', concept: 'Methods — Behaviour',
    description: 'Warriors need abilities! Add attack(Warrior target) that reduces the target\'s health by attackPower, and defend() that activates a protective shield. Then call both! Enemies will fight back — use defend to halve incoming damage!',
    hints: [
      'Methods are the verbs of a class — they define what an object can DO. attack() hurts an enemy, defend() protects yourself. Think: what changes when you attack? The target loses health equal to your power.',
      'Declared inside the class: public void methodName(parameters) { body }. attack should subtract attackPower from target.health. defend doesn\'t need parameters — it activates a shield state.',
      'attack(Warrior target): put "target.health = target.health - this.attackPower;" in the body. defend(): the game engine activates a shield when this method exists — the body can print a message or set a flag.',
    ],
    starter: 'class Warrior {\n    String name;\n    int health;\n    int attackPower;\n    int x;   // column on the map\n    int y;   // row on the map\n\n    Warrior(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n\n    // attack(target): reduce target.health AND tell the arena to animate\n    public void attack(Warrior target) {\n        target.health = target.health - this.attackPower;\n        Arena.attack(this, target);   // plays the animation in 3D\n    }\n\n    // defend: activate a shield\n    public void defend() {\n        Arena.defend(this);\n    }\n\n    // Movement — WASD / arrow keys bind to these at runtime\n    public void moveUp()    { this.y -= 1; Arena.move(this, this.x, this.y); }\n    public void moveDown()  { this.y += 1; Arena.move(this, this.x, this.y); }\n    public void moveLeft()  { this.x -= 1; Arena.move(this, this.x, this.y); }\n    public void moveRight() { this.x += 1; Arena.move(this, this.x, this.y); }\n}\n\nWarrior hero = new Warrior("Aldric", 100, 25);\nWarrior enemy = new Warrior("Grok", 80, 20);\nArena.summon(hero);\nArena.summon(enemy);\n\n// Now call attack and defend!\nhero.attack(enemy);\nhero.defend();\n',
    validate(p) {
      const c = p.classes.find((c) => c.name === 'Warrior')
      if (!c) return { pass: false, msg: 'Keep your Warrior class!' }
      if (!c.methods.find((m) => m.name === 'attack')) return { pass: false, msg: 'Add an attack(Warrior target) method' }
      if (!c.methods.find((m) => m.name === 'defend')) return { pass: false, msg: 'Add a defend() method' }
      if (!p.calls.find((c) => c.method === 'attack')) return { pass: false, msg: 'Call attack! e.g. hero.attack(enemy);' }
      if (!p.calls.find((c) => c.method === 'defend')) return { pass: false, msg: 'Call defend! e.g. hero.defend();' }
      return { pass: true, msg: 'Battle engaged! Your warriors fight with the exact power you gave them!' }
    },
  },

  // ─── CHAPTER 5: Encapsulation ───
  {
    id: 5, title: 'Chapter 5: Guarded Secrets', concept: 'Encapsulation',
    description: 'Enemies can\'t just change your health! Make all attributes \'private\', add getHealth() and setHealth(int h). Then use setHealth() to buff a warrior!',
    hints: [
      'Encapsulation is about protection. The \'private\' keyword restricts direct access from outside the class.',
      'Put \'private\' before each attribute. Create getter (returns value) and setter (changes value with validation).',
      'Make fields private. Add getHealth() returning health and setHealth(int h) setting it. Call setHealth() on a warrior!',
    ],
    starter: 'class Warrior {\n    String name;\n    int health;\n    int attackPower;\n\n    Warrior(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n\n    // 1. Make ALL attributes private\n    // 2. Add getHealth() and setHealth(int h)\n\n    public void attack(Warrior target) {\n        target.health = target.health - this.attackPower;\n        Arena.attack(this, target);\n    }\n    public void defend() {\n        Arena.defend(this);\n    }\n}\n\nWarrior hero = new Warrior("Aldric", 100, 25);\nArena.summon(hero);\n// Use setHealth to buff your hero!\n',
    validate(p) {
      const c = p.classes.find((c) => c.name === 'Warrior')
      if (!c) return { pass: false, msg: 'Keep your Warrior class!' }
      const priv = c.attrs.filter((a) => a.access === 'private')
      if (priv.length < 3) return { pass: false, msg: `Make ALL attributes private (${priv.length}/3 so far)` }
      if (!c.methods.find((m) => m.name === 'getHealth')) return { pass: false, msg: 'Add a getHealth() method' }
      if (!c.methods.find((m) => m.name === 'setHealth')) return { pass: false, msg: 'Add a setHealth(int h) method' }
      if (!p.calls.find((c) => c.method === 'setHealth')) return { pass: false, msg: 'Call setHealth() on a warrior!' }
      return { pass: true, msg: 'Data protected! Your warriors are safely encapsulated!' }
    },
  },

  // ─── CHAPTER 6: Inheritance ───
  {
    id: 6, title: 'Chapter 6: Arcane Power', concept: 'Inheritance — extends',
    description: 'A Mage inherits everything from Warrior but adds mana and castSpell(). Create a Mage class that EXTENDS Warrior!',
    hints: [
      'A Mage IS a Warrior with extra powers. Inheritance builds on existing classes without rewriting everything.',
      'Use \'extends\': class ChildClass extends ParentClass { new stuff }. The child only declares what\'s NEW.',
      'Create class Mage extends Warrior with int mana and castSpell method. Add a constructor and create a Mage object!',
    ],
    starter: 'class Warrior {\n    String name;\n    int health;\n    int attackPower;\n\n    Warrior(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n\n    public void attack(Warrior target) {\n        target.health = target.health - this.attackPower;\n        Arena.attack(this, target);\n    }\n    public void defend() {\n        Arena.defend(this);\n    }\n}\n\n// Create: class Mage extends Warrior\n//   Include: int mana, castSpell(Warrior t) that calls Arena.cast(this, t)\n\nWarrior hero = new Warrior("Aldric", 100, 25);\nArena.summon(hero);\n// Create a Mage object and summon it too!\n',
    validate(p) {
      const mg = p.classes.find((c) => c.name === 'Mage')
      if (!mg) return { pass: false, msg: "Create a class called 'Mage'" }
      if (mg.parent !== 'Warrior') return { pass: false, msg: 'Mage should extend Warrior' }
      if (!mg.attrs.find((a) => a.name === 'mana')) return { pass: false, msg: "Add 'mana' (int) to Mage" }
      if (!mg.methods.find((m) => m.name === 'castSpell')) return { pass: false, msg: 'Add a castSpell() method' }
      if (!p.objects.find((o) => o.className === 'Mage')) return { pass: false, msg: 'Create a Mage object!' }
      return { pass: true, msg: 'A Mage materialises! Inheritance unlocked!' }
    },
  },

  // ─── CHAPTER 7: Polymorphism ───
  {
    id: 7, title: 'Chapter 7: Many Forms', concept: 'Polymorphism — Override',
    description: 'Override attack() in Mage so it behaves differently. Call attack() on both a Warrior and Mage to see polymorphism!',
    hints: [
      'Polymorphism means \'many forms\'. Same method call, different behavior depending on the object\'s class.',
      'Write the same method signature in the child class to override the parent\'s version.',
      'Define attack() again inside Mage with the same signature. Create both types and call attack() on each.',
    ],
    starter: 'class Warrior {\n    String name;\n    int health;\n    int attackPower;\n\n    Warrior(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n\n    public void attack(Warrior target) {\n        target.health = target.health - this.attackPower;\n        Arena.attack(this, target);\n    }\n    public void defend() {\n        Arena.defend(this);\n    }\n}\n\nclass Mage extends Warrior {\n    int mana;\n\n    Mage(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n\n    // Override attack() — make it magical! Try Arena.cast(this, target).\n\n    public void castSpell(Warrior target) {\n        target.health = target.health - this.attackPower;\n        Arena.cast(this, target);\n    }\n}\n\nWarrior hero = new Warrior("Aldric", 100, 25);\nMage wizard = new Mage("Elara", 80, 35);\nWarrior enemy = new Warrior("Grok", 120, 20);\nArena.summon(hero);\nArena.summon(wizard);\nArena.summon(enemy);\n\n// Call attack() on BOTH hero and wizard!\n',
    validate(p) {
      const mg = p.classes.find((c) => c.name === 'Mage')
      if (!mg) return { pass: false, msg: 'Keep the Mage class' }
      if (!mg.methods.find((m) => m.name === 'attack')) return { pass: false, msg: 'Override attack() inside Mage' }
      const calls = p.calls.filter((c) => c.method === 'attack')
      const callers = calls.map((c) => c.obj)
      const wAtk = p.objects.some((o) => o.className === 'Warrior' && callers.includes(o.name))
      const mAtk = p.objects.some((o) => o.className === 'Mage' && callers.includes(o.name))
      if (!wAtk || !mAtk) return { pass: false, msg: 'Call attack() on both a Warrior AND a Mage' }
      return { pass: true, msg: 'Polymorphism! Sword slash vs magic blast — same method, different power!' }
    },
  },

  // ─── CHAPTER 8: The Archer ───
  {
    id: 8, title: 'Chapter 8: The Ranger', concept: 'Subclass Hierarchy',
    description: 'Create an Archer class extending Warrior with arrowCount and shoot(). Summon an Archer and shoot an enemy!',
    hints: [
      'Not all heroes fight up close. An Archer strikes from distance with arrows.',
      'Same extends pattern. Think about what makes an archer unique — ammunition that can run out.',
      'Archer extends Warrior with int arrowCount and shoot(Warrior target). Create the object and call shoot()!',
    ],
    starter: 'class Warrior {\n    String name;\n    int health;\n    int attackPower;\n\n    Warrior(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n\n    public void attack(Warrior target) {\n        target.health = target.health - this.attackPower;\n        Arena.attack(this, target);\n    }\n}\n\nclass Mage extends Warrior {\n    int mana;\n    Mage(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n    public void castSpell(Warrior target) {\n        target.health = target.health - this.attackPower;\n        Arena.cast(this, target);\n    }\n}\n\n// Create: class Archer extends Warrior\n//   int arrowCount; shoot(Warrior t) { ... Arena.shoot(this, t); }\n\nWarrior hero = new Warrior("Aldric", 100, 25);\nMage wizard = new Mage("Elara", 80, 35);\nArena.summon(hero);\nArena.summon(wizard);\n// Create an Archer, summon it, and shoot!\n',
    validate(p) {
      const ar = p.classes.find((c) => c.name === 'Archer')
      if (!ar) return { pass: false, msg: "Create a class called 'Archer'" }
      if (ar.parent !== 'Warrior') return { pass: false, msg: 'Archer should extend Warrior' }
      if (!ar.attrs.find((a) => a.name === 'arrowCount' || a.name === 'arrows')) return { pass: false, msg: 'Add arrowCount (int) to Archer' }
      if (!ar.methods.find((m) => m.name === 'shoot')) return { pass: false, msg: 'Add a shoot() method' }
      if (!p.objects.find((o) => o.className === 'Archer')) return { pass: false, msg: 'Create an Archer object!' }
      if (!p.calls.find((c) => c.method === 'shoot')) return { pass: false, msg: 'Call shoot() on your Archer!' }
      return { pass: true, msg: 'Arrow flies true! Warrior, Mage, and Archer — the hierarchy grows!' }
    },
  },

  // ─── CHAPTER 9: Abstract & Interfaces ───
  {
    id: 9, title: 'Chapter 9: Sacred Contracts', concept: 'Abstract & Interfaces',
    description: 'Make GameCharacter abstract with abstract specialAbility(). Create interface Healable with heal(). Make Mage implement both!',
    hints: [
      'Some blueprints should never be built directly. Abstract classes are templates that children MUST complete.',
      '\'abstract\' on a class prevents instantiation. Abstract methods have no body. \'interface\' is a contract.',
      'Declare abstract class GameCharacter with abstract specialAbility(). Interface Healable with heal(int). Mage extends + implements both.',
    ],
    starter: '// Create: abstract class GameCharacter\n//   String name, int health, int attackPower\n//   constructor, attack method\n//   abstract void specialAbility()\n\n// Create: interface Healable { void heal(int amount); }\n\n// Mage extends GameCharacter implements Healable\n// Must override specialAbility() and heal()\n\n// Create a Mage and call both methods!\n',
    validate(p) {
      const gc = p.classes.find((c) => c.name === 'GameCharacter')
      if (!gc) return { pass: false, msg: "Create an abstract class 'GameCharacter'" }
      if (!gc.isAbstract) return { pass: false, msg: 'GameCharacter should be abstract' }
      if (!gc.methods.find((m) => m.name === 'specialAbility' && m.isAbstract)) return { pass: false, msg: 'Add: abstract void specialAbility();' }
      const hi = p.interfaces.find((i) => i.name === 'Healable')
      if (!hi) return { pass: false, msg: "Create interface 'Healable'" }
      if (!hi.methods.find((m) => m.name === 'heal')) return { pass: false, msg: 'Add heal() to Healable' }
      const mg = p.classes.find((c) => c.name === 'Mage')
      if (!mg) return { pass: false, msg: 'Create a Mage class' }
      if (!mg.methods.find((m) => m.name === 'specialAbility')) return { pass: false, msg: 'Mage must implement specialAbility()' }
      if (!mg.methods.find((m) => m.name === 'heal')) return { pass: false, msg: 'Mage must implement heal()' }
      if (!p.objects.find((o) => o.className === 'Mage')) return { pass: false, msg: 'Create a Mage object!' }
      return { pass: true, msg: 'Contracts fulfilled! Abstract classes and interfaces mastered!' }
    },
  },

  // ─── CHAPTER 10: Collections ───
  {
    id: 10, title: 'Chapter 10: The Grand Battle', concept: 'Collections — ArrayList',
    description: 'Assemble your party! Create ArrayList<Warrior> party, add 3+ heroes, use for-each to make everyone attack the boss!',
    hints: [
      'Managing heroes one by one is tedious. Collections group them so you can command everyone at once.',
      'ArrayList stores objects in order. Use .add() to insert, for-each to iterate without needing an index.',
      'Declare ArrayList<Warrior> party = new ArrayList<>(); Use party.add(hero). Loop: for (Warrior w : party) { w.attack(boss); }',
    ],
    starter: 'class Warrior {\n    String name;\n    int health;\n    int attackPower;\n    Warrior(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n    public void attack(Warrior target) {\n        target.health = target.health - this.attackPower;\n    }\n}\n\nclass Mage extends Warrior {\n    int mana;\n    Mage(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n    public void attack(Warrior target) {\n        target.health = target.health - this.attackPower;\n    }\n    public void castSpell(Warrior target) {\n        target.health = target.health - this.attackPower;\n    }\n}\n\nclass Archer extends Warrior {\n    int arrowCount;\n    Archer(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n    public void shoot(Warrior target) {\n        target.health = target.health - this.attackPower;\n    }\n}\n\nWarrior tank = new Warrior("Bron", 150, 20);\nMage wizard = new Mage("Elara", 80, 35);\nArcher ranger = new Archer("Swift", 70, 30);\nWarrior boss = new Warrior("Dreadlord", 200, 40);\nArena.summon(tank);\nArena.summon(wizard);\nArena.summon(ranger);\nArena.summon(boss);\n\n// Create ArrayList, add heroes, for-each attack the boss!\n// Hint: inside the loop call Arena.attack(w, boss) so each swing animates.\n',
    validate(p) {
      const l = p.collections.find((c) => c.name === 'party')
      if (!l) return { pass: false, msg: 'Create: ArrayList<Warrior> party = new ArrayList<>();' }
      const adds = p.calls.filter((c) => c.obj === 'party' && c.method === 'add')
      if (adds.length < 3) return { pass: false, msg: `Add at least 3 heroes (${adds.length} so far)` }
      const loop = p.calls.find((c) => c.isLoop && c.coll === 'party')
      if (!loop) return { pass: false, msg: 'Use for-each: for (Warrior w : party) { w.attack(...); }' }
      return { pass: true, msg: 'VICTORY! The party attacks in unison — Collections mastered!' }
    },
  },

  // ─── CHAPTER 11: Method Overloading ───
  {
    id: 11, title: 'Chapter 11: Double Strike', concept: 'Method Overloading',
    description: 'Overloading lets you create multiple methods with the same name but different parameters. Add two attack methods: attack(Warrior target) and attack(Warrior target, int bonus). Call both!',
    hints: [
      'What if a warrior could attack normally OR with a power boost? Same action name, but different inputs change the behavior.',
      'Overloading means same method name, different parameter lists. The compiler picks which one to call based on the arguments you provide.',
      'Add attack(Warrior target) AND attack(Warrior target, int bonus) with different bodies. Call one with just a target and the other with target + bonus number.',
    ],
    starter: 'class Warrior {\n    String name;\n    int health;\n    int attackPower;\n\n    Warrior(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n\n    // Add attack(Warrior target)\n    // Add attack(Warrior target, int bonus) — overloaded!\n    \n}\n\nWarrior hero = new Warrior("Aldric", 100, 25);\nWarrior enemy = new Warrior("Grok", 120, 20);\n\n// Call both: hero.attack(enemy); and hero.attack(enemy, 10);\n',
    validate(p) {
      const c = p.classes.find((c) => c.name === 'Warrior')
      if (!c) return { pass: false, msg: 'Keep your Warrior class!' }
      const attackMethods = c.methods.filter((m) => m.name === 'attack')
      if (attackMethods.length < 2) return { pass: false, msg: `Need 2 attack() methods with different parameters (${attackMethods.length} so far)` }
      const calls = p.calls.filter((c) => c.method === 'attack')
      if (calls.length < 2) return { pass: false, msg: 'Call both versions of attack()!' }
      return { pass: true, msg: 'Double strike! Method overloading mastered — same name, different power!' }
    },
  },

  // ─── CHAPTER 12: Static Members ───
  {
    id: 12, title: 'Chapter 12: The War Council', concept: 'Static Members',
    description: 'Static fields belong to the CLASS, not individual objects. Add a static int count to Warrior that tracks how many warriors exist. Add a static method getCount(). Create 3 warriors!',
    hints: [
      'Some things belong to the entire army, not individual soldiers. How many warriors exist? That\'s shared knowledge — a class-level concern.',
      'The \'static\' keyword makes a field or method belong to the class itself. Access with ClassName.field instead of object.field.',
      'Add "static int count" to Warrior. In the constructor, increment it. Add "public static int getCount()" that returns count. Create 3 warriors.',
    ],
    starter: 'class Warrior {\n    String name;\n    int health;\n    int attackPower;\n    // Add: static int count\n\n    Warrior(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n        // Increment count here\n    }\n\n    // Add: public static int getCount()\n\n    public void attack(Warrior target) {\n        target.health = target.health - this.attackPower;\n    }\n}\n\n// Create 3 warriors and check the count!\n',
    validate(p) {
      const c = p.classes.find((c) => c.name === 'Warrior')
      if (!c) return { pass: false, msg: 'Keep your Warrior class!' }
      const countAttr = c.attrs.find((a) => a.name === 'count')
      if (!countAttr) return { pass: false, msg: 'Add a static int count to Warrior' }
      const getCount = c.methods.find((m) => m.name === 'getCount')
      if (!getCount) return { pass: false, msg: 'Add a static getCount() method' }
      const warriors = p.objects.filter((o) => o.className === 'Warrior')
      if (warriors.length < 3) return { pass: false, msg: `Create 3 warriors (${warriors.length} so far)` }
      return { pass: true, msg: 'The War Council convenes! Static members track the entire army!' }
    },
  },

  // ─── CHAPTER 13: Composition ───
  {
    id: 13, title: 'Chapter 13: Weapon Forge', concept: 'Composition — Has-A',
    description: 'Composition means a class HAS another class. Create a Weapon class with name and damage. Give Warrior a Weapon attribute. Create warriors with specific weapons!',
    hints: [
      'Inheritance is "is-a" (a Mage IS a Warrior). Composition is "has-a" (a Warrior HAS a Weapon). Objects containing other objects — building complex things from simple parts.',
      'Define a Weapon class with its own attributes. Then in Warrior, add an attribute of type Weapon. This creates a has-a relationship.',
      'Create class Weapon with String name and int damage. Add "Weapon weapon" to Warrior. Create Weapon objects first, then pass them when creating Warriors.',
    ],
    starter: '// Create: class Weapon { String name; int damage; constructor }\n\nclass Warrior {\n    String name;\n    int health;\n    int attackPower;\n    // Add: Weapon weapon\n\n    Warrior(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n\n    public void attack(Warrior target) {\n        target.health = target.health - this.attackPower;\n    }\n}\n\n// Create weapons, then warriors with those weapons!\n',
    validate(p) {
      const weapon = p.classes.find((c) => c.name === 'Weapon')
      if (!weapon) return { pass: false, msg: 'Create a Weapon class' }
      if (!weapon.attrs.find((a) => a.name === 'name')) return { pass: false, msg: 'Weapon needs a name attribute' }
      if (!weapon.attrs.find((a) => a.name === 'damage')) return { pass: false, msg: 'Weapon needs a damage attribute' }
      const warrior = p.classes.find((c) => c.name === 'Warrior')
      if (!warrior) return { pass: false, msg: 'Keep your Warrior class!' }
      const hasWeapon = warrior.attrs.find((a) => a.name === 'weapon')
      if (!hasWeapon) return { pass: false, msg: 'Add a Weapon attribute to Warrior' }
      if (p.objects.filter((o) => o.className === 'Weapon').length < 1) return { pass: false, msg: 'Create at least one Weapon object' }
      if (p.objects.filter((o) => o.className === 'Warrior').length < 1) return { pass: false, msg: 'Create a Warrior with a weapon!' }
      return { pass: true, msg: 'The forge blazes! Composition — warriors wield unique weapons!' }
    },
  },

  // ─── CHAPTER 14: Type Casting ───
  {
    id: 14, title: 'Chapter 14: Shapeshifter', concept: 'Type Casting & instanceof',
    description: 'A Mage stored as a Warrior variable can be cast back. Create a Warrior variable holding a Mage, then cast it and call castSpell(). Demonstrate polymorphic assignment!',
    hints: [
      'A child object can be stored in a parent variable — that\'s upcasting. But to access child-specific methods, you need to cast it back — that\'s downcasting.',
      'Warrior w = new Mage(...) is valid because Mage IS a Warrior. To call castSpell(), you need: ((Mage)w).castSpell(target)',
      'Create: Warrior disguised = new Mage("Elara", 80, 35); Then call a Warrior method on it AND cast it to call castSpell.',
    ],
    starter: 'class Warrior {\n    String name;\n    int health;\n    int attackPower;\n\n    Warrior(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n\n    public void attack(Warrior target) {\n        target.health = target.health - this.attackPower;\n    }\n}\n\nclass Mage extends Warrior {\n    int mana;\n\n    Mage(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n\n    public void attack(Warrior target) {\n        target.health = target.health - this.attackPower;\n    }\n\n    public void castSpell(Warrior target) {\n        target.health = target.health - this.attackPower;\n    }\n}\n\n// Create: Warrior disguised = new Mage("Elara", 80, 35);\nWarrior enemy = new Warrior("Grok", 120, 20);\n\n// Call attack on disguised, then castSpell!\n',
    validate(p) {
      // Check for a Warrior-typed variable holding a Mage
      const polyObj = p.objects.find((o) => o.type === 'Warrior' && o.className === 'Mage')
      if (!polyObj) return { pass: false, msg: 'Create: Warrior varName = new Mage(...); — store a Mage in a Warrior variable' }
      const atkCall = p.calls.find((c) => c.obj === polyObj.name && c.method === 'attack')
      if (!atkCall) return { pass: false, msg: `Call attack() on ${polyObj.name}` }
      const spellCall = p.calls.find((c) => c.method === 'castSpell')
      if (!spellCall) return { pass: false, msg: 'Cast the spell! Call castSpell() after downcasting' }
      return { pass: true, msg: 'Shapeshifter revealed! Type casting lets you unlock hidden powers!' }
    },
  },

  // ─── CHAPTER 15: Final Boss ───
  {
    id: 15, title: 'Chapter 15: The Final Boss', concept: 'Full OOP Battle',
    description: 'Put EVERYTHING together! Define a class hierarchy (Warrior, Mage, Archer, Healer), create an ArrayList party, give everyone unique names and stats, heal your team, and defeat the boss with a coordinated attack!',
    hints: [
      'This is the ultimate challenge. You need classes, inheritance, objects with unique names, collections, healing, and combat. Plan your party composition wisely!',
      'Create at least 4 classes in a hierarchy. Build an ArrayList, add your heroes. Use heal() to prepare, then for-each to attack the boss as a team.',
      'Define Warrior, Mage (extends), Archer (extends), and Healer (extends). Create unique heroes, add to ArrayList<Warrior> party. Heal first, then for-each loop to attack the boss.',
    ],
    starter: '// Define your class hierarchy:\n// Warrior (base), Mage, Archer, Healer (all extend Warrior)\n// Each with unique methods: castSpell, shoot, heal\n\n// Create your heroes with UNIQUE names and stats\n// Build an ArrayList<Warrior> party\n// Add everyone to the party\n// Heal your team, then for-each attack the boss!\n\n// THE BOSS: Warrior boss = new Warrior("Dreadlord", 300, 50);\n// Can your party defeat it?\n',
    validate(p) {
      const classes = p.classes.map((c) => c.name)
      if (!classes.includes('Warrior')) return { pass: false, msg: 'Define a Warrior class' }
      const subclasses = p.classes.filter((c) => c.parent === 'Warrior' || p.inheritance[c.name])
      if (subclasses.length < 2) return { pass: false, msg: `Need at least 2 subclasses (${subclasses.length} so far)` }
      if (p.objects.length < 4) return { pass: false, msg: `Create at least 4 characters (${p.objects.length} so far)` }
      const party = p.collections.find((c) => c.name === 'party')
      if (!party) return { pass: false, msg: 'Create ArrayList<Warrior> party' }
      const adds = p.calls.filter((c) => c.obj === 'party' && c.method === 'add')
      if (adds.length < 3) return { pass: false, msg: `Add at least 3 heroes to party (${adds.length} so far)` }
      const loop = p.calls.find((c) => c.isLoop && c.coll === 'party')
      if (!loop) return { pass: false, msg: 'Use for-each to command your party!' }
      const healCall = p.calls.find((c) => c.method === 'heal')
      if (!healCall) return { pass: false, msg: 'Heal your team before the final battle!' }
      return { pass: true, msg: '🏆 THE DREADLORD FALLS! The core quest is complete!' }
    },
  },

  // ═══════════════════════════════════════════════════
  // ADVANCED CHAPTERS 16-19
  // ═══════════════════════════════════════════════════

  // ─── CHAPTER 16: super() Constructor Chaining ───
  {
    id: 16, title: 'Chapter 16: The Chain of Command', concept: 'super() — Constructor Chaining',
    description: 'A child class must honour its parent. Use super() in Mage\'s constructor to call Warrior\'s constructor, passing name, health, and attackPower up the chain. Then add mana as Mage\'s own field. Create a Mage and verify it works!',
    hints: [
      'When Mage extends Warrior, the parent\'s fields are set by the parent\'s constructor — not by the child directly.',
      'Inside Mage\'s constructor, the FIRST line must be: super(name, health, attackPower); — then set this.mana = mana;',
      'Mage(String name, int health, int attackPower, int mana) { super(name, health, attackPower); this.mana = mana; }',
    ],
    starter: 'class Warrior {\n    String name;\n    int health;\n    int attackPower;\n\n    Warrior(String name, int health, int attackPower) {\n        this.name = name;\n        this.health = health;\n        this.attackPower = attackPower;\n    }\n\n    public void attack(Warrior target) {\n        target.health = target.health - this.attackPower;\n    }\n}\n\n// Create Mage extending Warrior\n// Use super() in the constructor!\n// Add int mana as Mage\'s own field\n\n// Create a Mage and a Warrior, have the Mage attack!\n',
    validate(p) {
      const mg = p.classes.find((c) => c.name === 'Mage')
      if (!mg) return { pass: false, msg: 'Create a Mage class' }
      if (mg.parent !== 'Warrior') return { pass: false, msg: 'Mage should extend Warrior' }
      if (!mg.ctor) return { pass: false, msg: 'Mage needs a constructor' }
      if (!mg.ctor.body.includes('super(')) return { pass: false, msg: 'Use super() to call the parent constructor — it must be the first line!' }
      if (!mg.attrs.find((a) => a.name === 'mana')) return { pass: false, msg: 'Add int mana to Mage' }
      if (!p.objects.find((o) => o.className === 'Mage')) return { pass: false, msg: 'Create a Mage object!' }
      return { pass: true, msg: 'The chain of command holds! super() properly delegates to the parent.' }
    },
  },

  // ─── CHAPTER 17: Abstraction Deep Dive ───
  {
    id: 17, title: 'Chapter 17: The Hidden Blueprint', concept: 'Abstraction — Hiding Complexity',
    description: 'Abstraction means showing only what matters. Create an abstract class Vehicle with abstract method move() and a concrete method describe() that prints the vehicle type. Then create Car and Boat that each implement move() differently. Instantiate both and call move() + describe() on each!',
    hints: [
      'abstract class Vehicle { abstract void move(); void describe() { System.out.println("I am a vehicle"); } }',
      'Car extends Vehicle and implements move() with its own behaviour. Same for Boat. You cannot instantiate Vehicle directly!',
      'Create Car car = new Car(...); car.move(); car.describe(); — same for Boat.',
    ],
    starter: '// abstract class Vehicle\n//   abstract void move();\n//   void describe() — prints vehicle type\n\n// class Car extends Vehicle — implements move()\n// class Boat extends Vehicle — implements move()\n\n// Create both, call move() and describe() on each\n',
    validate(p) {
      const vh = p.classes.find((c) => c.name === 'Vehicle')
      if (!vh) return { pass: false, msg: 'Create an abstract class Vehicle' }
      if (!vh.isAbstract) return { pass: false, msg: 'Vehicle must be abstract' }
      if (!vh.methods.find((m) => m.name === 'move' && m.isAbstract)) return { pass: false, msg: 'Add abstract void move() to Vehicle' }
      if (!vh.methods.find((m) => m.name === 'describe' && !m.isAbstract)) return { pass: false, msg: 'Add a concrete describe() method to Vehicle' }
      const car = p.classes.find((c) => c.name === 'Car')
      if (!car || car.parent !== 'Vehicle') return { pass: false, msg: 'Create class Car extends Vehicle' }
      if (!car.methods.find((m) => m.name === 'move')) return { pass: false, msg: 'Car must implement move()' }
      const boat = p.classes.find((c) => c.name === 'Boat')
      if (!boat || boat.parent !== 'Vehicle') return { pass: false, msg: 'Create class Boat extends Vehicle' }
      if (!boat.methods.find((m) => m.name === 'move')) return { pass: false, msg: 'Boat must implement move()' }
      if (p.objects.length < 2) return { pass: false, msg: 'Create at least a Car and a Boat object' }
      const moveCalls = p.calls.filter((c) => c.method === 'move')
      const descCalls = p.calls.filter((c) => c.method === 'describe')
      if (moveCalls.length < 2) return { pass: false, msg: 'Call move() on both Car and Boat' }
      if (descCalls.length < 2) return { pass: false, msg: 'Call describe() on both Car and Boat' }
      return { pass: true, msg: 'Abstraction mastered! Same interface, hidden differences.' }
    },
  },

  // ─── CHAPTER 18: HashMap ───
  {
    id: 18, title: 'Chapter 18: The War Map', concept: 'HashMap — Key-Value Pairs',
    description: 'A general needs a map of enemy positions! Create a HashMap<String, Integer> mapping location names to enemy counts. Add at least 3 entries with put(). Then retrieve one value with get() and print the entire map!',
    hints: [
      'HashMap stores key-value pairs. Declare: HashMap<String, Integer> enemyMap = new HashMap<>();',
      'Add entries: enemyMap.put("Forest", 12); Retrieve: enemyMap.get("Forest") returns 12.',
      'Print the whole map: System.out.println(enemyMap); — it prints all key-value pairs automatically.',
    ],
    starter: '// Create HashMap<String, Integer> for enemy positions\n\n// Add at least 3 locations with put()\n\n// Get one value and print it\n// Print the entire map\n',
    validate(p) {
      const hasImport = true // auto-wrapped by compiler with java.util.*
      const hasHashMap = p.classes.length === 0 // no custom classes needed
      const puts = p.calls.filter((c) => c.method === 'put')
      if (puts.length < 3) return { pass: false, msg: `Add at least 3 entries with put() (${puts.length} so far)` }
      const gets = p.calls.filter((c) => c.method === 'get')
      if (gets.length < 1) return { pass: false, msg: 'Retrieve a value using get()' }
      const prints = p.calls.filter((c) => c.obj === '__sysout__')
      if (prints.length < 1) return { pass: false, msg: 'Print the map or a retrieved value!' }
      return { pass: true, msg: 'The war map is drawn! HashMap mastered — every location tracked.' }
    },
  },

  // ─── CHAPTER 19: Wrapper Classes & Autoboxing ───
  {
    id: 19, title: 'Chapter 19: The Wrapper\'s Gift', concept: 'Wrapper Classes & Autoboxing',
    description: 'Primitive types (int, double) can\'t go into collections directly — they need wrappers! Create an ArrayList<Integer>, add 5 numbers using autoboxing (just add ints — Java wraps them automatically). Then loop through and print each. Also demonstrate Integer.parseInt() by converting a String "42" to int!',
    hints: [
      'ArrayList<Integer> numbers = new ArrayList<>(); — Integer is the wrapper for int.',
      'numbers.add(10); — Java autoboxes the int 10 into an Integer automatically.',
      'int x = Integer.parseInt("42"); converts the String "42" into the int 42.',
    ],
    starter: '// Create ArrayList<Integer>\n\n// Add 5 numbers (autoboxing handles int → Integer)\n\n// Loop and print each number\n\n// Parse a String to int:\n// int parsed = Integer.parseInt("42");\n// Print it!\n',
    validate(p) {
      const coll = p.collections.find((c) => c.elemType === 'Integer')
      if (!coll) return { pass: false, msg: 'Create an ArrayList<Integer>' }
      const adds = p.calls.filter((c) => c.method === 'add')
      if (adds.length < 5) return { pass: false, msg: `Add at least 5 numbers (${adds.length} so far)` }
      const loop = p.calls.find((c) => c.isLoop)
      if (!loop) return { pass: false, msg: 'Use a for-each loop to print each number' }
      const prints = p.calls.filter((c) => c.obj === '__sysout__')
      if (prints.length < 1) return { pass: false, msg: 'Print the parsed value!' }
      return { pass: true, msg: 'Wrapper classes unlocked! Primitives and objects work as one.' }
    },
  },
]
