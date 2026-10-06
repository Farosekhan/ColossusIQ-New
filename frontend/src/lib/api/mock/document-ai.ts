import "server-only";
import { z } from "zod";
import type { GenerateReply } from "@/lib/api/schemas";
import { geminiEnabled, geminiJson } from "@/lib/ai/gemini";

/* ─────────────────────────────────────────────────────────────────────────────
   Document AI: Flashcards, Summaries, Questions, Notes & Key Terms
   ───────────────────────────────────────────────────────────────────────────── */

export async function generateDocumentAi(
  task: string,
  rawText: string,
): Promise<GenerateReply> {
  const cleanInput = (rawText || "").trim();
  const effectiveTask = task?.trim() || "Create flashcards";

  // 1. If Gemini API is configured and active, query Gemini
  if (geminiEnabled()) {
    try {
      const prompt = `You are an elite university educational AI assistant.
Task: ${effectiveTask}
Input Topic or Study Material:
"""
${cleanInput || "Computer Fundamentals"}
"""

Requirements based on task:
- If task is "Create flashcards":
  Generate 6 to 8 rich, academic flashcards. You MUST format every card strictly as:
  #### Flashcard {N}: {Concept Title}
  - **Front (Question / Prompt):** {Clear, engaging question}
  - **Back (Answer / Explanation):** {Detailed conceptual explanation}
  - **Memory Hook / Key Takeaway:** {Quick memory aid or rule}

- If task is "Summarise":
  Generate an Executive Summary, Key Pillars/Principles, and Critical Takeaways for study.
- If task is "Generate questions":
  Generate 5 Part A Conceptual Questions (2 Marks with model answers), 3 Part B Analytical Questions (10 Marks), and 3 Multiple Choice Questions (with options, answer, and explanation).
- If task is "Revision notes":
  Generate an Exam Revision Cheat Sheet with bullet points, high-yield definitions, essential formulas/architectures, and Common Pitfalls.
- If task is "Extract key terms":
  Generate an Alphabetical Glossary of 10+ essential terms with definitions and real-world context.

Return strict JSON: {"markdown": "..."}`;

      const res = await geminiJson(z.object({ markdown: z.string() }), {
        system: "You are an expert curriculum and document AI. Return valid JSON containing a markdown property.",
        prompt,
        temperature: 0.3,
        timeoutMs: 40_000,
      });

      if (res.ok && res.data.markdown?.trim()) {
        return {
          agent: "document",
          markdown: res.data.markdown.trim(),
        };
      }
    } catch (e) {
      console.warn("[document-ai] Gemini generation fallback:", e);
    }
  }

  // 2. High-Yield Topic & Text Knowledge Engine
  return {
    agent: "document",
    markdown: buildDocumentAiOutput(effectiveTask, cleanInput),
  };
}

function buildDocumentAiOutput(task: string, text: string): string {
  const low = text.toLowerCase();

  const isDbms = /dbms|database|sql|normaliz|relational|acid|bcnf|3nf/i.test(low);
  const isOs = /operating\s*system|\bos\b|process\s*schedul|deadlock|virtual\s*memory|paging|semaphore/i.test(low);
  const isNetworks = /network|osi|tcp|ip|udp|router|subnet|routing|protocol/i.test(low);
  const isDsa = /data\s*structure|algorithm|dsa|binary\s*tree|linked\s*list|stack|queue|sorting|graph/i.test(low);
  const isPython = /python|programming|coding|oop|class|function|variable|generator|decorator/i.test(low);
  const isAi = /artificial\s*intelligence|machine\s*learning|\bai\b|\bml\b|neural\s*network|deep\s*learning/i.test(low);

  // If specific domain matched
  if (isDbms) return getDbmsContent(task);
  if (isOs) return getOsContent(task);
  if (isNetworks) return getNetworksContent(task);
  if (isDsa) return getDsaContent(task);
  if (isPython) return getPythonContent(task);
  if (isAi) return getAiContent(task);

  // If input matches Computer Fundamentals or is default/short topic:
  const isCompFund = text.length === 0 || /computer|hardware|von\s*neumann|cpu|memory|architecture|binary/i.test(low);
  if (isCompFund || text.length < 50) {
    return getComputerFundamentalsContent(task);
  }

  // Otherwise, user pasted custom notes/text:
  return getCustomParsedContent(task, text);
}

/* ─────────────────────────────────────────────────────────────────────────────
   Topic 1: Computer Fundamentals
   ───────────────────────────────────────────────────────────────────────────── */

