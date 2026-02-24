// src/components/phase2/QuizBlock.jsx
// Micro-assessment — 3 questions per topic × modality combination (10 topics × 4 modalities).
import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// QUESTION BANK  keyed by  `${topic}_${modality}`.toLowerCase()
// ---------------------------------------------------------------------------
const QUESTION_BANK = {

    /* ── VARIABLES ─────────────────────────────────────────────────────────── */
    variables_visual: [
        { q: 'In the box diagram, which type holds the string "Alice"?', options: ['int', 'float', 'str', 'bool'], answer: 2 },
        { q: 'What does the = symbol represent in a variable assignment?', options: ['Comparison', 'Assignment', 'Equality', 'Print'], answer: 1 },
        { q: 'Which first step do you take when creating a variable?', options: ['Print it', 'Choose a name', 'Declare a class', 'Import a module'], answer: 1 },
    ],
    variables_auditory: [
        { q: 'In the N-A-V mnemonic, "A" stands for?', options: ['Array', 'Assign', 'Attribute', 'Access'], answer: 1 },
        { q: 'The spoken analogy compared a variable to a?', options: ['Folder', 'Playlist', 'Sticky note', 'Database'], answer: 2 },
        { q: 'Python infers a variable\'s type from?', options: ['A declaration keyword', 'The variable name', 'The assigned value', 'The module'], answer: 2 },
    ],
    variables_reading: [
        { q: 'Which naming convention is standard in Python?', options: ['camelCase', 'PascalCase', 'snake_case', 'kebab-case'], answer: 2 },
        { q: '"Dynamically typed" means Python infers type from?', options: ['A keyword', 'The compiler', 'The assigned value', 'The IDE'], answer: 2 },
        { q: 'Which is a valid Python identifier?', options: ['2score', 'my-score', '_my_score', 'my score'], answer: 2 },
    ],
    variables_kinesthetic: [
        { q: 'To store 25 in age, you write?', options: ['age := 25', 'age == 25', 'age = 25', 'int age = 25'], answer: 2 },
        { q: 'In f"Hello, {name}!", {name} does what?', options: ['Prints "{name}"', 'Inserts the value of name', 'Creates a new variable', 'Raises a SyntaxError'], answer: 1 },
        { q: 'Which re-assignment is valid in Python?', options: ['age = 25 then age = "old"', 'Must declare new type first', 'Cannot reassign', 'Use let keyword'], answer: 0 },
    ],

    /* ── OPERATORS ─────────────────────────────────────────────────────────── */
    operators_visual: [
        { q: 'Which operator checks equality without assignment?', options: ['=', '==', '===', '!='], answer: 1 },
        { q: 'What is 7 % 3?', options: ['2', '1', '3', '0'], answer: 1 },
        { q: 'x **= 3 is shorthand for?', options: ['x = x + 3', 'x = x * 3', 'x = x ** 3', 'x = x / 3'], answer: 2 },
    ],
    operators_auditory: [
        { q: 'The "or" logical operator returns True when?', options: ['Both are True', 'At least one is True', 'Neither is True', 'Exactly one is True'], answer: 1 },
        { q: 'In Python, "not True" evaluates to?', options: ['True', 'False', 'None', 'Error'], answer: 1 },
        { q: 'Floor division operator is?', options: ['%', '//', '**', '/'], answer: 1 },
    ],
    operators_reading: [
        { q: '5 != 5 evaluates to?', options: ['True', 'False', 'None', 'Error'], answer: 1 },
        { q: 'Bitwise AND of 0b1010 and 0b1100 is?', options: ['0b1110', '0b1000', '0b0110', '0b1010'], answer: 1 },
        { q: 'Operator precedence: which runs first in 2 + 3 * 4?', options: ['2 + 3', '3 * 4', 'Left to right', 'Undefined'], answer: 1 },
    ],
    operators_kinesthetic: [
        { q: 'What does 10 // 3 return?', options: ['3.33', '3', '4', '1'], answer: 1 },
        { q: 'x = 5; x += 3; print(x) outputs?', options: ['5', '3', '8', '53'], answer: 2 },
        { q: 'True and False evaluates to?', options: ['True', 'False', 'None', 'Error'], answer: 1 },
    ],

    /* ── CONDITIONALS ──────────────────────────────────────────────────────── */
    conditionals_visual: [
        { q: 'In a flowchart, what shape represents a decision?', options: ['Rectangle', 'Circle', 'Diamond', 'Oval'], answer: 2 },
        { q: 'Which block only runs when the if-condition is False?', options: ['if', 'elif', 'else', 'pass'], answer: 2 },
        { q: 'How many else blocks can an if-statement have?', options: ['Unlimited', 'Two', 'One', 'None'], answer: 2 },
    ],
    conditionals_auditory: [
        { q: 'What does "elif" mean in plain English?', options: ['"end if"', '"else if"', '"else loop"', '"exit if"'], answer: 1 },
        { q: 'If the first condition is True, Python?', options: ['Checks all remaining branches', 'Runs only the matching branch', 'Skips the else', 'Raises an error'], answer: 1 },
        { q: 'A switch-case equivalent in Python 3.10+ uses?', options: ['select-case', 'switch', 'match-case', 'if-match'], answer: 2 },
    ],
    conditionals_reading: [
        { q: 'The keyword for additional if-branches in Python is?', options: ['else', 'elseif', 'elif', 'orif'], answer: 2 },
        { q: 'Short-circuit evaluation means?', options: ['Both operands always evaluated', 'Evaluation stops early when result is known', 'Syntax error', 'Float precision issue'], answer: 1 },
        { q: 'Which is valid Python conditional syntax?', options: ['if x = 5:', 'if x == 5:', 'if (x equals 5):', 'when x == 5:'], answer: 1 },
    ],
    conditionals_kinesthetic: [
        { q: 'Fix: if x > 0 print("pos") — what is missing?', options: ['Parentheses', 'Colon at end', 'Semicolon', 'Quotes'], answer: 1 },
        { q: 'What prints for x=0: if x>0: print("A") elif x==0: print("B") else: print("C")?', options: ['"A"', '"B"', '"C"', 'Nothing'], answer: 1 },
        { q: 'Nested if means?', options: ['An if inside another if', 'An if after an else', 'An if with many elif', 'An if with no else'], answer: 0 },
    ],

    /* ── LOOPS ─────────────────────────────────────────────────────────────── */
    loops_visual: [
        { q: 'In the flowchart, loop exits when condition is?', options: ['True', 'False', 'Zero', 'None'], answer: 1 },
        { q: 'range(5) produces?', options: ['1,2,3,4,5', '0,1,2,3,4', '0,1,2,3,4,5', '1,2,3,4'], answer: 1 },
        { q: 'Which keyword is used to start a for-loop?', options: ['while', 'repeat', 'for', 'loop'], answer: 2 },
    ],
    loops_auditory: [
        { q: 'The FOR-EACH-ITEM-DO chant describes which loop?', options: ['while loop', 'do-while', 'for loop', 'infinite loop'], answer: 2 },
        { q: 'In the playlist analogy, loop ends when?', options: ['break is hit', 'Playlist runs out', 'A condition is set', 'Timer expires'], answer: 1 },
        { q: '"break" immediately does what?', options: ['Skips iteration', 'Exits the loop', 'Restarts loop', 'Pauses execution'], answer: 1 },
    ],
    loops_reading: [
        { q: 'Which keyword skips current iteration?', options: ['break', 'pass', 'continue', 'skip'], answer: 2 },
        { q: 'range(2, 8, 2) produces?', options: ['2,4,6,8', '2,4,6', '0,2,4,6', '2,3,4,5,6,7'], answer: 1 },
        { q: 'A do-while loop guarantees the body runs?', options: ['Never', 'At least once', 'Exactly twice', 'Only if condition is True first'], answer: 1 },
    ],
    loops_kinesthetic: [
        { q: 'To print 1 through 5 inclusive, use?', options: ['range(5)', 'range(1,5)', 'range(1,6)', 'range(0,5)'], answer: 2 },
        { q: 'Why is the loop body indented in Python?', options: ['Readability only', 'Defines block scope', 'Required for speed', 'Optional convention'], answer: 1 },
        { q: 'Default start of range() with one arg is?', options: ['1', '-1', '0', 'None'], answer: 2 },
    ],

    /* ── FUNCTIONS ─────────────────────────────────────────────────────────── */
    functions_visual: [
        { q: 'Which keyword defines a function in Python?', options: ['func', 'define', 'def', 'fn'], answer: 2 },
        { q: 'A function\'s return value is sent back with?', options: ['yield', 'send', 'return', 'output'], answer: 2 },
        { q: 'Parameters are defined in the function?', options: ['Body', 'Docstring', 'Signature/header', 'Return statement'], answer: 2 },
    ],
    functions_auditory: [
        { q: 'Calling a function is analogous to?', options: ['Declaring a variable', 'Pressing play on a recipe', 'Opening a class', 'Writing a comment'], answer: 1 },
        { q: 'Default parameter values are assigned where?', options: ['At call time', 'In the function signature', 'In the body', 'As global variables'], answer: 1 },
        { q: '*args collects?', options: ['Keyword arguments', 'Positional arguments into a tuple', 'All global vars', 'Return values'], answer: 1 },
    ],
    functions_reading: [
        { q: 'What does a function without a return statement return?', options: ['0', '""', 'None', 'Error'], answer: 2 },
        { q: 'Lambda is used to create?', options: ['A class', 'An anonymous single-expression function', 'A loop', 'A module'], answer: 1 },
        { q: 'Local vs global scope: a variable defined inside a function is?', options: ['Global', 'Local', 'Static', 'Public'], answer: 1 },
    ],
    functions_kinesthetic: [
        { q: 'def add(a, b): return a + b — add(3,4) returns?', options: ['7', '34', 'None', 'Error'], answer: 0 },
        { q: 'To use a default argument of 10 for b: def f(a, b=?)', options: ['b==10', 'b:10', 'b=10', 'default b=10'], answer: 2 },
        { q: 'What is the output of: def f(): pass; print(f())?', options: ['0', 'pass', 'None', 'Error'], answer: 2 },
    ],

    /* ── ARRAYS & STRINGS ──────────────────────────────────────────────────── */
    arrays_visual: [
        { q: 'Array indices in most languages start at?', options: ['1', '0', '-1', 'Depends'], answer: 1 },
        { q: 'lst = [10,20,30]; lst[1] returns?', options: ['10', '20', '30', 'Error'], answer: 1 },
        { q: 'Which operation adds an item to the end of a Python list?', options: ['add()', 'push()', 'append()', 'extend()'], answer: 2 },
    ],
    arrays_auditory: [
        { q: 'Strings are described as immutable, meaning?', options: ['They are fast', 'They cannot be changed after creation', 'They store numbers', 'They are always short'], answer: 1 },
        { q: '"Hello"[1] returns?', options: ['H', 'e', 'l', 'o'], answer: 1 },
        { q: 'String concatenation with + produces?', options: ['A number', 'A new combined string', 'Modifies the original', 'An error'], answer: 1 },
    ],
    arrays_reading: [
        { q: 'Slicing lst[1:4] returns elements at indices?', options: ['1,2,3,4', '1,2,3', '2,3,4', '0,1,2,3'], answer: 1 },
        { q: 'len("Python") returns?', options: ['5', '6', '7', 'Error'], answer: 1 },
        { q: 'Which method splits a string into a list?', options: ['join()', 'split()', 'strip()', 'replace()'], answer: 1 },
    ],
    arrays_kinesthetic: [
        { q: 'lst = [1,2,3]; lst.append(4); len(lst) is?', options: ['3', '4', '5', 'Error'], answer: 1 },
        { q: '"hello".upper() returns?', options: ['"Hello"', '"HELLO"', '"hello"', 'Error'], answer: 1 },
        { q: 'Reverse "abc" using slicing?', options: ['"abc"[-1]', '"abc"[::-1]', '"abc"[::1]', 'reverse("abc")'], answer: 1 },
    ],

    /* ── RECURSION ─────────────────────────────────────────────────────────── */
    recursion_visual: [
        { q: 'Every recursive function must have a?', options: ['Loop', 'Global variable', 'Base case', 'Return None'], answer: 2 },
        { q: 'Without a base case, recursion leads to?', options: ['Correct result', 'Stack overflow / infinite recursion', 'Compilation error', 'Slow output'], answer: 1 },
        { q: 'factorial(n) = n * factorial(n-1); factorial(3) equals?', options: ['3', '6', '9', '12'], answer: 1 },
    ],
    recursion_auditory: [
        { q: 'Recursion is like?', options: ['A loop that counts down', 'A function that calls itself with a simpler version', 'An array of functions', 'A class inheritance chain'], answer: 1 },
        { q: 'The base case in factorial is?', options: ['n > 1', 'n == 0 or n == 1', 'n < 0', 'Always n == 0'], answer: 1 },
        { q: 'Call stack grows with each recursive call until?', options: ['Return is reached', 'Base case is hit', 'Stack is full', 'Loop ends'], answer: 1 },
    ],
    recursion_reading: [
        { q: 'Tail recursion is beneficial because?', options: ['It avoids loops', 'Some compilers optimise it to avoid stack growth', 'It is always faster', 'It eliminates the need for a base case'], answer: 1 },
        { q: 'Fibonacci(4) = Fibonacci(3) + Fibonacci(2); Fib(1)=Fib(0)=1. Fib(4) = ?', options: ['3', '5', '8', '4'], answer: 1 },
        { q: 'Memoization improves recursion by?', options: ['Removing the base case', 'Caching previously computed results', 'Iterating instead', 'Using loops'], answer: 1 },
    ],
    recursion_kinesthetic: [
        { q: 'def fact(n): if n==1: return 1; return n*fact(n-1). fact(4) = ?', options: ['4', '10', '24', '12'], answer: 2 },
        { q: 'To add memoization, you store results in a?', options: ['Loop', 'Dictionary/cache', 'New function', 'Class'], answer: 1 },
        { q: 'Binary search is recursive because?', options: ['It uses arrays', 'It calls itself on a smaller subarray', 'It has no loop', 'It sorts data'], answer: 1 },
    ],

    /* ── OOP ───────────────────────────────────────────────────────────────── */
    oop_visual: [
        { q: 'A class diagram shows?', options: ['CPU usage', 'Attributes and methods of a class', 'Network connections', 'File structures'], answer: 1 },
        { q: '__init__ in Python is the?', options: ['Destructor', 'Constructor', 'Static method', 'Class method'], answer: 1 },
        { q: 'Encapsulation means?', options: ['Inheriting from a class', 'Binding data and methods into a single unit', 'Overriding methods', 'Using polymorphism'], answer: 1 },
    ],
    oop_auditory: [
        { q: 'Inheritance allows?', options: ['A class to hide data', 'A subclass to use a parent class\'s behaviour', 'Faster execution', 'Duplicate code'], answer: 1 },
        { q: 'Polymorphism means different classes can?', options: ['Share the same data', 'Respond to the same method call differently', 'Be instantiated', 'Use global variables'], answer: 1 },
        { q: '"self" in Python refers to?', options: ['The class itself', 'The current instance of the class', 'A static method', 'A global variable'], answer: 1 },
    ],
    oop_reading: [
        { q: 'Which keyword creates a subclass in Python?', options: ['extends', 'inherits', 'class Sub(Parent):', 'Super()'], answer: 2 },
        { q: 'A private attribute in Python is conventionally named?', options: ['#attr', 'attr!', '__attr or _attr', 'private attr'], answer: 2 },
        { q: 'super() is used to?', options: ['Call a static method', 'Call the parent class\'s method', 'Delete an attribute', 'Override a method'], answer: 1 },
    ],
    oop_kinesthetic: [
        { q: 'class Dog(Animal): pass — Dog inherits from?', options: ['Dog', 'pass', 'Animal', 'class'], answer: 2 },
        { q: 'To create instance d of class Dog: d = ?', options: ['Dog', 'Dog()', 'new Dog()', 'class Dog'], answer: 1 },
        { q: 'dog.speak() calls the speak method on?', options: ['The Dog class', 'The instance dog', 'All animals', 'The parent class'], answer: 1 },
    ],

    /* ── DATA STRUCTURES ───────────────────────────────────────────────────── */
    datastructures_visual: [
        { q: 'A Stack follows which principle?', options: ['FIFO', 'LIFO', 'FILO', 'Random'], answer: 1 },
        { q: 'A Queue follows which principle?', options: ['LIFO', 'FILO', 'FIFO', 'Random'], answer: 2 },
        { q: 'In a singly linked list, each node stores?', options: ['Only data', 'Only a pointer', 'Data + pointer to next node', 'Data + two pointers'], answer: 2 },
    ],
    datastructures_auditory: [
        { q: 'Stack analogy is a pile of plates because?', options: ['Plates are circular', 'You add and remove from the top', 'Plates are heavy', 'Each plate is a node'], answer: 1 },
        { q: 'A HashMap provides average — time lookup?', options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'], answer: 2 },
        { q: 'Binary Search Tree property: left child is always?', options: ['Greater than parent', 'Equal to parent', 'Less than parent', 'Random'], answer: 2 },
    ],
    datastructures_reading: [
        { q: 'Time complexity of searching unsorted array?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 2 },
        { q: 'A Graph edge between two nodes means?', options: ['They are equal', 'There is a connection between them', 'One contains the other', 'They share an index'], answer: 1 },
        { q: 'Which data structure uses push and pop?', options: ['Queue', 'Linked List', 'Stack', 'Tree'], answer: 2 },
    ],
    datastructures_kinesthetic: [
        { q: 'stack = []; stack.append(1); stack.pop() returns?', options: ['0', '1', 'None', 'Error'], answer: 1 },
        { q: 'from collections import deque; q=deque(); q.append(5); q.popleft() returns?', options: ['None', '5', '0', 'Error'], answer: 1 },
        { q: 'd = {"a":1}; d["b"] = 2; len(d) is?', options: ['1', '2', '3', 'Error'], answer: 1 },
    ],

    /* ── TIME & SPACE COMPLEXITY ───────────────────────────────────────────── */
    complexity_visual: [
        { q: 'O(1) on a complexity graph is?', options: ['A steep curve', 'A flat horizontal line', 'A diagonal line', 'A parabola'], answer: 1 },
        { q: 'Which grows fastest as n increases?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'], answer: 2 },
        { q: 'Binary search runs in?', options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'], answer: 2 },
    ],
    complexity_auditory: [
        { q: '"Big-O" notation describes?', options: ['Exact runtime', 'Worst-case growth rate', 'Best-case runtime', 'Memory used exactly'], answer: 1 },
        { q: 'O(n log n) is typical for?', options: ['Bubble sort', 'Binary search', 'Merge sort / Quicksort', 'Hash lookup'], answer: 2 },
        { q: 'Space complexity measures?', options: ['Speed of an algorithm', 'Memory an algorithm uses relative to input size', 'Number of lines of code', 'CPU temperature'], answer: 1 },
    ],
    complexity_reading: [
        { q: 'Nested loops over n elements give?', options: ['O(n)', 'O(log n)', 'O(n²)', 'O(2n)'], answer: 2 },
        { q: 'An algorithm is O(1) if?', options: ['It has one loop', 'Run time grows linearly', 'Run time is constant regardless of input', 'It uses one variable'], answer: 2 },
        { q: 'Drop lower-order terms: 3n² + 2n + 1 = ?', options: ['O(n)', 'O(3n²)', 'O(n²)', 'O(2n)'], answer: 2 },
    ],
    complexity_kinesthetic: [
        { q: 'for i in range(n): for j in range(n): — complexity?', options: ['O(n)', 'O(2n)', 'O(n²)', 'O(log n)'], answer: 2 },
        { q: 'Binary search halves the search space each step — that is?', options: ['O(n)', 'O(n²)', 'O(log n)', 'O(1)'], answer: 2 },
        { q: 'Constant extra memory regardless of input is?', options: ['O(n) space', 'O(log n) space', 'O(1) space', 'O(n²) space'], answer: 2 },
    ],
};

// Fallback questions for any unlisted combination
const FALLBACK_QUESTIONS = [
    { q: 'Which principle helps write reusable, maintainable code?', options: ['Repetition', 'DRY (Don\'t Repeat Yourself)', 'Hard-coding', 'Ignoring edge cases'], answer: 1 },
    { q: 'A good variable name should be?', options: ['Single letter', 'Descriptive and concise', 'All uppercase', 'A number'], answer: 1 },
];

// ---------------------------------------------------------------------------

const QuizBlock = ({ topic, modality, onComplete }) => {
    const key = `${topic}_${modality}`.toLowerCase();
    const questions = QUESTION_BANK[key] ?? FALLBACK_QUESTIONS;

    const [currentQ, setCurrentQ] = useState(0);
    const [selected, setSelected] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [answers, setAnswers] = useState([]);
    const [showResult, setShowResult] = useState(false);

    const question = questions[currentQ];
    const isLast = currentQ === questions.length - 1;

    const handleSelect = (idx) => { if (!submitted) setSelected(idx); };

    const handleSubmit = () => {
        if (selected === null) return;
        const correct = selected === question.answer;
        const newAnswers = [...answers, correct];
        setAnswers(newAnswers);
        setSubmitted(true);
        if (isLast) setShowResult(false); // will show after user clicks See Results
    };

    const handleNext = () => {
        setCurrentQ(p => p + 1);
        setSelected(null);
        setSubmitted(false);
    };

    const handleSeeResults = () => setShowResult(true);

    const handleFinish = () => {
        const correct = answers.filter(Boolean).length;
        const total = questions.length;
        const satisfaction = parseFloat((correct / total).toFixed(4));
        onComplete({ correct, total, satisfaction });
    };

    const totalCorrect = answers.filter(Boolean).length;
    const progressPct = (currentQ / questions.length) * 100;

    return (
        <div className="qb-wrap">
            {!showResult ? (
                <>
                    <div className="qb-progress-bar">
                        <div className="qb-progress-fill" style={{ width: `${progressPct}%` }} />
                    </div>

                    <p className="qb-counter">Question {currentQ + 1} of {questions.length}</p>

                    <div className="qb-question"><p>{question.q}</p></div>

                    <div className="qb-options">
                        {question.options.map((opt, i) => {
                            let cls = 'qb-option';
                            if (submitted) {
                                if (i === question.answer) cls += ' qb-option--correct';
                                else if (i === selected) cls += ' qb-option--wrong';
                            } else if (i === selected) cls += ' qb-option--selected';

                            return (
                                <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={submitted}>
                                    <span className="qb-opt-letter">{String.fromCharCode(65 + i)}</span>
                                    {opt}
                                </button>
                            );
                        })}
                    </div>

                    {submitted && (
                        <div className={`qb-feedback qb-feedback--${selected === question.answer ? 'correct' : 'wrong'}`}>
                            {selected === question.answer
                                ? 'Correct.'
                                : `Incorrect — correct answer: "${question.options[question.answer]}"`}
                        </div>
                    )}

                    <div className="qb-actions">
                        {!submitted ? (
                            <button className="qb-btn" onClick={handleSubmit} disabled={selected === null}>
                                Submit
                            </button>
                        ) : isLast ? (
                            <button className="qb-btn" onClick={handleSeeResults}>
                                See Results
                            </button>
                        ) : (
                            <button className="qb-btn" onClick={handleNext}>
                                Next
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <div className="qb-result">
                    <h3 className="qb-result-heading">
                        {totalCorrect === questions.length
                            ? 'Perfect Score'
                            : totalCorrect >= Math.ceil(questions.length / 2)
                                ? 'Well Done'
                                : 'Keep Practising'}
                    </h3>
                    <p className="qb-result-score">
                        You scored <strong>{totalCorrect}</strong> out of <strong>{questions.length}</strong>
                    </p>
                    <div className="qb-result-breakdown">
                        {answers.map((c, i) => (
                            <span key={i} style={{ fontSize: '0.75rem', fontWeight: 700, color: c ? '#10B981' : '#EF4444' }}>
                                {c ? '✓' : '✗'}
                            </span>
                        ))}
                    </div>
                    <button className="qb-btn qb-btn--finish" onClick={handleFinish}>
                        Continue
                    </button>
                </div>
            )}
        </div>
    );
};

export default QuizBlock;
