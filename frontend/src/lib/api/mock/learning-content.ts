import "server-only";

/*
 * Department knowledge used by the (mock) AI Course Studio and Quiz Builder.
 * The real platform calls the course-planner / exam agents with the department syllabus via RAG;
 * this deterministic content keeps every screen fully usable offline.
 */

export interface BankQuestion {
  prompt: string;
  options: [string, string, string, string];
  answer: number;
  explanation: string;
}

/** Core topics per department (drives course units and quiz topics). */
export const DEPT_TOPICS: Record<string, string[]> = {
  "Computer Science & Engineering": ["Data structures", "Algorithms & complexity", "Database systems", "Operating systems", "Computer networks", "Software engineering", "Cloud computing", "Cyber security"],
  "Information Technology": ["Web technologies", "Database systems", "Networking", "Cloud & DevOps", "Information security", "Mobile app development"],
  "Artificial Intelligence & Data Science": ["Python for data science", "Statistics & probability", "Machine learning", "Deep learning", "Data visualisation", "MLOps & ethics"],
  "Electronics & Communication": ["Electronic devices", "Digital electronics", "Signals & systems", "Communication systems", "Microcontrollers", "VLSI design", "Embedded & IoT"],
  "Electrical & Electronics": ["Circuit theory", "Electrical machines", "Power systems", "Power electronics", "Control systems", "Renewable energy"],
  "Mechanical Engineering": ["Engineering mechanics", "Thermodynamics", "Fluid mechanics", "Manufacturing processes", "Machine design", "CAD/CAM"],
  "Civil Engineering": ["Surveying", "Strength of materials", "Structural analysis", "Concrete technology", "Geotechnical engineering", "Construction management"],
  Anatomy: ["General anatomy", "Upper limb", "Lower limb", "Thorax", "Abdomen & pelvis", "Head & neck", "Neuroanatomy", "Embryology"],
  Physiology: ["General physiology", "Blood", "Nerve & muscle", "Cardiovascular system", "Respiratory system", "Renal physiology", "Endocrinology"],
  Biochemistry: ["Enzymes", "Carbohydrate metabolism", "Lipid metabolism", "Protein metabolism", "Molecular biology", "Clinical biochemistry"],
  Pathology: ["Cell injury", "Inflammation & repair", "Haemodynamic disorders", "Neoplasia", "Haematology", "Systemic pathology"],
  Pharmacology: ["Pharmacokinetics", "Pharmacodynamics", "Autonomic drugs", "Cardiovascular drugs", "Antimicrobials", "CNS drugs"],
  Microbiology: ["General microbiology", "Immunology", "Bacteriology", "Virology", "Mycology & parasitology", "Hospital infection control"],
  "Community Medicine": ["Epidemiology", "Biostatistics", "Nutrition", "Communicable diseases", "National health programmes", "Environment & health"],
  "General Medicine": ["Clinical history & examination", "Infectious diseases", "Cardiology", "Respiratory medicine", "Endocrinology", "Emergency medicine"],
  "General Surgery": ["Wound healing", "Shock & fluids", "Trauma management", "Breast & thyroid", "Gastrointestinal surgery", "Asepsis & sterilisation"],
  Nursing: ["Fundamentals of nursing", "Anatomy for nurses", "Medical-surgical nursing", "Community health nursing", "Maternal nursing", "Patient safety"],
  Physiotherapy: ["Exercise therapy", "Electrotherapy", "Musculoskeletal physiotherapy", "Neurological rehabilitation", "Cardio-respiratory care"],
  Pharmacy: ["Pharmaceutics", "Pharmaceutical chemistry", "Pharmacognosy", "Pharmacology", "Hospital pharmacy"],
  Commerce: ["Financial accounting", "Cost accounting", "Business law", "Taxation (GST)", "Corporate accounting", "Auditing"],
  English: ["Communicative English", "Prose & poetry", "Grammar & usage", "Business writing", "Literary criticism"],
  Tamil: ["Sangam literature", "Bhakti literature", "Modern Tamil poetry", "Tamil grammar", "Translation studies"],
  Mathematics: ["Calculus", "Linear algebra", "Differential equations", "Real analysis", "Probability", "Numerical methods"],
  Physics: ["Mechanics", "Optics", "Thermal physics", "Electromagnetism", "Quantum physics", "Electronics"],
  Chemistry: ["Atomic structure", "Chemical bonding", "Organic reaction mechanisms", "Thermodynamics", "Spectroscopy", "Green chemistry"],
  "Computer Science": ["Programming in C", "Data structures", "Database management", "Web development", "Python programming", "Computer networks"],
  Economics: ["Microeconomics", "Macroeconomics", "Indian economy", "Money & banking", "Statistics for economics"],
  "Business Administration": ["Principles of management", "Marketing", "Human resource management", "Financial management", "Entrepreneurship"],
  Marketing: ["Consumer behaviour", "Digital marketing", "Brand management", "Sales management", "Marketing analytics"],
  Finance: ["Financial management", "Investment analysis", "Corporate finance", "Financial markets", "Risk management"],
};

