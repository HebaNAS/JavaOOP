import { UnitDef } from '../types'

export const UNIT_5: UnitDef = {
  id: 'unit-5',
  number: 5,
  title: 'The Armoury',
  subtitle: 'Arrays',
  description:
    'You enter the Armoury — rows of weapons line the walls, each rack numbered and organised. To manage this arsenal, you must learn to store, access, and manipulate collections of data.',
  theme: { primary: '#f4a62a', bg: '#1a1508', icon: '🗡️' },
  challenges: [
    // ─── 5.1 Introduction to Arrays ───

    {
      title: 'The Weapon Rack',
      concept: 'Declaring Arrays & for-each',
      description:
        'The master smith shows you a rack of freshly forged blades, each with a damage rating.\n\n' +
        'Declare this array:\n' +
        '  int[] damage = {10, 25, 15, 30, 20};\n\n' +
        'Use a for-each loop to print each value on its own line.',
      hints: [
        'A for-each loop: for (int d : damage) { System.out.println(d); }',
        'The variable d takes the value of each element in order — no index needed.',
        'Unlike a regular for loop, for-each cannot modify the array or know the position.',
      ],
      starter: '// Declare the damage array\n\n// For-each loop to print each value\n',
      validate: {
        type: 'output',
        expected: '10\n25\n15\n30\n20\n',
      },
      xp: 75,
    },

    {
      title: 'The Inventory Count',
      concept: 'Array Indexing & .length',
      description:
        'The quartermaster keeps a manifest of supplies:\n' +
        '  String[] items = {"Sword", "Shield", "Potion", "Bow", "Helmet"};\n\n' +
        'Read an int index from the adventurer. Print:\n' +
        'Item at position <index>: <item>\n' +
        'Total items: <length>\n\n' +
        '(Test: index = 2 → Potion, total = 5)',
      hints: [
        'Access an element: items[index] — indexing starts at 0.',
        'The array length: items.length (no parentheses — it is a field, not a method).',
        'Position 0 = Sword, 1 = Shield, 2 = Potion, 3 = Bow, 4 = Helmet.',
      ],
      starter: 'String[] items = {"Sword", "Shield", "Potion", "Bow", "Helmet"};\nScanner sc = new Scanner(System.in);\nint index = sc.nextInt();\n\n// Print the item and the total count\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '2', expected: 'Item at position 2: Potion\nTotal items: 5\n', label: 'index = 2' },
          { stdin: '0', expected: 'Item at position 0: Sword\nTotal items: 5\n', label: 'index = 0' },
        ],
      },
      xp: 75,
    },

    {
      title: 'The Forge Ledger',
      concept: 'Looping Through Arrays',
      description:
        'The forge master needs an account of today\'s sales:\n' +
        '  int[] prices = {120, 85, 200, 50, 175};\n\n' +
        'Calculate and print:\n' +
        'Total: <sum>\n' +
        'Average: <sum / length>\n\n' +
        '(Hint: integer division is fine — 630 / 5 = 126)',
      hints: [
        'Declare int total = 0; then loop: for (int p : prices) { total += p; }',
        'total += p is shorthand for total = total + p.',
        'Average: total / prices.length — both are ints, so the result is an int.',
      ],
      starter: 'int[] prices = {120, 85, 200, 50, 175};\n\n// Calculate total and average\n',
      validate: {
        type: 'custom',
        check: (r) => {
          if (!r.success) return { pass: false, msg: r.errors.split('\n')[0] }
          if (!r.output.includes('630')) return { pass: false, msg: 'Total should be 630' }
          if (!/126(\.0)?/.test(r.output)) return { pass: false, msg: 'Average should be 126 (630 / 5)' }
          return { pass: true, msg: 'The ledger balances — every coin accounted for!' }
        },
      },
      xp: 100,
    },

    {
      title: 'The Sorting Shelf',
      concept: 'Finding Min & Max',
      description:
        'The armour inspector must identify the strongest and weakest pieces on the shelf:\n' +
        '  int[] power = {45, 12, 78, 33, 91, 56};\n\n' +
        'Find and print:\n' +
        'Max: <highest value>\n' +
        'Min: <lowest value>\n\n' +
        '(No sorting needed — just scan through once!)',
      hints: [
        'Start with max = power[0] and min = power[0], then loop through the rest.',
        'Inside the loop: if (power[i] > max) max = power[i]; — same pattern for min.',
        'You can use a for-each or a regular for loop — both work.',
      ],
      starter: 'int[] power = {45, 12, 78, 33, 91, 56};\n\n// Find max and min\n',
      validate: {
        type: 'output',
        expected: 'Max: 91\nMin: 12\n',
      },
      xp: 100,
    },

    // ─── 5.2 Multi-Dimensional Arrays ───

    {
      title: 'The Storage Grid',
      concept: '2D Arrays — Creation & Printing',
      description:
        'The armoury stores items in a grid of shelves — rows and columns.\n\n' +
        'Read int rows and int cols. Create a 2D array where each cell holds a multiplication value:\n' +
        '  grid[i][j] = (i + 1) * (j + 1)\n\n' +
        'Print the grid, one row per line, values separated by spaces.\n\n' +
        '(Test: rows=3, cols=4 →\n1 2 3 4\n2 4 6 8\n3 6 9 12)',
      hints: [
        'Declare: int[][] grid = new int[rows][cols]; then fill with nested loops.',
        'Fill: grid[i][j] = (i + 1) * (j + 1); inside the inner loop.',
        'Print: loop again, using System.out.print with spaces, println after each row.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint rows = sc.nextInt();\nint cols = sc.nextInt();\n\n// Create, fill, and print the grid\n',
      validate: {
        type: 'custom',
        stdin: '3\n4',
        check: (r, code) => {
          if (!r.success) return { pass: false, msg: r.errors.split('\n')[0] }
          const lines = r.output.trimEnd().split('\n')
          if (lines.length < 3) return { pass: false, msg: `Expected 3 rows, got ${lines.length}` }
          const expected = [[1,2,3,4],[2,4,6,8],[3,6,9,12]]
          for (let i = 0; i < 3; i++) {
            const nums = lines[i].trim().split(/\s+/).map(Number)
            if (nums.length !== 4 || nums.some((n, j) => n !== expected[i][j]))
              return { pass: false, msg: `Row ${i + 1}: expected "${expected[i].join(' ')}" but got "${lines[i].trim()}"` }
          }
          if (!code.includes('int[][]') && !code.includes('int [][]'))
            return { pass: false, msg: 'Declare a 2D array with int[][]' }
          return { pass: true, msg: 'The storage grid is catalogued — every shelf accounted for!' }
        },
      },
      xp: 125,
    },

    {
      title: 'The Treasure Map',
      concept: '2D Array Access & Traversal',
      description:
        'An old map carved into the wall reveals treasure values at each location:\n\n' +
        '  int[][] map = {{5, 3, 8}, {2, 9, 1}, {7, 4, 6}};\n\n' +
        'Read int row and int col. Print:\n' +
        'Value at [<row>][<col>]: <value>\n\n' +
        'Then loop through ALL cells and print:\n' +
        'Map total: <sum of all values>\n\n' +
        '(Test: row=1, col=1 → value 9, total 45)',
      hints: [
        'Access: map[row][col] gives the value at that position.',
        'To sum everything: nested loop, add each map[i][j] to a total variable.',
        'map.length = number of rows, map[0].length = number of columns.',
      ],
      starter: 'int[][] map = {{5, 3, 8}, {2, 9, 1}, {7, 4, 6}};\nScanner sc = new Scanner(System.in);\nint row = sc.nextInt();\nint col = sc.nextInt();\n\n// Print the value at [row][col]\n// Sum all values and print the total\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '1\n1', expected: 'Value at [1][1]: 9\nMap total: 45\n', label: 'row=1, col=1' },
          { stdin: '0\n2', expected: 'Value at [0][2]: 8\nMap total: 45\n', label: 'row=0, col=2' },
        ],
      },
      xp: 125,
    },
  ],
}
