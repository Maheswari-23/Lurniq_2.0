// src/components/phase2/CapsuleViewer.jsx
// Full-screen modal overlay: Loading → Content → Quiz → Result flow.
// Falls back to FALLBACK_TEMPLATES when backend is offline.
import React, { useState, useEffect, useRef } from 'react';
import MicroCapsule from './MicroCapsule';
import QuizBlock from './QuizBlock';
import { generateCapsule, logInteraction, updateVarkProbabilities } from '../../services/capsuleService';

// ---------------------------------------------------------------------------
// Client-side fallback template bank — all 10 topics × 4 modalities.
// The backend mirrors this structure; used when Flask is offline.
// ---------------------------------------------------------------------------
const FALLBACK_TEMPLATES = {
    /* ── VARIABLES & DATA TYPES ────────── */
    variables_Visual: {
        learning_objective: 'Understand variables as labeled containers that store data values.',
        analogy: 'A variable is like a labeled box — it has a name and can hold any value.',
        diagram: [
            '  ┌──────────────────────┐',
            '  │  name = "Alice"      │  ← str',
            '  └──────────────────────┘',
            '  ┌──────────────────────┐',
            '  │  age  = 25           │  ← int',
            '  └──────────────────────┘',
            '  ┌──────────────────────┐',
            '  │  score = 9.8         │  ← float',
            '  └──────────────────────┘',
        ],
        color_code: [
            { label: 'name', color: '#7B61FF', value: '"Alice"', type: 'str' },
            { label: 'age', color: '#F97AFE', value: '25', type: 'int' },
            { label: 'score', color: '#10B981', value: '9.8', type: 'float' },
        ],
        steps: [
            '1. Choose a descriptive name (snake_case).',
            '2. Use = to assign a value: age = 25.',
            '3. Python infers the type automatically.',
            '4. Reassign any time: age = 26.',
        ],
    },
    variables_Auditory: {
        learning_objective: 'Understand variables through spoken analogies and rhythm.',
        analogy: 'When you say "name = Alice", you are telling Python: whenever I say name, I mean Alice.',
        narrative: [
            'Variables are just nicknames Python uses to remember data.',
            'Writing name = "Alice" is like putting a sticky note on a box that says "Alice".',
            'You can open that box anytime and swap the contents.',
            'The rhythm: NAME — equals — VALUE. Say it loud three times.',
        ],
        mnemonic: 'N-A-V: Name → Assign (=) → Value',
        analogy_spoken: 'If a variable were a song lyric: label, hold, change, repeat.',
    },
    variables_Reading: {
        learning_objective: 'Understand variables through structured definitions and examples.',
        definition: 'A variable is a named reference to a memory location. In Python, variables are dynamically typed — the type is inferred from the value assigned.',
        syntax: 'variable_name = value',
        notes: [
            '• Start with a letter or underscore.',
            '• Case-sensitive: Age ≠ age.',
            '• Convention: snake_case (user_name).',
            '• Python is dynamically typed.',
        ],
        examples: [
            { code: "name = 'Alice'", explanation: 'Stores a string.' },
            { code: 'age = 25', explanation: 'Stores an integer.' },
            { code: 'pi = 3.14', explanation: 'Stores a float.' },
        ],
        key_terms: [
            { term: 'Variable', definition: 'Named reference to memory.' },
            { term: 'Assignment', definition: 'Binding a name to a value.' },
            { term: 'Data Type', definition: 'int, float, str, bool, etc.' },
        ],
    },
    variables_Kinesthetic: {
        learning_objective: 'Understand variables by writing them.',
        analogy: 'A variable is a labeled container — you decide the label and the contents.',
        challenge: {
            instruction: 'Fix the code so it prints: Hello, Alice! You are 25 years old.',
            starter: 'name = "??"\nage = ??\nprint(f"Hello, {name}! You are {age} years old.")',
            solution: 'name = "Alice"\nage = 25\nprint(f"Hello, {name}! You are {age} years old.")',
            hints: ['Replace ?? in the string with a name inside quotes.', 'Replace the numeric ?? with 25.'],
        },
    },

    /* ── OPERATORS ──────────────────────── */
    operators_Visual: {
        learning_objective: 'Understand the types of operators and their visual precedence.',
        diagram: [
            '  Arithmetic:  +  -  *  /  //  %  **',
            '  Comparison:  ==  !=  >  <  >=  <=',
            '  Logical:     and  or  not',
            '  Assignment:  =  +=  -=  *=  /=',
            '  Bitwise:     &  |  ^  ~  <<  >>',
            '',
            '  Precedence (high → low):',
            '    **  →  * / // %  →  + -  →  comparisons  →  logical',
        ],
        color_code: [
            { label: 'Arithmetic', color: '#7B61FF', value: '+  -  *  /  //  %  **', type: 'group' },
            { label: 'Comparison', color: '#F97AFE', value: '==  !=  >  <  >=  <=', type: 'group' },
            { label: 'Logical', color: '#10B981', value: 'and  or  not', type: 'group' },
        ],
        steps: [
            '1. Use arithmetic operators for maths.',
            '2. Use comparison operators to produce True/False.',
            '3. Use logical operators to combine conditions.',
            '4. Mind operator precedence: ** before * before +.',
        ],
    },
    operators_Auditory: {
        learning_objective: 'Understand operators through spoken explanation and mnemonics.',
        analogy: 'Operators are verbs — they do things to nouns (values).',
        narrative: [
            'The = sign assigns — it does not check equality. To check, use ==.',
            'The and operator needs BOTH sides true. or needs just ONE.',
            'Think of % as dividing and keeping only the remainder — "what\'s left over".',
            '** is power: 2**3 says "2 to the power 3" — spoken as "two-cubed".',
        ],
        mnemonic: 'PEMDAS maps to: ** then */ then +-',
        analogy_spoken: 'Logical operators: "and" is strict, "or" is generous, "not" is a flip.',
    },
    operators_Reading: {
        learning_objective: 'Understand operators through definitions, tables, and examples.',
        definition: 'Operators are symbols that perform operations on values (operands). Python operators include arithmetic, comparison, logical, assignment, and bitwise categories.',
        syntax: 'result = operand1 operator operand2',
        notes: [
            '• = assigns; == compares.',
            '• // is floor division; % is modulo.',
            '• ** raises to a power.',
            '• Short-circuit: and stops on first False; or stops on first True.',
        ],
        examples: [
            { code: '7 % 3', explanation: 'Returns 1 (remainder).' },
            { code: '2 ** 8', explanation: 'Returns 256.' },
            { code: '5 != 5', explanation: 'Returns False.' },
            { code: 'True or False', explanation: 'Returns True.' },
        ],
        key_terms: [
            { term: 'Operand', definition: 'Value an operator acts on.' },
            { term: 'Precedence', definition: 'Order operators are applied.' },
            { term: 'Modulo %', definition: 'Returns the division remainder.' },
        ],
    },
    operators_Kinesthetic: {
        learning_objective: 'Understand operators by predicting and writing expressions.',
        analogy: 'Operators are like a calculator\'s buttons — each does a specific thing.',
        challenge: {
            instruction: 'Write expressions that produce: remainder of 17÷5, True when x>10 and x<20 (x=15), and 2 to the power 8.',
            starter: 'remainder = ??\nin_range = ??\npower    = ??\nprint(remainder, in_range, power)',
            solution: 'remainder = 17 % 5\nin_range = 15 > 10 and 15 < 20\npower    = 2 ** 8\nprint(remainder, in_range, power)',
            hints: ['% returns the division remainder.', 'Chain comparisons with and.'],
        },
    },

    /* ── CONDITIONALS ───────────────────── */
    conditionals_Visual: {
        learning_objective: 'Understand if-else branching via flowchart diagrams.',
        diagram: [
            '      START',
            '        ↓',
            '   ◇ condition? ◇',
            '   ↓ True    ↓ False',
            '  [if body] [else body]',
            '       ↓         ↓',
            '      END←←←←←←←',
        ],
        color_code: [
            { label: 'if', color: '#7B61FF', value: 'if condition:', type: 'keyword' },
            { label: 'elif', color: '#F97AFE', value: 'elif condition:', type: 'keyword' },
            { label: 'else', color: '#10B981', value: 'else:', type: 'keyword' },
        ],
        steps: ['1. Write the if and its condition.', '2. Indent the body.', '3. Add elif for extra branches.', '4. Add else as the final fallback.'],
    },
    conditionals_Auditory: {
        learning_objective: 'Understand conditionals through spoken decision flow.',
        analogy: 'An if-else is a fork in the road: Python picks one path based on the condition.',
        narrative: [
            '"If it is raining, take an umbrella. Otherwise, wear sunglasses." — that is an if-else.',
            'elif means "else if" — a new question only asked when the previous answer was No.',
            'Python evaluates conditions top-down and takes the first True branch.',
            'match-case in Python 3.10+ is the equivalent of a switch statement.',
        ],
        mnemonic: 'IF → ELIF → ELSE: read it as "if not, then if not, then finally".',
        analogy_spoken: 'Short-circuit: Python stops checking as soon as it finds a True.',
    },
    conditionals_Reading: {
        learning_objective: 'Understand conditionals through syntax and rules.',
        definition: 'Conditional statements control execution flow. if checks a condition; elif provides additional checks; else handles all remaining cases.',
        syntax: 'if condition:\n    body\nelif other_condition:\n    body\nelse:\n    body',
        notes: [
            '• Conditions must be boolean expressions.',
            '• elif can appear multiple times; else at most once.',
            '• Python 3.10+ supports match-case (structural pattern matching).',
            '• Short-circuit evaluation avoids unnecessary checks.',
        ],
        examples: [
            { code: 'if x > 0:\n    print("pos")', explanation: 'Runs when x > 0.' },
            { code: 'if x>0: ...\nelif x<0: ...\nelse: ...', explanation: 'Three-way branch.' },
        ],
        key_terms: [
            { term: 'Condition', definition: 'Expression that evaluates to True/False.' },
            { term: 'Short-circuit', definition: 'Stop evaluating when result is known.' },
            { term: 'match-case', definition: 'Python 3.10 structural pattern matching.' },
        ],
    },
    conditionals_Kinesthetic: {
        learning_objective: 'Write and debug conditional logic hands-on.',
        analogy: 'A conditional is a decision gate — only one door opens.',
        challenge: {
            instruction: 'Write code that prints "Positive", "Negative", or "Zero" based on x = -7.',
            starter: 'x = -7\n# Your if-elif-else here',
            solution: 'x = -7\nif x > 0:\n    print("Positive")\nelif x < 0:\n    print("Negative")\nelse:\n    print("Zero")',
            hints: ['Use if x > 0 first.', 'Chain with elif x < 0.'],
        },
    },

    /* ── LOOPS ──────────────────────────── */
    loops_Visual: {
        learning_objective: 'Visualise loop execution as a repeated cycle.',
        analogy: 'A loop is like a hamster wheel — it keeps spinning until a condition says stop.',
        diagram: [
            '  START → ◇ condition? ◇ → False → EXIT',
            '               ↓ True',
            '           [loop body]',
            '               ↓',
            '          ←←←←←←←←←←←',
        ],
        color_code: [
            { label: 'for', color: '#7B61FF', value: 'for i in range(5):', type: 'keyword' },
            { label: 'body', color: '#F97AFE', value: '    print(i)', type: 'body' },
            { label: 'range', color: '#10B981', value: 'range(start,stop)', type: 'function' },
        ],
        steps: ['1. Write for i in range(n):.', '2. Indent the body.', '3. Each iteration i increments.', '4. Loop exits when range is exhausted.'],
    },
    loops_Auditory: {
        learning_objective: 'Understand loops through narrative and rhythm.',
        analogy: 'A loop is a playlist that plays every song and then stops.',
        narrative: [
            'A for loop says: for every item in this sequence, do something.',
            'range(5) is a playlist of five tracks: 0, 1, 2, 3, 4.',
            'When the playlist ends, the loop ends.',
            'Chant: FOR — EACH — ITEM — DO. That is the for-loop beat.',
        ],
        mnemonic: 'break = eject the disc; continue = skip this track.',
        analogy_spoken: 'A while loop says: keep going as long as this is true.',
    },
    loops_Reading: {
        learning_objective: 'Understand loop syntax, keywords, and patterns.',
        definition: 'A loop repeats a block of code. for iterates over a sequence; while repeats while a condition is True.',
        syntax: 'for variable in iterable:\n    body\n\nwhile condition:\n    body',
        notes: [
            '• range(n) → 0 to n-1; range(a,b) → a to b-1.',
            '• break exits immediately.',
            '• continue skips current iteration.',
            '• Avoid infinite loops: ensure condition becomes False.',
        ],
        examples: [
            { code: 'for i in range(3):\n    print(i)', explanation: 'Prints 0, 1, 2.' },
            { code: 'while x > 0:\n    x -= 1', explanation: 'Decrements to 0.' },
        ],
        key_terms: [
            { term: 'Iteration', definition: 'One pass through the loop body.' },
            { term: 'range()', definition: 'Generates a numeric sequence.' },
            { term: 'break', definition: 'Exits the loop immediately.' },
        ],
    },
    loops_Kinesthetic: {
        learning_objective: 'Write loops by fixing and completing code.',
        analogy: 'A loop is a stamp that presses as many times as you tell it.',
        challenge: {
            instruction: 'Fix the code to print numbers 1 through 5.',
            starter: 'for i in range(??, ??):\n    print(i)',
            solution: 'for i in range(1, 6):\n    print(i)',
            hints: ['range(start, stop) — stop is exclusive.', 'To include 5, use 6 as stop.'],
        },
    },

    /* ── FUNCTIONS ──────────────────────── */
    functions_Visual: {
        learning_objective: 'Understand function anatomy via a visual breakdown.',
        diagram: [
            '  def function_name(param1, param2):',
            '      """Docstring"""',
            '      # body',
            '      return result',
            '',
            '  ┌──────────┐  call   ┌─────────────┐',
            '  │  Caller  │ ──────► │  Function   │',
            '  │          │ ◄────── │  (returns)  │',
            '  └──────────┘  result └─────────────┘',
        ],
        color_code: [
            { label: 'def', color: '#7B61FF', value: 'def name(params):', type: 'keyword' },
            { label: 'return', color: '#F97AFE', value: 'return value', type: 'keyword' },
            { label: 'call', color: '#10B981', value: 'result = name(args)', type: 'call' },
        ],
        steps: ['1. def + name + parameters + colon.', '2. Indent the body.', '3. Use return to send back a value.', '4. Call the function with arguments.'],
    },
    functions_Auditory: {
        learning_objective: 'Understand functions through spoken explanation.',
        analogy: 'A function is a recipe: you give it ingredients (args) and it produces a dish (return value).',
        narrative: [
            'def tells Python: here comes a recipe. Give it a name and list the ingredients.',
            'When you call the function, Python follows the recipe and hands you the result.',
            'Default parameters let you skip optional ingredients.',
            '*args collects extra positional arguments; **kwargs collects extra keyword ones.',
        ],
        mnemonic: 'DRY — Don\'t Repeat Yourself. Functions are how you avoid copy-pasting.',
        analogy_spoken: 'scope: variables inside a function are invisible outside it.',
    },
    functions_Reading: {
        learning_objective: 'Understand function syntax, scope, and types.',
        definition: 'A function is a named, reusable block of code. It accepts parameters, executes a body, and optionally returns a value.',
        syntax: 'def name(param1, param2=default):\n    """Docstring."""\n    return result',
        notes: [
            '• Functions without return → return None.',
            '• Lambda: lambda x: x * 2 — anonymous single expression.',
            '• Local variables are scoped to the function.',
            '• *args → tuple; **kwargs → dict.',
        ],
        examples: [
            { code: 'def add(a, b):\n    return a + b', explanation: 'Returns sum.' },
            { code: 'square = lambda x: x**2', explanation: 'Lambda function.' },
        ],
        key_terms: [
            { term: 'Parameter', definition: 'Variable in function definition.' },
            { term: 'Argument', definition: 'Value passed at call time.' },
            { term: 'Scope', definition: 'Region where a variable is visible.' },
        ],
    },
    functions_Kinesthetic: {
        learning_objective: 'Write functions to encapsulate logic.',
        analogy: 'A function is a vending machine — insert inputs, receive output.',
        challenge: {
            instruction: 'Write a function greet(name, greeting="Hello") that returns "Hello, Alice!" when called as greet("Alice").',
            starter: 'def greet(??, ??="Hello"):\n    return ??',
            solution: 'def greet(name, greeting="Hello"):\n    return f"{greeting}, {name}!"',
            hints: ['Use an f-string to combine greeting and name.', 'Default value goes in the signature.'],
        },
    },

    /* ── ARRAYS & STRINGS ───────────────── */
    arrays_Visual: {
        learning_objective: 'Visualise arrays and string structures with index diagrams.',
        diagram: [
            '  lst = [10, 20, 30, 40, 50]',
            '  idx:   0   1   2   3   4',
            '  neg:  -5  -4  -3  -2  -1',
            '',
            '  "P  y  t  h  o  n"',
            '   0  1  2  3  4  5',
        ],
        color_code: [
            { label: 'index', color: '#7B61FF', value: 'lst[0] → 10', type: 'access' },
            { label: 'slice', color: '#F97AFE', value: 'lst[1:3] → [20,30]', type: 'slice' },
            { label: 'method', color: '#10B981', value: 'lst.append(60)', type: 'mutate' },
        ],
        steps: ['1. Access elements with index.', '2. Slice with [start:stop].', '3. append() adds to end.', '4. len() returns count.'],
    },
    arrays_Auditory: {
        learning_objective: 'Understand arrays and strings through spoken metaphors.',
        analogy: 'An array is a numbered shelf — each item has a fixed slot. Strings are arrays you cannot modify.',
        narrative: [
            'Index 0 is always the first slot — Python counts from zero.',
            'Slicing is like tearing out pages 2 to 4 from a book — you get a copy.',
            'Strings are immutable: you cannot change "hello" directly; you create a new one.',
            '"hello".upper() does not modify hello — it returns a new uppercase version.',
        ],
        mnemonic: 'len() is the librarian — ask it how many books are on the shelf.',
        analogy_spoken: 'join() is the glue; split() is the scissors.',
    },
    arrays_Reading: {
        learning_objective: 'Understand array and string operations through definitions.',
        definition: 'A list is a mutable ordered sequence. A string is an immutable ordered sequence of characters. Both support indexing and slicing.',
        syntax: 'lst[i]         # access\nlst[a:b]       # slice\nlst.append(x)  # mutate\nlen(lst)       # length',
        notes: [
            '• Indices start at 0; negative indices from end.',
            '• Slicing: lst[start:stop:step].',
            '• Strings: immutable — operations return new strings.',
            '• Common methods: split, join, strip, replace, upper, lower.',
        ],
        examples: [
            { code: 'lst = [1,2,3]; lst[1]', explanation: 'Returns 2.' },
            { code: '"hello"[::-1]', explanation: 'Returns "olleh".' },
            { code: '"a,b,c".split(",")', explanation: 'Returns ["a","b","c"].' },
        ],
        key_terms: [
            { term: 'Indexing', definition: 'Accessing element by position.' },
            { term: 'Slicing', definition: 'Extracting a sub-sequence.' },
            { term: 'Immutable', definition: 'Cannot be changed after creation.' },
        ],
    },
    arrays_Kinesthetic: {
        learning_objective: 'Manipulate arrays and strings in code.',
        analogy: 'An array is a train — each carriage is a slot.',
        challenge: {
            instruction: 'Given lst = [3,1,4,1,5,9], print the last element, the reversed list, and its length.',
            starter: 'lst = [3,1,4,1,5,9]\nprint(lst[??])\nprint(lst[??])\nprint(??)',
            solution: 'lst = [3,1,4,1,5,9]\nprint(lst[-1])\nprint(lst[::-1])\nprint(len(lst))',
            hints: ['Negative index -1 gives the last element.', '[::-1] reverses any sequence.'],
        },
    },

    /* ── RECURSION ──────────────────────── */
    recursion_Visual: {
        learning_objective: 'Visualise recursion as nested function frames.',
        diagram: [
            '  fact(4)',
            '   └─ 4 × fact(3)',
            '           └─ 3 × fact(2)',
            '                   └─ 2 × fact(1)',
            '                           └─ 1  ← BASE CASE',
            '  Unwinds: 1 → 2 → 6 → 24',
        ],
        color_code: [
            { label: 'base case', color: '#10B981', value: 'if n == 1: return 1', type: 'base' },
            { label: 'recursive', color: '#7B61FF', value: 'return n * fact(n-1)', type: 'recursive' },
        ],
        steps: ['1. Identify the base case (smallest input).', '2. Call the function with a SIMPLER input.', '3. Trust the recursion to resolve.', '4. Unwind builds the answer.'],
    },
    recursion_Auditory: {
        learning_objective: 'Understand recursion as a function calling itself.',
        analogy: 'Recursion is like standing between two mirrors — each reflection shows a smaller version.',
        narrative: [
            'A recursive function calls itself with a simpler problem until it hits the base case.',
            'Without a base case, the mirrors face each other forever — stack overflow!',
            'factorial(4) = 4 × factorial(3) = 4 × 3 × factorial(2) = ... = 24.',
            'Each call waits for the one inside it to finish — the call stack is the waiting room.',
        ],
        mnemonic: 'BASE case BREAKS the chain; RECURSIVE case REDUCES the problem.',
        analogy_spoken: 'Memoization is a notepad — write down results to avoid recalculating.',
    },
    recursion_Reading: {
        learning_objective: 'Understand recursion through formal definitions and patterns.',
        definition: 'Recursion is a technique where a function calls itself with a smaller sub-problem. Every recursive function needs a base case to terminate.',
        syntax: 'def fact(n):\n    if n <= 1:      # base case\n        return 1\n    return n * fact(n - 1)  # recursive case',
        notes: [
            '• Base case prevents infinite recursion.',
            '• Each call adds a frame to the call stack.',
            '• Memoization caches results to improve performance.',
            '• Tail recursion can be optimised by some compilers.',
        ],
        examples: [
            { code: 'fact(3) = 3*fact(2) = 3*2*fact(1) = 6', explanation: 'Factorial unwind.' },
            { code: 'fib(n) = fib(n-1) + fib(n-2)', explanation: 'Fibonacci pattern.' },
        ],
        key_terms: [
            { term: 'Base Case', definition: 'Condition that stops recursion.' },
            { term: 'Call Stack', definition: 'Memory storing active calls.' },
            { term: 'Memoization', definition: 'Caching results to avoid recomputation.' },
        ],
    },
    recursion_Kinesthetic: {
        learning_objective: 'Write recursive functions from scratch.',
        analogy: 'Recursion peels an onion — each layer reveals a smaller onion until you hit the core.',
        challenge: {
            instruction: 'Write a recursive function sum_list(lst) that returns the sum of all elements.',
            starter: 'def sum_list(lst):\n    if len(lst) == ??:\n        return ??\n    return lst[0] + sum_list(??)',
            solution: 'def sum_list(lst):\n    if len(lst) == 0:\n        return 0\n    return lst[0] + sum_list(lst[1:])',
            hints: ['Base case: empty list returns 0.', 'Recursive: add first element + sum of rest.'],
        },
    },

    /* ── OOP ────────────────────────────── */
    oop_Visual: {
        learning_objective: 'Visualise OOP pillars: class, object, inheritance.',
        diagram: [
            '  class Animal:             ← Blueprint',
            '      def __init__(self, name):',
            '          self.name = name  ← Attribute',
            '      def speak(self):      ← Method',
            '          pass',
            '',
            '  class Dog(Animal):        ← Inherits Animal',
            '      def speak(self):',
            '          return "Woof!"    ← Overrides',
        ],
        color_code: [
            { label: 'class', color: '#7B61FF', value: 'class Dog(Animal):', type: 'definition' },
            { label: 'init', color: '#F97AFE', value: 'def __init__(self):', type: 'constructor' },
            { label: 'inherit', color: '#10B981', value: 'Dog inherits Animal', type: 'concept' },
        ],
        steps: ['1. Define class with attributes in __init__.', '2. Add methods to define behaviour.', '3. Inherit with class Sub(Parent):.', '4. Override methods for specialisation.'],
    },
    oop_Auditory: {
        learning_objective: 'Understand OOP through spoken analogies.',
        analogy: 'A class is a blueprint; an object is the house built from it.',
        narrative: [
            'Encapsulation bundles data and behaviour together — the object manages its own state.',
            'Inheritance lets a subclass reuse and extend a parent class — "is-a" relationship.',
            'Polymorphism lets different objects respond to the same message differently.',
            'self refers to the current instance — its how the object talks to itself.',
        ],
        mnemonic: 'APIE — Abstraction, Polymorphism, Inheritance, Encapsulation.',
        analogy_spoken: '__init__ is the birth certificate — it sets up the object when created.',
    },
    oop_Reading: {
        learning_objective: 'Understand OOP through definitions and syntax rules.',
        definition: 'Object-Oriented Programming models software using classes (blueprints) and objects (instances). The four pillars are Encapsulation, Inheritance, Polymorphism, and Abstraction.',
        syntax: 'class Dog(Animal):\n    def __init__(self, name):\n        super().__init__(name)\n    def speak(self):\n        return "Woof!"',
        notes: [
            '• __init__ is the constructor.',
            '• self refers to the instance.',
            '• super() accesses the parent class.',
            '• _attr is protected; __attr is name-mangled (private).',
        ],
        examples: [
            { code: 'd = Dog("Rex")', explanation: 'Creates instance.' },
            { code: 'd.speak()', explanation: 'Calls overridden method.' },
        ],
        key_terms: [
            { term: 'Encapsulation', definition: 'Bundling data + methods.' },
            { term: 'Inheritance', definition: 'Subclass reuses parent.' },
            { term: 'Polymorphism', definition: 'Same interface, different behaviour.' },
        ],
    },
    oop_Kinesthetic: {
        learning_objective: 'Write a class hierarchy by completing code.',
        analogy: 'A class is a cookie cutter; objects are the cookies.',
        challenge: {
            instruction: 'Complete the Car class with brand, speed attributes and an accelerate(amount) method that increases speed.',
            starter: 'class Car:\n    def __init__(self, brand):\n        self.brand = ??\n        self.speed = ??\n    def accelerate(self, amount):\n        self.?? += amount',
            solution: 'class Car:\n    def __init__(self, brand):\n        self.brand = brand\n        self.speed = 0\n    def accelerate(self, amount):\n        self.speed += amount',
            hints: ['self.brand stores the brand parameter.', 'Initial speed is 0.'],
        },
    },

    /* ── DATA STRUCTURES ────────────────── */
    datastructures_Visual: {
        learning_objective: 'Visualise core data structures and their operations.',
        diagram: [
            '  STACK (LIFO):   [1, 2, 3] ← top',
            '    push(4) →     [1, 2, 3, 4]',
            '    pop()   →     [1, 2, 3]  returns 4',
            '',
            '  QUEUE (FIFO):   front → [1, 2, 3] ← rear',
            '    enqueue(4)    [1, 2, 3, 4]',
            '    dequeue()     [2, 3, 4]  returns 1',
            '',
            '  LINKED LIST:    [1] → [2] → [3] → None',
        ],
        color_code: [
            { label: 'Stack', color: '#7B61FF', value: 'push / pop (top)', type: 'LIFO' },
            { label: 'Queue', color: '#F97AFE', value: 'enqueue / dequeue (front)', type: 'FIFO' },
            { label: 'HashMap', color: '#10B981', value: 'key→value, O(1) lookup', type: 'hash' },
        ],
        steps: ['1. Choose structure based on access pattern.', '2. Stack: last in, first out.', '3. Queue: first in, first out.', '4. HashMap: key→value for O(1) lookup.'],
    },
    datastructures_Auditory: {
        learning_objective: 'Understand data structures through spoken analogies.',
        analogy: 'Stack = pile of plates (LIFO); Queue = checkout line (FIFO); HashMap = phone book.',
        narrative: [
            'A stack is like Undo — the last action is the first one undone.',
            'A queue is like a printer — first job submitted, first printed.',
            'A HashMap is a phone book with instant lookup — give a key, get a value in O(1).',
            'A binary search tree maintains sorted order so search takes O(log n).',
        ],
        mnemonic: 'LIFO = Last In First Out (Stack); FIFO = First In First Out (Queue).',
        analogy_spoken: 'A Graph is a city map — nodes are intersections, edges are roads.',
    },
    datastructures_Reading: {
        learning_objective: 'Understand data structure definitions and complexities.',
        definition: 'Data structures organise and store data for efficient access and modification. Key structures: Stack (LIFO), Queue (FIFO), Linked List, Tree, Graph, HashMap.',
        syntax: '# Stack\nstack = []; stack.append(x); stack.pop()\n# Queue\nfrom collections import deque\nq = deque(); q.append(x); q.popleft()\n# HashMap\nd = {}; d[key] = val; val = d[key]',
        notes: [
            '• Stack: O(1) push/pop.',
            '• Queue: O(1) enqueue/dequeue with deque.',
            '• HashMap: O(1) average lookup; O(n) worst.',
            '• BST search: O(log n) average.',
        ],
        examples: [
            { code: 'stack = [1,2,3]; stack.pop()', explanation: 'Returns 3 (LIFO).' },
            { code: 'q = deque([1,2]); q.popleft()', explanation: 'Returns 1 (FIFO).' },
        ],
        key_terms: [
            { term: 'LIFO', definition: 'Last In, First Out — Stack.' },
            { term: 'FIFO', definition: 'First In, First Out — Queue.' },
            { term: 'HashMap', definition: 'Key-value store, O(1) average access.' },
        ],
    },
    datastructures_Kinesthetic: {
        learning_objective: 'Implement stack and queue operations in code.',
        analogy: 'Using data structures is like choosing the right tool from a toolbox.',
        challenge: {
            instruction: 'Implement a stack that pushes 1, 2, 3 then pops twice, printing each popped value.',
            starter: 'stack = []\nstack.??(1)\nstack.??(2)\nstack.??(3)\nprint(stack.??())\nprint(stack.??())',
            solution: 'stack = []\nstack.append(1)\nstack.append(2)\nstack.append(3)\nprint(stack.pop())\nprint(stack.pop())',
            hints: ['Use .append() to push.', 'Use .pop() to remove the top.'],
        },
    },

    /* ── TIME & SPACE COMPLEXITY ────────── */
    complexity_Visual: {
        learning_objective: 'Visualise Big-O growth rates on a complexity graph.',
        diagram: [
            '  Time ↑',
            '        |             O(n²)',
            '        |          /',
            '        |      O(n)',
            '        |    /',
            '        |  O(log n)',
            '        |O(1)___________',
            '        └──────────────── Input n →',
        ],
        color_code: [
            { label: 'O(1)', color: '#10B981', value: 'Constant — dict lookup', type: 'best' },
            { label: 'O(log n)', color: '#7B61FF', value: 'Logarithmic — binary search', type: 'great' },
            { label: 'O(n)', color: '#F59E0B', value: 'Linear — array scan', type: 'okay' },
            { label: 'O(n²)', color: '#EF4444', value: 'Quadratic — nested loops', type: 'avoid' },
        ],
        steps: ['1. Count the dominant operations.', '2. Drop constants and lower terms.', '3. Express as O(f(n)).', '4. Aim for the lowest class that correctness allows.'],
    },
    complexity_Auditory: {
        learning_objective: 'Understand complexity through spoken analogies.',
        analogy: 'Big-O is how you describe a journey — not "17 minutes" but "the time roughly doubles if the city doubles in size".',
        narrative: [
            'O(1) means: no matter how big the input, the task takes the same time.',
            'O(n) means: a list twice as long takes twice as long to scan.',
            'O(n²) is the smell of nested loops — a 10× bigger input = 100× slower.',
            'O(log n) is binary search — each step halves the remaining work.',
        ],
        mnemonic: '1 < log n < n < n log n < n² < 2ⁿ — memorise this order.',
        analogy_spoken: 'Space complexity is how much extra whiteboard you need while solving the problem.',
    },
    complexity_Reading: {
        learning_objective: 'Understand Big-O notation formally and with examples.',
        definition: 'Big-O notation describes the worst-case growth rate of an algorithm\'s time or space as input size n grows. Constants and lower-order terms are dropped.',
        syntax: '# Runtime classes (best to worst)\nO(1) → O(log n) → O(n) → O(n log n) → O(n²) → O(2ⁿ)',
        notes: [
            '• Drop constants: O(3n) → O(n).',
            '• Drop lower terms: O(n² + n) → O(n²).',
            '• Nested loops over n → O(n²).',
            '• Space complexity accounts for auxiliary memory, not input.',
        ],
        examples: [
            { code: 'for i in range(n):', explanation: 'O(n) — linear.' },
            { code: 'for i in range(n):\n  for j in range(n):', explanation: 'O(n²) — quadratic.' },
            { code: 'binary_search(lst, target)', explanation: 'O(log n).' },
        ],
        key_terms: [
            { term: 'Big-O', definition: 'Worst-case upper bound on growth.' },
            { term: 'Space Complexity', definition: 'Memory used relative to input.' },
            { term: 'Amortised', definition: 'Average cost over many operations.' },
        ],
    },
    complexity_Kinesthetic: {
        learning_objective: 'Identify and annotate complexity of code snippets.',
        analogy: 'Counting Big-O is like counting laps — ignore the warm-up, count what scales.',
        challenge: {
            instruction: 'What is the time complexity of this snippet? Write it in the comment.\n\nfor i in range(n):\n    for j in range(n):\n        print(i, j)',
            starter: '# Time complexity: O(??)',
            solution: '# Time complexity: O(n²)',
            hints: ['There are two nested loops each running n times.', 'n × n = n².'],
        },
    },
};

