import "server-only";

/*
 * Teaching material for each library topic, keyed by the topic title in course-library.ts.
 * Every topic becomes a chapter with three lessons: key concepts (intro, key points, key terms),
 * worked example (example + common mistakes) and practice & recap (questions with model answers).
 */

export interface TopicExtra {
  intro: string;
  terms: Array<[term: string, meaning: string]>;
  example: string;
  mistakes: [string, string];
  practice: Array<[question: string, answer: string]>;
}

export const TOPIC_EXTRA: Record<string, TopicExtra> = {
  /* ───────────── Database Management Systems ───────────── */
  "Introduction to database systems": {
    intro: "A database system stores related data centrally and lets many users query and update it safely through a DBMS.",
    terms: [
      ["DBMS", "Software that creates, stores, secures and queries databases for many users."],
      ["Schema", "The overall logical design of a database, which changes rarely."],
      ["Instance", "The data stored in the database at a particular moment."],
    ],
    example:
      "**University records.** Without a DBMS, the exam cell and the library keep separate student files. A new phone number is updated in one file but not the other — *data inconsistency*.\n\nWith a DBMS, both departments read one `STUDENT` table. The number is stored once, access is controlled by user roles, and a crash during an update is rolled back automatically.",
    mistakes: ["Confusing the schema (the design) with the instance (the current data).", "Assuming a spreadsheet gives the same concurrency and recovery guarantees as a DBMS."],
    practice: [
      ["Name two problems of file-processing systems that a DBMS solves.", "Data redundancy and inconsistency; also concurrent-access anomalies, integrity and security problems, and difficult data access."],
      ["What is physical data independence?", "The ability to change how data is stored (files, indexes) without changing the logical schema or the application programs."],
    ],
  },
  "ER modelling": {
    intro: "Entity–Relationship (ER) modelling designs a database visually before any table is created: entities, their attributes and the relationships between them.",
    terms: [
      ["Entity set", "A collection of similar real-world objects, such as all students of a college."],
      ["Relationship set", "An association among two or more entity sets, such as ENROLS between student and course."],
      ["Participation constraint", "Whether every entity must take part in a relationship (total) or need not (partial)."],
    ],
    example:
      "**Designing a college database**\n1. Entities: `STUDENT(roll_no, name, phone)` and `COURSE(code, title, credits)`.\n2. Relationship: `ENROLS` between them, with the attribute `grade`.\n3. Cardinality: a student takes many courses and a course has many students, so ENROLS is **M:N**.\n4. Mapping: an M:N relationship becomes its own table `ENROLS(roll_no, code, grade)` with a composite key.",
    mistakes: ["Storing a relationship attribute such as grade inside one entity instead of on the relationship.", "Drawing an M:N relationship as 1:N because only one direction was considered."],
    practice: [
      ["How is an M:N relationship mapped to tables?", "As a separate table holding the primary keys of both entity sets (plus any relationship attributes); together they form its key."],
      ["What is a derived attribute? Give an example.", "An attribute computed from others, such as age from date of birth; it is drawn as a dashed ellipse."],
    ],
  },
  "Relational model & keys": {
    intro: "The relational model stores data as tables (relations) of rows (tuples) and columns (attributes), and uses keys to identify and link rows.",
    terms: [
      ["Superkey", "Any set of attributes whose values uniquely identify each tuple."],
      ["Primary key", "The candidate key chosen by the designer to identify rows in a table."],
      ["Referential integrity", "The rule that every foreign key value matches an existing referenced row or is NULL."],
    ],
    example:
      "**Keys in `STUDENT(roll_no, email, name, dept_id)`**\n- `roll_no` and `email` are each unique, so both are *candidate keys*.\n- `{roll_no, name}` is unique too but not minimal — a *superkey*, not a candidate key.\n- The college picks `roll_no` as the *primary key*.\n- `dept_id` refers to `DEPARTMENT(dept_id)` — a *foreign key*; inserting `dept_id = 99` fails if no such department exists.",
    mistakes: ["Calling any unique set of attributes a candidate key — it must also be minimal.", "Forgetting that a foreign key may be NULL unless it is declared NOT NULL."],
    practice: [
      ["What is the difference between a superkey and a candidate key?", "A superkey is any set of attributes that uniquely identifies tuples; a candidate key is a minimal superkey."],
      ["Can a table have more than one candidate key?", "Yes — for example roll_no and email; one of them is chosen as the primary key."],
    ],
  },
  "Relational algebra": {
    intro: "Relational algebra is a set of operations that take relations as input and return a relation — the theory underneath every SQL query.",
    terms: [
      ["Selection (σ)", "The operation that keeps only the tuples satisfying a condition."],
      ["Projection (π)", "The operation that keeps only the listed attributes of a relation."],
      ["Cartesian product (×)", "The operation that pairs every tuple of one relation with every tuple of another."],
    ],
    example:
      "**Query:** names of students in the CSE department.\n\n`π name ( σ dept = 'CSE' (STUDENT) )`\n\n1. `σ dept = 'CSE'` keeps only CSE rows.\n2. `π name` keeps only the name column.\n\nIn SQL: `SELECT DISTINCT name FROM student WHERE dept = 'CSE';` — `DISTINCT` matches the algebra, which never returns duplicates.",
    mistakes: ["Projecting before selecting and losing the column the condition needs.", "Forgetting that relational algebra removes duplicates while a plain SQL SELECT does not."],
    practice: [
      ["Write an expression for the roll numbers of students who scored above 90.", "π roll_no ( σ marks > 90 (RESULT) )"],
      ["Which operation answers 'students enrolled in every course'?", "Division (÷)."],
    ],
  },
  "SQL queries & joins": {
    intro: "SQL is the standard language for defining and querying relational databases; joins combine rows from several tables.",
    terms: [
      ["INNER JOIN", "Returns only rows that have matching values in both tables."],
      ["GROUP BY", "Collects rows with the same values so aggregates can be computed per group."],
      ["Aggregate function", "A function such as COUNT, SUM or AVG that returns one value for a set of rows."],
    ],
    example:
      "**Average marks per department, only departments above 70:**\n```sql\nSELECT d.name, AVG(r.marks) AS avg_marks\nFROM result r\nJOIN student s ON s.roll_no = r.roll_no\nJOIN department d ON d.dept_id = s.dept_id\nGROUP BY d.name\nHAVING AVG(r.marks) > 70;\n```\n`WHERE` cannot filter on the average, because the average only exists after grouping.",
    mistakes: ["Using WHERE instead of HAVING to filter on an aggregate.", "Selecting a column that is neither grouped nor aggregated."],
    practice: [
      ["Which join keeps students who have no results yet?", "A LEFT OUTER JOIN from student to result; the unmatched result columns are NULL."],
      ["What does COUNT(*) count compared with COUNT(column)?", "COUNT(*) counts all rows; COUNT(column) counts only rows where that column is not NULL."],
    ],
  },
  "Functional dependencies": {
    intro: "A functional dependency describes how the value of one set of attributes determines another — the basis of good table design.",
    terms: [
      ["Determinant", "The attribute set on the left-hand side of a functional dependency."],
      ["Trivial dependency", "A dependency X → Y where Y is a subset of X."],
      ["Attribute closure", "The set of all attributes that can be derived from a given set using the dependencies."],
    ],
    example:
      "**R(A, B, C, D)** with `A → B`, `B → C`, `A → D`.\n\nClosure of {A}:\n1. Start with {A}.\n2. A → B adds B → {A, B}.\n3. B → C adds C → {A, B, C}.\n4. A → D adds D → {A, B, C, D}.\n\n{A}⁺ contains every attribute, so **A is a key** of R.",
    mistakes: ["Reading a dependency backwards: A → B does not mean B → A.", "Stopping the closure computation before no more attributes can be added."],
    practice: [
      ["Given A → B and B → C, what can you infer?", "A → C, by transitivity."],
      ["How do you test whether X is a superkey?", "Compute X⁺; X is a superkey if X⁺ contains every attribute of the relation."],
    ],
  },
  "Normalization (1NF–BCNF)": {
    intro: "Normalization splits tables step by step through the normal forms to remove redundancy and update anomalies.",
    terms: [
      ["Partial dependency", "A non-key attribute that depends on only part of a composite key."],
      ["Transitive dependency", "A non-key attribute that depends on another non-key attribute."],
      ["Update anomaly", "An inconsistency caused by having to change the same fact in many rows."],
    ],
    example:
      "**ENROL(roll_no, course_code, student_name, course_title, grade)**, key {roll_no, course_code}\n- `roll_no → student_name` and `course_code → course_title` are *partial* dependencies, so the table is not in 2NF.\n- Decompose into `STUDENT(roll_no, student_name)`, `COURSE(course_code, course_title)` and `ENROL(roll_no, course_code, grade)`.\n- Each fact is now stored once — renaming a course is a single-row update.",
    mistakes: ["Decomposing without checking that the join is lossless.", "Assuming 3NF always equals BCNF — they differ when a non-key attribute determines part of a key."],
    practice: [
      ["What must hold for a table to be in 1NF?", "Every attribute value is atomic — no repeating groups or multivalued cells."],
      ["Why might a designer stop at 3NF instead of BCNF?", "A BCNF decomposition is not always dependency-preserving, while a 3NF one always can be."],
    ],
  },
  "Transactions & ACID": {
    intro: "A transaction is a unit of work, such as a fee payment, that the DBMS must run completely and correctly even when many run at once.",
    terms: [
      ["Commit", "The point at which a transaction's changes become permanent."],
      ["Rollback", "Undoing every change made by a transaction that cannot complete."],
      ["Isolation", "The property that concurrent transactions do not see each other's partial results."],
    ],
    example:
      "**Fee payment of ₹50,000**\n```sql\nBEGIN;\nUPDATE account SET balance = balance - 50000 WHERE id = 'STUDENT';\nUPDATE account SET balance = balance + 50000 WHERE id = 'COLLEGE';\nCOMMIT;\n```\nIf power fails after the first UPDATE, **atomicity** rolls it back — money is never deducted without being credited. After COMMIT, **durability** keeps the payment even if the server crashes.",
    mistakes: ["Thinking the DBMS alone guarantees consistency — it also depends on correct transaction logic.", "Confusing conflict-serialisable with actually running transactions one after another."],
    practice: [
      ["Which ACID property does the log and recovery manager ensure after a crash?", "Durability (and atomicity, by undoing incomplete transactions)."],
      ["When do two operations conflict?", "When they belong to different transactions, access the same item, and at least one is a write."],
    ],
  },
  "Concurrency control": {
    intro: "Concurrency control lets many transactions run at once without corrupting data or giving results no serial order could produce.",
    terms: [
      ["Shared lock", "A lock that lets several transactions read an item but none write it."],
      ["Exclusive lock", "A lock that lets one transaction read and write an item while others wait."],
      ["Starvation", "A transaction waiting indefinitely because others keep getting priority."],
    ],
    example:
      "**Lost update — booking the last seats**\n| Time | T1 | T2 |\n|---|---|---|\n| 1 | read seats = 5 | |\n| 2 | | read seats = 5 |\n| 3 | write seats = 4 | |\n| 4 | | write seats = 4 |\n\nTwo students booked, yet seats shows 4. With **exclusive locks**, T2 waits until T1 commits, reads 4, and correctly writes 3.",
    mistakes: ["Acquiring a new lock after releasing one — this breaks two-phase locking.", "Believing locking prevents deadlocks; it can cause them."],
    practice: [
      ["What is strict two-phase locking?", "2PL in which exclusive locks are held until the transaction commits or aborts, preventing cascading rollbacks."],
      ["Name one way to handle deadlocks.", "Detect them with a wait-for graph and abort a victim, prevent them with wait-die or wound-wait, or use timeouts."],
    ],
  },
  "Indexing & B+ trees": {
    intro: "Indexes are extra structures that let the DBMS find rows without scanning the whole table.",
    terms: [
      ["Search key", "The attribute or attributes used to look up records in an index."],
      ["Dense index", "An index with an entry for every search-key value in the file."],
      ["Fan-out", "The number of child pointers a tree node holds."],
    ],
    example:
      "**Finding roll_no 21CS045 among 1,00,000 students**\n- Without an index: scan up to 1,00,000 rows.\n- With a B+ tree of fan-out 100: about 3 node reads (100 × 100 × 100 ≥ 1,00,000), then follow the leaf pointer.\n- For `roll_no BETWEEN '21CS040' AND '21CS060'`, find the first leaf once, then walk along the linked leaves.",
    mistakes: ["Indexing every column — each index slows down inserts and updates.", "Expecting a hash index to speed up range queries."],
    practice: [
      ["Why are B+ trees shallow even for huge tables?", "Each node holds many keys (high fan-out), so the height grows only logarithmically."],
      ["How do clustered and non-clustered indexes differ?", "A clustered index decides the physical row order (one per table); a non-clustered index is a separate structure that points to rows."],
    ],
  },

  /* ───────────── Data Structures ───────────── */
  "Arrays & complexity": {
    intro: "An array stores elements in contiguous memory; complexity analysis tells us how an algorithm's cost grows with the size of its input.",
    terms: [
      ["Time complexity", "How the running time of an algorithm grows with the size of its input."],
      ["Space complexity", "How much extra memory an algorithm needs as its input grows."],
      ["Contiguous memory", "Memory locations that sit next to each other."],
    ],
    example: "**Address of an element**\nAn int array `A` starts at address 1000 and each int takes 4 bytes.\n\nAddress of `A[5]` = 1000 + 5 × 4 = **1020** — computed directly, which is why array access is O(1).",
    mistakes: ["Forgetting that array indices start at 0.", "Treating O(n²) as acceptable for very large inputs."],
    practice: [
      ["What is the complexity of finding the maximum in an unsorted array?", "O(n) — every element must be examined once."],
      ["Which grows more slowly for large n: O(n log n) or O(n²)?", "O(n log n)."],
    ],
  },
  "Linked lists": {
    intro: "A linked list stores elements in nodes connected by pointers, so it can grow and shrink without moving other elements.",
    terms: [
      ["Head", "A pointer to the first node of a linked list."],
      ["Circular linked list", "A list whose last node points back to the first."],
      ["Traversal", "Visiting each element of a structure in turn."],
    ],
    example: "**Insert 25 after node 20 in 10 → 20 → 30**\n1. Create `new(25)`.\n2. `new.next = node20.next` (it now points to 30).\n3. `node20.next = new`.\n\nResult: 10 → 20 → 25 → 30 with nothing shifted — O(1) once node 20 is found.",
    mistakes: ["Changing `node20.next` before saving the old pointer, which loses the rest of the list.", "Forgetting to handle the empty-list case."],
    practice: [
      ["What is the cost of reaching the k-th element?", "O(k), because the list must be walked from the head."],
      ["How do you detect a loop in a linked list?", "Floyd's algorithm: a slow and a fast pointer meet if there is a cycle."],
    ],
  },
  Stacks: {
    intro: "A stack allows insertion and deletion at one end only, called the top.",
    terms: [
      ["Push", "Adding an element to the top of a stack."],
      ["Pop", "Removing the element at the top of a stack."],
      ["Stack overflow", "Trying to push onto a stack that is already full."],
    ],
    example: "**Evaluate the postfix expression `5 3 + 2 *`**\n| Token | Stack |\n|---|---|\n| 5 | 5 |\n| 3 | 5 3 |\n| + | 8 |\n| 2 | 8 2 |\n| * | 16 |\n\nResult: **16**.",
    mistakes: ["Popping from an empty stack (underflow).", "Reversing the operand order for − and ÷ during postfix evaluation."],
    practice: [
      ["Convert `A + B * C` to postfix.", "A B C * +"],
      ["Which data structure checks balanced parentheses?", "A stack."],
    ],
  },
  Queues: {
    intro: "A queue inserts at the rear and removes from the front, like a line at a counter.",
    terms: [
      ["Enqueue", "Adding an element at the rear of a queue."],
      ["Dequeue", "Removing an element from the front of a queue."],
      ["Deque", "A double-ended queue that allows insertion and deletion at both ends."],
    ],
    example: "**Circular queue of size 5**\nFront = 3, rear = 4, and slots 0–2 are free.\n\nThe next enqueue goes to (4 + 1) mod 5 = **0** — the empty space at the start is reused instead of reporting 'full'.",
    mistakes: ["Declaring a linear queue full while free slots remain at the front.", "Confusing FIFO (queue) with LIFO (stack)."],
    practice: [
      ["Give a use of a queue in an operating system.", "CPU scheduling or printer spooling."],
      ["Which queue releases higher-priority items first?", "A priority queue."],
    ],
  },
  "Binary search trees": {
    intro: "A binary search tree keeps keys in order so that search, insertion and deletion follow a single path from the root.",
    terms: [
      ["Leaf node", "A node with no children."],
      ["Height of a tree", "The number of edges on the longest path from the root to a leaf."],
      ["Inorder successor", "The next node in sorted order — the smallest key in the right subtree."],
    ],
    example: "**Insert 50, 30, 70, 20, 40**\n```\n      50\n     /  \\\n   30    70\n  /  \\\n20    40\n```\nSearching for 40: 50 → left to 30 → right to 40 — three comparisons.",
    mistakes: ["Deleting a node with two children without replacing it by its inorder successor or predecessor.", "Assuming BST operations are always O(log n)."],
    practice: [
      ["What is the inorder traversal of the tree above?", "20, 30, 40, 50, 70"],
      ["Which trees keep themselves balanced automatically?", "AVL trees and red-black trees."],
    ],
  },
  "Heaps & priority queues": {
    intro: "A heap is a complete binary tree that keeps the largest (or smallest) element at the root, which makes it ideal for priority queues.",
    terms: [
      ["Min-heap", "A heap in which every parent is less than or equal to its children."],
      ["Heapify", "Restoring the heap property by moving an element down the tree."],
      ["Complete binary tree", "A tree filled level by level from left to right."],
    ],
    example: "**Insert 60 into the max-heap [50, 30, 40]**\n1. Add at the end → [50, 30, 40, 60].\n2. 60 > parent 30 → swap → [50, 60, 40, 30].\n3. 60 > parent 50 → swap → [60, 50, 40, 30].\n\nThe new maximum reaches the root after at most log n swaps.",
    mistakes: ["Confusing a heap with a BST — a heap is not sorted left to right.", "Forgetting to re-heapify after removing the root."],
    practice: [
      ["How long does it take to build a heap from n elements?", "O(n)."],
      ["Where is the smallest element of a max-heap?", "At one of the leaves."],
    ],
  },
  Hashing: {
    intro: "Hashing stores and finds keys in about constant time by computing their position directly from the key.",
    terms: [
      ["Collision", "When two different keys map to the same slot."],
      ["Linear probing", "Resolving collisions by checking the next slots one by one."],
      ["Rehashing", "Building a larger table and reinserting every key when the table gets too full."],
    ],
    example: "**h(k) = k mod 10 with linear probing; insert 23, 43, 13**\n- 23 → slot 3.\n- 43 → slot 3 taken → slot 4.\n- 13 → slots 3 and 4 taken → slot 5.\n\nThis clustering is why a good hash function and a low load factor matter.",
    mistakes: ["Choosing a table size that shares factors with common key patterns.", "Letting the load factor approach 1 with open addressing."],
    practice: [
      ["What is the average search time in a well-designed hash table?", "O(1)."],
      ["Name two collision-resolution methods.", "Chaining and open addressing (linear probing, quadratic probing, double hashing)."],
    ],
  },
  "Graphs & traversal": {
    intro: "Graphs model networks of connections — roads, friendships, course prerequisites — as vertices and edges.",
    terms: [
      ["Adjacency list", "A representation that stores, for each vertex, the list of its neighbours."],
      ["Directed graph", "A graph whose edges have a direction."],
      ["Spanning tree", "A subgraph that connects every vertex without any cycle."],
    ],
    example: "**BFS from A** on edges A–B, A–C, B–D, C–D, D–E\n\nQueue: A → B, C → D → E\n\nVisit order: **A, B, C, D, E**. BFS also finds the fewest-edge path: A to E needs 3 edges (A–B–D–E).",
    mistakes: ["Forgetting to mark vertices as visited, causing infinite loops.", "Using Dijkstra's algorithm when some edge weights are negative."],
    practice: [
      ["Which traversal finds shortest paths in an unweighted graph?", "Breadth-first search."],
      ["Name two minimum spanning tree algorithms.", "Prim's and Kruskal's."],
    ],
  },
  "Sorting & searching": {
    intro: "Sorting arranges data in order, and ordered data can be searched much faster.",
    terms: [
      ["Stable sort", "A sort that keeps equal elements in their original relative order."],
      ["In-place sort", "A sort that needs only a small, constant amount of extra memory."],
      ["Pivot", "The element quick sort uses to partition the array."],
    ],
    example: "**Binary search for 42 in [5, 12, 19, 27, 42, 56, 73]**\n1. Middle is 27 → 42 is larger → search the right half.\n2. Middle of [42, 56, 73] is 56 → search left.\n3. Found 42 in **3 steps**, instead of 5 with a linear scan.",
    mistakes: ["Running binary search on unsorted data.", "Assuming quick sort is always faster than merge sort."],
    practice: [
      ["Which sort is stable: merge sort or quick sort?", "Merge sort."],
      ["What is the best-case complexity of insertion sort?", "O(n), when the array is already sorted."],
    ],
  },

  /* ───────────── Operating Systems ───────────── */
  "Processes & threads": {
    intro: "A process is the unit of work in an operating system; threads let one process do several things at once.",
    terms: [
      ["Context switch", "Saving the state of one process and loading another so the CPU can switch between them."],
      ["Process state", "Where a process is in its life cycle: new, ready, running, waiting or terminated."],
      ["Multithreading", "Running several threads inside one process so that they share its memory."],
    ],
    example: "**A browser with three tabs**\n- Each tab runs as a separate *process*, so a crash in one tab does not close the others.\n- Inside a tab, one *thread* draws the page while another downloads images — they share memory.\n- When the download thread waits for the network it moves from *running* to *waiting*, and the scheduler runs another thread.",
    mistakes: ["Assuming threads have separate memory like processes.", "Thinking a waiting process is using the CPU."],
    practice: [
      ["Why is creating a thread cheaper than creating a process?", "Threads share the process's address space and resources, so the OS has much less to allocate."],
      ["What moves a process from running to ready?", "An interrupt or the end of its time slice (preemption)."],
    ],
  },
  "CPU scheduling": {
    intro: "The CPU scheduler decides which ready process runs next; the choice affects waiting time, response time and fairness.",
    terms: [
      ["Turnaround time", "Time from a process's arrival until it completes."],
      ["Time quantum", "The fixed slice of CPU time each process receives in round robin."],
      ["Preemption", "Taking the CPU away from a running process before it finishes."],
    ],
    example: "**FCFS vs SJF** — bursts P1 = 6, P2 = 2, P3 = 1, all arriving at time 0\n| Order | Waiting times | Average |\n|---|---|---|\n| FCFS: P1, P2, P3 | P1 = 0, P2 = 6, P3 = 8 | 4.67 |\n| SJF: P3, P2, P1 | P3 = 0, P2 = 1, P1 = 3 | 1.33 |\n\nRunning the shortest jobs first cuts the average wait sharply.",
    mistakes: ["Forgetting to subtract the arrival time when computing waiting time.", "Choosing a quantum so small that context switching dominates."],
    practice: [
      ["Which algorithm suits time-sharing systems?", "Round robin, because every process gets the CPU regularly and response time stays low."],
      ["What is ageing?", "Gradually raising the priority of waiting processes so they are not starved."],
    ],
  },
  Synchronisation: {
    intro: "When processes share data, their operations must be coordinated so the result does not depend on timing.",
    terms: [
      ["Race condition", "When the outcome depends on the unpredictable order in which threads access shared data."],
      ["Mutual exclusion", "The rule that only one process may be inside its critical section at a time."],
      ["Busy waiting", "A process repeatedly checking a condition instead of sleeping."],
    ],
    example: "**A counter updated by two threads**\n`count = count + 1` is really *load, add, store*. If both threads load 10 before either stores, the result is 11 instead of 12.\n\nFix it with a mutex:\n```\nlock(m);\ncount = count + 1;\nunlock(m);\n```\nNow the three steps run as one indivisible critical section.",
    mistakes: ["Forgetting to release a lock on an error path, blocking every other thread.", "Protecting writes but not reads of the same shared data."],
    practice: [
      ["What three requirements must a critical-section solution meet?", "Mutual exclusion, progress and bounded waiting."],
      ["What is a binary semaphore?", "A semaphore whose value is only 0 or 1, used like a mutex lock."],
    ],
  },
  Deadlocks: {
    intro: "A deadlock happens when processes each hold a resource and wait for one held by another, so none can proceed.",
    terms: [
      ["Safe state", "A state in which the system can finish every process in some order without deadlock."],
      ["Resource-allocation graph", "A graph showing which resources each process holds and requests."],
      ["Circular wait", "A closed chain of processes, each waiting for a resource held by the next."],
    ],
    example: "**Two processes, two devices**\n1. P1 holds the *printer* and requests the *scanner*.\n2. P2 holds the *scanner* and requests the *printer*.\n3. Neither can continue — all four conditions hold.\n\nPrevention: number the resources and require every process to request them in increasing order. P2 must then ask for the printer first, so the circular wait cannot form.",
    mistakes: ["Treating an unsafe state as a deadlock — it only means deadlock is possible.", "Thinking a cycle always means deadlock when resources have several instances."],
    practice: [
      ["What must the banker's algorithm know in advance?", "The maximum number of each resource every process may request."],
      ["Name one way to recover from deadlock.", "Abort one or more processes, or preempt resources from them."],
    ],
  },
  "Memory management": {
    intro: "Memory management decides where each process lives in main memory and translates the addresses programs use into physical ones.",
    terms: [
      ["Logical address", "An address generated by the CPU for a program, before translation."],
      ["Page table", "The per-process table that maps page numbers to frame numbers."],
      ["Internal fragmentation", "Unused space inside an allocated block, such as the last page of a process."],
    ],
    example: "**Address translation — page size 1 KB (1024 bytes)**\n- Logical address 3500 → page = 3500 ÷ 1024 = **3**, offset = 3500 − 3072 = **428**.\n- The page table maps page 3 to frame **7**.\n- Physical address = 7 × 1024 + 428 = **7596**.",
    mistakes: ["Mixing up internal fragmentation (paging) with external fragmentation (variable partitions).", "Forgetting that every memory access needs a page-table lookup unless the TLB hits."],
    practice: [
      ["TLB hit ratio 90%, TLB 10 ns, memory 100 ns — effective access time?", "0.9 × 110 + 0.1 × 210 = 120 ns."],
      ["Why does segmentation suffer external fragmentation?", "Segments have different sizes, so free memory breaks into holes too small to use."],
    ],
  },
  "Virtual memory": {
    intro: "Virtual memory lets a process run when only part of it is in main memory, using the disk as an extension.",
    terms: [
      ["Page fault", "A trap raised when a program accesses a page that is not in main memory."],
      ["Working set", "The pages a process has used in its most recent window of time."],
      ["Page replacement", "Choosing which page to evict when a new page must be loaded and memory is full."],
    ],
    example: "**FIFO with 3 frames, references 7, 0, 1, 2, 0, 3**\n| Ref | Frames | Fault? |\n|---|---|---|\n| 7 | 7 | yes |\n| 0 | 7 0 | yes |\n| 1 | 7 0 1 | yes |\n| 2 | 2 0 1 | yes (7 out) |\n| 0 | 2 0 1 | no |\n| 3 | 2 3 1 | yes (0 out) |\n\n5 page faults. LRU would evict page 1 instead of 0 at the last step.",
    mistakes: ["Assuming more frames always means fewer faults — FIFO can show Belady's anomaly.", "Confusing a page fault with a bug in the program."],
    practice: [
      ["Which replacement algorithm is optimal but impossible to implement exactly?", "OPT — replace the page that will not be used for the longest time."],
      ["How can thrashing be reduced?", "Give processes enough frames for their working sets, or reduce the degree of multiprogramming."],
    ],
  },
  "File systems": {
    intro: "The file system organises data on disk into files and directories and decides how disk blocks are allocated.",
    terms: [
      ["Indexed allocation", "Keeping all the block pointers of a file together in one index block."],
      ["Mounting", "Attaching a file system to a directory so that its files become accessible."],
      ["Access control list", "A list of users and the operations each may perform on a file."],
    ],
    example: "**Opening /home/anu/notes.txt on a Unix-style system**\n1. Read the root directory, find `home`.\n2. Read `home`, find `anu`.\n3. Read `anu`, find `notes.txt` → inode 812.\n4. Inode 812 lists the data blocks; read them.\n\nEach path component costs at least one disk read — which is why directories are cached.",
    mistakes: ["Thinking a file's name is stored in its inode — it is stored in the directory entry.", "Using linked allocation for files that need fast random access."],
    practice: [
      ["Which allocation method supports direct access without external fragmentation?", "Indexed allocation."],
      ["How does a hard link differ from a symbolic link?", "A hard link is another directory entry for the same inode; a symbolic link is a small file containing a path."],
    ],
  },
  "Disk scheduling": {
    intro: "Disk scheduling orders pending I/O requests to reduce how far the disk head has to move.",
    terms: [
      ["Rotational latency", "Time for the required sector to rotate under the disk head."],
      ["C-SCAN", "An algorithm that serves requests in one direction only, then jumps back to the start."],
      ["Request queue", "The list of pending disk I/O requests waiting to be served."],
    ],
    example: "**Head at 50; queue 82, 170, 43, 140, 24, 16, 190**\n- FCFS: 32 + 88 + 127 + 97 + 116 + 8 + 174 = **642** cylinders.\n- SSTF: 50→43→24→16→82→140→170→190 = 7 + 19 + 8 + 66 + 58 + 30 + 20 = **208** cylinders.\n\nServing the nearest request first cuts head movement by more than two thirds.",
    mistakes: ["Forgetting that SSTF can starve requests far from the head.", "Counting the starting head position as a request."],
    practice: [
      ["Why is C-SCAN fairer than SCAN?", "The head always sweeps in one direction and returns to the start, giving a more uniform wait."],
      ["Which is usually larger: seek time or rotational latency?", "Seek time."],
    ],
  },

  /* ───────────── Python Programming ───────────── */
  "Variables & data types": {
    intro: "Python programs work with values of different types — numbers, text, booleans and collections — stored in variables.",
    terms: [
      ["Dynamic typing", "The type belongs to the value, so a name can later refer to a value of another type."],
      ["Immutable object", "An object whose value cannot change after it is created."],
      ["Type casting", "Converting a value from one type to another."],
    ],
    example: "```python\nmarks = \"87\"            # a string read from input\ntotal = int(marks) + 5  # convert before adding\nprint(total)            # 92\n\nname = \"Anu\"\n# name[0] = \"E\"  -> TypeError: strings are immutable\nname = \"E\" + name[1:]   # build a new string instead\n```",
    mistakes: ["Adding a number to a string read from input without converting it.", "Using `is` instead of `==` to compare values."],
    practice: [
      ["What does `print(type(3 / 2))` show?", "<class 'float'> — the / operator always returns a float."],
      ["Is a list mutable or immutable?", "Mutable — its elements can be changed in place."],
    ],
  },
  "Control flow": {
    intro: "Control flow decides which statements run and how many times: conditions choose a path and loops repeat work.",
    terms: [
      ["Iterable", "Any object that can return its items one at a time, such as a list, string or range."],
      ["elif", "The keyword that checks another condition when the previous one was false."],
      ["Infinite loop", "A loop whose condition never becomes false."],
    ],
    example: "```python\nfor m in [45, 72, 91]:\n    if m >= 90:\n        grade = \"O\"\n    elif m >= 60:\n        grade = \"B\"\n    else:\n        grade = \"RA\"\n    print(m, grade)\n```\nOutput: `45 RA`, `72 B`, `91 O`. Indentation decides what belongs to each branch.",
    mistakes: ["Mixing tabs and spaces, which raises IndentationError.", "Expecting `range(1, 10)` to include 10."],
    practice: [
      ["How many times does `for i in range(2, 11, 3)` run?", "Three times: i = 2, 5, 8."],
      ["When does the else clause of a for loop run?", "When the loop finishes without a break."],
    ],
  },
  Functions: {
    intro: "Functions package reusable logic behind a name, take inputs as parameters and return a result.",
    terms: [
      ["Parameter", "A name in a function definition that receives a value when the function is called."],
      ["Return value", "The result a function sends back to its caller."],
      ["Scope", "The region of a program in which a name can be used."],
    ],
    example: "```python\ndef grade(marks, pass_mark=50):\n    return \"Pass\" if marks >= pass_mark else \"Fail\"\n\nprint(grade(62))       # Pass (default 50)\nprint(grade(62, 70))   # Fail\n\ndef total(*scores):\n    return sum(scores)\n\nprint(total(10, 20, 30))  # 60\n```",
    mistakes: ["Using a mutable default such as `def f(items=[])`, which is shared between calls.", "Forgetting `return`, so the function gives back None."],
    practice: [
      ["What does a function without a return statement return?", "None."],
      ["How do *args and **kwargs differ?", "*args collects extra positional arguments into a tuple; **kwargs collects extra keyword arguments into a dictionary."],
    ],
  },
  "Lists, tuples & dictionaries": {
    intro: "Python's built-in collections store many values: lists and tuples keep order, and dictionaries map keys to values.",
    terms: [
      ["Index", "The position of an item in a sequence, counting from 0."],
      ["Key–value pair", "An entry in a dictionary linking a unique key to its value."],
      ["Tuple", "An ordered sequence of values that cannot be changed."],
    ],
    example: "```python\nmarks = {\"Anu\": 88, \"Ravi\": 74}\nmarks[\"Meena\"] = 91              # add a key\ntoppers = [n for n, m in marks.items() if m >= 80]\nprint(toppers)                     # ['Anu', 'Meena']\n\npoint = (12.9, 80.2)               # latitude, longitude — should not change\n```",
    mistakes: ["Using a list as a dictionary key — lists are not hashable.", "Changing a list while looping over it."],
    practice: [
      ["How do you read a key that may not exist?", "Use `d.get(key, default)`."],
      ["What is `[x * x for x in range(4)]`?", "[0, 1, 4, 9]"],
    ],
  },
  "Strings & files": {
    intro: "Strings hold text, and files let programs keep data after they finish running.",
    terms: [
      ["Slicing", "Taking part of a sequence using start:stop:step."],
      ["File mode", "A string such as 'r', 'w' or 'a' that says how a file is opened."],
      ["Context manager", "An object used with `with` that sets up and cleans up a resource automatically."],
    ],
    example: "```python\nwith open(\"results.csv\", \"a\") as f:\n    f.write(\"21CS045,Anu,88\\n\")\n\nwith open(\"results.csv\") as f:\n    for line in f:\n        roll, name, mark = line.strip().split(\",\")\n        print(name.upper(), int(mark))\n```\nThe `with` blocks close the file even if an error occurs.",
    mistakes: ["Opening with 'w' when you meant to add — 'w' erases the existing content.", "Forgetting `strip()`, so every line keeps its trailing newline."],
    practice: [
      ["What is `\"Python\"[::-1]`?", "'nohtyP' — a step of −1 reverses the string."],
      ["What does `split(\",\")` return?", "A list of the parts of the string separated by commas."],
    ],
  },
  "Object-oriented programming": {
    intro: "Object-oriented programming groups data and the functions that work on it into classes; objects are instances of those classes.",
    terms: [
      ["Class", "A blueprint that defines the attributes and methods of its objects."],
      ["Method", "A function defined inside a class that works on its objects."],
      ["Encapsulation", "Keeping an object's data together with its methods and hiding internal details."],
    ],
    example: "```python\nclass Student:\n    def __init__(self, name, marks):\n        self.name = name\n        self.marks = marks\n\n    def grade(self):\n        return \"O\" if self.marks >= 90 else \"A\"\n\nclass Topper(Student):\n    def grade(self):          # overrides the parent method\n        return \"O+\"\n\nprint(Student(\"Anu\", 92).grade(), Topper(\"Ravi\", 99).grade())  # O O+\n```",
    mistakes: ["Forgetting `self` as the first parameter of a method.", "Using a class attribute when each object needs its own value."],
    practice: [
      ["What is method overriding?", "A subclass providing its own version of a method defined in its parent class."],
      ["How do you call the parent's __init__ from a subclass?", "With `super().__init__(...)`."],
    ],
  },
  Exceptions: {
    intro: "Exceptions signal errors at run time; handling them lets a program respond sensibly instead of crashing.",
    terms: [
      ["Traceback", "The report Python prints showing where an unhandled exception occurred."],
      ["ValueError", "The exception raised when a value has the right type but unsuitable content."],
      ["else clause", "The part of a try statement that runs only when no exception occurred."],
    ],
    example: "```python\ntry:\n    marks = int(input(\"Marks: \"))\nexcept ValueError:\n    print(\"Please enter a whole number\")\nelse:\n    print(\"Saved\", marks)\nfinally:\n    print(\"Done\")\n```\nTyping `eighty` prints the friendly message and `Done` instead of a traceback.",
    mistakes: ["Catching everything with a bare `except:`, which hides real bugs.", "Wrapping too much code in `try`, so it is unclear which line failed."],
    practice: [
      ["When does the finally block run?", "Always — whether or not an exception was raised or handled."],
      ["How do you define your own exception?", "Create a class that inherits from Exception."],
    ],
  },
  "Modules & libraries": {
    intro: "Modules split programs into files and let you reuse code written by others, from the standard library or from PyPI.",
    terms: [
      ["Standard library", "The modules that come with every Python installation, such as math and datetime."],
      ["Package", "A directory of modules that can be imported together."],
      ["Virtual environment", "An isolated folder of packages for one project."],
    ],
    example: "```python\nimport statistics\nfrom datetime import date\nimport numpy as np\n\nmarks = [72, 88, 91, 64]\nprint(statistics.mean(marks))   # 78.75\nprint(np.array(marks) + 5)      # [77 93 96 69]\nprint(date.today().year)\n```\nInstall NumPy once per project with `pip install numpy` inside a virtual environment.",
    mistakes: ["Naming your own file `random.py`, which hides the standard module.", "Installing packages globally instead of in a virtual environment."],
    practice: [
      ["What does `if __name__ == \"__main__\":` do?", "Runs the code below it only when the file is executed directly, not when it is imported."],
      ["How do `import math` and `from math import sqrt` differ?", "The first imports the module (use math.sqrt); the second brings only sqrt into the current namespace."],
    ],
  },

  /* ───────────── General Pathology ───────────── */
  "Cell injury & adaptation": {
    intro: "Cells respond to stress by adapting; when the stress is too great they are injured, first reversibly and then irreversibly.",
    terms: [
      ["Atrophy", "A decrease in cell size and function, for example after disuse."],
      ["Hypoxia", "Oxygen deficiency — the commonest cause of cell injury."],
      ["Dysplasia", "Disordered growth with loss of uniformity of cells, often a precursor of cancer."],
    ],
    example: "**The heart in long-standing hypertension**\n- Increased workload → cardiac muscle cells enlarge (*hypertrophy*), because adult cardiomyocytes cannot divide.\n- If blood supply cannot keep up, cells become hypoxic → swelling and fatty change (*reversible injury*).\n- Continued ischaemia → membrane damage and necrosis (*irreversible injury*).",
    mistakes: ["Calling metaplasia a cancer — it is an adaptation, although it may progress to dysplasia.", "Assuming every swollen cell is irreversibly injured."],
    practice: [
      ["Give an example of physiological hyperplasia.", "Proliferation of breast glandular epithelium at puberty or in pregnancy (also the endometrium in the menstrual cycle)."],
      ["What are the hallmarks of irreversible injury?", "Severe mitochondrial damage, membrane damage and nuclear changes (pyknosis, karyorrhexis, karyolysis)."],
    ],
  },
  "Cell death": {
    intro: "Cells die by necrosis, an uncontrolled process that provokes inflammation, or by apoptosis, a regulated programme.",
    terms: [
      ["Caseous necrosis", "Cheese-like necrosis typical of tuberculous granulomas."],
      ["Pyknosis", "Shrinkage and increased darkness of the nucleus in a dying cell."],
      ["Fat necrosis", "Destruction of fat by released lipases, as in acute pancreatitis."],
    ],
    example: "**Myocardial infarction — what the microscope shows**\n| Time | Change |\n|---|---|\n| 4–12 h | Early coagulative necrosis |\n| 1–3 days | Dense neutrophil infiltrate |\n| 3–7 days | Macrophages remove dead cells |\n| 7–10 days | Granulation tissue |\n| ≥ 2 months | Dense collagen scar |",
    mistakes: ["Describing apoptosis as causing inflammation.", "Forgetting that brain infarcts undergo liquefactive, not coagulative, necrosis."],
    practice: [
      ["Which necrosis is seen in acute pancreatitis?", "Fat necrosis (enzymatic fat necrosis)."],
      ["What are apoptotic bodies?", "Membrane-bound fragments of an apoptotic cell, removed by phagocytes."],
    ],
  },
  "Acute inflammation": {
    intro: "Acute inflammation is a rapid, short-lived response that brings leukocytes and plasma proteins to the site of injury.",
    terms: [
      ["Exudate", "Protein-rich extravascular fluid formed because of increased vascular permeability."],
      ["Chemotaxis", "Movement of leukocytes along a chemical gradient towards the site of injury."],
      ["Margination", "Leukocytes moving to the periphery of a blood vessel before adhering to it."],
    ],
    example: "**The sequence after a thorn prick**\n1. Brief vasoconstriction, then vasodilation → redness and heat.\n2. Increased permeability → exudate → swelling.\n3. Leukocytes marginate, roll, adhere and migrate out of the vessel.\n4. Neutrophils phagocytose bacteria; bradykinin and prostaglandins cause pain.",
    mistakes: ["Confusing exudate (protein-rich) with transudate (protein-poor).", "Thinking macrophages dominate the first 24 hours — neutrophils do."],
    practice: [
      ["Which mediators cause pain in inflammation?", "Bradykinin and prostaglandins (PGE2)."],
      ["What are the possible outcomes of acute inflammation?", "Complete resolution, healing by fibrosis, abscess formation, or progression to chronic inflammation."],
    ],
  },
  "Chronic inflammation & repair": {
    intro: "Chronic inflammation lasts weeks to months, with tissue destruction and attempts at repair going on together.",
    terms: [
      ["Epithelioid cell", "An activated macrophage with abundant pink cytoplasm, seen in granulomas."],
      ["Healing by first intention", "Repair of a clean wound with closely apposed edges and minimal scarring."],
      ["Fibrosis", "Replacement of tissue by collagen-rich scar."],
    ],
    example: "**A clean surgical incision (first intention)**\n- 24 h: neutrophils at the margins; epithelium begins to grow.\n- Day 3: macrophages; granulation tissue fills the gap.\n- Day 5: new vessels peak; collagen bridges the incision.\n- Week 2: collagen accumulates and blanching begins.\n- Month 1: a scar covered by intact epidermis.",
    mistakes: ["Calling granulation tissue a granuloma — they are completely different.", "Forgetting that chronic inflammation can begin without a preceding acute phase."],
    practice: [
      ["Name two causes of granulomatous inflammation.", "Tuberculosis and sarcoidosis (also leprosy, fungal infections and foreign bodies)."],
      ["Which cell dominates chronic inflammation?", "The macrophage."],
    ],
  },
  "Oedema & thrombosis": {
    intro: "Haemodynamic disorders disturb the normal movement of fluid and blood — oedema, congestion and thrombosis.",
    terms: [
      ["Thrombus", "A solid mass of blood constituents formed inside a living blood vessel or the heart."],
      ["Anasarca", "Severe generalised oedema with swelling of the whole body."],
      ["Congestion", "Passive accumulation of blood in tissues because outflow is impaired."],
    ],
    example: "**Deep vein thrombosis after surgery**\n- *Stasis*: the patient lies in bed for days.\n- *Hypercoagulability*: surgery and tissue injury activate clotting.\n- *Endothelial injury*: possible from surgical handling.\n\nAll three parts of Virchow's triad are present — which is why early mobilisation and prophylactic anticoagulation are used.",
    mistakes: ["Confusing a thrombus with a post-mortem clot, which has no lines of Zahn and is not attached to the wall.", "Blaming the oedema of nephrotic syndrome on raised hydrostatic pressure rather than low albumin."],
    practice: [
      ["Why does nephrotic syndrome cause oedema?", "Albumin lost in the urine lowers plasma oncotic pressure."],
      ["Name the possible fates of a thrombus.", "Propagation, embolisation, dissolution, and organisation with recanalisation."],
    ],
  },
  "Embolism, infarction & shock": {
    intro: "Emboli block vessels, infarcts follow loss of blood supply, and shock is circulatory failure that starves every tissue.",
    terms: [
      ["Embolus", "A detached mass carried by the blood to a site distant from where it formed."],
      ["Red infarct", "A haemorrhagic infarct, typical of organs with a dual blood supply such as the lung."],
      ["Hypovolaemic shock", "Shock caused by loss of blood or plasma volume."],
    ],
    example: "**Types of shock at the bedside**\n| Type | Example | Key feature |\n|---|---|---|\n| Hypovolaemic | Road accident with bleeding | Low volume, cold clammy skin |\n| Cardiogenic | Large myocardial infarction | Pump failure |\n| Septic | Gram-negative infection | Vasodilation; warm skin early on |",
    mistakes: ["Assuming every infarct is pale — lung infarcts are usually red.", "Linking fat embolism to minor injuries instead of long-bone fractures."],
    practice: [
      ["Why are lung infarcts usually haemorrhagic?", "The lung has a dual (pulmonary and bronchial) blood supply, so blood flows into the necrotic area."],
      ["What are the stages of shock?", "Non-progressive (compensated), progressive, and irreversible."],
    ],
  },
  "Neoplasia: nomenclature": {
    intro: "Neoplasms are named by their cell of origin and by whether they behave in a benign or a malignant way.",
    terms: [
      ["Metastasis", "Spread of a tumour to a distant site, not in continuity with the primary."],
      ["Carcinoma in situ", "A malignant epithelial tumour that has not yet invaded the basement membrane."],
      ["Papilloma", "A benign epithelial tumour growing as finger-like projections."],
    ],
    example: "**Naming by tissue of origin**\n| Tissue | Benign | Malignant |\n|---|---|---|\n| Glandular epithelium | Adenoma | Adenocarcinoma |\n| Squamous epithelium | Squamous papilloma | Squamous cell carcinoma |\n| Fat | Lipoma | Liposarcoma |\n| Bone | Osteoma | Osteosarcoma |",
    mistakes: ["Assuming every name ending in -oma is benign — lymphoma and melanoma are malignant.", "Treating dysplasia or carcinoma in situ as invasive cancer."],
    practice: [
      ["What is a hamartoma?", "A disorganised but benign mass of cells native to the site, such as a pulmonary hamartoma."],
      ["Which feature most reliably separates malignant from benign tumours?", "Metastasis (together with invasion)."],
    ],
  },
  "Carcinogenesis & spread": {
    intro: "Cancer develops through accumulated genetic changes that let cells grow without control, invade and spread.",
    terms: [
      ["Oncogene", "A mutated gene that promotes uncontrolled cell growth."],
      ["Carcinogen", "An agent that can cause cancer, such as tobacco smoke or aflatoxin."],
      ["Seeding", "Spread of cancer cells across body cavities such as the peritoneum."],
    ],
    example: "**Multistep carcinogenesis in the colon**\n1. Loss of the APC gene → adenomatous polyp.\n2. KRAS mutation → larger adenoma.\n3. Loss of TP53 → carcinoma.\n\nEach step adds a *hit*; screening colonoscopy removes polyps before the later hits occur.",
    mistakes: ["Thinking a single mutation causes most cancers.", "Assuming carcinomas spread only by lymphatics — many also spread through blood."],
    practice: [
      ["Name two tumour suppressor genes.", "TP53 and RB (also APC and BRCA1/2)."],
      ["Give a chemical carcinogen and the cancer it causes.", "Aflatoxin B1 → hepatocellular carcinoma (or tobacco smoke → lung carcinoma)."],
    ],
  },

  /* ───────────── Fundamentals of Nursing ───────────── */
  "Nursing as a profession": {
    intro: "Nursing is a profession with its own body of knowledge, ethics and a systematic way of planning care.",
    terms: [
      ["Nursing diagnosis", "A clinical judgement about a patient's response to a health problem that nurses can treat."],
      ["Code of ethics", "The principles that guide a nurse's professional conduct."],
      ["Holistic care", "Care that considers physical, emotional, social and spiritual needs together."],
    ],
    example: "**The nursing process for a post-operative patient**\n1. *Assessment*: pain score 7/10, reluctant to move.\n2. *Diagnosis*: acute pain related to the surgical incision.\n3. *Planning*: pain below 3/10 within 1 hour.\n4. *Implementation*: prescribed analgesic, repositioning, splinting the wound when coughing.\n5. *Evaluation*: pain 2/10 after 45 minutes — goal met.",
    mistakes: ["Writing a medical diagnosis, such as appendicitis, as a nursing diagnosis.", "Skipping evaluation, so ineffective care is never changed."],
    practice: [
      ["What makes a nursing goal SMART?", "Specific, Measurable, Achievable, Realistic and Time-bound."],
      ["Name two roles of a nurse besides caregiver.", "Any two of educator, advocate, communicator, manager, counsellor or researcher."],
    ],
  },
  "Therapeutic communication": {
    intro: "What a nurse says, and how, shapes the patient's trust, understanding and recovery.",
    terms: [
      ["Empathy", "Understanding and sharing the patient's feelings while staying objective."],
      ["Open-ended question", "A question that invites the patient to answer in their own words."],
      ["Non-verbal communication", "Messages sent through posture, facial expression, touch and tone."],
    ],
    example: "**Patient: “I don't think I can manage at home.”**\n- Avoid: “Don't worry, you'll be fine.” (false reassurance)\n- Better: “You're worried about going home. What part feels hardest?” (reflection and an open question)\n\nThe second reply keeps the conversation open and uncovers the real problem — perhaps no one at home to help with dressings.",
    mistakes: ["Giving false reassurance instead of exploring the worry.", "Using medical jargon the patient does not understand."],
    practice: [
      ["Give an example of a closed question.", "“Did you sleep well last night?” — it can be answered yes or no."],
      ["Why can silence be therapeutic?", "It gives the patient time to think and to share feelings at their own pace."],
    ],
  },
  "Vital signs": {
    intro: "Temperature, pulse, respiration and blood pressure are the quickest indicators of a patient's condition.",
    terms: [
      ["Tachycardia", "A pulse rate above 100 beats per minute in an adult."],
      ["Hypotension", "Blood pressure lower than normal, usually below 90/60 mmHg."],
      ["Pulse deficit", "The difference between the apical and radial pulse rates."],
    ],
    example: "**7 a.m. observations**\n| Sign | Reading | Interpretation |\n|---|---|---|\n| Temperature | 38.6 °C | Fever |\n| Pulse | 112/min | Tachycardia |\n| Respiration | 24/min | Tachypnoea |\n| BP | 96/60 mmHg | Low normal |\n\nFever with a fast pulse and fast breathing may signal sepsis — report it to the doctor at once.",
    mistakes: ["Counting an irregular pulse for only 15 seconds — count a full minute.", "Using a cuff that is too small, which falsely raises the blood pressure reading."],
    practice: [
      ["Where is the apical pulse counted?", "At the apex of the heart: fifth intercostal space, left mid-clavicular line."],
      ["What is normal oxygen saturation in a healthy adult?", "About 95–100%."],
    ],
  },
  "Health assessment": {
    intro: "Health assessment gathers subjective and objective information to find problems and plan care.",
    terms: [
      ["Subjective data", "Information the patient reports, such as pain or nausea."],
      ["Objective data", "Information the nurse observes or measures, such as the size of a wound."],
      ["Auscultation", "Listening to body sounds with a stethoscope."],
    ],
    example: "**Glasgow Coma Scale after a head injury**\n- Eyes open to voice → 3\n- Confused conversation → 4\n- Localises pain → 5\n\n**Total 12/15** — moderate head injury; check neurological signs every hour.",
    mistakes: ["Recording an opinion (“patient is lazy”) instead of an observation (“patient stayed in bed all morning”).", "Palpating the abdomen before auscultation, which alters bowel sounds."],
    practice: [
      ["Is a patient's report of chest pain subjective or objective data?", "Subjective."],
      ["Which GCS score indicates severe head injury?", "8 or less."],
    ],
  },
  "Infection control": {
    intro: "Infection control breaks the chain of infection so that patients and staff are not harmed by the care they receive.",
    terms: [
      ["Asepsis", "Freedom from disease-causing microorganisms."],
      ["Personal protective equipment", "Gloves, gowns, masks and eye protection that shield staff and patients."],
      ["Nosocomial infection", "An infection acquired in hospital that was not present on admission."],
    ],
    example: "**WHO: five moments for hand hygiene**\n1. Before touching a patient\n2. Before a clean or aseptic procedure\n3. After body-fluid exposure risk\n4. After touching a patient\n5. After touching the patient's surroundings",
    mistakes: ["Treating gloves as a substitute for hand hygiene.", "Discarding sharps into ordinary waste bins."],
    practice: [
      ["Which colour bag takes soiled dressings under India's biomedical waste rules?", "Yellow (red is for contaminated recyclable plastics such as tubing)."],
      ["How long should alcohol hand rub be applied?", "About 20–30 seconds, until the hands are dry."],
    ],
  },
  "Hygiene & pressure care": {
    intro: "Personal hygiene and pressure-area care keep the skin intact and prevent avoidable complications in dependent patients.",
    terms: [
      ["Pressure ulcer", "Localised damage to skin and tissue over a bony prominence caused by pressure."],
      ["Bony prominence", "A place where bone lies close to the skin, such as the sacrum or heel."],
      ["Shearing force", "Layers of skin sliding in opposite directions, as when a patient slides down the bed."],
    ],
    example: "**Stages of a pressure ulcer**\n| Stage | What you see |\n|---|---|\n| 1 | Non-blanchable redness; skin intact |\n| 2 | Partial-thickness loss; shallow open wound |\n| 3 | Full-thickness loss; fat visible |\n| 4 | Bone, tendon or muscle exposed |",
    mistakes: ["Massaging reddened bony areas, which increases tissue damage.", "Dragging patients up the bed instead of lifting them, causing shear."],
    practice: [
      ["Name three common sites of pressure ulcers.", "Sacrum, heels and greater trochanters (also elbows, occiput and scapulae)."],
      ["Does a lower Braden score mean higher or lower risk?", "Higher risk."],
    ],
  },
  "Medication administration": {
    intro: "Safe medication administration depends on accurate calculation, correct technique and careful checks at every step.",
    terms: [
      ["Adverse drug reaction", "A harmful, unintended response to a medicine at a normal dose."],
      ["PRN order", "An order to give a medicine only when it is needed."],
      ["Parenteral route", "Giving a drug by injection rather than through the digestive tract."],
    ],
    example: "**Dose calculation**\nOrdered: paracetamol 500 mg. Available: 250 mg in 5 mL.\n\nVolume = (500 ÷ 250) × 5 mL = **10 mL**.\n\nCheck the patient's name and ID band, the drug, dose, route and time before giving it, and record it immediately afterwards.",
    mistakes: ["Giving a medicine someone else prepared without checking it yourself.", "Documenting a dose before it has actually been given."],
    practice: [
      ["An order reads 1 g and tablets are 500 mg. How many tablets?", "Two tablets."],
      ["At what angle is an intramuscular injection given?", "90 degrees."],
    ],
  },
  "Documentation & handover": {
    intro: "Clear records and structured handovers keep care continuous and protect both patients and nurses.",
    terms: [
      ["Handover", "The transfer of responsibility for a patient's care from one nurse to another."],
      ["Incident report", "A record of an unexpected event that caused, or could have caused, harm."],
      ["Legal record", "A document that can be produced as evidence in court."],
    ],
    example: "**An SBAR handover**\n- *Situation*: Mr Kumar, bed 12 — BP has dropped to 88/56.\n- *Background*: day 1 after bowel surgery, on IV fluids.\n- *Assessment*: pulse 118, urine 15 mL in the last hour — possible bleeding.\n- *Recommendation*: please review now; I am monitoring every 15 minutes.",
    mistakes: ["Using abbreviations that are not approved, which get misread.", "Leaving blank lines where later entries could be added."],
    practice: [
      ["Why must entries be written in chronological order?", "So the record shows exactly what happened and when — essential clinically and legally."],
      ["How do you correct a mistake in a paper record?", "Draw a single line through it, write 'error', and add your initials, the date and the time."],
    ],
  },

  /* ───────────── Financial Accounting ───────────── */
  "Accounting concepts & conventions": {
    intro: "Accounting concepts and conventions are the ground rules that make financial statements consistent and comparable.",
    terms: [
      ["Accrual concept", "Revenue and expenses are recorded when earned or incurred, not when cash moves."],
      ["Money measurement", "Only transactions that can be expressed in money are recorded."],
      ["Consistency", "Using the same accounting methods from one year to the next."],
    ],
    example: "**Accrual in action**\nRavi Traders sells goods worth ₹40,000 on credit on 28 March; the customer pays on 10 April.\n- The revenue belongs to the year ending 31 March, because the sale happened then.\n- March salary of ₹15,000 paid on 5 April is also a March expense.\n\nThe timing of cash does not decide the year.",
    mistakes: ["Recording the owner's personal expenses as business expenses (breaks the business entity concept).", "Valuing closing stock at market price when it is above cost."],
    practice: [
      ["Which concept values closing stock at cost or market price, whichever is lower?", "Conservatism (prudence)."],
      ["Why does the going concern concept matter for fixed assets?", "Assets are shown at cost less depreciation, not at what they would fetch in a sale."],
    ],
  },
  "Journal & ledger": {
    intro: "Every transaction is recorded first in the journal and then posted to ledger accounts, following the rules of double entry.",
    terms: [
      ["Narration", "A brief explanation written below each journal entry."],
      ["Posting", "Transferring journal entries to the ledger accounts."],
      ["Real account", "An account for assets such as cash, furniture or machinery."],
    ],
    example: "**Bought furniture for ₹20,000 cash**\n| Particulars | Dr (₹) | Cr (₹) |\n|---|---|---|\n| Furniture A/c Dr | 20,000 | |\n| To Cash A/c | | 20,000 |\n\n*(Being furniture purchased for cash.)* Rule for real accounts: debit what comes in, credit what goes out.",
    mistakes: ["Debiting the account that gives instead of the one that receives.", "Posting to the wrong side of the ledger account."],
    practice: [
      ["What is the rule for nominal accounts?", "Debit all expenses and losses; credit all incomes and gains."],
      ["Salary paid ₹10,000 — what is the journal entry?", "Salary A/c Dr ₹10,000; To Cash A/c ₹10,000."],
    ],
  },
  "Trial balance": {
    intro: "A trial balance lists every ledger balance to check that total debits equal total credits.",
    terms: [
      ["Error of principle", "Recording a transaction against a fundamental accounting principle, such as treating capital expenditure as revenue."],
      ["Compensating error", "Two errors of equal amount that cancel each other out."],
      ["Error of commission", "Posting the right amount to the wrong account of the same class."],
    ],
    example: "**Errors a trial balance will not reveal**\n- *Omission*: a credit sale of ₹5,000 not recorded at all.\n- *Commission*: ₹2,000 received from Ram posted to Shyam's account.\n- *Principle*: purchase of machinery debited to purchases.\n- *Compensating*: sales and wages both overcast by ₹500.\n\nThe totals still agree in every case.",
    mistakes: ["Assuming an agreed trial balance means the books are correct.", "Including closing stock in the trial balance when it is given only as an adjustment."],
    practice: [
      ["On which side of the trial balance does capital appear?", "The credit side."],
      ["On which side do drawings appear?", "The debit side."],
    ],
  },
  "Subsidiary books & cash book": {
    intro: "Subsidiary books group similar transactions, such as credit purchases or cash payments, so the journal is not overloaded.",
    terms: [
      ["Petty cash book", "A book for small day-to-day expenses paid in cash."],
      ["Sales returns book", "A book recording goods returned by customers."],
      ["Imprest system", "Giving the petty cashier a fixed float that is topped up regularly."],
    ],
    example: "**A contra entry**\nCash of ₹10,000 deposited into the bank:\n- Cash column: credit ₹10,000 (cash goes out).\n- Bank column: debit ₹10,000 (the bank receives).\n\nBoth sides appear in the same cash book, marked **C** in the L.F. column.",
    mistakes: ["Recording cash purchases of goods in the purchases book, which holds only credit purchases.", "Recording a contra entry on only one side of the cash book."],
    practice: [
      ["Which book records credit sales of goods?", "The sales book (sales day book)."],
      ["What does a debit balance in the bank column mean?", "Money is available in the bank — a favourable balance."],
    ],
  },
  "Bank reconciliation": {
    intro: "A bank reconciliation statement explains why the cash book balance differs from the bank pass book balance.",
    terms: [
      ["Overdraft", "A negative bank balance the bank allows up to an agreed limit."],
      ["Pass book", "The bank's record of the customer's account, also called the bank statement."],
      ["Uncredited cheque", "A cheque deposited into the bank but not yet credited by it."],
    ],
    example: "**Preparing a BRS — cash book shows ₹25,000 (Dr)**\n| Item | ₹ |\n|---|---|\n| Balance as per cash book | 25,000 |\n| Add: cheques issued, not yet presented | 4,000 |\n| Less: cheques deposited, not yet credited | 3,000 |\n| Less: bank charges not in the cash book | 200 |\n| **Balance as per pass book** | **25,800** |",
    mistakes: ["Adding and subtracting in the wrong direction when starting from an overdraft.", "Forgetting interest credited by the bank."],
    practice: [
      ["Interest credited by the bank is not yet in the cash book. Is the pass book balance higher or lower?", "Higher."],
      ["When is a BRS usually prepared?", "At the end of each month, when the bank statement arrives."],
    ],
  },
  Depreciation: {
    intro: "Depreciation is the gradual fall in value of a fixed asset through use, time or obsolescence, charged as an expense each year.",
    terms: [
      ["Residual value", "The expected sale value of an asset at the end of its useful life."],
      ["Book value", "The cost of an asset minus its accumulated depreciation."],
      ["Useful life", "The period over which an asset is expected to be used."],
    ],
    example: "**Machine costing ₹1,00,000 at 10% a year**\n| Year | Straight line | Written-down value |\n|---|---|---|\n| 1 | 10,000 | 10,000 |\n| 2 | 10,000 | 9,000 |\n| 3 | 10,000 | 8,100 |\n\nSLM uses the original cost every year; WDV applies 10% to the reducing balance (1,00,000 → 90,000 → 81,000).",
    mistakes: ["Charging depreciation on land, which normally does not depreciate.", "Applying the WDV rate to the original cost instead of the book value."],
    practice: [
      ["What is the straight-line depreciation formula?", "(Cost − residual value) ÷ useful life."],
      ["Which method gives higher depreciation in the early years?", "The written-down value method."],
    ],
  },
  "Trading, P&L and balance sheet": {
    intro: "Final accounts turn the trial balance into three statements: the trading account, the profit and loss account and the balance sheet.",
    terms: [
      ["Gross profit", "Sales minus the cost of goods sold."],
      ["Direct expense", "An expense incurred to buy or produce goods, such as carriage inwards."],
      ["Current asset", "An asset expected to become cash within a year, such as debtors."],
    ],
    example: "**Trading account in brief**\n| Dr | ₹ | Cr | ₹ |\n|---|---|---|---|\n| Opening stock | 20,000 | Sales | 1,50,000 |\n| Purchases | 90,000 | Closing stock | 30,000 |\n| Carriage inwards | 5,000 | | |\n| Gross profit c/d | 65,000 | | |\n| **Total** | **1,80,000** | **Total** | **1,80,000** |",
    mistakes: ["Putting carriage outwards in the trading account — it is an indirect expense for the P&L.", "Showing drawings as an expense instead of deducting them from capital."],
    practice: [
      ["Where does closing stock appear?", "On the credit side of the trading account and as a current asset in the balance sheet."],
      ["Is rent received shown in the trading account or the P&L account?", "The profit and loss account (credit side)."],
    ],
  },
  "Adjustments & rectification": {
    intro: "Adjustments bring the final accounts in line with the accrual concept, and rectification entries correct errors found later.",
    terms: [
      ["Accrued income", "Income earned but not yet received."],
      ["Income received in advance", "Income received for a future period, shown as a liability."],
      ["Provision for doubtful debts", "An amount set aside for debts that may not be recovered."],
    ],
    example: "**Salary ₹12,000 in the trial balance; ₹3,000 outstanding**\n- P&L debit: 12,000 + 3,000 = **₹15,000**.\n- Balance sheet: outstanding salary **₹3,000** as a current liability.\n\nEvery adjustment appears twice — once in the trading or P&L account, and once in the balance sheet.",
    mistakes: ["Recording an adjustment in only one place.", "Reversing a whole entry when only one side was wrong."],
    practice: [
      ["Prepaid insurance of ₹1,000 — what are its two effects?", "Deduct ₹1,000 from insurance in the P&L, and show ₹1,000 as a current asset."],
      ["Furniture of ₹5,000 was debited to purchases. What is the rectifying entry?", "Furniture A/c Dr ₹5,000; To Purchases A/c ₹5,000."],
    ],
  },

  /* ───────────── Financial Management ───────────── */
  "Scope & objectives of finance": {
    intro: "Financial management plans how a firm raises money, invests it and returns it to owners, with the aim of increasing their wealth.",
    terms: [
      ["Shareholder wealth", "The market value of the shareholders' holding in the firm."],
      ["Finance function", "The activities of raising, allocating and controlling a firm's funds."],
      ["Risk–return trade-off", "The principle that higher expected returns come with higher risk."],
    ],
    example: "**Profit vs wealth**\n- Project A: ₹10 lakh profit next year, very uncertain.\n- Project B: ₹9 lakh a year for three years, stable.\n\nProfit maximisation might pick A for its single bigger figure; wealth maximisation compares the *present value* of all cash flows after adjusting for risk — usually favouring B.",
    mistakes: ["Treating accounting profit as the same as cash flow.", "Ignoring when returns arrive."],
    practice: [
      ["Name the three major financial decisions.", "Investment, financing and dividend decisions."],
      ["Why is profit maximisation criticised?", "It ignores the time value of money and risk, and is vague about which profit is meant."],
    ],
  },
  "Time value of money": {
    intro: "Money has a time value: a sum received earlier can be invested to grow, so future sums must be discounted before comparing.",
    terms: [
      ["Present value", "Today's value of a future sum, found by discounting."],
      ["Compound interest", "Interest earned on both the principal and the interest already added."],
      ["Discount rate", "The rate used to convert future cash flows into present value."],
    ],
    example: "**₹1,00,000 for 3 years at 10% compounded yearly**\nFV = 1,00,000 × (1.10)³ = **₹1,33,100**.\n\nIn reverse, the present value of ₹1,33,100 due in 3 years at 10% is 1,33,100 ÷ (1.10)³ = **₹1,00,000**.",
    mistakes: ["Using simple interest when compounding is stated.", "Mixing annual rates with monthly periods."],
    practice: [
      ["What is the future value formula?", "FV = PV × (1 + r)ⁿ."],
      ["What is a perpetuity and how is it valued?", "An equal payment that continues for ever; PV = payment ÷ r."],
    ],
  },
  "Capital budgeting": {
    intro: "Capital budgeting evaluates long-term investments, such as new machinery or plants, before funds are committed.",
    terms: [
      ["Net present value", "The present value of cash inflows minus the initial investment."],
      ["Profitability index", "The present value of inflows divided by the initial investment."],
      ["Cash inflow", "Money a project brings into the firm."],
    ],
    example: "**Machine costs ₹1,00,000; inflows ₹40,000 a year for 3 years; discount rate 10%**\n| Year | Cash flow | PV factor | PV |\n|---|---|---|---|\n| 1 | 40,000 | 0.909 | 36,360 |\n| 2 | 40,000 | 0.826 | 33,040 |\n| 3 | 40,000 | 0.751 | 30,040 |\n\nTotal PV = 99,440, so **NPV = −₹560**. Reject — narrowly.",
    mistakes: ["Using accounting profit instead of cash flow.", "Ranking projects of very different sizes by IRR alone."],
    practice: [
      ["Payback period for ₹1,00,000 recovered at ₹25,000 a year?", "4 years."],
      ["What does a profitability index above 1 mean?", "The NPV is positive — accept the project."],
    ],
  },
  "Cost of capital": {
    intro: "The cost of capital is the minimum return a firm must earn to satisfy its lenders and shareholders.",
    terms: [
      ["Cost of debt", "The effective rate a firm pays on its borrowings, after tax."],
      ["Beta", "A measure of how much a share moves with the overall market."],
      ["Hurdle rate", "The minimum return a project must earn to be accepted."],
    ],
    example: "**Weighted average cost of capital**\n| Source | Amount (₹ lakh) | Weight | Cost | Weighted |\n|---|---|---|---|---|\n| Equity | 60 | 0.6 | 14% | 8.4% |\n| Debt (after tax) | 40 | 0.4 | 7% | 2.8% |\n| **WACC** | | | | **11.2%** |\n\nProjects earning less than 11.2% destroy value.",
    mistakes: ["Using the pre-tax cost of debt in WACC.", "Using book values when market values are available."],
    practice: [
      ["What is the CAPM formula?", "Ke = Rf + β (Rm − Rf)."],
      ["Debt at 10% interest with a 30% tax rate — after-tax cost?", "7%."],
    ],
  },
  "Capital structure & leverage": {
    intro: "Capital structure is the mix of debt and equity that finances a firm; leverage magnifies both returns and risk.",
    terms: [
      ["Degree of financial leverage", "EBIT divided by EBT; shows how EPS responds to changes in EBIT."],
      ["EBIT", "Earnings before interest and taxes."],
      ["Trading on equity", "Using borrowed funds to increase the return to equity shareholders."],
    ],
    example: "**Same EBIT of ₹10 lakh, two structures**\n| | All equity | 50% debt at 10% |\n|---|---|---|\n| Capital | ₹50 lakh equity | ₹25 lakh equity + ₹25 lakh debt |\n| Interest | 0 | 2.5 |\n| EBT | 10 | 7.5 |\n| Return on equity (before tax) | 20% | 30% |\n\nDebt lifts the return to shareholders — until EBIT falls.",
    mistakes: ["Assuming more debt is always better because it is cheaper.", "Confusing operating leverage with financial leverage."],
    practice: [
      ["What is combined leverage?", "Operating leverage × financial leverage."],
      ["Name one theory of capital structure.", "Net income, net operating income, the traditional approach, or Modigliani–Miller."],
    ],
  },
  "Working capital management": {
    intro: "Working capital management keeps enough cash, stock and receivables for daily operations without tying up excess funds.",
    terms: [
      ["Current ratio", "Current assets divided by current liabilities."],
      ["Cash conversion cycle", "Inventory days plus receivable days minus payable days."],
      ["Trade credit", "Credit from suppliers that allows payment later."],
    ],
    example: "**Cash conversion cycle**\n- Inventory held: 60 days\n- Customers pay in: 45 days\n- Suppliers are paid in: 30 days\n\nCCC = 60 + 45 − 30 = **75 days** that the firm must finance itself. Collecting from customers 15 days sooner cuts it to 60.",
    mistakes: ["Treating a very high current ratio as always good.", "Ignoring seasonal needs when planning working capital."],
    practice: [
      ["What current ratio is usually quoted as ideal?", "About 2 : 1."],
      ["Name two sources of short-term finance.", "Any two of trade credit, bank overdraft, cash credit or commercial paper."],
    ],
  },
  "Dividend decisions": {
    intro: "The dividend decision chooses how much profit to pay out and how much to keep for growth.",
    terms: [
      ["Payout ratio", "Dividends as a percentage of earnings."],
      ["Retained earnings", "Profits kept in the business instead of being paid out."],
      ["Bonus shares", "Free additional shares issued to shareholders out of reserves."],
    ],
    example: "**Walter's model**\nEPS ₹10, return on investment r = 15%, cost of equity k = 10%.\n\nBecause r > k, retaining profits adds value — the model suggests a **0% payout** for the highest share price. If r < k it suggests paying out everything.",
    mistakes: ["Assuming high dividends always raise the share price.", "Ignoring shareholders' tax position when setting the policy."],
    practice: [
      ["What does Gordon's model assume about growth?", "Growth g = b × r, where b is the retention ratio and r the return on investment."],
      ["What is a stock split?", "Dividing each share into several shares of lower face value without changing total capital."],
    ],
  },
  "Financial markets": {
    intro: "Financial markets connect savers with firms that need funds, for both long-term and short-term needs.",
    terms: [
      ["Capital market", "The market for long-term funds such as shares and bonds."],
      ["IPO", "A company's first sale of shares to the public."],
      ["Treasury bill", "A short-term government borrowing instrument sold at a discount."],
    ],
    example: "**The journey of a share**\n1. A company issues shares through an IPO — the *primary market*.\n2. Investors later buy and sell them on NSE or BSE — the *secondary market*.\n3. SEBI regulates disclosures and trading so that prices are fair.",
    mistakes: ["Thinking the company receives money when its shares trade in the secondary market.", "Confusing the money market with the capital market."],
    practice: [
      ["Name two stock exchanges in India.", "NSE and BSE."],
      ["What is commercial paper?", "An unsecured short-term promissory note issued by companies."],
    ],
  },
};
