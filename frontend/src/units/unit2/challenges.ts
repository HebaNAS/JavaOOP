import { UnitDef } from '../types'

export const UNIT_2: UnitDef = {
  id: 'unit-2',
  number: 2,
  title: "The Alchemist's Lab",
  subtitle: 'Fundamental Elements of Programming',
  description:
    'Welcome to the Alchemist\'s Lab! Here you will learn the building blocks of every program: values, data types, variables, and how to read input from a user.',
  theme: { primary: '#7C4DFF', bg: '#1a1030', icon: '\u{1F9EA}' },
  challenges: [
    // ─── 2.1 Values ───
    {
      title: 'The First Brew',
      concept: 'Printing Values',
      description:
        'Every potion starts with a single ingredient. Use System.out.println() to display the message:\n\nHello Alchemist!',
      hints: [
        'System.out.println() prints a line of text to the console.',
        'Text values must be enclosed in double quotes: "like this"',
        'Full answer: System.out.println("Hello Alchemist!");',
      ],
      starter: '// Print the message: Hello Alchemist!\n',
      validate: { type: 'output', expected: 'Hello Alchemist!\n' },
      xp: 50,
    },

    // ─── 2.2 Data Types ───
    {
      title: 'The Ingredient Shelf',
      concept: 'Variables & Data Types',
      description:
        'An alchemist labels every ingredient. Declare three variables and print each one:\n\n' +
        '- String potion with value "Healing Elixir"\n' +
        '- int strength with value 75\n' +
        '- double volume with value 2.5',
      hints: [
        'Variables store data. Syntax: type name = value;',
        'String for text, int for whole numbers, double for decimals.',
        'Example: String potion = "Healing Elixir"; then System.out.println(potion);',
      ],
      starter:
        '// Declare your variables:\n\n\n// Print each one:\n',
      validate: {
        type: 'custom',
        check: (r, code) => {
          if (!r.success) return { pass: false, msg: r.errors.split('\n')[0] }
          if (!code.includes('String ')) return { pass: false, msg: 'Declare a String variable' }
          if (!code.includes('int ')) return { pass: false, msg: 'Declare an int variable' }
          if (!code.includes('double ')) return { pass: false, msg: 'Declare a double variable' }
          if (!r.output.includes('Healing Elixir')) return { pass: false, msg: 'Print the potion name' }
          if (!r.output.includes('75')) return { pass: false, msg: 'Print the strength value' }
          if (!r.output.includes('2.5')) return { pass: false, msg: 'Print the volume value' }
          return { pass: true, msg: 'Ingredients labelled! Three data types mastered.' }
        },
      },
      xp: 75,
    },

    // ─── 2.2 continued: Arithmetic ───
    {
      title: 'The Mixing Table',
      concept: 'Arithmetic Operations',
      description:
        'Alchemy requires precise maths! Given:\n\n' +
        'int ingredients = 4;\n' +
        'int potions = 12;\n\n' +
        'Print three results, one per line:\n' +
        '1. Total items: ingredients + potions\n' +
        '2. Potions per ingredient: potions / ingredients\n' +
        '3. Leftover: potions % 5',
      hints: [
        'Java operators: + - * / and % (remainder).',
        'Integer division truncates: 12 / 4 = 3 (no decimal).',
        '12 % 5 = 2 because 12 = 5\u00D72 + 2.',
      ],
      starter:
        'int ingredients = 4;\nint potions = 12;\n\n// Print each result on its own line\n',
      validate: {
        type: 'output',
        expected: '16\n3\n2\n',
      },
      xp: 75,
    },

    // ─── 2.2 continued: Booleans ───
    {
      title: 'The Boolean Crystal',
      concept: 'Booleans & Comparisons',
      description:
        'Some potions are dangerous! Given:\n\n' +
        'int temperature = 350;\n' +
        'double pH = 6.8;\n\n' +
        'Declare and print:\n' +
        '- boolean isHot = whether temperature > 300\n' +
        '- boolean isNeutral = whether pH is exactly 7.0',
      hints: [
        'boolean stores true or false. Comparison operators: > < >= <= == !=',
        'boolean isHot = temperature > 300;',
        'For doubles: boolean isNeutral = pH == 7.0;',
      ],
      starter:
        'int temperature = 350;\ndouble pH = 6.8;\n\n// Declare booleans and print them\n',
      validate: {
        type: 'output',
        expected: 'true\nfalse\n',
      },
      xp: 75,
    },

    // ─── 2.3 Variables: concatenation ───
    {
      title: 'The Label Maker',
      concept: 'String Concatenation',
      description:
        'Combine text and variables into a single potion label!\n\n' +
        'Given the variables below, print exactly:\n' +
        'Potion: Healing Elixir | Strength: 75 | Ready: true',
      hints: [
        'The + operator joins strings: "Hello " + "World" → "Hello World"',
        'Variables are converted automatically: "Value: " + 75 → "Value: 75"',
        'Build the full label with + connecting every part.',
      ],
      starter:
        'String name = "Healing Elixir";\nint strength = 75;\nboolean ready = true;\n\n// Print the label\n',
      validate: {
        type: 'outputMatch',
        pattern: /Potion: Healing Elixir \| Strength: 75 \| Ready: true/,
      },
      xp: 75,
    },

    // ─── 2.3 continued: casting ───
    {
      title: 'The Type Transformer',
      concept: 'Type Casting',
      description:
        'Sometimes you must convert between types.\n\n' +
        '1. Cast the double 9.7 to int and print it\n' +
        '2. Cast the int 42 to double and print it\n\n' +
        'What happens to the decimal part?',
      hints: [
        'Put the target type in parentheses: (int) 9.7 truncates to 9.',
        'int \u2192 double widens safely: (double) 42 gives 42.0.',
        'int x = (int) 9.7; double y = (double) 42; — print both.',
      ],
      starter:
        'double precise = 9.7;\nint whole = 42;\n\n// Cast and print\n',
      validate: {
        type: 'output',
        expected: '9\n42.0\n',
      },
      xp: 75,
    },

    // ─── 2.4 User Input ───
    {
      title: 'The Customer',
      concept: 'Scanner & User Input',
      description:
        'A customer arrives! Use Scanner to read their name, then greet them:\n\n' +
        'Welcome, <name>! Your potion is brewing.\n\n' +
        'Test input: Gandalf',
      hints: [
        'Create a Scanner: Scanner sc = new Scanner(System.in);',
        'Read a line of text: String name = sc.nextLine();',
        'Then concatenate it: "Welcome, " + name + "! Your potion is brewing."',
      ],
      starter:
        'Scanner sc = new Scanner(System.in);\n\n// Read the name and print the greeting\n',
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
      title: 'The Order Form',
      concept: 'Reading Numbers',
      description:
        'The customer orders potions! Read:\n' +
        '- an int quantity (first line)\n' +
        '- a double price (second line)\n\n' +
        'Print the total cost (quantity * price).\n\n' +
        'Test input: 3 then 12.5 \u2192 should print 37.5',
      hints: [
        'sc.nextInt() reads an integer, sc.nextDouble() reads a decimal.',
        'Multiply them for the total: quantity * price.',
        'Java automatically promotes int \u00D7 double to double.',
      ],
      starter:
        'Scanner sc = new Scanner(System.in);\n\n// Read quantity (int) and price (double)\n// Print the total\n',
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
