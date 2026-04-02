import { UnitDef } from '../types'

export const UNIT_3: UnitDef = {
  id: 'unit-3',
  number: 3,
  title: 'The Labyrinth',
  subtitle: 'Control Flow Statements',
  description:
    'You descend into an ancient labyrinth beneath the Alchemist\'s tower. Every corridor forks, every door is locked with a riddle, and only those who master the flow of logic will escape.',
  theme: { primary: '#4dd0e1', bg: '#0d1a1e', icon: '🛡️' },
  challenges: [
    // ─── 3.1 Conditional Execution ───

    {
      title: 'The First Fork',
      concept: 'if Statement',
      description:
        'The corridor splits in two. A sign reads: "Only pass if the torchlight is strong enough."\n\n' +
        'You have:\n' +
        '  int torchLight = 75;\n\n' +
        'If torchLight is greater than 50, print:\n' +
        'The path is bright — safe to continue!\n\n' +
        'Then always print:\n' +
        'You walk onward.',
      hints: [
        'An if statement runs code only when a condition is true: if (condition) { ... }',
        'The > operator checks "greater than": torchLight > 50',
        'The second print is outside the if block — it always runs regardless.',
      ],
      starter: 'int torchLight = 75;\n\n// If torchLight > 50, print the safety message\n\n// Always print: You walk onward.\n',
      validate: { type: 'output', expected: 'The path is bright — safe to continue!\nYou walk onward.\n' },
      xp: 50,
    },

    {
      title: "The Guardian's Riddle",
      concept: 'if / else',
      description:
        'A stone guardian blocks the door. "Answer my riddle," it rumbles. ' +
        '"What is the answer to life, the universe, and everything?"\n\n' +
        'Read an integer from the adventurer (Scanner). If the answer is 42, print:\n' +
        'The door groans open!\n\n' +
        'Otherwise print:\n' +
        'Wrong answer. The guardian shakes its head.\n\n' +
        '(Test inputs: 42 and 7)',
      hints: [
        'if (condition) { ... } else { ... } — the else block runs when the condition is false.',
        'Use == to check equality: answer == 42',
        'Read with Scanner: int answer = sc.nextInt();',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint answer = sc.nextInt();\n\n// Check the answer\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '42', expected: 'The door groans open!\n', label: 'answer = 42' },
          { stdin: '7', expected: 'Wrong answer. The guardian shakes its head.\n', label: 'answer = 7' },
        ],
      },
      xp: 75,
    },

    {
      title: 'The Three Doors',
      concept: 'if / else if / else',
      description:
        'You enter a round chamber with three glowing doors: Gold, Silver, and Bronze. ' +
        'A plaque reads: "Your score decides your fate."\n\n' +
        'Read an int score from the adventurer.\n' +
        '• score >= 90 → print: Gold door — the treasure vault!\n' +
        '• score >= 60 → print: Silver door — the armoury!\n' +
        '• otherwise → print: Bronze door — the training hall.\n\n' +
        '(Tests: 95, 75, and 30)',
      hints: [
        'Chain conditions: if (...) { } else if (...) { } else { }',
        'Check the highest threshold first (90), then the next (60), then the fallback.',
        'Only ONE block runs — the first condition that matches wins.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint score = sc.nextInt();\n\n// Three doors based on score\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '95', expected: 'Gold door — the treasure vault!\n', label: 'score = 95' },
          { stdin: '75', expected: 'Silver door — the armoury!\n', label: 'score = 75' },
          { stdin: '30', expected: 'Bronze door — the training hall.\n', label: 'score = 30' },
        ],
      },
      xp: 100,
    },

    {
      title: 'The Ancient Lock',
      concept: 'Logical Operators && ||',
      description:
        'The vault door has TWO locks. You need a strong key AND a map to open it fully.\n\n' +
        'Read two integers: keyPower and hasMap (1 = yes, 0 = no).\n\n' +
        '• keyPower > 100 AND hasMap is 1 → print: Both locks click — the vault opens!\n' +
        '• keyPower > 100 OR hasMap is 1 → print: One lock opens — partial access.\n' +
        '• otherwise → print: Both locks remain sealed.\n\n' +
        '(Tests: "150 1", "150 0", "50 0")',
      hints: [
        '&& means AND — both sides must be true. || means OR — at least one side must be true.',
        'Check the strictest condition (&&) first, then the looser one (||).',
        'if (keyPower > 100 && hasMap == 1) { ... } else if (keyPower > 100 || hasMap == 1) { ... }',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint keyPower = sc.nextInt();\nint hasMap = sc.nextInt();\n\n// Check both locks\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '150\n1', expected: 'Both locks click — the vault opens!\n', label: 'key=150, map=yes' },
          { stdin: '150\n0', expected: 'One lock opens — partial access.\n', label: 'key=150, map=no' },
          { stdin: '50\n0', expected: 'Both locks remain sealed.\n', label: 'key=50, map=no' },
        ],
      },
      xp: 100,
    },

    // ─── 3.2 Switch-case Statements ───

    {
      title: 'The Enchanted Compass',
      concept: 'switch on String',
      description:
        'You find a glowing compass. It whispers: "Speak a direction and I shall reveal what lies ahead."\n\n' +
        'Read a String direction. Use a switch statement:\n' +
        '• "north" → You head towards the frozen caves.\n' +
        '• "south" → You retreat towards the entrance.\n' +
        '• "east" → You approach the dragon\'s lair.\n' +
        '• "west" → You discover a hidden garden.\n' +
        '• default → The compass spins wildly!\n\n' +
        '(Tests: "east" and "up")',
      hints: [
        'switch (variable) { case "value": ... break; default: ... }',
        'Each case must end with break; or execution "falls through" to the next case.',
        'default catches anything that doesn\'t match any case.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nString direction = sc.nextLine();\n\n// switch on direction\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: 'east', expected: "You approach the dragon's lair.\n", label: 'direction = east' },
          { stdin: 'up', expected: 'The compass spins wildly!\n', label: 'direction = up (default)' },
        ],
      },
      xp: 100,
    },

    {
      title: 'The Rune Decoder',
      concept: 'switch on int',
      description:
        'Ancient runes are carved into the wall, each with a number. A tablet reads:\n' +
        '"Touch a rune to receive its power."\n\n' +
        'Read an int rune. Use a switch:\n' +
        '• 1 → Fire rune — gain fire resistance!\n' +
        '• 2 → Ice rune — freeze your enemies!\n' +
        '• 3 → Lightning rune — speed doubled!\n' +
        '• default → Unknown rune... nothing happens.\n\n' +
        '(Tests: 2 and 5)',
      hints: [
        'switch works with int too: switch (rune) { case 1: ... break; case 2: ... break; }',
        'Remember the break after each case, or the code falls through to the next one!',
        'default handles any value not listed in the cases.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint rune = sc.nextInt();\n\n// switch on rune number\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '2', expected: 'Ice rune — freeze your enemies!\n', label: 'rune = 2' },
          { stdin: '5', expected: 'Unknown rune... nothing happens.\n', label: 'rune = 5 (default)' },
        ],
      },
      xp: 100,
    },

    // ─── 3.3 Iteration ───

    {
      title: 'The Gem Corridor',
      concept: 'for Loop',
      description:
        'A long corridor glitters with gems embedded in the walls! ' +
        'You must collect them one by one as you walk.\n\n' +
        'Read int n (how many gems). Use a for loop to print:\n' +
        'Gem 1 collected!\n' +
        'Gem 2 collected!\n' +
        '... up to n.\n\n' +
        'After the loop print:\n' +
        'Total: <n> gems!\n\n' +
        '(Test: n = 4)',
      hints: [
        'A for loop repeats code a set number of times: for (int i = 1; i <= n; i++) { ... }',
        'The variable i counts from 1 to n, increasing by 1 each time.',
        'After the loop, print the total using the variable n.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint n = sc.nextInt();\n\n// for loop: collect gems 1 to n\n\n// Print total\n',
      validate: {
        type: 'testCases',
        cases: [
          {
            stdin: '4',
            expected: 'Gem 1 collected!\nGem 2 collected!\nGem 3 collected!\nGem 4 collected!\nTotal: 4 gems!\n',
            label: 'n = 4',
          },
        ],
      },
      xp: 100,
    },

    {
      title: 'The Echo Chamber',
      concept: 'while Loop',
      description:
        'You shout into a vast cavern. Your voice echoes back, each time fainter — ' +
        'the echo halves with every bounce.\n\n' +
        'Read int echoStrength. While it is greater than 0:\n' +
        '  print: Echo... (<strength>)\n' +
        '  then halve it: echoStrength = echoStrength / 2;\n\n' +
        'After the loop print:\n' +
        'Silence.\n\n' +
        '(Test: echoStrength = 8 → echoes at 8, 4, 2, 1, then silence)',
      hints: [
        'while (condition) { ... } repeats as long as the condition stays true.',
        'Integer division truncates: 1 / 2 = 0 in Java, so the loop ends naturally.',
        'Print the current strength BEFORE halving it each iteration.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint echoStrength = sc.nextInt();\n\n// while echoStrength > 0, print and halve\n\n// Print: Silence.\n',
      validate: {
        type: 'testCases',
        cases: [
          {
            stdin: '8',
            expected: 'Echo... (8)\nEcho... (4)\nEcho... (2)\nEcho... (1)\nSilence.\n',
            label: 'echo = 8',
          },
        ],
      },
      xp: 100,
    },

    // ─── BONUS: Predict the Output ───
    {
      title: 'The Oracle\'s Test',
      concept: 'Predict the Output',
      description:
        'The Oracle shows you a snippet of code and asks: "What will this print?"\n\n' +
        'Study the code carefully, then type the EXACT output you predict below.\n' +
        '(Include each line of output, pressing Enter between lines.)',
      hints: [
        'Trace through the code line by line. What is x at each step?',
        'The if condition checks x > 5 — is 3 greater than 5?',
        'x starts at 3, the if is false so the else runs. Then the final println always runs.',
      ],
      starter: '',
      validate: {
        type: 'predict',
        code: 'int x = 3;\nif (x > 5) {\n    System.out.println("Big");\n} else {\n    System.out.println("Small");\n}\nSystem.out.println("Done: " + x);',
      },
      xp: 75,
    },

    // ─── BONUS: Find the Bug ───
    {
      title: 'The Cursed Scroll',
      concept: 'Find & Fix the Bug',
      description:
        'A fellow adventurer wrote this code but it doesn\'t work! The loop should print numbers 1 to 5, but something is wrong.\n\n' +
        'Find the bug and fix it so the output is:\n1\n2\n3\n4\n5',
      hints: [
        'Look at the loop condition carefully — when does it stop?',
        'The loop says i <= 10 but we only want 1 to 5.',
        'Change the condition to i <= 5.',
      ],
      starter: '// Bug: this should print 1 to 5, but it prints too many!\nfor (int i = 1; i <= 10; i++) {\n    System.out.println(i);\n}\n',
      validate: {
        type: 'bugfix',
        expected: '1\n2\n3\n4\n5',
      },
      xp: 75,
    },
  ],
}
