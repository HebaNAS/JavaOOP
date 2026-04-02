import { UnitDef } from '../types'

export const UNIT_4: UnitDef = {
  id: 'unit-4',
  number: 4,
  title: 'The Deep Labyrinth',
  subtitle: 'Complex Control Flow',
  description:
    'You descend further. The corridors twist and overlap. Down here, loops hide inside loops, traps force you to skip ahead, and sometimes the only option is to break free.',
  theme: { primary: '#26a69a', bg: '#0d1718', icon: '🌀' },
  challenges: [
    // ─── 4.1 Iteration + Conditional ───

    {
      title: 'The Treasure Filter',
      concept: 'Loop with Condition',
      description:
        'A long vault stretches before you with numbered alcoves. ' +
        '"Only the EVEN-numbered alcoves hold treasure," warns a sign.\n\n' +
        'Read int n. Loop from 1 to n. For each even number, print:\n' +
        'Treasure at alcove <i>!\n\n' +
        'After the loop print:\n' +
        'Scan complete.\n\n' +
        '(Test: n = 6 → treasure at 2, 4, 6)',
      hints: [
        'Use a for loop: for (int i = 1; i <= n; i++) — then check inside.',
        'An even number has no remainder when divided by 2: i % 2 == 0',
        'The "Scan complete." line is outside the loop — it runs once at the end.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint n = sc.nextInt();\n\n// Loop 1 to n, print only even alcoves\n\n// Print: Scan complete.\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '6', expected: 'Treasure at alcove 2!\nTreasure at alcove 4!\nTreasure at alcove 6!\nScan complete.\n', label: 'n = 6' },
        ],
      },
      xp: 75,
    },

    {
      title: 'The Patrol Route',
      concept: 'Loop with Multiple Conditions',
      description:
        'You patrol a corridor of n steps. Each step holds a different fate:\n\n' +
        '• If the step number is divisible by 3: Step <i>: TRAP! Dodge!\n' +
        '• Else if divisible by 2: Step <i>: Found a coin!\n' +
        '• Otherwise: Step <i>: All clear.\n\n' +
        'After the loop print:\n' +
        'Patrol complete.\n\n' +
        '(Test: n = 6)',
      hints: [
        'Use i % 3 == 0 to check divisibility by 3, i % 2 == 0 for even numbers.',
        'Check % 3 FIRST — order matters! If 6 matches both, it should be a trap.',
        'if (...) { } else if (...) { } else { } inside the for loop body.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint n = sc.nextInt();\n\n// Patrol each step\n\n// Print: Patrol complete.\n',
      validate: {
        type: 'testCases',
        cases: [
          {
            stdin: '6',
            expected:
              'Step 1: All clear.\n' +
              'Step 2: Found a coin!\n' +
              'Step 3: TRAP! Dodge!\n' +
              'Step 4: Found a coin!\n' +
              'Step 5: All clear.\n' +
              'Step 6: TRAP! Dodge!\n' +
              'Patrol complete.\n',
            label: 'n = 6',
          },
        ],
      },
      xp: 100,
    },

    // ─── 4.2 Continue / Break ───

    {
      title: 'The Cursed Corridor',
      concept: 'continue — Skip Iterations',
      description:
        'A corridor of n rooms stretches ahead, but rooms 3 and 7 are cursed — ' +
        'you must skip them entirely!\n\n' +
        'Loop from 1 to n. If i is 3 or 7, use continue to skip.\n' +
        'Otherwise print: Room <i>: safe\n\n' +
        'After the loop: Corridor cleared.\n\n' +
        '(Test: n = 8 → rooms 1,2,4,5,6,8)',
      hints: [
        'continue immediately jumps to the next iteration, skipping the rest of the loop body.',
        'Check: if (i == 3 || i == 7) { continue; }',
        'Place the continue check BEFORE the println so the cursed rooms are never printed.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint n = sc.nextInt();\n\n// Loop 1 to n, skip rooms 3 and 7\n\n// Print: Corridor cleared.\n',
      validate: {
        type: 'testCases',
        cases: [
          {
            stdin: '8',
            expected:
              'Room 1: safe\nRoom 2: safe\nRoom 4: safe\nRoom 5: safe\nRoom 6: safe\nRoom 8: safe\nCorridor cleared.\n',
            label: 'n = 8',
          },
        ],
      },
      xp: 100,
    },

    {
      title: 'The Escape Hatch',
      concept: 'break — Exit a Loop Early',
      description:
        'You are searching for a secret exit. You check rooms one by one, starting from room 1.\n\n' +
        'Read int target (the room with the exit). Loop from 1 to 20:\n' +
        '• If i equals target: print Found the exit at room <i>! and break.\n' +
        '• Otherwise print: Searching room <i>...\n\n' +
        'After the loop: Search ended.\n\n' +
        '(Test: target = 4 → search 1, 2, 3 then find 4)',
      hints: [
        'break immediately exits the loop — no more iterations run.',
        'Check for the target FIRST, print and break. Otherwise print the searching message.',
        'The "Search ended." line is after the loop — it always runs.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint target = sc.nextInt();\n\n// Search rooms 1 to 20\n\n// Print: Search ended.\n',
      validate: {
        type: 'testCases',
        cases: [
          {
            stdin: '4',
            expected:
              'Searching room 1...\nSearching room 2...\nSearching room 3...\nFound the exit at room 4!\nSearch ended.\n',
            label: 'target = 4',
          },
        ],
      },
      xp: 100,
    },

    // ─── 4.3 Nested Loops ───

    {
      title: 'The Dungeon Grid',
      concept: 'Nested for Loops',
      description:
        'You find an ancient map etched into the wall — a grid of symbols. ' +
        'Recreate it to unlock the next passage.\n\n' +
        'Read int rows and int cols. Print a grid of * characters:\n' +
        '• Each row has cols stars separated by spaces\n' +
        '• Each row on its own line\n\n' +
        '(Test: rows=3, cols=4 →\n* * * *\n* * * *\n* * * *)',
      hints: [
        'Outer loop controls rows, inner loop controls columns: for (int i...) { for (int j...) { } }',
        'Use System.out.print("*") inside the inner loop (no newline), then System.out.println() after.',
        'For spaces between stars: if (j > 0) System.out.print(" "); before printing the star.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint rows = sc.nextInt();\nint cols = sc.nextInt();\n\n// Nested loop: print the grid\n',
      validate: {
        type: 'custom',
        check: (r, code) => {
          if (!r.success) return { pass: false, msg: r.errors.split('\n')[0] }
          const lines = r.output.trimEnd().split('\n')
          if (lines.length < 3) return { pass: false, msg: `Expected 3 rows, got ${lines.length}` }
          for (let i = 0; i < 3; i++) {
            const stars = lines[i].trim().split(/\s+/)
            if (stars.length !== 4 || stars.some(s => s !== '*'))
              return { pass: false, msg: `Row ${i + 1} should have 4 stars separated by spaces` }
          }
          if (!code.includes('for') || code.indexOf('for') === code.lastIndexOf('for'))
            return { pass: false, msg: 'Use two nested for loops (one inside the other)' }
          return { pass: true, msg: 'The grid illuminates — the passage opens!' }
        },
      },
      xp: 125,
    },

    {
      title: 'The Staircase',
      concept: 'Nested Loops — Variable Bounds',
      description:
        'A collapsed staircase blocks your path. Rebuild it step by step!\n\n' +
        'Read int height. Print a staircase of * characters:\n' +
        'Row 1: *\n' +
        'Row 2: **\n' +
        'Row 3: ***\n' +
        '...up to the given height.\n\n' +
        '(Test: height = 5)',
      hints: [
        'The inner loop count changes each row — row i prints i stars.',
        'Outer: for (int i = 1; i <= height; i++). Inner: for (int j = 0; j < i; j++).',
        'Use System.out.print("*") in the inner loop, System.out.println() after it.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint height = sc.nextInt();\n\n// Build the staircase\n',
      validate: {
        type: 'testCases',
        cases: [
          {
            stdin: '5',
            expected: '*\n**\n***\n****\n*****\n',
            label: 'height = 5',
          },
        ],
      },
      xp: 125,
    },
  ],
}