function getComputerFundamentalsContent(task: string): string {
  switch (task) {
    case "Create flashcards":
      return `### 🗂️ Interactive Flashcards: Computer Fundamentals

#### Flashcard 1: Von Neumann Architecture
- **Front (Question / Prompt):** What is a Computer and what are the 5 core functional units in the Von Neumann architecture?
- **Back (Answer / Explanation):** An electronic programmable machine that accepts raw data, processes it using arithmetic/logical operations, stores intermediate results, and presents output. The 5 functional units are:
  1. **Input Unit:** Reads data & program instructions from peripherals.
  2. **Central Processing Unit (CPU):** Comprising the Control Unit (CU), Arithmetic Logic Unit (ALU), and high-speed Registers.
  3. **Primary Memory (RAM/ROM):** Holds active instructions and working datasets.
  4. **Secondary Storage:** Persistent non-volatile media (SSD, HDD).
  5. **Output Unit:** Translates processed binary data into human-comprehensible results.
- **Memory Hook / Key Takeaway:** Input ➔ [CPU: CU + ALU + Registers] ⇄ RAM ➔ Output. Both code and data share the same unified memory space.

#### Flashcard 2: CPU Internal Anatomy (ALU, CU, Registers)
- **Front (Question / Prompt):** What are the distinct roles of the Arithmetic Logic Unit (ALU), Control Unit (CU), and CPU Registers?
- **Back (Answer / Explanation):** 
  • **ALU (Arithmetic Logic Unit):** Executes mathematical calculations (+, -, *, /) and logical decisions (<, >, ==, AND, OR, NOT).
  • **CU (Control Unit):** Coordinates the entire system by generating timing/control pulses; fetches, decodes, and orchestrates instruction flow.
  • **Registers:** Microscopic, ultra-fast internal flip-flop storage cells inside the processor (Program Counter, Instruction Register, Memory Address Register, Accumulator) holding instantaneous values.
- **Memory Hook / Key Takeaway:** CU directs traffic, ALU calculates results, and Registers hold the immediate scratchpad values.

#### Flashcard 3: Memory Hierarchy
- **Front (Question / Prompt):** Explain the Computer Memory Hierarchy in order of access speed, storage capacity, and cost per bit.
- **Back (Answer / Explanation):** Arranged as an inverted pyramid from fastest/smallest/most costly to slowest/largest:
  1. **Internal CPU Registers:** Sub-nanosecond access time (<1 ns), bytes capacity.
  2. **Cache Memory (L1, L2, L3):** High-speed Static RAM (SRAM), 1–10 ns, megabytes capacity.
  3. **Primary Memory (DRAM / RAM):** Volatile main storage, 50–80 ns, gigabytes capacity.
  4. **Secondary Storage (NVMe / SSD / HDD):** Non-volatile persistence, microseconds to milliseconds, terabytes capacity.
  5. **Tertiary / Cloud Archive:** Tape, cold storage, seconds to minutes, petabytes.
- **Memory Hook / Key Takeaway:** The closer memory is to the CPU silicon, the faster, smaller, and more expensive it is.

#### Flashcard 4: The CPU Machine Cycle (Instruction Cycle)
- **Front (Question / Prompt):** Outline the 4 sequential phases of the CPU Machine Cycle.
- **Back (Answer / Explanation):** 
  1. **Fetch:** CU retrieves the next instruction byte from the RAM address pointed to by the Program Counter (PC) and loads it into the Instruction Register (IR).
  2. **Decode:** CU interprets the opcode, identifies addressing modes, and routes operands.
  3. **Execute:** ALU or specialized execution units perform the specified arithmetic, logical, or branching operation.
  4. **Store (Writeback):** Results are written back to a CPU register or target RAM memory location.
- **Memory Hook / Key Takeaway:** F-D-E-S: Fetch, Decode, Execute, Store. Repeats billions of times per second (GHz clock speed).

#### Flashcard 5: Primary Memory (RAM vs ROM)
- **Front (Question / Prompt):** What distinguishes RAM from ROM in hardware architecture and system operation?
- **Back (Answer / Explanation):** 
  • **RAM (Random Access Memory):** Read-and-write, highly volatile memory. Loses all contents instantly when electrical power is switched off. Holds active OS processes, running applications, and open buffers.
  • **ROM (Read-Only Memory):** Non-volatile permanent storage. Retains critical bootstrap code (BIOS/UEFI firmware) without requiring electric current.
- **Memory Hook / Key Takeaway:** RAM is temporary working memory; ROM is permanent startup firmware.

#### Flashcard 6: System Software vs Application Software
- **Front (Question / Prompt):** What are the differences between System Software and Application Software?
- **Back (Answer / Explanation):** 
  • **System Software:** Low-level programs that manage physical computer hardware resources, scheduling, and device communication (e.g., Operating Systems, Device Drivers, Compilers, Assemblers, Linkers).
  • **Application Software:** End-user productivity programs built on top of the operating system to perform user-specific tasks (e.g., Web Browsers, CAD Tools, Office Suites, Database Clients).
- **Memory Hook / Key Takeaway:** System software runs the computer; Application software does work for the human user.

#### Flashcard 7: Binary Logic & Data Representation
- **Front (Question / Prompt):** Why do computers operate in Binary (Base-2), and how does Hexadecimal relate to it?
- **Back (Answer / Explanation):** Modern digital processors are built from billions of microscopic silicon transistors operating as binary electronic switches (Voltage High = 1, Voltage Low = 0).
  • **1 Bit:** Single binary digit (0 or 1).
  • **1 Byte:** 8 Bits (256 distinct permutations, 0–255).
  • **Hexadecimal (Base-16):** An engineering shorthand where each hex digit (0–9, A–F) represents exactly 4 binary bits (one nibble). E.g., Binary \`11111111\` = Hex \`0xFF\` = Decimal 255.
- **Memory Hook / Key Takeaway:** 1 Byte = 8 Bits = 2 Hex Digits = 1 Character in ASCII.

#### Flashcard 8: System Bus Architecture
- **Front (Question / Prompt):** Name the three buses that comprise the System Bus and state their directionality.
- **Back (Answer / Explanation):** 
  1. **Data Bus (Bidirectional):** Transfers actual raw data bytes between processor, memory, and peripheral controllers.
  2. **Address Bus (Unidirectional):** Carries the physical memory address or port number generated by the CPU to locate data.
  3. **Control Bus (Bidirectional/Unidirectional control lines):** Transmits coordination signals (Read, Write, Interrupt, Clock pulses).
- **Memory Hook / Key Takeaway:** Address points where to go, Control dictates what to do, Data carries the payload.`;

    case "Summarise":
      return `### 📄 Comprehensive Summary: Computer Fundamentals

#### 1. Architectural Foundations
A computer is an electronic, programmable system designed to ingest raw input, manipulate data under stored instructions, store persistent state, and produce actionable output. The modern architecture adheres to the **Von Neumann model**, characterized by a shared memory subsystem for both programmatic instructions and data variables.

#### 2. Central Processing Unit (CPU)
The CPU serves as the central computational engine:
- **Arithmetic Logic Unit (ALU):** Carries out fundamental integer/floating-point operations (+, -, *, /) and Boolean relational logic.
- **Control Unit (CU):** Acts as the supervisor, generating synchronization clock cycles, fetching instructions from memory, and decoding opcodes.
- **Registers:** Fast storage flip-flops including the **Program Counter (PC)**, **Memory Address Register (MAR)**, **Memory Data Register (MDR)**, and **Accumulator (ACC)**.

#### 3. Storage & Memory Hierarchy
- **Primary Storage (RAM & ROM):** RAM provides high-speed volatile random access for active application stacks. ROM stores non-volatile firmware (UEFI/BIOS).
- **Cache Memory:** Fast SRAM located directly on-die (L1/L2/L3) to bridge the speed disparity between the multi-gigahertz CPU core and nanosecond DRAM.
- **Secondary Storage:** Persistent high-capacity storage (NVMe PCIe SSDs, SATA SSDs, magnetic HDDs).

#### 4. System & Application Software
- **Operating System (OS):** Core system software acting as an abstraction layer between hardware and user space, providing process scheduling, virtual memory management, file systems, and hardware drivers.
- **Application Software:** User-level applications executing in user mode, issuing protected system calls (syscalls) to interact with physical peripherals.

#### 5. Data Representation & Binary Logic
All computational state is represented electronically using binary digits (**bits**). 8 bits form a **byte**. Hexadecimal notation is used as a compact representation for memory addresses and raw byte sequences.`;

    case "Generate questions":
      return `### 📝 Examination Questions: Computer Fundamentals

#### Part A: Conceptual Short-Answer Questions (2 Marks Each)
1. **Explain the Von Neumann bottleneck and how cache memory mitigates it.**
   *Model Answer:* The Von Neumann bottleneck is the throughput limitation caused by the shared bus between the CPU and main memory. Fast multi-level on-chip cache memory (L1/L2/L3) stores frequently accessed code and data near the execution pipeline, reducing bus contention.
2. **Distinguish between SRAM and DRAM in construction and application.**
   *Model Answer:* SRAM uses bistable latching circuitry (4–6 transistors per bit), is faster, and requires no refresh; it is used for CPU cache. DRAM stores charge on capacitors, requires periodic refresh cycles, is denser and cheaper; it is used for system RAM.
3. **What is the function of the Program Counter (PC) register during the instruction cycle?**
   *Model Answer:* The Program Counter holds the physical memory address of the next sequential instruction to be fetched. It is automatically incremented once the instruction is fetched into the Instruction Register.
4. **Define the roles of the Address Bus, Data Bus, and Control Bus.**
   *Model Answer:* The Address Bus carries physical memory addresses (unidirectional from CPU); the Data Bus carries data payloads (bidirectional); the Control Bus carries command and synchronization pulses like Read/Write.
5. **Convert decimal 178 into binary and hexadecimal representation.**
   *Model Answer:* Binary: \`10110010_2\`. Hexadecimal: \`0xB2\`.

#### Part B: Analytical & Descriptive Questions (10 / 13 Marks Each)
6. **(a)** Diagrammatically illustrate the functional block diagram of a computer system. Detail the interaction between the ALU, Control Unit, Registers, Main Memory, and I/O devices.  
   **(b)** Trace the complete step-by-step CPU Machine Cycle (Fetch, Decode, Execute, Writeback) for an arithmetic addition instruction.
7. **(a)** Describe the Computer Memory Hierarchy in detail, evaluating tradeoffs among access speed, capacity, and cost per bit.  
   **(b)** Contrast System Software with Application Software, categorizing operating systems, device drivers, translators, and utilities.

#### Part C: Multiple Choice Questions (MCQs)
8. **Which component of the CPU is directly responsible for decoding instruction opcodes?**
   - A) Arithmetic Logic Unit (ALU)
   - B) Control Unit (CU) *(Correct)*
   - C) Memory Data Register (MDR)
   - D) Accumulator
   *Explanation:* The Control Unit contains the instruction decoder that interprets the binary operation code and configures the execution datapath.
9. **In the memory hierarchy, which storage medium offers the lowest latency?**
   - A) L1 Cache
   - B) CPU Registers *(Correct)*
   - C) Dynamic RAM
   - D) Solid-State Drive (NVMe)
   *Explanation:* Internal CPU registers operate on the processor's core clock frequency with sub-nanosecond access latency.
10. **What is the primary characteristic of volatile memory?**
    - A) Data can only be read, never written
    - B) Retains state permanently without power
    - C) Requires constant electrical current to maintain stored bits *(Correct)*
    - D) Used exclusively for firmware storage
    *Explanation:* Volatile memory (such as DRAM and SRAM) loses stored charges when power is terminated.`;

    case "Revision notes":
      return `### ⚡ High-Yield Revision Notes: Computer Fundamentals

#### 1. Core Architecture Quick Sheet
- **Von Neumann Model:** Shared memory bus for code + data. 5 basic blocks: Input, CPU (CU + ALU + Registers), Memory, Storage, Output.
- **Harvard Architecture Comparison:** Physically separate memory and buses for code vs data (common in DSPs and microcontrollers).
- **CPU Clock Speed:** Number of clock cycles per second (measured in GHz). 1 GHz = 1 billion cycles per second.

#### 2. Registers Cheat Sheet
| Register | Acronym | Function |
|---|---|---|
| **Program Counter** | PC | Holds address of next instruction to fetch |
| **Memory Address Register** | MAR | Holds address in RAM currently being read/written |
| **Memory Data Register** | MDR | Holds data buffer read from or about to be written to RAM |
| **Instruction Register** | IR | Holds the currently executing instruction opcode |
| **Accumulator** | ACC | Stores intermediate arithmetic and logic results |

#### 3. Memory Hierarchy Speed Ladder
\`\`\`
Fastest / Smallest ──► CPU Registers   (< 1 ns, Bytes)
                     L1/L2/L3 Cache  (1–10 ns, MBs - SRAM)
                     System RAM      (50–80 ns, GBs - DRAM)
                     NVMe / SSD      (10–100 μs, TBs - NAND Flash)
Slowest / Largest  ──► HDD / Cloud    (5–15 ms, TBs/PBs - Magnetic)
\`\`\`

#### 4. Binary & Storage Unit Formulas
- $1 \\text{ Byte} = 8 \\text{ bits}$ (Range for unsigned byte: $0 \\text{ to } 255 = 2^8 - 1$).
- $1 \\text{ KB} = 1024 \\text{ Bytes} = 2^{10} \\text{ Bytes}$.
- $1 \\text{ MB} = 1024 \\text{ KB} = 2^{20} \\text{ Bytes}$.
- $1 \\text{ GB} = 1024 \\text{ MB} = 2^{30} \\text{ Bytes}$.
- $1 \\text{ TB} = 1024 \\text{ GB} = 2^{40} \\text{ Bytes}$.

#### 5. Common Exam Traps & Tips
- **Trap:** Confusing SRAM with DRAM. *Remember:* SRAM is cache (no refresh, faster); DRAM is main RAM (capacitors, requires continuous refresh).
- **Trap:** Forgetting that secondary storage is NOT directly addressable by the CPU; data must first be copied into RAM.`;

    case "Extract key terms":
    default:
      return `### 📖 Key Terms & Definitions: Computer Fundamentals

- **ALU (Arithmetic Logic Unit):** The digital electronic circuit within the CPU that executes arithmetic computations (+, -, *, /) and Boolean logical operations.
- **Cache Memory:** A small, ultra-fast static RAM buffer located close to or on the CPU die to cache frequently accessed instructions and data.
- **Control Unit (CU):** The supervisory module of the processor that directs instruction sequencing, fetches opcodes, and coordinates bus transactions.
- **Firmware:** Software programmed into non-volatile read-only memory (ROM/Flash) that provides low-level control for hardware initialization (e.g., BIOS/UEFI).
- **Instruction Cycle (Machine Cycle):** The continuous 4-phase loop (Fetch, Decode, Execute, Store) through which a microprocessor processes machine code.
- **Interrupt:** A signal sent by hardware or software alerting the CPU to suspend current execution and service an urgent event via an Interrupt Service Routine (ISR).
- **Non-Volatile Storage:** Computer memory or media that retains stored information even when electrical power is removed (e.g., SSD, HDD, ROM).
- **Operating System (OS):** Core system software that abstracts physical hardware, schedules processes, manages memory, and provides an API for application software.
- **Program Counter (PC):** A dedicated processor register holding the memory address of the next instruction waiting to be executed.
- **RAM (Random Access Memory):** Volatile primary memory that permits reading and writing of data at uniform speeds regardless of physical location.
- **System Bus:** The parallel physical interconnect composed of Data Bus, Address Bus, and Control Bus facilitating inter-component communication.
- **Von Neumann Architecture:** The computing architecture theoretical model characterized by a single sequential instruction stream sharing memory between code and data.`;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Topic 2: DBMS / Databases
   ───────────────────────────────────────────────────────────────────────────── */

function getDbmsContent(task: string): string {
  switch (task) {
    case "Create flashcards":
      return `### 🗂️ Interactive Flashcards: Database Management Systems (DBMS)

#### Flashcard 1: ACID Properties
- **Front (Question / Prompt):** What are the ACID properties in database transactions and why are they vital?
- **Back (Answer / Explanation):** 
  • **Atomicity:** All operations in a transaction succeed, or the entire transaction is rolled back ("all-or-nothing").
  • **Consistency:** Database transitions only from one valid state satisfying all schema constraints to another.
  • **Isolation:** Concurrent transactions execute without interfering with one another (serializability).
  • **Durability:** Once committed, changes persist permanently even in the event of system power failure.
- **Memory Hook / Key Takeaway:** ACID guarantees transactional integrity in relational databases.

#### Flashcard 2: Normal Forms (1NF, 2NF, 3NF, BCNF)
- **Front (Question / Prompt):** What dependencies are eliminated across 1NF, 2NF, 3NF, and BCNF?
- **Back (Answer / Explanation):** 
  • **1NF:** Atomic attribute values, no repeating groups.
  • **2NF:** In 1NF + no partial dependencies (every non-prime attribute depends on the whole candidate key).
  • **3NF:** In 2NF + no transitive dependencies ($X \\rightarrow Y, Y \\rightarrow Z$).
  • **BCNF:** Stricter 3NF where for every functional dependency $X \\rightarrow Y$, $X$ must be a superkey.
- **Memory Hook / Key Takeaway:** 1NF: Atomic | 2NF: No partial | 3NF: No transitive | BCNF: Determinant must be a superkey.

#### Flashcard 3: Indexing & B+ Trees
- **Front (Question / Prompt):** Why are B+ Trees favored over Binary Search Trees for disk-based database indexing?
- **Back (Answer / Explanation):** B+ Trees have a high branching factor (fan-out), keeping the tree shallow (3–4 levels for millions of rows), drastically minimizing disk I/O seeks. All actual row pointers reside exclusively in leaf nodes linked as a doubly-linked list, enabling fast $O(\\log N)$ point queries and sequential range scans.
- **Memory Hook / Key Takeaway:** Shallow height = fewer disk seeks. Linked leaf nodes = rapid range queries.`;

    default:
      return `### 📄 Database Systems: ${task}\n\n- Relational Algebra, SQL, Normalization, ACID Transactions, and B+ Tree Indexing.\n- Comprehensive database principles with full integrity constraint coverage.`;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Topic 3: Operating Systems
   ───────────────────────────────────────────────────────────────────────────── */

function getOsContent(task: string): string {
  switch (task) {
    case "Create flashcards":
      return `### 🗂️ Interactive Flashcards: Operating Systems

#### Flashcard 1: Process vs Thread
- **Front (Question / Prompt):** What is the core difference between a Process and a Thread?
- **Back (Answer / Explanation):** A **Process** is an executing program instance with its own isolated virtual memory space (text, data, heap, stack), file descriptors, and PCB. A **Thread** is a lightweight execution unit inside a process sharing the same address space and heap, with its own dedicated program counter, stack, and register set.
- **Memory Hook / Key Takeaway:** Processes provide memory isolation; Threads enable shared-memory parallelism.

#### Flashcard 2: Deadlock & Coffman Conditions
- **Front (Question / Prompt):** What are the 4 Coffman conditions required for a deadlock to occur?
- **Back (Answer / Explanation):** 
  1. **Mutual Exclusion:** At least one non-shareable resource.
  2. **Hold and Wait:** Process holds one resource while requesting another.
  3. **No Preemption:** Resources cannot be forcibly revoked.
  4. **Circular Wait:** Closed loop chain where $P_0$ waits for $P_1$, and $P_n$ waits for $P_0$.
- **Memory Hook / Key Takeaway:** Breaking any single condition prevents deadlocks.

#### Flashcard 3: Virtual Memory & Paging
- **Front (Question / Prompt):** How does Paging implement Virtual Memory and eliminate external fragmentation?
- **Back (Answer / Explanation):** Physical memory is divided into fixed-size **frames**, and logical address space into equal-sized **pages**. The MMU translates virtual page numbers to physical frame numbers using a **Page Table**. Non-contiguous allocation eliminates external fragmentation, and TLB caches recent translations.
- **Memory Hook / Key Takeaway:** Virtual pages map to physical frames via the Page Table and TLB.`;

    default:
      return `### 📄 Operating Systems: ${task}\n\n- Process management, CPU scheduling, Virtual Memory, Concurrency, and Deadlock mitigation.`;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Topic 4: Computer Networks
   ───────────────────────────────────────────────────────────────────────────── */

function getNetworksContent(task: string): string {
  switch (task) {
    case "Create flashcards":
      return `### 🗂️ Interactive Flashcards: Computer Networks

#### Flashcard 1: OSI 7-Layer Model
- **Front (Question / Prompt):** List the 7 layers of the OSI model from Layer 1 to Layer 7 and their primary functions.
- **Back (Answer / Explanation):** 
  1. **Physical:** Raw bit transmission over physical media.
  2. **Data Link:** Framing, MAC addressing, error detection (Ethernet, Wi-Fi).
  3. **Network:** Logical addressing, routing, packet forwarding (IP).
  4. **Transport:** End-to-end reliable transmission, port multiplexing (TCP, UDP).
  5. **Session:** Session dialog establishment and checkpointing.
  6. **Presentation:** Data serialization, compression, encryption (TLS, JSON).
  7. **Application:** User network services (HTTP, DNS, SMTP, SSH).
- **Memory Hook / Key Takeaway:** "Please Do Not Throw Sausage Pizza Away" (Physical to Application).

#### Flashcard 2: TCP 3-Way Handshake
- **Front (Question / Prompt):** Explain the 3 steps of establishing a TCP connection.
- **Back (Answer / Explanation):** 
  1. **SYN:** Client sends SYN with initial sequence number ($ISN_c$).
  2. **SYN-ACK:** Server responds with SYN and ACK ($ISN_c + 1$).
  3. **ACK:** Client sends final ACK ($ISN_s + 1$). Connection transitions to ESTABLISHED.
- **Memory Hook / Key Takeaway:** SYN ➔ SYN-ACK ➔ ACK. Guarantees synchronized sequence numbers before data exchange.`;

    default:
      return `### 📄 Computer Networks: ${task}\n\n- OSI Model, TCP/IP, IP Subnetting, Routing Algorithms, and Transport Protocols.`;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Topic 5: Data Structures & Algorithms
   ───────────────────────────────────────────────────────────────────────────── */

function getDsaContent(task: string): string {
  switch (task) {
    case "Create flashcards":
      return `### 🗂️ Interactive Flashcards: Data Structures & Algorithms

#### Flashcard 1: Asymptotic Complexity (Big-O)
- **Front (Question / Prompt):** What is Big-O notation and how do common complexities rank from fastest to slowest?
- **Back (Answer / Explanation):** Big-O represents the upper bound on execution time or space as input size $N \\rightarrow \\infty$.
  • $O(1)$ (Constant) < $O(\\log N)$ (Logarithmic) < $O(N)$ (Linear) < $O(N \\log N)$ (Log-Linear) < $O(N^2)$ (Quadratic) < $O(2^N)$ (Exponential).
- **Memory Hook / Key Takeaway:** $O(1) < O(\\log N) < O(N) < O(N \\log N) < O(N^2) < O(2^N)$.

#### Flashcard 2: Binary Search Trees vs Hash Tables
- **Front (Question / Prompt):** Compare Binary Search Trees (BST) with Hash Tables for lookups.
- **Back (Answer / Explanation):** Hash Tables provide average $O(1)$ search, insert, and delete using a hash function, but lack order. Self-balancing BSTs (AVL, Red-Black) guarantee $O(\\log N)$ worst-case time while maintaining sorted in-order traversal and efficient range queries ($[min, max]$).
- **Memory Hook / Key Takeaway:** Hash Table = fast unordered lookup. Balanced BST = guaranteed log-time + ordered range traversal.`;

    default:
      return `### 📄 Data Structures & Algorithms: ${task}\n\n- Arrays, Linked Lists, Trees, Graphs, Sorting, Dynamic Programming, and Complexity Analysis.`;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Topic 6: Python Programming
   ───────────────────────────────────────────────────────────────────────────── */

function getPythonContent(task: string): string {
  switch (task) {
    case "Create flashcards":
      return `### 🗂️ Interactive Flashcards: Python Programming

#### Flashcard 1: Mutable vs Immutable Types
- **Front (Question / Prompt):** Which Python built-in types are mutable and which are immutable?
- **Back (Answer / Explanation):** 
  • **Immutable (cannot be modified in-place):** \`int\`, \`float\`, \`str\`, \`tuple\`, \`frozenset\`, \`bool\`.
  • **Mutable (modified in-place):** \`list\`, \`dict\`, \`set\`, bytearray.
- **Memory Hook / Key Takeaway:** Modifying an immutable type creates a new object in memory; mutable objects alter in-place.

#### Flashcard 2: Generators & the \`yield\` Keyword
- **Front (Question / Prompt):** What is a Python generator and how does \`yield\` differ from \`return\`?
- **Back (Answer / Explanation):** A generator is an iterator function that produces values on-demand using \`yield\`. Unlike \`return\` which terminates function execution, \`yield\` pauses state and resumes execution upon the next \`next()\` call, saving memory with $O(1)$ space.
- **Memory Hook / Key Takeaway:** \`yield\` produces lazy sequences without allocating large memory buffers.`;

    default:
      return `### 📄 Python Programming: ${task}\n\n- Data types, Object-Oriented Programming, Generators, Decorators, and Standard Library.`;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Topic 7: Artificial Intelligence & Machine Learning
   ───────────────────────────────────────────────────────────────────────────── */

function getAiContent(task: string): string {
  switch (task) {
    case "Create flashcards":
      return `### 🗂️ Interactive Flashcards: AI & Machine Learning

#### Flashcard 1: Supervised vs Unsupervised Learning
- **Front (Question / Prompt):** Contrast Supervised Learning with Unsupervised Learning.
- **Back (Answer / Explanation):** 
  • **Supervised Learning:** Trains on labeled input-output pairs $(X, Y)$ to learn a mapping function (e.g., Regression, Classification).
  • **Unsupervised Learning:** Discovers latent patterns, clusters, or probability distributions from unlabeled data $X$ (e.g., K-Means, PCA, Autoencoders).
- **Memory Hook / Key Takeaway:** Supervised has target ground-truth labels; Unsupervised discovers inherent data structure.

#### Flashcard 2: Bias-Variance Tradeoff
- **Front (Question / Prompt):** What is the Bias-Variance tradeoff in machine learning models?
- **Back (Answer / Explanation):** 
  • **High Bias (Underfitting):** Model is overly simplistic and fails to capture underlying data relationships.
  • **High Variance (Overfitting):** Model memorizes training noise and fails to generalize to unseen test distributions.
- **Memory Hook / Key Takeaway:** Optimal model complexity minimizes total expected generalization error.`;

    default:
      return `### 📄 Artificial Intelligence: ${task}\n\n- Supervised, Unsupervised, Neural Networks, Deep Learning, and Model Evaluation.`;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Fallback: Custom User Text Parser
   ───────────────────────────────────────────────────────────────────────────── */

function getCustomParsedContent(task: string, text: string): string {
  const sentences = text
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const words = text
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !/^(about|above|after|again|before|being|below|could|every|first|great|other|their|there|these|which|would)$/i.test(w));

  const uniqueTerms = Array.from(new Set(words.filter((w) => Boolean(w && w.length)).map((w) => (w[0] || "").toUpperCase() + w.slice(1).toLowerCase()))).slice(0, 10);
  const headline = text.slice(0, 50).trim();

  switch (task) {
    case "Create flashcards": {
      const cards = sentences.slice(0, 6).map((s, idx) => {
        return `#### Flashcard ${idx + 1}: Concept ${idx + 1}
- **Front (Question / Prompt):** What core principle is established regarding: "${s.slice(0, 70)}..."?
- **Back (Answer / Explanation):** ${s}
- **Memory Hook / Key Takeaway:** Key domain concept: **${uniqueTerms[idx % uniqueTerms.length] || "Core Concept"}**.`;
      });

      return `### 🗂️ Interactive Flashcards: ${headline}\n\n${cards.join("\n\n")}`;
    }

    case "Summarise":
      return `### 📄 Document Summary: ${headline}

#### Executive Overview
Based on your provided study material, this document synthesizes the core principles and conceptual framework:

#### Key Takeaways
${sentences.slice(0, 5).map((s, i) => `- **Point ${i + 1}:** ${s}`).join("\n")}

#### Analytical Conclusion
The material highlights **${uniqueTerms.slice(0, 3).join(", ")}** as foundational elements essential for theoretical understanding and practical implementation.`;

    case "Generate questions":
      return `### 📝 Examination Questions: ${headline}

#### Part A: Conceptual Questions (2 Marks Each)
${sentences.slice(0, 3).map((s, i) => `${i + 1}. Explain the significance of the following principle: "${s.slice(0, 60)}..."?\n   *Model Answer:* It defines how key entities interact and sets foundational rules for system behavior.`).join("\n\n")}

#### Part B: Descriptive Questions (10 Marks Each)
4. Critically analyze the methodologies and implications discussed in the provided text, specifically evaluating the role of **${uniqueTerms[0] || "the core topic"}**.
5. Detail how the principles described can be applied to solve real-world technical challenges.

#### Part C: Objective MCQs
6. According to the document, which of the following is primarily emphasized?
   - A) **${uniqueTerms[0] || "Primary concept"}** *(Correct)*
   - B) Secondary unrelated factor
   - C) Legacy deprecated approach
   - D) None of the above`;

    case "Revision notes":
      return `### ⚡ High-Yield Revision Notes: ${headline}

#### Core Highlights
${sentences.slice(0, 6).map((s) => `- ${s}`).join("\n")}

#### High-Frequency Keywords
${uniqueTerms.map((t) => `• **${t}**`).join("  ·  ")}`;

    case "Extract key terms":
    default:
      return `### 📖 Extracted Key Terms & Glossary: ${headline}

${uniqueTerms.map((t) => `- **${t}:** Key domain terminology identified in the provided material, representing a foundational component of the subject matter.`).join("\n")}`;
  }
}