function buildFallbackCapsule(topic, modality) {
    const key = `${topic}_${modality}`;
    const content = FALLBACK_TEMPLATES[key] ?? {
        learning_objective: `Study ${topic} through the ${modality} learning approach.`,
        notes: ['Start the Flask backend to load personalised content.'],
    };
    return { success: true, learning_objective: content.learning_objective, modality, difficulty: 1, content, confidence_score: 0.8, verified: true };
}

// ---------------------------------------------------------------------------
// CapsuleViewer component
// ---------------------------------------------------------------------------
const CapsuleViewer = ({ topic, topicLabel, modality, varkProbs, onClose }) => {
    const [phase, setPhase] = useState('loading');
    const [capsule, setCapsule] = useState(null);
    const [error, setError] = useState(null);
    const [quizResult, setQuizResult] = useState(null);
    const [reward, setReward] = useState(null);
    const [updatedProbs, setUpdatedProbs] = useState(null);

    const contentStartTime = useRef(null);

    // Load content: use the rich client-side template bank immediately (instant, no network),
    // then attempt to fetch from Flask in the background and upgrade if it returns richer content.
    useEffect(() => {
        let cancelled = false;

        // Step 1: Show local template immediately (all 10 topics × 4 modalities are pre-built)
        const local = buildFallbackCapsule(topic, modality);
        setCapsule(local);
        setPhase('content');
        contentStartTime.current = Date.now();

        // Step 2: Try Flask in background — upgrade if backend returns verified content
        (async () => {
            try {
                const data = await generateCapsule(topic, modality, 1);
                // Only upgrade if Flask has genuine modality-specific content —
                // NOT the generic DEFAULT_TEMPLATE which only has notes/required_labels.
                const RICH_FIELDS = ['diagram', 'narrative', 'challenge', 'definition', 'syntax', 'color_code'];
                const hasRichContent = data?.content &&
                    RICH_FIELDS.some(f => data.content[f] && (
                        Array.isArray(data.content[f])
                            ? data.content[f].length > 0
                            : Object.keys(data.content[f]).length > 0
                    ));
                if (!cancelled && hasRichContent) {
                    setCapsule(data);
                }
            } catch {
                // Ignore — already showing local template
            }
        })();


        return () => { cancelled = true; };
    }, [topic, modality]);

    // Lock body scroll
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    // Escape key
    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') handleClose(); };
        window.addEventListener('keydown', h);
        return () => window.removeEventListener('keydown', h);
    }, [updatedProbs]);

    const handleClose = () => onClose(updatedProbs || varkProbs);

    const handleQuizComplete = async ({ correct, total, satisfaction }) => {
        const timeSpent = contentStartTime.current
            ? Math.floor((Date.now() - contentStartTime.current) / 1000) : 0;
        setQuizResult({ correct, total, satisfaction });
        setPhase('result');

        try {
            const ir = await logInteraction({
                topic, modality, time_spent: timeSpent,
                quiz_results: { correct, total }, satisfaction,
                vark_probs: varkProbs, session_id: window._lurniqSessionId ?? 'default',
            });
            const r = ir.reward ?? 0;
            setReward(r);
            const ur = await updateVarkProbabilities(varkProbs, r, modality);
            if (ur.success) {
                setUpdatedProbs(ur.updated_probs);
                if (window.varkResult) { window.varkResult.allScores = ur.updated_probs; window.varkResult.style = ur.dominant_style; }
            }
        } catch (e) {
            console.warn('[CapsuleViewer] backend interaction failed (non-critical):', e.message);
        }
    };

    const displayLabel = topicLabel || (topic.charAt(0).toUpperCase() + topic.slice(1));
    const modalityLow = modality.toLowerCase();

    return (
        <div className="cv-overlay" onClick={handleClose} role="dialog" aria-modal="true">
            <div className={`cv-panel`} onClick={e => e.stopPropagation()}>

                {/* Accent line */}
                <div className={`cv-panel-accent cv-panel-accent--${modalityLow}`} />

                {/* Header */}
                <div className="cv-header">
                    <div className="cv-header-left">
                        <span className={`cv-modality-pill cv-modality-pill--${modalityLow}`}>{modality}</span>
                        <h2 className="cv-topic-title">{displayLabel}</h2>
                    </div>
                    <button className="cv-close-btn" onClick={handleClose} aria-label="Close">✕</button>
                </div>

                {/* Body */}
                <div className="cv-body">

                    {/* LOADING */}
                    {phase === 'loading' && (
                        <div className="cv-loading">
                            <div className="cv-spinner" />
                            <p>Loading {modality} capsule…</p>
                        </div>
                    )}

                    {/* CONTENT */}
                    {phase === 'content' && (
                        <>
                            {error && <div className="cv-error-banner">Backend unreachable — showing cached template.</div>}
                            {capsule
                                ? <MicroCapsule topic={topic} modality={modality} content={capsule.content} />
                                : <div className="cv-loading"><div className="cv-spinner" /><p>Loading…</p></div>
                            }
                            {capsule && (
                                <div className="cv-cta-bar">
                                    <button className="cv-btn cv-btn--primary" onClick={() => setPhase('quiz')}>
                                        Take Mini Quiz
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* QUIZ */}
                    {phase === 'quiz' && (
                        <>
                            <h3 className="cv-quiz-heading">Quick Check</h3>
                            <p className="cv-quiz-sub">Test what you have just studied.</p>
                            <QuizBlock topic={topic} modality={modality} onComplete={handleQuizComplete} />
                        </>
                    )}

                    {/* RESULT */}
                    {phase === 'result' && quizResult && (
                        <div className="cv-result">
                            <h3 className="cv-result-heading">
                                {quizResult.correct === quizResult.total ? 'Perfect Score' :
                                    quizResult.correct >= Math.ceil(quizResult.total / 2) ? 'Session Complete' : 'Keep Practising'}
                            </h3>

                            <div className="cv-result-score-card">
                                <div className="cv-result-stat">
                                    <span className="cv-result-stat-value">{quizResult.correct}/{quizResult.total}</span>
                                    <span className="cv-result-stat-label">Quiz Score</span>
                                </div>
                                {reward !== null && (
                                    <div className="cv-result-stat">
                                        <span className="cv-result-stat-value">{(reward * 100).toFixed(0)}%</span>
                                        <span className="cv-result-stat-label">Reward Signal</span>
                                    </div>
                                )}
                            </div>

                            {updatedProbs && (
                                <div className="cv-vark-update">
                                    <h4>Updated VARK Profile</h4>
                                    <div className="cv-vark-bars">
                                        {Object.entries(updatedProbs).map(([style, prob]) => (
                                            <div key={style} className="cv-vark-bar-row">
                                                <span className="cv-vark-bar-label">{style}</span>
                                                <div className="cv-vark-bar-track">
                                                    <div className={`cv-vark-bar-fill cv-vark-bar-fill--${style.toLowerCase()}`}
                                                        style={{ width: `${(prob * 100).toFixed(1)}%` }} />
                                                </div>
                                                <span className="cv-vark-bar-pct">{(prob * 100).toFixed(1)}%</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="cv-vark-note">Bayesian update applied — λ = 0.9</p>
                                </div>
                            )}

                            <button className="cv-btn cv-btn--primary cv-btn--wide" onClick={handleClose}>
                                Back to Topics
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CapsuleViewer;
