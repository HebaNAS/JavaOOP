import { UnitDef } from '../types'

export const UNIT_6: UnitDef = {
  id: 'unit-6',
  number: 6,
  title: 'The Spell Workshop',
  subtitle: 'Methods',
  description:
    'Welcome to the Spell Workshop! Here, enchanters craft reusable spell scrolls — each one named, each one accepting ingredients, each one producing a magical effect. In programming, we call these methods.',
  theme: { primary: '#e84393', bg: '#1a0c16', icon: '📜' },
  challenges: [
    // ─── 6.1 What is a Method? ───

    {
      title: 'The First Spell',
      concept: 'Defining & Calling a Method',
      description:
        'Every enchanter must craft their first spell scroll. A method is a named block of code you can call whenever you need it.\n\n' +
        'Define a method called castLight that takes no parameters and prints:\n' +
        'A bright light fills the room!\n\n' +
        'Then call it from your main code.',
      hints: [
        'Define a method: void castLight() { System.out.println("..."); }',
        'void means the method returns nothing — it just performs an action.',
        'Call it by name: castLight(); — the parentheses are required even with no arguments.',
      ],
      starter: '// Define the castLight method\n\n\n// Call it\n',
      validate: {
        type: 'custom',
        check: (r, code) => {
          if (!r.success) return { pass: false, msg: r.errors.split('\n')[0] }
          if (!code.includes('void castLight')) return { pass: false, msg: 'Define a method called castLight' }
          if (!code.includes('castLight()')) return { pass: false, msg: 'Call your method: castLight();' }
          if (!r.output.includes('A bright light fills the room!'))
            return { pass: false, msg: 'The method should print "A bright light fills the room!"' }
          return { pass: true, msg: 'Your first spell scroll is complete!' }
        },
      },
      xp: 75,
    },

    {
      title: 'The Battle Cry',
      concept: 'Calling Methods Multiple Times',
      description:
        'The beauty of a spell scroll is that you can use it again and again!\n\n' +
        'Define a method called battleCry that prints:\n' +
        'For glory!\n\n' +
        'Call it exactly 3 times. One scroll, three uses.',
      hints: [
        'Define it the same way: void battleCry() { ... }',
        'Call it three separate times: battleCry(); battleCry(); battleCry();',
        'Each call executes the entire method body from the start.',
      ],
      starter: '// Define battleCry\n\n\n// Call it 3 times\n',
      validate: {
        type: 'output',
        expected: 'For glory!\nFor glory!\nFor glory!\n',
      },
      xp: 75,
    },

    // ─── 6.2 Passing Values to Methods ───

    {
      title: 'The Damage Calculator',
      concept: 'Method Parameters',
      description:
        'A more powerful scroll accepts ingredients — values you pass in when casting.\n\n' +
        'Read int base and int bonus from the adventurer.\n' +
        'Define a method:\n' +
        '  void calculateDamage(int base, int bonus)\n' +
        'that prints: Damage dealt: <base + bonus>\n\n' +
        'Call it with the values you read.\n\n' +
        '(Test: base=20, bonus=15 → "Damage dealt: 35")',
      hints: [
        'Parameters are variables listed in the parentheses: void calculateDamage(int base, int bonus)',
        'Inside the method, use them like normal variables: base + bonus',
        'Call with values: calculateDamage(base, bonus);',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint base = sc.nextInt();\nint bonus = sc.nextInt();\n\n// Define calculateDamage method\n\n// Call it\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '20\n15', expected: 'Damage dealt: 35\n', label: 'base=20, bonus=15' },
          { stdin: '50\n0', expected: 'Damage dealt: 50\n', label: 'base=50, bonus=0' },
        ],
      },
      xp: 100,
    },

    {
      title: 'The Greeting Scroll',
      concept: 'String Parameters',
      description:
        'Scrolls can accept text too — not just numbers.\n\n' +
        'Read a String name from the adventurer.\n' +
        'Define a method:\n' +
        '  void greet(String name)\n' +
        'that prints: Hail, <name>! Welcome to the workshop.\n\n' +
        'Call it with the name you read.\n\n' +
        '(Test: "Merlin")',
      hints: [
        'String parameters work exactly like int: void greet(String name) { ... }',
        'Concatenate inside: "Hail, " + name + "! Welcome to the workshop."',
        'Call: greet(name);',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nString name = sc.nextLine();\n\n// Define greet method\n\n// Call it\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: 'Merlin', expected: 'Hail, Merlin! Welcome to the workshop.\n', label: 'name = Merlin' },
          { stdin: 'Ada', expected: 'Hail, Ada! Welcome to the workshop.\n', label: 'name = Ada' },
        ],
      },
      xp: 100,
    },

    // ─── 6.3 Returning Values ───

    {
      title: 'The Potion Brewer',
      concept: 'Returning an int',
      description:
        'The finest scrolls produce something — they return a result you can store and use.\n\n' +
        'Read int herbs and int water.\n' +
        'Define a method:\n' +
        '  int brewPotion(int herbs, int water)\n' +
        'that returns herbs * 3 + water * 2\n\n' +
        'Call it, store the result, and print:\n' +
        'Potion strength: <result>\n\n' +
        '(Test: herbs=5, water=10 → strength = 35)',
      hints: [
        'Use int instead of void: int brewPotion(int herbs, int water) { return ...; }',
        'The return keyword sends a value back to the caller.',
        'Store it: int strength = brewPotion(herbs, water); then print it.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint herbs = sc.nextInt();\nint water = sc.nextInt();\n\n// Define brewPotion that RETURNS an int\n\n// Call it, store result, print\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '5\n10', expected: 'Potion strength: 35\n', label: 'herbs=5, water=10' },
          { stdin: '10\n5', expected: 'Potion strength: 40\n', label: 'herbs=10, water=5' },
        ],
      },
      xp: 100,
    },

    {
      title: 'The Power Check',
      concept: 'Returning a boolean',
      description:
        'Some scrolls answer a yes-or-no question — they return true or false.\n\n' +
        'Read int power.\n' +
        'Define a method:\n' +
        '  boolean isStrong(int power)\n' +
        'that returns whether power is greater than 50.\n\n' +
        'Call it and print:\n' +
        'Strong enough: <result>\n\n' +
        '(Tests: 75 → true, 30 → false)',
      hints: [
        'boolean isStrong(int power) { return power > 50; }',
        'The comparison power > 50 already produces a boolean — just return it directly.',
        'boolean result = isStrong(power); System.out.println("Strong enough: " + result);',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint power = sc.nextInt();\n\n// Define isStrong\n\n// Call and print\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '75', expected: 'Strong enough: true\n', label: 'power = 75' },
          { stdin: '30', expected: 'Strong enough: false\n', label: 'power = 30' },
        ],
      },
      xp: 100,
    },

    {
      title: 'The Price Tag',
      concept: 'Multiple Parameters, Returning double',
      description:
        'The shop needs a reusable pricing scroll.\n\n' +
        'Read int quantity and double unitPrice.\n' +
        'Define:\n' +
        '  double totalPrice(int qty, double price)\n' +
        'that returns qty * price.\n\n' +
        'Call it and print:\n' +
        'Total: <result>\n\n' +
        '(Test: qty=3, price=12.5 → "Total: 37.5")',
      hints: [
        'Mix parameter types freely: double totalPrice(int qty, double price)',
        'int * double automatically produces a double in Java.',
        'double result = totalPrice(quantity, unitPrice);',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint quantity = sc.nextInt();\ndouble unitPrice = sc.nextDouble();\n\n// Define totalPrice\n\n// Call and print\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '3\n12.5', expected: 'Total: 37.5\n', label: 'qty=3, price=12.5' },
          { stdin: '5\n10.0', expected: 'Total: 50.0\n', label: 'qty=5, price=10.0' },
        ],
      },
      xp: 100,
    },

    // ─── 6.4 Variable Scope ───

    {
      title: "The Enchanter's Circle",
      concept: 'Variable Scope (Pass by Value)',
      description:
        'A crucial lesson: what happens inside a spell stays inside a spell.\n\n' +
        'Define a method:\n' +
        '  void doubleIt(int x)\n' +
        'that doubles x and prints: Inside: <doubled value>\n\n' +
        'Then in main code:\n' +
        '  int number = 10;\n' +
        '  doubleIt(number);\n' +
        '  System.out.println("Outside: " + number);\n\n' +
        'Watch carefully — does number change outside the method?\n\n' +
        '(Expected: Inside: 20, Outside: 10)',
      hints: [
        'Java passes primitives by VALUE — the method gets a copy, not the original.',
        'Inside the method: x = x * 2; modifies the local copy only.',
        'The original variable number in main remains 10 after the call.',
      ],
      starter: '// Define doubleIt: doubles x and prints "Inside: " + x\n\n\nint number = 10;\ndoubleIt(number);\nSystem.out.println("Outside: " + number);\n',
      validate: {
        type: 'output',
        expected: 'Inside: 20\nOutside: 10\n',
      },
      xp: 125,
    },
  ],
}
