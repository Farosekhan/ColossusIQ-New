import "server-only";

/*
 * Curated lesson library used by the (mock) AI Course Studio. When a course title matches an entry,
 * the generated lessons carry real, checkable key points — and the final assessment asks about them.
 * Titles that don't match fall back to a generic outline the HOD edits before publishing.
 * The live platform replaces this with the course-planner agent grounded on the department syllabus.
 */

export interface LibraryLesson {
  title: string;
  facts: [string, string, string];
}
export interface LibraryUnit {
  title: string;
  lessons: LibraryLesson[];
}
export interface LibraryCourse {
  match: RegExp;
  units: LibraryUnit[];
}

export const COURSE_LIBRARY: LibraryCourse[] = [
  {
    match: /database|dbms|\bsql\b/i,
    units: [
      {
        title: "Foundations",
        lessons: [
          { title: "Introduction to database systems", facts: ["A DBMS separates the logical view of data from how it is physically stored (data independence).", "Metadata describing tables, columns and constraints is kept in the data dictionary.", "Concurrent access and crash recovery are services a DBMS provides that flat files do not."] },
          { title: "ER modelling", facts: ["A weak entity has no key of its own and is identified through its owner entity.", "Cardinality ratios such as 1:N and M:N describe how many entities take part in a relationship.", "A multivalued attribute is drawn as a double ellipse in an ER diagram."] },
        ],
      },
      {
        title: "Relational model & SQL",
        lessons: [
          { title: "Relational model & keys", facts: ["A candidate key is a minimal set of attributes that uniquely identifies a tuple.", "A foreign key value must match a primary key in the referenced table or be NULL.", "Every attribute value in a relation must be atomic."] },
          { title: "Relational algebra", facts: ["Selection (σ) filters rows, while projection (π) chooses columns.", "A natural join combines tuples that agree on all common attributes.", "Division answers 'for all' queries, such as students enrolled in every course."] },
          { title: "SQL queries & joins", facts: ["WHERE filters rows before grouping, whereas HAVING filters groups after GROUP BY.", "A LEFT OUTER JOIN keeps unmatched rows from the left table and fills NULLs on the right.", "A correlated subquery is re-evaluated for each row of the outer query."] },
        ],
      },
      {
        title: "Database design",
        lessons: [
          { title: "Functional dependencies", facts: ["X → Y means any two tuples that agree on X must also agree on Y.", "Armstrong's axioms are reflexivity, augmentation and transitivity.", "The closure of an attribute set is used to test whether it is a superkey."] },
          { title: "Normalization (1NF–BCNF)", facts: ["2NF removes partial dependencies of non-key attributes on part of a composite key.", "3NF removes transitive dependencies of non-key attributes.", "In BCNF every determinant of a non-trivial dependency is a superkey."] },
        ],
      },
      {
        title: "Transactions & storage",
        lessons: [
          { title: "Transactions & ACID", facts: ["Atomicity means a transaction's changes are applied completely or not at all.", "Durability guarantees that committed changes survive a system crash.", "A schedule is conflict-serialisable if its precedence graph has no cycle."] },
          { title: "Concurrency control", facts: ["Two-phase locking has a growing phase followed by a shrinking phase.", "A deadlock occurs when transactions wait on each other's locks in a cycle.", "Timestamp ordering resolves conflicts using each transaction's start time."] },
          { title: "Indexing & B+ trees", facts: ["In a B+ tree all data pointers are stored at the leaf level.", "B+ tree leaves are linked, which makes range queries efficient.", "A clustered index determines the physical order of rows in a table."] },
        ],
      },
    ],
  },
  {
    match: /data structure/i,
    units: [
      {
        title: "Basics",
        lessons: [
          { title: "Arrays & complexity", facts: ["Accessing an array element by index takes constant time, O(1).", "Big-O notation describes an upper bound on growth as the input size increases.", "Inserting in the middle of an array requires shifting later elements, O(n)."] },
          { title: "Linked lists", facts: ["Each node of a singly linked list stores data and a pointer to the next node.", "A doubly linked list can be traversed in both directions.", "Linked lists grow dynamically without needing contiguous memory."] },
        ],
      },
      {
        title: "Linear structures",
        lessons: [
          { title: "Stacks", facts: ["A stack follows Last In, First Out (LIFO) order.", "Function calls and recursion are managed with a call stack.", "Postfix expressions are evaluated using a stack."] },
          { title: "Queues", facts: ["A queue follows First In, First Out (FIFO) order.", "A circular queue reuses empty slots at the front of the array.", "Breadth-first search uses a queue."] },
        ],
      },
      {
        title: "Trees",
        lessons: [
          { title: "Binary search trees", facts: ["In a BST, keys in the left subtree are smaller than the root.", "An inorder traversal of a BST visits keys in sorted order.", "A skewed BST degrades search to O(n)."] },
          { title: "Heaps & priority queues", facts: ["In a max-heap every parent is greater than or equal to its children.", "A heap stored in an array keeps the children of index i at 2i+1 and 2i+2.", "Heap sort runs in O(n log n) time."] },
        ],
      },
      {
        title: "Hashing, graphs & sorting",
        lessons: [
          { title: "Hashing", facts: ["A hash function maps a key to an index in the table.", "Chaining handles collisions by keeping a list at each slot.", "Load factor is the number of entries divided by the table size."] },
          { title: "Graphs & traversal", facts: ["Depth-first search explores as far as possible along a branch before backtracking.", "An adjacency matrix uses O(V²) space.", "Dijkstra's algorithm finds shortest paths when edge weights are non-negative."] },
          { title: "Sorting & searching", facts: ["Merge sort divides the list, sorts the halves and merges them in O(n log n).", "Quick sort's worst case is O(n²) when pivots are chosen poorly.", "Binary search requires the data to be sorted."] },
        ],
      },
    ],
  },
  {
    match: /operating system/i,
    units: [
      {
        title: "Processes",
        lessons: [
          { title: "Processes & threads", facts: ["A process is a program in execution with its own address space.", "Threads of the same process share code, data and open files.", "The PCB stores a process's state, registers and scheduling information."] },
          { title: "CPU scheduling", facts: ["Round robin gives each process a fixed time quantum.", "Shortest job first minimises average waiting time but can starve long jobs.", "Waiting time equals turnaround time minus burst time."] },
        ],
      },
      {
        title: "Concurrency",
        lessons: [
          { title: "Synchronisation", facts: ["A critical section is code that accesses shared resources.", "A semaphore's wait() decrements its value and signal() increments it.", "A mutex allows only one thread into the critical section at a time."] },
          { title: "Deadlocks", facts: ["The four necessary conditions are mutual exclusion, hold and wait, no preemption and circular wait.", "The banker's algorithm avoids deadlock by checking for a safe state.", "Breaking any one necessary condition prevents deadlock."] },
        ],
      },
      {
        title: "Memory",
        lessons: [
          { title: "Memory management", facts: ["Paging divides memory into fixed-size frames and removes external fragmentation.", "The TLB caches recent page-table entries to speed up address translation.", "Segmentation divides memory into logical units such as code and stack."] },
          { title: "Virtual memory", facts: ["Demand paging loads a page only when it is referenced.", "Thrashing happens when a system spends more time paging than executing.", "Belady's anomaly can occur with FIFO page replacement."] },
        ],
      },
      {
        title: "Storage",
        lessons: [
          { title: "File systems", facts: ["An inode stores a file's metadata and block pointers.", "Contiguous allocation gives fast access but causes external fragmentation.", "Directories map file names to file metadata."] },
          { title: "Disk scheduling", facts: ["SSTF picks the request closest to the current head position.", "SCAN moves the disk head from end to end like an elevator.", "Seek time is usually the largest part of disk access time."] },
        ],
      },
    ],
  },
  {
    match: /python/i,
    units: [
      {
        title: "Getting started",
        lessons: [
          { title: "Variables & data types", facts: ["Python is dynamically typed, so a variable's type is decided at run time.", "Strings and tuples are immutable.", "int(), float() and str() convert values between types."] },
          { title: "Control flow", facts: ["Python uses indentation to define code blocks.", "A for loop iterates over any iterable, such as range(5).", "break exits a loop, while continue skips to the next iteration."] },
        ],
      },
      {
        title: "Functions & collections",
        lessons: [
          { title: "Functions", facts: ["def defines a function and return sends a value back to the caller.", "Default argument values are used when the caller omits them.", "*args collects extra positional arguments into a tuple."] },
          { title: "Lists, tuples & dictionaries", facts: ["Lists are ordered and mutable.", "Dictionary keys must be hashable, such as strings or numbers.", "A list comprehension builds a list in a single expression."] },
        ],
      },
      {
        title: "Working with data",
        lessons: [
          { title: "Strings & files", facts: ["The slice s[1:4] returns the characters at index 1 to 3.", "A with open(...) block closes the file automatically.", "File mode 'a' appends instead of overwriting."] },
          { title: "Object-oriented programming", facts: ["__init__ initialises a new object's attributes.", "self refers to the current instance of the class.", "Inheritance lets a class reuse another class's methods."] },
        ],
      },
      {
        title: "Robust programs",
        lessons: [
          { title: "Exceptions", facts: ["try/except catches run-time errors so the program can recover.", "A finally block runs whether or not an exception occurred.", "raise throws an exception deliberately."] },
          { title: "Modules & libraries", facts: ["import loads a module so its functions can be used.", "pip installs third-party packages.", "NumPy provides fast operations on arrays."] },
        ],
      },
    ],
  },
  {
    match: /pathology/i,
    units: [
      {
        title: "Cell injury",
        lessons: [
          { title: "Cell injury & adaptation", facts: ["Hypertrophy is an increase in cell size, while hyperplasia is an increase in cell number.", "Metaplasia is the replacement of one adult cell type by another, as in the bronchi of smokers.", "Reversible cell injury shows cellular swelling and fatty change."] },
          { title: "Cell death", facts: ["Coagulative necrosis is typical of infarcts in solid organs such as the heart and kidney.", "Liquefactive necrosis is characteristic of brain infarcts and abscesses.", "Apoptosis is programmed cell death without an inflammatory reaction."] },
        ],
      },
      {
        title: "Inflammation & repair",
        lessons: [
          { title: "Acute inflammation", facts: ["Neutrophils are the predominant cells in acute inflammation.", "The cardinal signs are redness, heat, swelling, pain and loss of function.", "Increased vascular permeability allows a protein-rich exudate to form."] },
          { title: "Chronic inflammation & repair", facts: ["Macrophages, lymphocytes and plasma cells dominate chronic inflammation.", "A granuloma is a collection of epithelioid macrophages, as seen in tuberculosis.", "Granulation tissue consists of new capillaries and proliferating fibroblasts."] },
        ],
      },
      {
        title: "Haemodynamic disorders",
        lessons: [
          { title: "Oedema & thrombosis", facts: ["Virchow's triad is endothelial injury, abnormal blood flow and hypercoagulability.", "Oedema can result from raised hydrostatic pressure or reduced plasma oncotic pressure.", "Lines of Zahn show that a thrombus formed in flowing blood."] },
          { title: "Embolism, infarction & shock", facts: ["Most pulmonary emboli arise from deep vein thrombosis of the legs.", "An infarct is an area of ischaemic necrosis caused by loss of blood supply.", "Septic shock is most often caused by Gram-negative bacterial endotoxins."] },
        ],
      },
      {
        title: "Neoplasia",
        lessons: [
          { title: "Neoplasia: nomenclature", facts: ["Benign tumours of glandular epithelium are called adenomas.", "Malignant tumours of mesenchymal origin are called sarcomas.", "Anaplasia means lack of differentiation and is a hallmark of malignancy."] },
          { title: "Carcinogenesis & spread", facts: ["Proto-oncogenes become oncogenes through gain-of-function mutations.", "TP53 is a tumour suppressor gene known as the 'guardian of the genome'.", "Carcinomas typically spread through lymphatics, sarcomas through blood vessels."] },
        ],
      },
    ],
  },
  {
    match: /fundamental|foundations? of nursing|nursing foundation/i,
    units: [
      {
        title: "The nursing profession",
        lessons: [
          { title: "Nursing as a profession", facts: ["The nursing process has five steps: assessment, diagnosis, planning, implementation and evaluation.", "Florence Nightingale is regarded as the founder of modern nursing.", "Patient advocacy means protecting the patient's rights and interests."] },
          { title: "Therapeutic communication", facts: ["Therapeutic communication focuses on the patient's needs, not the nurse's.", "Active listening includes eye contact, nodding and paraphrasing.", "Closed questions are useful for gathering specific facts quickly."] },
        ],
      },
      {
        title: "Assessment",
        lessons: [
          { title: "Vital signs", facts: ["A normal adult resting pulse is 60–100 beats per minute.", "A normal adult respiratory rate is 12–20 breaths per minute.", "Normal oral body temperature is about 37 °C."] },
          { title: "Health assessment", facts: ["Physical examination uses inspection, palpation, percussion and auscultation.", "In abdominal examination, auscultation is done before palpation.", "The Glasgow Coma Scale ranges from 3 to 15."] },
        ],
      },
      {
        title: "Patient safety",
        lessons: [
          { title: "Infection control", facts: ["Hand hygiene is the single most effective way to prevent hospital-acquired infections.", "Standard precautions apply to every patient regardless of diagnosis.", "Used needles are never recapped and go straight into a sharps container."] },
          { title: "Hygiene & pressure care", facts: ["Repositioning a bed-bound patient every 2 hours helps prevent pressure ulcers.", "The Braden scale assesses the risk of pressure ulcers.", "Oral care is especially important for unconscious patients."] },
        ],
      },
      {
        title: "Medicines & records",
        lessons: [
          { title: "Medication administration", facts: ["The 'rights' of medication include the right patient, drug, dose, route and time.", "Intramuscular injections are commonly given in the deltoid or vastus lateralis.", "Two patient identifiers are checked before giving any medicine."] },
          { title: "Documentation & handover", facts: ["Nursing records must be accurate, timely and signed.", "SBAR stands for Situation, Background, Assessment, Recommendation.", "Errors in records are corrected with a single line, never erased."] },
        ],
      },
    ],
  },
  {
    match: /financial accounting|accountancy|principles of accounting/i,
    units: [
      {
        title: "Accounting basics",
        lessons: [
          { title: "Accounting concepts & conventions", facts: ["The business entity concept treats the business as separate from its owner.", "The going concern concept assumes the business will keep operating.", "The conservatism convention anticipates losses but not gains."] },
          { title: "Journal & ledger", facts: ["The journal is the book of original entry.", "Under double entry, every debit has an equal and opposite credit.", "Ledger accounts are balanced to find the closing position of each account."] },
        ],
      },
      {
        title: "Books & checks",
        lessons: [
          { title: "Trial balance", facts: ["A trial balance checks the arithmetical accuracy of ledger postings.", "Errors of omission are not revealed by a trial balance.", "A suspense account temporarily holds a trial balance difference."] },
          { title: "Subsidiary books & cash book", facts: ["The purchases book records only credit purchases of goods.", "A three-column cash book has cash, bank and discount columns.", "Contra entries record transfers between cash and bank."] },
        ],
      },
      {
        title: "Reconciliation & depreciation",
        lessons: [
          { title: "Bank reconciliation", facts: ["A bank reconciliation statement explains the difference between cash book and pass book balances.", "Cheques issued but not yet presented make the pass book balance higher than the cash book.", "Bank charges not yet recorded in the cash book make the pass book balance lower."] },
          { title: "Depreciation", facts: ["Depreciation spreads the cost of an asset over its useful life.", "The straight-line method charges an equal amount every year.", "The written-down value method applies a fixed rate to the reducing book value."] },
        ],
      },
      {
        title: "Final accounts",
        lessons: [
          { title: "Trading, P&L and balance sheet", facts: ["The trading account shows gross profit.", "The profit and loss account shows net profit after indirect expenses.", "The balance sheet shows assets and liabilities on a given date."] },
          { title: "Adjustments & rectification", facts: ["Outstanding expenses are added to the expense and shown as a liability.", "Prepaid expenses are shown as an asset in the balance sheet.", "Rectification entries correct errors found after posting."] },
        ],
      },
    ],
  },
  {
    match: /financial management|corporate finance|managerial finance/i,
    units: [
      {
        title: "Finance fundamentals",
        lessons: [
          { title: "Scope & objectives of finance", facts: ["Wealth maximisation is preferred to profit maximisation because it considers risk and timing.", "The three core finance decisions are investment, financing and dividend decisions.", "Agency problems arise when managers' goals differ from shareholders' goals."] },
          { title: "Time value of money", facts: ["A rupee today is worth more than a rupee in future because it can earn a return.", "Compounding finds future value; discounting finds present value.", "An annuity is a series of equal payments at regular intervals."] },
        ],
      },
      {
        title: "Investment decisions",
        lessons: [
          { title: "Capital budgeting", facts: ["A project is acceptable if its net present value is positive.", "IRR is the discount rate at which NPV equals zero.", "The payback period ignores cash flows after payback."] },
          { title: "Cost of capital", facts: ["WACC weights each source of finance by its share of the capital structure.", "Interest on debt is tax-deductible, which lowers the cost of debt.", "The cost of equity can be estimated with the CAPM."] },
        ],
      },
      {
        title: "Financing & working capital",
        lessons: [
          { title: "Capital structure & leverage", facts: ["Financial leverage comes from fixed-interest debt in the capital structure.", "Operating leverage arises from fixed operating costs.", "Excessive debt raises the risk of financial distress."] },
          { title: "Working capital management", facts: ["Working capital is current assets minus current liabilities.", "The operating cycle runs from buying raw materials to collecting cash from customers.", "Too much working capital hurts profitability; too little hurts liquidity."] },
        ],
      },
      {
        title: "Dividends & markets",
        lessons: [
          { title: "Dividend decisions", facts: ["Walter's and Gordon's models link dividend policy to firm value.", "The MM theory argues that dividend policy is irrelevant in perfect markets.", "A stable dividend policy signals confidence to investors."] },
          { title: "Financial markets", facts: ["The primary market is where new securities are issued.", "SEBI regulates the securities market in India.", "Money market instruments have maturities of up to one year."] },
        ],
      },
    ],
  },
];

export function libraryFor(title: string): LibraryCourse | undefined {
  return COURSE_LIBRARY.find((c) => c.match.test(title));
}