export function topicsFor(department: string, title: string): string[] {
  const t = DEPT_TOPICS[department];
  if (t) return t;
  const base = title.trim() || department;
  return [`Foundations of ${base}`, `Core concepts in ${base}`, `Methods & tools`, `Applications of ${base}`, `Case studies`, `Recent advances`];
}

/** Curated question banks for key departments. Others fall back to topic-driven templates. */
export const QUESTION_BANK: Record<string, BankQuestion[]> = {
  "Computer Science & Engineering": [
    { prompt: "Which data structure uses LIFO order?", options: ["Queue", "Stack", "Heap", "Linked list"], answer: 1, explanation: "A stack removes the most recently added element first (Last In, First Out)." },
    { prompt: "Worst-case time complexity of binary search on a sorted array of n items is…", options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"], answer: 1, explanation: "Each comparison halves the search space, giving O(log n)." },
    { prompt: "A relation in which every determinant is a candidate key is in…", options: ["1NF", "2NF", "3NF", "BCNF"], answer: 3, explanation: "BCNF requires every determinant of a non-trivial FD to be a superkey." },
    { prompt: "Which scheduling algorithm can cause starvation of long processes?", options: ["Round robin", "FCFS", "Shortest job first", "Multilevel feedback with ageing"], answer: 2, explanation: "SJF keeps favouring short jobs, so long jobs may wait indefinitely." },
    { prompt: "Which layer of the OSI model is responsible for routing?", options: ["Data link", "Network", "Transport", "Session"], answer: 1, explanation: "The network layer (Layer 3) selects paths and routes packets." },
    { prompt: "SQL injection is best prevented by…", options: ["Hiding error messages", "Parameterised queries", "Using POST instead of GET", "Client-side validation"], answer: 1, explanation: "Parameterised queries keep data separate from SQL code." },
    { prompt: "In Agile Scrum, the time-boxed iteration is called a…", options: ["Milestone", "Sprint", "Epic", "Backlog"], answer: 1, explanation: "A sprint is a fixed-length iteration, typically 1–4 weeks." },
    { prompt: "Which service model gives you virtual machines you manage yourself?", options: ["SaaS", "PaaS", "IaaS", "FaaS"], answer: 2, explanation: "IaaS provides compute, storage and networking; you manage the OS upwards." },
  ],
  "Electronics & Communication": [
    { prompt: "A NAND gate outputs 0 only when…", options: ["Any input is 0", "All inputs are 1", "All inputs are 0", "Inputs differ"], answer: 1, explanation: "NAND is the complement of AND: output is 0 only when every input is 1." },
    { prompt: "The Nyquist sampling rate for a signal of maximum frequency f is…", options: ["f/2", "f", "2f", "4f"], answer: 2, explanation: "Sampling at at least twice the highest frequency avoids aliasing." },
    { prompt: "Which modulation varies the carrier's frequency?", options: ["AM", "FM", "PAM", "ASK"], answer: 1, explanation: "Frequency modulation changes carrier frequency with the message." },
    { prompt: "In a BJT, the region used for amplification is…", options: ["Cut-off", "Saturation", "Active", "Breakdown"], answer: 2, explanation: "The active region gives linear current gain." },
    { prompt: "An 8-bit ADC with 5 V reference has a resolution of about…", options: ["5 mV", "19.5 mV", "39 mV", "0.5 V"], answer: 1, explanation: "5 V / 256 ≈ 19.5 mV per step." },
  ],
  "Mechanical Engineering": [
    { prompt: "The first law of thermodynamics is a statement of conservation of…", options: ["Mass", "Momentum", "Energy", "Entropy"], answer: 2, explanation: "ΔU = Q − W: energy is conserved." },
    { prompt: "Bernoulli's equation applies to flow that is…", options: ["Viscous and compressible", "Steady, incompressible, non-viscous", "Turbulent only", "Unsteady"], answer: 1, explanation: "Classic Bernoulli assumes steady, incompressible, frictionless flow along a streamline." },
    { prompt: "Which process joins metals by melting a filler without melting the base metal?", options: ["Welding", "Brazing", "Forging", "Casting"], answer: 1, explanation: "Brazing melts a filler (> 450 °C) but not the base metals." },
    { prompt: "Factor of safety is the ratio of…", options: ["Working stress to ultimate stress", "Ultimate stress to working stress", "Strain to stress", "Load to area"], answer: 1, explanation: "FoS = ultimate (or yield) stress / allowable working stress." },
  ],
  "Civil Engineering": [
    { prompt: "The standard curing period for ordinary Portland cement concrete is typically…", options: ["1 day", "7 days", "28 days", "90 days"], answer: 2, explanation: "Characteristic strength is specified at 28 days." },
    { prompt: "Which instrument measures horizontal and vertical angles?", options: ["Dumpy level", "Theodolite", "Plane table", "Chain"], answer: 1, explanation: "A theodolite measures both horizontal and vertical angles." },
    { prompt: "A simply supported beam with a central point load has maximum bending moment of…", options: ["WL/2", "WL/4", "WL/8", "WL"], answer: 1, explanation: "M_max = WL/4 at mid-span." },
  ],
  Anatomy: [
    { prompt: "The nerve damaged in 'wrist drop' is the…", options: ["Median nerve", "Ulnar nerve", "Radial nerve", "Axillary nerve"], answer: 2, explanation: "Radial nerve injury paralyses wrist extensors, causing wrist drop." },
    { prompt: "The largest bone of the human body is the…", options: ["Humerus", "Tibia", "Femur", "Pelvis"], answer: 2, explanation: "The femur is the longest and strongest bone." },
    { prompt: "The sinoatrial node is located in the wall of the…", options: ["Left atrium", "Right atrium", "Right ventricle", "Interventricular septum"], answer: 1, explanation: "The SA node lies in the right atrium near the opening of the SVC." },
    { prompt: "Which structure passes through the carpal tunnel?", options: ["Ulnar nerve", "Median nerve", "Radial artery", "Ulnar artery"], answer: 1, explanation: "The median nerve and flexor tendons pass through the carpal tunnel." },
  ],
  Physiology: [
    { prompt: "Normal resting membrane potential of a neuron is about…", options: ["+30 mV", "−70 mV", "−90 mV", "0 mV"], answer: 1, explanation: "Neuronal RMP is approximately −70 mV." },
    { prompt: "The hormone that lowers blood glucose is…", options: ["Glucagon", "Cortisol", "Insulin", "Adrenaline"], answer: 2, explanation: "Insulin promotes glucose uptake and storage." },
    { prompt: "Cardiac output equals…", options: ["Heart rate × stroke volume", "Blood pressure × resistance", "Stroke volume ÷ heart rate", "End-diastolic volume − end-systolic volume"], answer: 0, explanation: "CO = HR × SV (≈ 5 L/min at rest)." },
  ],
  Pathology: [
    { prompt: "Irreversible cell injury is characterised by…", options: ["Cell swelling", "Fatty change", "Nuclear karyolysis", "Membrane blebs"], answer: 2, explanation: "Nuclear changes (pyknosis, karyorrhexis, karyolysis) indicate necrosis." },
    { prompt: "A benign tumour of glandular epithelium is called…", options: ["Adenoma", "Papilloma", "Carcinoma", "Sarcoma"], answer: 0, explanation: "Adenoma = benign tumour of glandular epithelium." },
    { prompt: "The most common type of anaemia worldwide is…", options: ["Megaloblastic", "Iron deficiency", "Aplastic", "Haemolytic"], answer: 1, explanation: "Iron-deficiency anaemia is the most prevalent." },
  ],
  Pharmacology: [
    { prompt: "Drug of choice for anaphylactic shock is…", options: ["Hydrocortisone", "Adrenaline", "Antihistamine", "Atropine"], answer: 1, explanation: "IM adrenaline is first-line in anaphylaxis." },
    { prompt: "Bioavailability of an IV drug is…", options: ["0%", "50%", "100%", "Variable"], answer: 2, explanation: "IV administration delivers the full dose to circulation." },
    { prompt: "Paracetamol overdose is treated with…", options: ["Naloxone", "N-acetylcysteine", "Flumazenil", "Atropine"], answer: 1, explanation: "N-acetylcysteine replenishes glutathione." },
  ],
  Nursing: [
    { prompt: "The first step of the nursing process is…", options: ["Planning", "Diagnosis", "Assessment", "Evaluation"], answer: 2, explanation: "ADPIE: Assessment, Diagnosis, Planning, Implementation, Evaluation." },
    { prompt: "Hand hygiene with alcohol rub should last at least…", options: ["5 seconds", "20–30 seconds", "2 minutes", "5 minutes"], answer: 1, explanation: "WHO recommends 20–30 seconds for alcohol-based hand rub." },
    { prompt: "Normal adult respiratory rate is…", options: ["8–10 /min", "12–20 /min", "24–30 /min", "30–40 /min"], answer: 1, explanation: "Adults normally breathe 12–20 times per minute." },
  ],
  Commerce: [
    { prompt: "Depreciation under the written-down value method is charged on…", options: ["Original cost", "Book value at the beginning of the year", "Scrap value", "Market value"], answer: 1, explanation: "WDV applies the rate to the reducing book value." },
    { prompt: "Which account shows gross profit?", options: ["Profit & loss account", "Trading account", "Balance sheet", "Cash book"], answer: 1, explanation: "The trading account determines gross profit." },
    { prompt: "GST in India is a…", options: ["Direct tax", "Destination-based indirect tax", "Wealth tax", "Customs duty only"], answer: 1, explanation: "GST is a destination-based consumption (indirect) tax." },
    { prompt: "Assets = Liabilities + …", options: ["Expenses", "Capital", "Revenue", "Drawings"], answer: 1, explanation: "The accounting equation: A = L + Capital." },
  ],
  English: [
    { prompt: "Choose the correctly punctuated sentence.", options: ["Its a good idea.", "It's a good idea.", "Its' a good idea.", "It is' a good idea."], answer: 1, explanation: "It's = it is." },
    { prompt: "A formal letter's closing for an unknown recipient is…", options: ["Yours lovingly", "Yours faithfully", "Cheers", "Regards, buddy"], answer: 1, explanation: "'Yours faithfully' is used when the recipient's name is unknown." },
    { prompt: "The figure of speech in 'The wind whispered' is…", options: ["Simile", "Personification", "Hyperbole", "Alliteration"], answer: 1, explanation: "Giving human qualities to the wind is personification." },
  ],
  Chemistry: [
    { prompt: "The hybridisation of carbon in methane is…", options: ["sp", "sp²", "sp³", "dsp²"], answer: 2, explanation: "Four sigma bonds → sp³, tetrahedral geometry." },
    { prompt: "Which is a principle of green chemistry?", options: ["Maximise waste", "Atom economy", "Use more solvents", "Avoid catalysts"], answer: 1, explanation: "Atom economy maximises incorporation of reactants into the product." },
    { prompt: "SN2 reactions proceed with…", options: ["Retention", "Racemisation", "Inversion of configuration", "No stereochemical change"], answer: 2, explanation: "Backside attack inverts configuration (Walden inversion)." },
  ],
  Mathematics: [
    { prompt: "The derivative of sin x is…", options: ["−cos x", "cos x", "tan x", "sec² x"], answer: 1, explanation: "d/dx (sin x) = cos x." },
    { prompt: "The determinant of a singular matrix is…", options: ["1", "0", "−1", "Undefined"], answer: 1, explanation: "A matrix is singular exactly when its determinant is 0." },
    { prompt: "∫ 1/x dx = …", options: ["x²/2 + C", "ln|x| + C", "1/x² + C", "e^x + C"], answer: 1, explanation: "The antiderivative of 1/x is ln|x|." },
  ],
};

/** Aptitude questions shared across streams (placement readiness). */
export const APTITUDE_BANK: BankQuestion[] = [
  { prompt: "If 12 workers finish a job in 10 days, how many days will 15 workers take?", options: ["6", "8", "10", "12"], answer: 1, explanation: "Work = 120 worker-days; 120 / 15 = 8 days." },
  { prompt: "A price rises 20% then falls 20%. The net change is…", options: ["0%", "4% decrease", "4% increase", "2% decrease"], answer: 1, explanation: "1.2 × 0.8 = 0.96 → 4% decrease." },
  { prompt: "Find the next number: 2, 6, 12, 20, 30, …", options: ["36", "40", "42", "44"], answer: 2, explanation: "Differences 4, 6, 8, 10, 12 → 42." },
];

export function bankFor(department: string): BankQuestion[] {
  return QUESTION_BANK[department] ?? [];
}

/** Template questions when a department has no curated bank (always marked for faculty review). */
export function templateQuestions(department: string, topics: string[], n: number): BankQuestion[] {
  const out: BankQuestion[] = [];
  for (let i = 0; i < n; i++) {
    const topic = topics[i % topics.length] ?? department;
    const others = topics.filter((t) => t !== topic).slice(0, 3);
    while (others.length < 3) others.push(`General ${department} practice`);
    const options = [topic, ...others] as [string, string, string, string];
    // rotate so the correct option is not always first
    const shift = i % 4;
    const rotated = [...options.slice(shift), ...options.slice(0, shift)] as [string, string, string, string];
    out.push({
      prompt: `Which unit of the ${department} syllabus would you revise for a question on "${topic.toLowerCase()}"? (review & edit)`,
      options: rotated,
      answer: (4 - shift) % 4,
      explanation: `Placeholder generated from the ${department} topic list — replace with a subject-specific question before publishing.`,
    });
  }
  return out;
}
