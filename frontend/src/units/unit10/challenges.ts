import { UnitDef } from '../types'

export const UNIT_10: UnitDef = {
  id: 'unit-10',
  number: 10,
  title: 'The Shadow Realm',
  subtitle: 'Exceptions & Strings',
  description:
    'You enter the Shadow Realm — a place where unstable portals throw deadly errors and ancient ciphers guard forgotten knowledge. Master exception handling to survive, and String manipulation to decode the secrets.',
  theme: { primary: '#b366ff', bg: '#140e1e', icon: '👻' },
  challenges: [
    // ─── 10.1-10.3 Exceptions ───

    {
      title: 'The Unstable Portal',
      concept: 'try-catch Basics',
      description:
        'A portal crackles with dangerous energy. Dividing by zero would tear the fabric of reality!\n\n' +
        'Read int divisor. Use try-catch:\n' +
        '• Try: calculate 100 / divisor and print: Result: <value>\n' +
        '• Catch ArithmeticException: print: Error: Cannot divide by zero!\n\n' +
        '(Tests: divisor=5 → "Result: 20", divisor=0 → error message)',
      hints: [
        'try { risky code } catch (ExceptionType e) { handle it }',
        'ArithmeticException is thrown when dividing by zero in Java.',
        'try { int r = 100 / divisor; System.out.println("Result: " + r); } catch (ArithmeticException e) { ... }',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint divisor = sc.nextInt();\n\n// try-catch the division\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '5', expected: 'Result: 20\n', label: 'divisor = 5' },
          { stdin: '0', expected: 'Error: Cannot divide by zero!\n', label: 'divisor = 0' },
        ],
      },
      xp: 100,
    },

    {
      title: 'The Trap Handler',
      concept: 'try-catch-finally',
      description:
        'The portal ALWAYS needs stabilising after use, whether it succeeded or failed!\n\n' +
        'Given int[] runes = {10, 20, 30};\nRead int index. Use try-catch-finally:\n' +
        '• Try: print Rune value: <runes[index]>\n' +
        '• Catch ArrayIndexOutOfBoundsException: print Trap! Index out of bounds.\n' +
        '• Finally: print Portal stabilised. (this ALWAYS runs)\n\n' +
        '(Tests: index=1 → value + stabilised, index=5 → trap + stabilised)',
      hints: [
        'finally { } runs no matter what — even if an exception was caught.',
        'ArrayIndexOutOfBoundsException is thrown when accessing an invalid array index.',
        'The finally block is perfect for cleanup code that must always execute.',
      ],
      starter: 'int[] runes = {10, 20, 30};\nScanner sc = new Scanner(System.in);\nint index = sc.nextInt();\n\n// try-catch-finally\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '1', expected: 'Rune value: 20\nPortal stabilised.\n', label: 'index = 1' },
          { stdin: '5', expected: 'Trap! Index out of bounds.\nPortal stabilised.\n', label: 'index = 5' },
        ],
      },
      xp: 100,
    },

    {
      title: 'The Multi-Trap',
      concept: 'Multiple catch Blocks',
      description:
        'The Shadow Realm throws different curses — you need different shields for each!\n\n' +
        'Read a String input. Try:\n' +
        '1. Parse it as an int with Integer.parseInt(input)\n' +
        '2. Divide 100 by the parsed number\n' +
        '3. Print: Result: <value>\n\n' +
        'Catch NumberFormatException: print Not a number!\n' +
        'Catch ArithmeticException: print Cannot divide by zero!\n\n' +
        '(Tests: "abc" → not a number, "0" → divide by zero, "5" → result 20)',
      hints: [
        'You can chain multiple catch blocks: try { } catch (TypeA e) { } catch (TypeB e) { }',
        'Integer.parseInt("abc") throws NumberFormatException. 100/0 throws ArithmeticException.',
        'Order matters: Java checks catch blocks top to bottom, uses the first match.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nString input = sc.nextLine();\n\n// try with multiple catches\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '5', expected: 'Result: 20\n', label: 'input = "5"' },
          { stdin: 'abc', expected: 'Not a number!\n', label: 'input = "abc"' },
          { stdin: '0', expected: 'Cannot divide by zero!\n', label: 'input = "0"' },
        ],
      },
      xp: 125,
    },

    {
      title: 'The Custom Curse',
      concept: 'Throwing Exceptions',
      description:
        'Sometimes YOU must raise the alarm! Read int age.\n\n' +
        'If age is negative, throw an IllegalArgumentException with message "Age cannot be negative!"\n' +
        'Wrap everything in try-catch:\n' +
        '• If valid: print Valid age: <age>\n' +
        '• If caught: print Error: <exception message>\n\n' +
        '(Tests: 25 → valid, -5 → error)',
      hints: [
        'throw new IllegalArgumentException("message"); creates and throws an exception.',
        'Wrap in try-catch to handle your own thrown exception gracefully.',
        'e.getMessage() retrieves the message you passed to the exception constructor.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nint age = sc.nextInt();\n\n// try: check age, throw if negative. catch: print error message\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: '25', expected: 'Valid age: 25\n', label: 'age = 25' },
          { stdin: '-5', expected: 'Error: Age cannot be negative!\n', label: 'age = -5' },
        ],
      },
      xp: 125,
    },

    // ─── 10.4 Using Strings ───

    {
      title: 'The Cipher Stone',
      concept: 'String Methods: length, charAt, toUpperCase',
      description:
        'An ancient cipher stone reveals its secrets through String methods.\n\n' +
        'Read a String word. Print three things:\n' +
        'Length: <word.length()>\n' +
        'First: <word.charAt(0)>\n' +
        'Upper: <word.toUpperCase()>\n\n' +
        '(Test: "dragon")',
      hints: [
        'word.length() returns the number of characters. word.charAt(0) returns the first character.',
        'word.toUpperCase() returns a NEW string with all letters capitalised (the original is unchanged).',
        'Strings are immutable in Java — methods return new strings, they never modify the original.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nString word = sc.nextLine();\n\n// Print length, first char, uppercase\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: 'dragon', expected: 'Length: 6\nFirst: d\nUpper: DRAGON\n', label: 'word = dragon' },
        ],
      },
      xp: 100,
    },

    {
      title: 'The Secret Message',
      concept: 'substring, indexOf, contains',
      description:
        'A hidden message is encoded in a longer text. You must extract it!\n\n' +
        'Read a String text. Print:\n' +
        'Contains "shadow": <text.contains("shadow")>\n' +
        'Position: <text.indexOf("shadow")>\n' +
        'First 6 chars: <text.substring(0, 6)>\n\n' +
        '(Test: "In the shadow realm")',
      hints: [
        'text.contains("shadow") returns true/false. text.indexOf("shadow") returns the starting position (or -1).',
        'text.substring(0, 6) extracts characters from index 0 up to (but not including) index 6.',
        'Remember: String indexing starts at 0, just like arrays.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nString text = sc.nextLine();\n\n// Print contains, indexOf, substring\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: 'In the shadow realm', expected: 'Contains "shadow": true\nPosition: 7\nFirst 6 chars: In the\n', label: '"In the shadow realm"' },
        ],
      },
      xp: 100,
    },

    {
      title: 'The Word Splitter',
      concept: 'split, trim, replace',
      description:
        'A cursed scroll has words separated by commas with messy spaces. Clean it up!\n\n' +
        'Read a String. Split by comma, then for each piece: trim whitespace and print it.\n' +
        'After the loop, print the original with "dark" replaced by "light".\n\n' +
        '(Test: " sword , dark shield , potion ")',
      hints: [
        'String[] parts = text.split(","); splits on commas into an array of strings.',
        'part.trim() removes leading and trailing whitespace from a string.',
        'text.replace("dark", "light") returns a new string with all occurrences swapped.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nString text = sc.nextLine();\n\n// Split by comma, trim each, print\n// Then replace "dark" with "light" and print\n',
      validate: {
        type: 'testCases',
        cases: [
          {
            stdin: ' sword , dark shield , potion ',
            expected: 'sword\ndark shield\npotion\n sword , light shield , potion \n',
            label: 'comma-separated items',
          },
        ],
      },
      xp: 100,
    },

    {
      title: 'The Palindrome Gate',
      concept: 'String Comparison & Reversal',
      description:
        'The gate to the final chamber opens only for palindromes — words that read the same forwards and backwards.\n\n' +
        'Read a String. Build its reverse using a loop, then compare:\n' +
        'Reversed: <reversed string>\n' +
        'Palindrome: <true/false>\n\n' +
        'Use .equals() for comparison, NOT ==\n\n' +
        '(Tests: "racecar" → true, "dragon" → false)',
      hints: [
        'Build reversed: loop from the last character to the first, appending each to a new String.',
        'for (int i = word.length() - 1; i >= 0; i--) { reversed += word.charAt(i); }',
        'NEVER use == to compare Strings in Java! Use word.equals(reversed) instead.',
      ],
      starter: 'Scanner sc = new Scanner(System.in);\nString word = sc.nextLine();\n\n// Build the reversed string\n// Print reversed and whether it is a palindrome\n',
      validate: {
        type: 'testCases',
        cases: [
          { stdin: 'racecar', expected: 'Reversed: racecar\nPalindrome: true\n', label: 'racecar (palindrome)' },
          { stdin: 'dragon', expected: 'Reversed: nogard\nPalindrome: false\n', label: 'dragon (not palindrome)' },
        ],
      },
      xp: 125,
    },

    // ─── BONUS: Predict the Output ───
    {
      title: 'The Shadow Oracle',
      concept: 'Predict the Output',
      description:
        'The Oracle of Shadows shows you this code. "What does it print?" she asks.\n\n' +
        'Type the EXACT output — trace through the try-catch carefully.',
      hints: [
        'Integer.parseInt("hello") will throw NumberFormatException — what does the catch do?',
        'The catch prints "Caught!" and then execution continues AFTER the try-catch block.',
        '"Before" prints, then the exception is caught, "Caught!" prints, then "After" prints.',
      ],
      starter: '',
      validate: {
        type: 'predict',
        code: 'System.out.println("Before");\ntry {\n    int x = Integer.parseInt("hello");\n    System.out.println("Inside: " + x);\n} catch (NumberFormatException e) {\n    System.out.println("Caught!");\n}\nSystem.out.println("After");',
      },
      xp: 75,
    },

    // ─── BONUS: Find the Bug ───
    {
      title: 'The Cracked Mirror',
      concept: 'Find & Fix the Bug',
      description:
        'This code should check if two strings are equal, but it uses == instead of .equals()!\n\n' +
        'Fix it so it prints:\nEqual: true',
      hints: [
        '== compares memory addresses (references), not content. Two different String objects with the same text are == false.',
        'Use .equals() to compare String content: a.equals(b)',
        'Change the == to .equals() in the comparison.',
      ],
      starter: 'String a = new String("shadow");\nString b = new String("shadow");\nboolean same = (a == b);  // BUG HERE\nSystem.out.println("Equal: " + same);\n',
      validate: {
        type: 'bugfix',
        expected: 'Equal: true',
      },
      xp: 75,
    },
  ],
}
