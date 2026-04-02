import { UnitDef } from '../types'

export const UNIT_2: UnitDef = {
  id: 'unit-2',
  number: 2,
  title: "The Alchemist's Lab",
  subtitle: 'Fundamental Elements of Programming',
  description:
    'Welcome to the Alchemist\'s Lab! Master the building blocks of every program: values, data types, variables, and user input.',
  theme: { primary: '#9b7dff', bg: '#1a1535', icon: '🧪' },
  challenges: [
    // ─── 2.1 Values ───
    {
      title: 'The First Incantation',
      concept: 'Printing Values',
      description:
        'You step into the dimly lit Alchemist\'s Lab for the first time. ' +
        'A note on the workbench reads: "To activate the cauldron, speak the ancient words."\n\n' +
        'Use System.out.println() to speak the incantation:\n\n' +
        'Hello Alchemist!',
      hints: [
        'System.out.println() is your voice — it prints a line of text to the console.',
        'Text (called a "String") must be wrapped in double quotes: "like this"',
        'The full spell: System.out.println("Hello Alchemist!");',
      ],
      starter: '// Speak the incantation to awaken the cauldron\n',
      validate: { type: 'output', expected: 'Hello Alchemist!\n' },
      xp: 50,
    },

    // ─── 2.2 Data Types ───
    {
      title: 'Labelling the Ingredients',
      concept: 'Variables & Data Types',
      description:
        'The shelves are full of unlabelled jars! The master alchemist insists: ' +
        '"Every ingredient must be labelled with its name and type, or the recipes will fail."\n\n' +
        'Create three labelled jars (variables) and display what\'s inside each one:\n\n' +
        '• A text jar: String potion = "Healing Elixir"\n' +
        '• A number jar: int strength = 75\n' +
        '• A precise jar: double volume = 2.5',
      hints: [
        'Variables are like labelled jars — each has a type (shape) and a name (label). Syntax: type name = value;',
        'String stores text, int stores whole numbers, double stores decimals.',
        'Example: String potion = "Healing Elixir"; then System.out.println(potion);',
      ],
      starter: '// Label your three ingredient jars\n\n\n// Show what is inside each one\n',
      validate: {
        type: 'custom',
        check: (r, code) => {
          if (!r.success) return { pass: false, msg: r.errors.split('\n')[0] }
          if (!code.includes('String ')) return { pass: false, msg: 'You need a text jar — declare a String variable' }
          if (!code.includes('int ')) return { pass: false, msg: 'You need a number jar — declare an int variable' }
          if (!code.includes('double ')) return { pass: false, msg: 'You need a precise jar — declare a double variable' }
          if (!r.output.includes('Healing Elixir')) return { pass: false, msg: 'Show the potion name (should display "Healing Elixir")' }
          if (!r.output.includes('75')) return { pass: false, msg: 'Show the strength value (should display 75)' }
          if (!r.output.includes('2.5')) return { pass: false, msg: 'Show the volume value (should display 2.5)' }
          return { pass: true, msg: 'Ingredients labelled! Three types of jar mastered.' }
        },
      },
      xp: 75,
    },

    // ─── 2.2 continued: Arithmetic ───
    {
      title: 'The Mixing Formula',
      concept: 'Arithmetic Operations',
      description:
        'The recipe book lies open on the table. "To brew the Grand Elixir," it reads, ' +
        '"you must calculate the exact proportions — one mistake and the whole batch is ruined!"\n\n' +
        'Your stockroom has:\n' +
        '  int ingredients = 4;\n' +
        '  int potions = 12;\n\n' +
        'The recipe demands three answers, each on its own line:\n' +
        '1. How many items in total? (ingredients + potions)\n' +
        '2. How many potions per ingredient? (potions / ingredients)\n' +
        '3. How many potions are left over after packing in groups of 5? (potions % 5)',
      hints: [
        'Java maths operators: + (add), - (subtract), * (multiply), / (divide), % (remainder).',
        'Integer division truncates: 12 / 4 = 3 (no decimals). The % operator gives the remainder.',
        '12 % 5 = 2, because 12 = 5 × 2 + 2. Print each answer with System.out.println().',
      ],
      starter: 'int ingredients = 4;\nint potions = 12;\n\n// Calculate and print each answer on its own line\n',
      validate: { type: 'output', expected: '16\n3\n2\n' },
      xp: 75,
    },

    // ─── 2.2 continued: Booleans ───
    {
      title: 'The Safety Crystal',
      concept: 'Booleans & Comparisons',
      description:
        'A glowing crystal sits on the workbench. "This crystal reveals the truth," says the master. ' +
        '"Ask it a yes-or-no question, and it will glow true or false."\n\n' +
        'Your cauldron reads:\n' +
        '  int temperature = 350;\n' +
        '  double pH = 6.8;\n\n' +
        'Ask the crystal two questions and print each answer:\n' +
        '• Is the temperature dangerously high? (above 300)\n' +
        '• Is the pH perfectly neutral? (exactly 7.0)',
      hints: [
        'boolean stores true or false. Comparison operators: > < >= <= == !=',
        'Declare: boolean isHot = temperature > 300;',
        'For equality with doubles: boolean isNeutral = pH == 7.0;',
      ],
      starter: 'int temperature = 350;\ndouble pH = 6.8;\n\n// Ask the crystal and print each answer\n',
      validate: { type: 'output', expected: 'true\nfalse\n' },
      xp: 75,
    },

    // ─── 2.3 Variables: concatenation ───
    {
      title: 'The Potion Label',
      concept: 'String Concatenation',
      description:
        'Every potion sold from this lab needs a proper label — the Apothecary Guild demands it! ' +
        'Combine text and variables into one label using the + operator.\n\n' +
        'Given these ingredients:\n' +
        '  String name = "Healing Elixir";\n' +
        '  int strength = 75;\n' +
        '  boolean ready = true;\n\n' +
        'Print this exact label:\n' +
        'Potion: Healing Elixir | Strength: 75 | Ready: true',
      hints: [
        'The + operator joins text: "Hello " + "World" becomes "Hello World"',
        'Variables join automatically: "Value: " + 75 becomes "Value: 75"',
        'Build the whole label with + connecting every piece.',
      ],
      starter: 'String name = "Healing Elixir";\nint strength = 75;\nboolean ready = true;\n\n// Print the potion label\n',
      validate: {
        type: 'outputMatch',
        pattern: /Potion: Healing Elixir \| Strength: 75 \| Ready: true/,
      },
      xp: 75,
    },

    // ─── 2.3 continued: casting ───
    {
      title: 'The Transmutation Circle',
      concept: 'Type Casting',
      description:
        'The transmutation circle can change one substance into another — ' +
        'but be careful, some transformations lose material!\n\n' +
        'You have:\n' +
        '  double precise = 9.7;\n' +
        '  int whole = 42;\n\n' +
        'Transform them:\n' +
        '1. Cast the double 9.7 into an integer and print it — what happens to .7?\n' +
        '2. Cast the integer 42 into a double and print it — what gets added?',
      hints: [
        'Put the target type in parentheses before the value: (int) 9.7 truncates to 9 — the decimal is lost!',
        'int to double is safe (nothing lost): (double) 42 becomes 42.0',
        'int x = (int) 9.7; double y = (double) 42; — then print both.',
      ],
      starter: 'double precise = 9.7;\nint whole = 42;\n\n// Transmute and print each result\n',
      validate: { type: 'output', expected: '9\n42.0\n' },
      xp: 75,
    },

    // ─── 2.4 User Input ───
    {
      title: 'The Wandering Customer',
      concept: 'Scanner & User Input',
      description:
        'The shop bell rings — a customer walks in! "I\'d like a potion, please," they say.\n\n' +
        '"Of course! But first, what is your name?" You need to read their answer ' +
        'and greet them properly.\n\n' +
        'Read the customer\'s name, then print:\n' +
        'Welcome, <name>! Your potion is brewing.\n\n' +
        '(When tested, the customer will say: Gandalf)',
      hints: [
        'Scanner reads input. Create one: Scanner sc = new Scanner(System.in);',
        'Read a line of text: String name = sc.nextLine();',
        'Then build the greeting: "Welcome, " + name + "! Your potion is brewing."',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\n\n// Read the customer\'s name and greet them\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: 'Gandalf', expected: 'Welcome, Gandalf! Your potion is brewing.\n', label: 'name = Gandalf' },
          { stdin: 'Ada', expected: 'Welcome, Ada! Your potion is brewing.\n', label: 'name = Ada' },
        ],
      },
      xp: 100,
    },

    // ─── 2.4 continued: numbers ───
    {
      title: 'The Grand Order',
      concept: 'Reading Numbers',
      description:
        'The customer wants a bulk order! "I need several potions," they announce, ' +
        '"and here is what I can pay per bottle."\n\n' +
        'Read two values from the customer:\n' +
        '• An integer: how many potions they want (quantity)\n' +
        '• A decimal: the price per potion\n\n' +
        'Calculate and print the total cost.\n\n' +
        '(Test input: they order 3 potions at 12.5 gold each — total should be 37.5)',
      hints: [
        'sc.nextInt() reads a whole number, sc.nextDouble() reads a decimal.',
        'Multiply them for the total: quantity * price.',
        'Java automatically makes the result a double when you multiply int × double.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\n\n// Read quantity (int) and price (double)\n// Calculate and print the total\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '3\n12.5', expected: '37.5\n', label: 'qty=3, price=12.5' },
          { stdin: '5\n10.0', expected: '50.0\n', label: 'qty=5, price=10.0' },
        ],
      },
      xp: 100,
    },
  ],
}
