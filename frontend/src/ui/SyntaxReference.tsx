import { useState } from 'react'

const SECTIONS = [
  {
    title: 'Class',
    code: `class ClassName {
    // attributes & methods
}`,
  },
  {
    title: 'Attributes',
    code: `String name;
int health;
private int attackPower;`,
  },
  {
    title: 'Constructor',
    code: `ClassName(String name, int hp) {
    this.name = name;
    this.health = hp;
}`,
  },
  {
    title: 'Method',
    code: `public void attack(Warrior target) {
    target.health -= this.attackPower;
}`,
  },
  {
    title: 'Getter / Setter',
    code: `public int getHealth() {
    return this.health;
}
public void setHealth(int h) {
    this.health = h;
}`,
  },
  {
    title: 'Inheritance',
    code: `class Mage extends Warrior {
    int mana;
    // inherits name, health, etc.
}`,
  },
  {
    title: 'Override',
    code: `// In child class:
public void attack(Warrior target) {
    // different behavior
}`,
  },
  {
    title: 'Abstract',
    code: `abstract class GameCharacter {
    abstract void specialAbility();
}`,
  },
  {
    title: 'Interface',
    code: `interface Healable {
    void heal(int amount);
}
class Mage implements Healable {
    public void heal(int amount) { }
}`,
  },
  {
    title: 'ArrayList',
    code: `ArrayList<Warrior> party =
    new ArrayList<>();
party.add(hero);
for (Warrior w : party) {
    w.attack(enemy);
}`,
  },
  {
    title: 'Create Object',
    code: `Warrior hero =
    new Warrior("Name", 100, 25);`,
  },
  {
    title: 'Method Call',
    code: `hero.attack(enemy);
hero.defend();
mage.castSpell(target);`,
  },
  {
    title: 'Movement (Keyboard)',
    code: `// Define these to enable WASD:
public void moveUp() { }
public void moveDown() { }
public void moveLeft() { }
public void moveRight() { }`,
  },
  {
    title: 'Combat (Keyboard)',
    code: `// SPACE = attack nearest
// Q = defend (reduce damage)
// E = castSpell / shoot
// R = heal self`,
  },
]

export default function SyntaxReference() {
  const [open, setOpen] = useState(false)
  const [activeSection, setActiveSection] = useState(0)

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="syntax-ref-toggle"
      >
        📖 Java Reference
      </button>
    )
  }

  return (
    <div className="syntax-ref-panel">
      <div className="syntax-ref-header">
        <span style={{ fontWeight: 700, color: '#FFC107', letterSpacing: 1 }}>📖 JAVA SYNTAX</span>
        <button onClick={() => setOpen(false)} className="syntax-ref-close">✕</button>
      </div>
      <div className="syntax-ref-tabs">
        {SECTIONS.map((s, i) => (
          <button
            key={i}
            className={`syntax-ref-tab${i === activeSection ? ' active' : ''}`}
            onClick={() => setActiveSection(i)}
          >
            {s.title}
          </button>
        ))}
      </div>
      <div className="syntax-ref-code">
        <pre>{SECTIONS[activeSection].code}</pre>
      </div>
    </div>
  )
}
