"use client";

import { useState, useMemo } from "react";
import {
  Database,
  FileText,
  Search,
  Plus,
  Download,
  Filter,
  Eye,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Send,
  Layers,
  ShieldCheck,
  Bot,
  SlidersHorizontal,
  Check,
  FileCheck,
  Cpu,
  FileUp,
  UploadCloud,
} from "lucide-react";
import type { Role } from "@/lib/auth/roles";
import {
  Badge,
  Button,
  Card,
  Field,
  EmptyState,
  Spinner,
  inputClass,
  toneForStatus,
} from "@/components/ui/primitives";
import { toCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";

/* ── Data Interfaces ────────────────────────────────── */

export type DocType =
  | "Regulation"
  | "Calendar"
  | "Handbook"
  | "Policy"
  | "Guideline"
  | "Lab manual"
  | "Circular"
  | "Syllabus"
  | "Accreditation Evidence";

export type DocStatus = "Approved" | "Pending approval" | "Indexing" | "Archived";

export interface DocChunk {
  id: string;
  chunkIndex: number;
  section: string;
  content: string;
  tokens: number;
  confidence: number;
  pageNumber: number;
}

export interface KnowledgeDoc {
  id: string;
  doc: string;
  type: DocType;
  owner: string;
  updated: string;
  chunks: number;
  status: DocStatus;
  size: string;
  scope: string;
  description: string;
  vectorModel: string;
  groundedAgents: string[];
  sampleChunks: DocChunk[];
}

export interface RagPresetQuery {
  id: string;
  question: string;
  targetDoc: string;
  citation: string;
  answer: string;
  sourceChunks: {
    docTitle: string;
    section: string;
    similarity: number;
    snippet: string;
  }[];
}

/* ── Initial Mock Data ──────────────────────────────── */

const INITIAL_DOCS: KnowledgeDoc[] = [
  {
    id: "kb-01",
    doc: "Regulations 2021 — B.E./B.Tech",
    type: "Regulation",
    owner: "Registrar",
    updated: "1 Sep 2026",
    chunks: 40,
    status: "Approved",
    size: "3.4 MB",
    scope: "Institution-wide",
    description:
      "Academic regulations governing Choice Based Credit System (CBCS), minimum credits for B.E./B.Tech degree, grading scale, attendance requirements, and fast-track graduation policies.",
    vectorModel: "text-embedding-3-large (1536 dim)",
    groundedAgents: ["Policy Assistant", "Faculty AI Copilot", "Campus Assistant", "Exam Blueprint"],
    sampleChunks: [
      {
        id: "c-101",
        chunkIndex: 1,
        section: "Clause 4.2: Attendance Requirements & Condonation",
        content:
          "A candidate shall only be permitted to appear for end-semester examinations if he/she secures not less than 75% attendance in each registered course. Condonation up to 10% (attendance between 65% and 74%) may be granted on medical grounds or authorised institutional representation upon submission of certified records and Principal approval.",
        tokens: 384,
        confidence: 0.985,
        pageNumber: 14,
      },
      {
        id: "c-102",
        chunkIndex: 2,
        section: "Clause 6.1: Evaluation Weightage & Letter Grading",
        content:
          "Continuous Internal Assessment (CIA) carries 40% weightage, and End Semester Examination (ESE) carries 60% weightage. Letter grades O (91–100), A+ (81–90), A (71–80), B+ (61–70), B (50–60), and RA (Reappearance < 50) determine the semester grade point average (SGPA).",
        tokens: 312,
        confidence: 0.991,
        pageNumber: 22,
      },
      {
        id: "c-103",
        chunkIndex: 3,
        section: "Clause 9.4: Fast-Track & Honours Degree Track",
        content:
          "Students with a cumulative grade point average (CGPA) of 8.50 and above with no standing arrears are eligible to enrol in the Honours Degree track or 8th semester industry fast-track internship programme.",
        tokens: 290,
        confidence: 0.974,
        pageNumber: 36,
      },
    ],
  },
  {
    id: "kb-02",
    doc: "Academic Calendar 2026–27 (Odd sem)",
    type: "Calendar",
    owner: "Registrar",
    updated: "4 Sep 2026",
    chunks: 101,
    status: "Approved",
    size: "1.2 MB",
    scope: "Institution-wide",
    description:
      "Schedule of academic activities for Odd Semester 2026–27: class commencement, continuous assessment tests (CAT I, II, III), instructional holidays, practical evaluations, and final theory exams.",
    vectorModel: "text-embedding-3-large (1536 dim)",
    groundedAgents: ["Policy Assistant", "Campus Assistant", "Study Planner"],
    sampleChunks: [
      {
        id: "c-201",
        chunkIndex: 1,
        section: "Section 1: Academic Milestones & Assessment Window",
        content:
          "Commencement of classes: 10 August 2026. Continuous Assessment Test I (CAT-I): 22–26 September 2026. Continuous Assessment Test II (CAT-II): 28 October–03 November 2026. Last instructional working day: 14 November 2026.",
        tokens: 245,
        confidence: 0.994,
        pageNumber: 2,
      },
      {
        id: "c-202",
        chunkIndex: 2,
        section: "Section 2: Examination Schedule & Grade Publication",
        content:
          "End Semester Practical Laboratory Examinations: 17–24 November 2026. Theory Examinations begin: 01 December 2026. Tentative declaration of semester examination results: 28 December 2026.",
        tokens: 230,
        confidence: 0.988,
        pageNumber: 4,
      },
    ],
  },
  {
    id: "kb-03",
    doc: "CSE Department Handbook",
    type: "Handbook",
    owner: "CSE Dept",
    updated: "7 Sep 2026",
    chunks: 162,
    status: "Approved",
    size: "4.8 MB",
    scope: "Computer Science",
    description:
      "Department curriculum structure, laboratory safety procedures, faculty mentor directory, elective allocation matrix, and capstone project evaluation rubrics for Computer Science & Engineering.",
    vectorModel: "text-embedding-3-large (1536 dim)",
    groundedAgents: ["Faculty AI Copilot", "Policy Assistant", "Exam Blueprint"],
    sampleChunks: [
      {
        id: "c-301",
        chunkIndex: 1,
        section: "Section 3: Final Year Capstone Project Rubric",
        content:
          "Every candidate must undertake an industry-grade or research-oriented capstone project during Semesters 7 and 8. Phase I evaluation comprises 100 marks: Zero Review (20 marks), Review I (30 marks), and Review II with viva-voce (50 marks). Publication in a peer-reviewed Scopus indexed journal yields bonus credits.",
        tokens: 410,
        confidence: 0.982,
        pageNumber: 19,
      },
      {
        id: "c-302",
        chunkIndex: 2,
        section: "Section 5: Computing Lab Access & Cloud Sandbox Rules",
        content:
          "High Performance Computing (HPC) and Cloud Sandbox instances are provisioned to CSE students through institutional SSO. GPU allocations for Deep Learning projects are queued with a maximum 48-hour continuous runtime cap.",
        tokens: 275,
        confidence: 0.965,
        pageNumber: 31,
      },
    ],
  },
  {
    id: "kb-04",
    doc: "Internal Assessment Rules",
    type: "Policy",
    owner: "Exam Cell",
    updated: "10 Sep 2026",
    chunks: 223,
    status: "Approved",
    size: "890 KB",
    scope: "Examination Cell",
    description:
      "Standard operational procedures for question paper blueprint setting, Bloom's Taxonomy mapping, internal assessment moderation, assignment rubric calculations, and grievance redressal.",
    vectorModel: "text-embedding-3-large (1536 dim)",
    groundedAgents: ["Exam Blueprint", "Faculty AI Copilot", "Policy Assistant"],
    sampleChunks: [
      {
        id: "c-401",
        chunkIndex: 1,
        section: "Rule 2.1: Continuous Assessment Test Conduct & Normalization",
        content:
          "Three continuous assessment tests of 90 minutes duration each shall be scheduled per semester. The average of the best two test performances shall be converted to 20 marks. Assignments, case studies, and mini-quizzes contribute an additional 20 marks of CIA.",
        tokens: 320,
        confidence: 0.992,
        pageNumber: 5,
      },
      {
        id: "c-402",
        chunkIndex: 2,
        section: "Rule 4.3: Bloom's Taxonomy Distribution Requirement",
        content:
          "Internal examination question papers must adhere to the following distribution: Remember & Understand (30%), Apply & Analyse (50%), Evaluate & Create (20%). Every question must explicitly declare mapped Course Outcomes (CO1 through CO5).",
        tokens: 285,
        confidence: 0.988,
        pageNumber: 8,
      },
    ],
  },
  {
    id: "kb-05",
    doc: "Placement Policy 2026",
    type: "Policy",
    owner: "Placement Cell",
    updated: "13 Sep 2026",
    chunks: 284,
    status: "Approved",
    size: "1.5 MB",
    scope: "Placement Cell",
    description:
      "Placement drive eligibility criteria, code of conduct during recruiter interactions, dream company offer policies (CTC >= 10 LPA), internship conversion rules, and placement cell guidelines.",
    vectorModel: "text-embedding-3-large (1536 dim)",
    groundedAgents: ["Policy Assistant", "Placement Readiness", "Campus Assistant"],
    sampleChunks: [
      {
        id: "c-501",
        chunkIndex: 1,
        section: "Clause 1.4: Eligibility & Dream Offer Upgrades",
        content:
          "Students with a CGPA of 6.50 and above with zero standing arrears are eligible to participate in on-campus recruitment drives. A student with an existing placement offer of less than ₹6.0 LPA is eligible to attempt subsequent 'Dream Offer' recruitment drives offering packages of ₹10.0 LPA or higher.",
        tokens: 360,
        confidence: 0.995,
        pageNumber: 3,
      },
      {
        id: "c-502",
        chunkIndex: 2,
        section: "Clause 3.2: Attendance at Scheduled Company Drives",
        content:
          "Any student who registers for a recruitment drive but fails to appear for the initial test or interview without prior written approval from the Placement Officer shall be debarred from the subsequent three campus placement opportunities.",
        tokens: 290,
        confidence: 0.978,
        pageNumber: 7,
      },
    ],
  },
  {
    id: "kb-06",
    doc: "Student Code of Conduct",
    type: "Guideline",
    owner: "Registrar",
    updated: "16 Sep 2026",
    chunks: 345,
    status: "Approved",
    size: "2.1 MB",
    scope: "Institution-wide",
    description:
      "Campus ethics, student disciplinary regulations, statutory anti-ragging measures, hostel rules, acceptable IT usage policies, and institutional grievance redressal cell workflows.",
    vectorModel: "text-embedding-3-large (1536 dim)",
    groundedAgents: ["Policy Assistant", "Campus Assistant"],
    sampleChunks: [
      {
        id: "c-601",
        chunkIndex: 1,
        section: "Section 5: Zero-Tolerance Anti-Ragging Mandate",
        content:
          "Ragging in any form within or outside the collegiate campus premises is strictly prohibited under UGC and State Statutory Regulations. Any reported complaint triggers immediate suspension and an enquiry by the Institutional Anti-Ragging Committee within 24 hours.",
        tokens: 330,
        confidence: 0.996,
        pageNumber: 9,
      },
      {
        id: "c-602",
        chunkIndex: 2,
        section: "Section 7: Campus Digital & Network Ethics",
        content:
          "The campus high-speed network is provisioned strictly for academic and research pursuits. Unauthorized access, cryptographic mining, harassment via digital channels, or tampering with collegiate IT infrastructure results in immediate network de-authorization and disciplinary action.",
        tokens: 310,
        confidence: 0.971,
        pageNumber: 15,
      },
    ],
  },
  {
    id: "kb-07",
    doc: "DBMS Lab Manual",
    type: "Lab manual",
    owner: "CSE Dept",
    updated: "19 Sep 2026",
    chunks: 406,
    status: "Approved",
    size: "5.6 MB",
    scope: "Computer Science",
    description:
      "Practical laboratory syllabus, DDL/DML SQL queries, ER diagram case studies, relational algebra, PL/SQL triggers and cursors, and database normalization exercises for CS3492.",
    vectorModel: "text-embedding-3-large (1536 dim)",
    groundedAgents: ["Faculty AI Copilot", "Exam Blueprint"],
    sampleChunks: [
      {
        id: "c-701",
        chunkIndex: 1,
        section: "Exercise 4: Relational Schema Normalization & Complex Joins",
        content:
          "Objective: Normalize a retail inventory database from 1NF to 3NF and BCNF to eliminate insertion, deletion, and update anomalies. Implement nested subqueries and multi-table outer joins to extract departmental sales trends.",
        tokens: 350,
        confidence: 0.989,
        pageNumber: 24,
      },
      {
        id: "c-702",
        chunkIndex: 2,
        section: "Exercise 7: PL/SQL Triggers & Stored Procedures",
        content:
          "Implement row-level and statement-level triggers to audit salary updates in an employee schema. Ensure transaction integrity using COMMIT, ROLLBACK, and SAVEPOINT within exception-handling blocks.",
        tokens: 295,
        confidence: 0.984,
        pageNumber: 42,
      },
    ],
  },
  {
    id: "kb-08",
    doc: "Circular 42/2026 — Exam fee",
    type: "Circular",
    owner: "Exam Cell",
    updated: "22 Sep 2026",
    chunks: 467,
    status: "Pending approval",
    size: "420 KB",
    scope: "Examination Cell",
    description:
      "Official notification on November/December 2026 end-semester examination fee schedule, payment gateway URLs, late penalty slabs, and hall ticket issuance requirements.",
    vectorModel: "text-embedding-3-large (1536 dim)",
    groundedAgents: ["Campus Assistant", "Policy Assistant"],
    sampleChunks: [
      {
        id: "c-801",
        chunkIndex: 1,
        section: "Notice: End-Semester Exam Fee Deadlines & Penalties",
        content:
          "The last date for payment of examination fee for Regular and Arrear examinations of November/December 2026 is 30 September 2026 without fine. With a late penalty of ₹500, payments will be accepted until 05 October 2026. Hall tickets will be released on the portal only for candidates with cleared dues.",
        tokens: 260,
        confidence: 0.997,
        pageNumber: 1,
      },
    ],
  },
];

/* Preset RAG queries for immediate interactive testing */
const PRESET_QUERIES: RagPresetQuery[] = [
  {
    id: "pq-1",
    question: "What is the minimum attendance required to appear for end-semester exams?",
    targetDoc: "Regulations 2021 — B.E./B.Tech",
    citation: "Regulations 2021, Clause 4.2",
    answer:
      "Under Clause 4.2 of Regulations 2021, students must secure a minimum of 75% attendance in each registered course to be eligible for end-semester examinations. Condonation up to 10% (between 65% and 74%) may be granted on medical grounds or official institutional representation with Principal approval.",
    sourceChunks: [
      {
        docTitle: "Regulations 2021 — B.E./B.Tech",
        section: "Clause 4.2 Attendance Requirements & Condonation",
        similarity: 0.985,
        snippet:
          "A candidate shall only be permitted to appear for end-semester examinations if he/she secures not less than 75% attendance in each registered course. Condonation up to 10% may be granted on medical grounds...",
      },
      {
        docTitle: "Academic Calendar 2026–27 (Odd sem)",
        section: "Section 1: Academic Milestones & Assessment Window",
        similarity: 0.742,
        snippet: "Last instructional working day: 14 November 2026. Attendance calculation window closes...",
      },
    ],
  },
  {
    id: "pq-2",
    question: "What are the rules for landing a Dream Offer in campus placements?",
    targetDoc: "Placement Policy 2026",
    citation: "Placement Policy 2026, Clause 1.4",
    answer:
      "According to Clause 1.4 of the Placement Policy 2026, students maintaining a minimum CGPA of 6.50 with no active arrears can participate in placement drives. If a student receives an initial offer under ₹6.0 LPA, they remain eligible to participate in 'Dream Offer' recruitment drives offering ₹10.0 LPA or above.",
    sourceChunks: [
      {
        docTitle: "Placement Policy 2026",
        section: "Clause 1.4: Eligibility & Dream Offer Upgrades",
        similarity: 0.995,
        snippet:
          "A student with an existing placement offer of less than ₹6.0 LPA is eligible to attempt subsequent 'Dream Offer' recruitment drives offering packages of ₹10.0 LPA or higher...",
      },
      {
        docTitle: "Regulations 2021 — B.E./B.Tech",
        section: "Clause 9.4 Fast-Track & Honours Degree Track",
        similarity: 0.684,
        snippet: "Students with CGPA >= 8.50 are eligible for 8th semester full-time industry internship...",
      },
    ],
  },
  {
    id: "pq-3",
    question: "How are internal assessment test marks calculated and normalized?",
    targetDoc: "Internal Assessment Rules",
    citation: "Internal Assessment Rules, Rule 2.1",
    answer:
      "As per Rule 2.1 of the Internal Assessment Rules, three 90-minute Continuous Assessment Tests (CAT) are held each semester. The average of the best two test scores is scaled to 20 marks. The remaining 20 marks of CIA are computed from assignments, case studies, and mini-quizzes.",
    sourceChunks: [
      {
        docTitle: "Internal Assessment Rules",
        section: "Rule 2.1: Continuous Assessment Test Conduct & Normalization",
        similarity: 0.992,
        snippet:
          "Three continuous assessment tests of 90 minutes duration each shall be scheduled per semester. The average of the best two test performances shall be converted to 20 marks...",
      },
      {
        docTitle: "Regulations 2021 — B.E./B.Tech",
        section: "Clause 6.1 Evaluation Weightage & Letter Grading",
        similarity: 0.812,
        snippet: "Continuous Internal Assessment (CIA) carries 40% weightage, and End Semester Examination (ESE) carries 60% weightage...",
      },
    ],
  },
  {
    id: "pq-4",
    question: "When is the deadline to pay the Odd Semester 2026 exam fees without fine?",
    targetDoc: "Circular 42/2026 — Exam fee",
    citation: "Circular 42/2026, Section 1",
    answer:
      "Per Circular 42/2026 from the Examination Cell, the last date for paying exam fees for November/December 2026 examinations without fine is 30 September 2026. After that date, payments with a late penalty of ₹500 will be accepted up to 05 October 2026.",
    sourceChunks: [
      {
        docTitle: "Circular 42/2026 — Exam fee",
        section: "Notice: End-Semester Exam Fee Deadlines & Penalties",
        similarity: 0.997,
        snippet:
          "The last date for payment of examination fee for Regular and Arrear examinations of November/December 2026 is 30 September 2026 without fine. With late fine of ₹500...",
      },
    ],
  },
];

/* ── Component ──────────────────────────────────────── */

export function KnowledgeBaseModule({ role }: { role: Role }) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"repository" | "rag-playground" | "vector-index">("repository");

  // State for documents
  const [docs, setDocs] = useState<KnowledgeDoc[]>(INITIAL_DOCS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedOwner, setSelectedOwner] = useState<string>("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [inspectingDoc, setInspectingDoc] = useState<KnowledgeDoc | null>(null);
  const [inspectModalTab, setInspectModalTab] = useState<"chunks" | "overview" | "settings">("chunks");
  const [chunkFilter, setChunkFilter] = useState("");
  const [isReindexing, setIsReindexing] = useState<string | null>(null);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  // Upload Form State
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadType, setUploadType] = useState<DocType>("Policy");
  const [uploadOwner, setUploadOwner] = useState("Registrar");
  const [uploadScope, setUploadScope] = useState("Institution-wide");
  const [uploadChunkSize, setUploadChunkSize] = useState("512 tokens");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);

  // RAG Playground State
  const [ragQuery, setRagQuery] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [activeRagResult, setActiveRagResult] = useState<RagPresetQuery | null>(PRESET_QUERIES[0]!);
  const [customAnswer, setCustomAnswer] = useState<{
    query: string;
    answer: string;
    citation: string;
    sources: { docTitle: string; section: string; similarity: number; snippet: string }[];
  } | null>(null);

  // Auto-dismiss toast
  const triggerToast = (msg: string) => {
    setActionSuccessToast(msg);
    setTimeout(() => {
      setActionSuccessToast((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  /* ── Filtered Documents ── */
  const filteredDocs = useMemo(() => {
    return docs.filter((item) => {
      const matchesSearch =
        searchQuery === "" ||
        item.doc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sampleChunks.some((c) => c.content.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedType === "all" || item.type === selectedType;
      const matchesStatus = selectedStatus === "all" || item.status === selectedStatus;
      const matchesOwner = selectedOwner === "all" || item.owner === selectedOwner;

      return matchesSearch && matchesType && matchesStatus && matchesOwner;
    });
  }, [docs, searchQuery, selectedType, selectedStatus, selectedOwner]);

  // Total pages
  const totalPages = Math.ceil(filteredDocs.length / pageSize) || 1;
  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDocs.slice(start, start + pageSize);
  }, [filteredDocs, currentPage, pageSize]);

  // Aggregate stats
  const totalChunks = useMemo(() => docs.reduce((acc, d) => acc + d.chunks, 0), [docs]);
  const approvedDocs = useMemo(() => docs.filter((d) => d.status === "Approved").length, [docs]);
  const pendingDocs = useMemo(() => docs.filter((d) => d.status === "Pending approval").length, [docs]);

  // Unique types and owners for filters
  const allTypes = useMemo(() => {
    const set = new Set(docs.map((d) => d.type));
    return Array.from(set);
  }, [docs]);

  const allOwners = useMemo(() => {
    const set = new Set(docs.map((d) => d.owner));
    return Array.from(set);
  }, [docs]);

  /* ── Handlers ── */
  const handleApprove = (docId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setDocs((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, status: "Approved" } : d))
    );
    if (inspectingDoc && inspectingDoc.id === docId) {
      setInspectingDoc((prev) => (prev ? { ...prev, status: "Approved" } : null));
    }
    triggerToast("Document approved and activated into live AI RAG grounding!");
  };

  const handleDelete = (docId: string, docName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm(`Remove "${docName}" from the RAG Knowledge Base? Vector embeddings will be pruned.`)) {
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      if (inspectingDoc?.id === docId) {
        setInspectingDoc(null);
      }
      triggerToast(`Removed "${docName}" and deleted indexed vector chunks.`);
    }
  };

  const handleReindex = (docId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsReindexing(docId);
    setTimeout(() => {
      setIsReindexing(null);
      setDocs((prev) =>
        prev.map((d) =>
          d.id === docId
            ? {
                ...d,
                updated: "Just now",
                chunks: d.chunks + Math.floor(Math.random() * 5 + 1),
              }
            : d
        )
      );
      triggerToast("Vector re-indexing completed successfully via text-embedding-3-large.");
    }, 1200);
  };

  const handleDownloadManifest = () => {
    const rows = [
      ["Document Name", "Category", "Issuing Authority", "Scope", "Last Updated", "Vector Chunks", "File Size", "Grounding Status", "Embedding Model"],
      ...docs.map((d) => [
        d.doc,
        d.type,
        d.owner,
        d.scope,
        d.updated,
        d.chunks,
        d.size,
        d.status,
        d.vectorModel,
      ]),
    ];
    const csvContent = toCsv(rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `colossus-knowledge-base-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast("Exported Knowledge Base manifest to CSV.");
  };

  const handleSimulateUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    setIsUploading(true);
    setUploadStep(1); // parsing

    setTimeout(() => {
      setUploadStep(2); // chunking
      setTimeout(() => {
        setUploadStep(3); // embedding
        setTimeout(() => {
          setUploadStep(4); // indexing

          setTimeout(() => {
            const calculatedChunks = Math.floor(Math.random() * 80 + 35);
            const newDocItem: KnowledgeDoc = {
              id: `kb-${Date.now().toString(36)}`,
              doc: uploadTitle.trim(),
              type: uploadType,
              owner: uploadOwner,
              updated: "Just now",
              chunks: calculatedChunks,
              status: "Approved",
              size: `${(Math.random() * 3 + 1.1).toFixed(1)} MB`,
              scope: uploadScope,
              description:
                uploadDescription.trim() ||
                `Institutional ${uploadType.toLowerCase()} indexed for semantic RAG grounding across academic services.`,
              vectorModel: "text-embedding-3-large (1536 dim)",
              groundedAgents: ["Policy Assistant", "Faculty AI Copilot", "Campus Assistant"],
              sampleChunks: [
                {
                  id: `nc-${Date.now()}-1`,
                  chunkIndex: 1,
                  section: `Section 1: General Provisions (${uploadTitle.trim()})`,
                  content: `This document establishes formal institutional guidelines and regulatory compliance for ${uploadScope.toLowerCase()}. Approved by the Academic Council for continuous academic adherence.`,
                  tokens: 340,
                  confidence: 0.992,
                  pageNumber: 1,
                },
                {
                  id: `nc-${Date.now()}-2`,
                  chunkIndex: 2,
                  section: "Section 2: Operating Procedures & Stakeholder Compliance",
                  content:
                    "All departments and associated collegiate units must ensure alignment with the verified criteria outlined herein. Continuous monitoring and periodic review are maintained through the IQAC committee.",
                  tokens: 295,
                  confidence: 0.985,
                  pageNumber: 3,
                },
              ],
            };

            setDocs((prev) => [newDocItem, ...prev]);
            setIsUploading(false);
            setUploadStep(0);
            setIsUploadOpen(false);
            // Reset form
            setUploadTitle("");
            setUploadDescription("");
            setUploadFileName("");
            triggerToast(`Successfully indexed "${newDocItem.doc}" into ${newDocItem.chunks} vector chunks!`);
          }, 600);
        }, 600);
      }, 600);
    }, 600);
  };

  const handleAskRag = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!ragQuery.trim()) return;

    setIsAsking(true);
    setActiveRagResult(null);

    // Simulate RAG vector retrieval & response synthesis
    setTimeout(() => {
      const q = ragQuery.toLowerCase();
      // Match against existing docs
      const matched = docs.find(
        (d) =>
          d.doc.toLowerCase().includes(q) ||
          d.sampleChunks.some((c) => c.content.toLowerCase().includes(q) || c.section.toLowerCase().includes(q))
      ) || docs[0]!;

      const primaryChunk = matched.sampleChunks[0] || {
        section: "Institutional Policy Grounding",
        content: "Institutional regulations require documented compliance across all academic evaluations.",
      };

      setCustomAnswer({
        query: ragQuery,
        answer: `According to ${matched.doc} (${primaryChunk.section}), the institutional framework specifies that: "${primaryChunk.content.slice(0, 220)}...". All related academic operations must adhere strictly to these criteria.`,
        citation: `${matched.doc}, ${primaryChunk.section}`,
        sources: [
          {
            docTitle: matched.doc,
            section: primaryChunk.section,
            similarity: 0.964,
            snippet: primaryChunk.content,
          },
          {
            docTitle: "Regulations 2021 — B.E./B.Tech",
            section: "Clause 6.1 Evaluation Weightage",
            similarity: 0.781,
            snippet: "Continuous Internal Assessment (CIA) carries 40% weightage, and End Semester Examination (ESE) carries 60%...",
          },
        ],
      });
      setIsAsking(false);
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Alert / Success Toast ── */}
      {actionSuccessToast && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-xl border border-teal/30 bg-teal-soft/80 px-4 py-3 text-sm text-teal shadow-sm transition-all"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-teal" />
            <span className="font-medium">{actionSuccessToast}</span>
          </div>
          <button
            onClick={() => setActionSuccessToast(null)}
            className="rounded p-1 text-teal hover:bg-teal/20"
            aria-label="Dismiss toast"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ── RAG System Overview KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 bg-surface border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-3">Total Documents</span>
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <FileText className="size-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{docs.length}</span>
            <span className="text-xs text-ink-3">Across {allTypes.length} categories</span>
          </div>
          <div className="mt-1 text-xs text-teal font-medium flex items-center gap-1">
            <CheckCircle2 className="size-3" /> {approvedDocs} Active & Grounded
          </div>
        </Card>

        <Card className="p-4 bg-surface border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-3">Vector Chunks</span>
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-sky-soft text-sky">
              <Layers className="size-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">{totalChunks.toLocaleString()}</span>
            <span className="text-xs text-ink-3">1536-dim embeddings</span>
          </div>
          <div className="mt-1 text-xs text-ink-3">Model: text-embedding-3-large</div>
        </Card>

        <Card className="p-4 bg-surface border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-3">RAG Grounding Health</span>
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-teal-soft text-teal">
              <ShieldCheck className="size-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal">100%</span>
            <span className="text-xs text-ink-3">Synchronized</span>
          </div>
          <div className="mt-1 text-xs text-ink-3">
            {pendingDocs > 0 ? `${pendingDocs} document pending approval` : "All documents verified"}
          </div>
        </Card>

        <Card className="p-4 bg-surface border-line">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-ink-3">Connected AI Agents</span>
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-gold-soft text-amber">
              <Bot className="size-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-ink">4 Agents</span>
            <span className="text-xs text-ink-3">Subscribed</span>
          </div>
          <div className="mt-1 text-xs text-ink-3">Policy, Copilot, Exam & Campus</div>
        </Card>
      </div>

      {/* ── Main Navigation Sub-Tabs ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("repository")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
              activeTab === "repository"
                ? "bg-brand text-white shadow-sm"
                : "bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
            )}
          >
            <Database className="size-4" />
            Knowledge Repository
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                activeTab === "repository" ? "bg-white/20 text-white" : "bg-surface-2 text-ink-3"
              )}
            >
              {docs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("rag-playground")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
              activeTab === "rag-playground"
                ? "bg-brand text-white shadow-sm"
                : "bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
            )}
          >
            <Sparkles className="size-4 text-amber-400" />
            RAG Grounding Playground
          </button>

          <button
            onClick={() => setActiveTab("vector-index")}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all",
              activeTab === "vector-index"
                ? "bg-brand text-white shadow-sm"
                : "bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
            )}
          >
            <SlidersHorizontal className="size-4" />
            Vector Store & Indexing
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="neutral" className="capitalize text-xs hidden sm:inline-flex">
            {role} Access
          </Badge>
          <Button variant="secondary" size="sm" onClick={handleDownloadManifest} title="Export CSV manifest">
            <Download className="size-4" />
            Export Manifest
          </Button>

          <Button
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            className="shadow-sm"
          >
            <Plus className="size-4" />
            Upload document
          </Button>
        </div>
      </div>

      {/* ── TAB 1: KNOWLEDGE REPOSITORY ── */}
      {activeTab === "repository" && (
        <Card className="overflow-hidden border-line">
          {/* Controls: Search, Type filter, Status filter, Owner filter */}
          <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between bg-surface">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search regulations, circulars, handbooks, chunks..."
                className={cn(inputClass, "pl-9 text-sm")}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type filter */}
              <div className="flex items-center gap-1 text-xs text-ink-3">
                <Filter className="size-3.5" />
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={cn(inputClass, "h-9 w-auto text-xs py-1")}
                >
                  <option value="all">All Types</option>
                  {allTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status filter */}
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className={cn(inputClass, "h-9 w-auto text-xs py-1")}
              >
                <option value="all">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending approval">Pending approval</option>
                <option value="Indexing">Indexing</option>
              </select>

              {/* Owner filter */}
              <select
                value={selectedOwner}
                onChange={(e) => {
                  setSelectedOwner(e.target.value);
                  setCurrentPage(1);
                }}
                className={cn(inputClass, "h-9 w-auto text-xs py-1")}
              >
                <option value="all">All Owners</option>
                {allOwners.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-surface-2/40 px-4 py-2">
            <span className="text-xs font-medium text-ink-3 mr-1">Filter Type:</span>
            <button
              onClick={() => {
                setSelectedType("all");
                setCurrentPage(1);
              }}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                selectedType === "all"
                  ? "bg-brand text-white shadow-xs"
                  : "bg-surface text-ink-2 hover:bg-surface-2"
              )}
            >
              All ({docs.length})
            </button>
            {allTypes.map((t) => {
              const count = docs.filter((d) => d.type === t).length;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setSelectedType(t);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    selectedType === t
                      ? "bg-brand text-white shadow-xs"
                      : "bg-surface text-ink-2 hover:bg-surface-2"
                  )}
                >
                  {t} ({count})
                </button>
              );
            })}
          </div>

          {/* Table */}
          {paginatedDocs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="No institutional documents match your criteria"
                body="Try adjusting your search terms or filters to locate documents in the knowledge base."
                action={
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedType("all");
                      setSelectedStatus("all");
                      setSelectedOwner("all");
                    }}
                  >
                    Reset Filters
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-3 bg-surface-2/30">
                    <th scope="col" className="px-4 py-3 font-semibold">DOCUMENT</th>
                    <th scope="col" className="px-4 py-3 font-semibold">TYPE</th>
                    <th scope="col" className="px-4 py-3 font-semibold">OWNER</th>
                    <th scope="col" className="px-4 py-3 font-semibold">UPDATED</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">INDEXED CHUNKS</th>
                    <th scope="col" className="px-4 py-3 font-semibold">STATUS</th>
                    <th scope="col" className="px-4 py-3 font-semibold text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginatedDocs.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setInspectingDoc(item)}
                      className="cursor-pointer transition-colors hover:bg-surface-2/60 group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2 group-hover:bg-brand-soft group-hover:text-brand transition-colors">
                            <FileText className="size-4" />
                          </span>
                          <div>
                            <div className="font-medium text-ink group-hover:text-brand transition-colors">
                              {item.doc}
                            </div>
                            <div className="text-xs text-ink-3 line-clamp-1">{item.description}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge tone="neutral" className="text-xs">
                          {item.type}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-2 font-medium">
                        {item.owner}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-3">
                        {item.updated}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right font-mono text-xs font-semibold text-ink">
                        {item.chunks}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge tone={toneForStatus(item.status)} className="capitalize">
                          {item.status}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {item.status === "Pending approval" && (
                            <button
                              onClick={(e) => handleApprove(item.id, e)}
                              title="Approve for live RAG grounding"
                              className="inline-flex items-center gap-1 rounded-lg bg-teal-soft px-2 py-1 text-xs font-medium text-teal hover:bg-teal/20"
                            >
                              <Check className="size-3" /> Approve
                            </button>
                          )}

                          <button
                            onClick={() => setInspectingDoc(item)}
                            title="Inspect vector chunks"
                            className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
                          >
                            <Eye className="size-4" />
                          </button>

                          <button
                            onClick={(e) => handleReindex(item.id, e)}
                            title="Re-embed and sync chunks"
                            disabled={isReindexing === item.id}
                            className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-50"
                          >
                            <RefreshCw className={cn("size-4", isReindexing === item.id && "animate-spin text-brand")} />
                          </button>

                          <button
                            onClick={(e) => handleDelete(item.id, item.doc, e)}
                            title="Delete document"
                            className="rounded-lg p-1.5 text-ink-3 hover:bg-rose-soft hover:text-rose"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Full Dynamic Pagination Footer ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-line px-4 py-3 bg-surface text-xs text-ink-3">
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={cn(inputClass, "h-8 w-auto px-2 py-0 text-xs")}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <span className="hidden sm:inline">|</span>
              <span>
                Showing{" "}
                <span className="font-semibold text-ink">
                  {filteredDocs.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-ink">
                  {Math.min(currentPage * pageSize, filteredDocs.length)}
                </span>{" "}
                of <span className="font-semibold text-ink">{filteredDocs.length}</span> documents
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="h-8 px-2.5 text-xs"
              >
                <ChevronLeft className="size-3.5" />
                Prev
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    onClick={() => setCurrentPage(pageNumber)}
                    className={cn(
                      "size-8 rounded-lg font-medium transition-colors text-xs",
                      pageNumber === currentPage
                        ? "bg-brand text-white font-semibold shadow-xs"
                        : "text-ink-2 hover:bg-surface-2"
                    )}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 px-2.5 text-xs"
              >
                Next
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── TAB 2: RAG GROUNDING PLAYGROUND ── */}
      {activeTab === "rag-playground" && (
        <div className="space-y-6">
          <Card className="p-6 border-line bg-surface">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand">
                <Sparkles className="size-4" />
                Interactive Semantic Retrieval Sandbox
              </div>
              <h3 className="mt-1 text-lg font-bold text-ink">Test Grounded Answers from Approved Documents</h3>
              <p className="mt-1 text-sm text-ink-3">
                Ask any query about collegiate regulations, grading policies, placement thresholds, or circulars. The
                engine simulates vector search across indexed chunks and provides grounded citations.
              </p>
            </div>

            {/* Quick preset chips */}
            <div className="mt-4">
              <div className="text-xs font-medium text-ink-3 mb-2">Try quick institutional queries:</div>
              <div className="flex flex-wrap gap-2">
                {PRESET_QUERIES.map((pq) => (
                  <button
                    key={pq.id}
                    onClick={() => {
                      setRagQuery(pq.question);
                      setActiveRagResult(pq);
                      setCustomAnswer(null);
                    }}
                    className={cn(
                      "rounded-xl border px-3 py-1.5 text-left text-xs transition-all",
                      activeRagResult?.id === pq.id && !customAnswer
                        ? "border-brand bg-brand-soft font-semibold text-brand shadow-xs"
                        : "border-line bg-surface-2/60 text-ink-2 hover:border-brand/40 hover:bg-surface-2"
                    )}
                  >
                    {pq.question}
                  </button>
                ))}
              </div>
            </div>

            {/* Query bar */}
            <form onSubmit={handleAskRag} className="mt-5 flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
                <input
                  type="text"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder="Ask a custom question (e.g., 'What is the attendance condonation percentage?')..."
                  className={cn(inputClass, "pl-9 text-sm")}
                />
              </div>
              <Button type="submit" disabled={isAsking || !ragQuery.trim()} className="gap-2">
                {isAsking ? <Spinner className="size-4" /> : <Send className="size-4" />}
                Ask Institutional AI
              </Button>
            </form>
          </Card>

          {/* RAG Query Result View */}
          {(customAnswer || activeRagResult) && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Main Grounded Answer Card */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="p-6 border-line bg-surface">
                  <div className="flex items-center justify-between border-b border-line pb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-teal-soft text-teal">
                        <CheckCircle2 className="size-4" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-teal">
                        Grounded AI Answer
                      </span>
                    </div>
                    <Badge tone="teal" className="gap-1">
                      <ShieldCheck className="size-3" /> Verified Against Official Documents
                    </Badge>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-base font-semibold text-ink">
                      {customAnswer ? customAnswer.query : activeRagResult?.question}
                    </h4>

                    <div className="mt-3 rounded-xl bg-surface-2/50 p-4 text-sm leading-relaxed text-ink border border-line/60">
                      {customAnswer ? customAnswer.answer : activeRagResult?.answer}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-3">
                      <div className="flex items-center gap-1 font-medium text-brand">
                        <FileCheck className="size-3.5" />
                        <span>Source Citation:</span>
                        <span className="underline decoration-dotted">
                          {customAnswer ? customAnswer.citation : activeRagResult?.citation}
                        </span>
                      </div>
                      <span>•</span>
                      <span>Latency: 138ms</span>
                      <span>•</span>
                      <span>Vector Match: High Confidence</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Retrieved Chunks Column */}
              <div className="space-y-4">
                <Card className="p-5 border-line bg-surface">
                  <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
                      <Layers className="size-3.5 text-brand" /> Retrieved Chunks ({customAnswer ? customAnswer.sources.length : activeRagResult?.sourceChunks.length})
                    </h4>
                    <span className="text-[11px] text-ink-3 font-mono">Top-k = 2</span>
                  </div>

                  <div className="space-y-3">
                    {(customAnswer ? customAnswer.sources : activeRagResult?.sourceChunks ?? []).map((sc, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-line bg-surface-2/40 p-3 text-xs space-y-2 hover:border-brand/40 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink line-clamp-1">{sc.docTitle}</span>
                          <span className="rounded-full bg-teal-soft px-1.5 py-0.5 font-mono text-[10px] font-bold text-teal">
                            {(sc.similarity * 100).toFixed(1)}% match
                          </span>
                        </div>
                        <div className="text-[11px] font-medium text-brand">{sc.section}</div>
                        <p className="text-ink-2 italic line-clamp-3 bg-surface p-2 rounded border border-line/40">
                          &quot;{sc.snippet}&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: VECTOR STORE & INDEXING SETTINGS ── */}
      {activeTab === "vector-index" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="p-6 border-line bg-surface space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <Cpu className="size-4" />
                </span>
                <div>
                  <h3 className="font-semibold text-ink">Vector Store Architecture</h3>
                  <p className="text-xs text-ink-3">Instance & embedding engine specifications</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b border-line py-2">
                  <span className="text-ink-3">Vector Engine</span>
                  <span className="font-medium text-ink">Qdrant HNSW Collection</span>
                </div>
                <div className="flex justify-between border-b border-line py-2">
                  <span className="text-ink-3">Collection Name</span>
                  <span className="font-mono text-xs font-medium text-brand">colossus-institutional-rag-v1</span>
                </div>
                <div className="flex justify-between border-b border-line py-2">
                  <span className="text-ink-3">Embedding Model</span>
                  <span className="font-medium text-ink">text-embedding-3-large</span>
                </div>
                <div className="flex justify-between border-b border-line py-2">
                  <span className="text-ink-3">Embedding Dimensions</span>
                  <span className="font-mono text-xs text-ink">1,536</span>
                </div>
                <div className="flex justify-between border-b border-line py-2">
                  <span className="text-ink-3">Distance Metric</span>
                  <span className="font-medium text-ink">Cosine Similarity</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-ink-3">Total Active Vectors</span>
                  <span className="font-bold text-teal">{totalChunks.toLocaleString()} chunks</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-line bg-surface space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-sky-soft text-sky">
                  <SlidersHorizontal className="size-4" />
                </span>
                <div>
                  <h3 className="font-semibold text-ink">Retrieval & Reranker Hyperparameters</h3>
                  <p className="text-xs text-ink-3">Configure how agents retrieve chunks</p>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-ink">Top-K Retrieved Chunks</span>
                    <span className="font-bold text-brand">4 chunks</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    defaultValue="4"
                    className="mt-2 w-full accent-brand cursor-pointer"
                  />
                  <span className="text-[11px] text-ink-3">Number of relevant passages injected into system prompt.</span>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-ink">Similarity Cutoff Threshold</span>
                    <span className="font-bold text-brand">0.72</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    defaultValue="72"
                    className="mt-2 w-full accent-brand cursor-pointer"
                  />
                  <span className="text-[11px] text-ink-3">Discards chunks with cosine similarity below this score.</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-line p-3 bg-surface-2/40">
                  <div>
                    <div className="text-xs font-semibold text-ink">Hybrid BM25 + Vector Search</div>
                    <div className="text-[11px] text-ink-3">Combine exact lexical keywords with dense semantic vectors</div>
                  </div>
                  <span className="rounded-full bg-teal-soft px-2 py-0.5 text-xs font-bold text-teal">Enabled</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-line p-3 bg-surface-2/40">
                  <div>
                    <div className="text-xs font-semibold text-ink">Automatic Sync on Document Edit</div>
                    <div className="text-[11px] text-ink-3">Re-calculates embeddings upon approved revisions</div>
                  </div>
                  <span className="rounded-full bg-teal-soft px-2 py-0.5 text-xs font-bold text-teal">Enabled</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── MODAL: UPLOAD DOCUMENT ── */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <FileUp className="size-4" />
                </span>
                <div>
                  <h3 className="font-bold text-ink">Upload Document to Knowledge Base</h3>
                  <p className="text-xs text-ink-3">Document will be chunked, embedded, and added to the RAG vector index.</p>
                </div>
              </div>
              <button
                onClick={() => !isUploading && setIsUploadOpen(false)}
                disabled={isUploading}
                className="rounded-lg p-1 text-ink-3 hover:bg-surface-2 hover:text-ink disabled:opacity-40"
              >
                <X className="size-5" />
              </button>
            </div>

            {isUploading ? (
              <div className="py-8 space-y-6 text-center">
                <Spinner className="mx-auto size-10 text-brand" />
                <div className="space-y-1">
                  <div className="font-bold text-ink text-base">Processing Document for RAG Vector Index</div>
                  <p className="text-xs text-ink-3">Please wait while the document pipeline executes.</p>
                </div>

                <div className="max-w-md mx-auto space-y-2 text-left text-xs">
                  <div className={cn("flex items-center gap-2 p-2 rounded-lg", uploadStep >= 1 ? "bg-teal-soft text-teal font-medium" : "text-ink-3")}>
                    <CheckCircle2 className="size-4" /> 1. Validating document & OCR text extraction
                  </div>
                  <div className={cn("flex items-center gap-2 p-2 rounded-lg", uploadStep >= 2 ? "bg-teal-soft text-teal font-medium" : "text-ink-3")}>
                    <CheckCircle2 className="size-4" /> 2. Splitting into contextual chunks ({uploadChunkSize})
                  </div>
                  <div className={cn("flex items-center gap-2 p-2 rounded-lg", uploadStep >= 3 ? "bg-teal-soft text-teal font-medium" : "text-ink-3")}>
                    <CheckCircle2 className="size-4" /> 3. Generating dense vectors via text-embedding-3-large
                  </div>
                  <div className={cn("flex items-center gap-2 p-2 rounded-lg", uploadStep >= 4 ? "bg-teal-soft text-teal font-medium" : "text-ink-3")}>
                    <CheckCircle2 className="size-4" /> 4. Indexing into Qdrant collection & updating routing
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSimulateUpload} className="space-y-4">
                {/* Drag and Drop Box */}
                <div className="rounded-xl border-2 border-dashed border-line bg-surface-2/30 p-6 text-center hover:border-brand/50 transition-colors">
                  <UploadCloud className="mx-auto size-8 text-brand/80" />
                  <div className="mt-2 text-sm font-medium text-ink">
                    {uploadFileName ? (
                      <span className="text-brand font-semibold">{uploadFileName}</span>
                    ) : (
                      "Drag & drop PDF, DOCX or Markdown here"
                    )}
                  </div>
                  <p className="text-xs text-ink-3 mt-1">Maximum file size: 25 MB</p>
                  <label className="mt-3 inline-block">
                    <span className="cursor-pointer rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-ink border border-line hover:bg-surface-2">
                      Browse File
                    </span>
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.docx,.txt,.md"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadFileName(file.name);
                          if (!uploadTitle) {
                            setUploadTitle(file.name.replace(/\.[^/.]+$/, ""));
                          }
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Document Title *" htmlFor="upload-title">
                      <input
                        id="upload-title"
                        type="text"
                        required
                        value={uploadTitle}
                        onChange={(e) => setUploadTitle(e.target.value)}
                        placeholder="e.g. AICTE Mandatory Disclosure 2026-27"
                        className={inputClass}
                      />
                    </Field>
                  </div>

                  <div>
                    <Field label="Document Category" htmlFor="upload-category">
                      <select
                        id="upload-category"
                        value={uploadType}
                        onChange={(e) => setUploadType(e.target.value as DocType)}
                        className={inputClass}
                      >
                        <option value="Regulation">Regulation</option>
                        <option value="Calendar">Calendar</option>
                        <option value="Handbook">Handbook</option>
                        <option value="Policy">Policy</option>
                        <option value="Guideline">Guideline</option>
                        <option value="Lab manual">Lab manual</option>
                        <option value="Circular">Circular</option>
                        <option value="Syllabus">Syllabus</option>
                        <option value="Accreditation Evidence">Accreditation Evidence</option>
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Field label="Issuing Authority / Owner" htmlFor="upload-owner">
                      <select
                        id="upload-owner"
                        value={uploadOwner}
                        onChange={(e) => setUploadOwner(e.target.value)}
                        className={inputClass}
                      >
                        <option value="Registrar">Registrar</option>
                        <option value="Exam Cell">Exam Cell</option>
                        <option value="CSE Dept">CSE Dept</option>
                        <option value="Placement Cell">Placement Cell</option>
                        <option value="Dean Academics">Dean Academics</option>
                        <option value="Principal Office">Principal Office</option>
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Field label="Target Scope" htmlFor="upload-scope">
                      <select
                        id="upload-scope"
                        value={uploadScope}
                        onChange={(e) => setUploadScope(e.target.value)}
                        className={inputClass}
                      >
                        <option value="Institution-wide">Institution-wide</option>
                        <option value="Computer Science">Computer Science</option>
                        <option value="Examination Cell">Examination Cell</option>
                        <option value="Placement Cell">Placement Cell</option>
                        <option value="Admissions">Admissions</option>
                      </select>
                    </Field>
                  </div>

                  <div>
                    <Field label="Vector Chunk Size" htmlFor="upload-chunk-size">
                      <select
                        id="upload-chunk-size"
                        value={uploadChunkSize}
                        onChange={(e) => setUploadChunkSize(e.target.value)}
                        className={inputClass}
                      >
                        <option value="256 tokens">256 tokens (Dense precision)</option>
                        <option value="512 tokens">512 tokens (Recommended)</option>
                        <option value="1024 tokens">1024 tokens (Broader context)</option>
                      </select>
                    </Field>
                  </div>

                  <div className="sm:col-span-2">
                    <Field label="Summary / Description" htmlFor="upload-desc">
                      <textarea
                        id="upload-desc"
                        rows={2}
                        value={uploadDescription}
                        onChange={(e) => setUploadDescription(e.target.value)}
                        placeholder="Brief summary of document contents for AI retrieval context..."
                        className={cn(inputClass, "resize-none")}
                      />
                    </Field>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-line">
                  <Button variant="secondary" type="button" onClick={() => setIsUploadOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!uploadTitle.trim()}>
                    Index & Ground Document
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: INSPECT DOCUMENT & CHUNKS ── */}
      {inspectingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div className="flex items-start gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft text-brand shrink-0">
                  <FileText className="size-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-ink text-base">{inspectingDoc.doc}</h3>
                    <Badge tone={toneForStatus(inspectingDoc.status)} className="capitalize text-xs">
                      {inspectingDoc.status}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-3">
                    <span>Category: <strong className="text-ink">{inspectingDoc.type}</strong></span>
                    <span>•</span>
                    <span>Owner: <strong className="text-ink">{inspectingDoc.owner}</strong></span>
                    <span>•</span>
                    <span>Total Chunks: <strong className="text-teal font-mono">{inspectingDoc.chunks}</strong></span>
                    <span>•</span>
                    <span>Size: {inspectingDoc.size}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectingDoc(null)}
                className="rounded-lg p-1.5 text-ink-3 hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Inner Tabs */}
            <div className="flex items-center gap-2 border-b border-line pb-2">
              <button
                onClick={() => setInspectModalTab("chunks")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  inspectModalTab === "chunks"
                    ? "bg-brand text-white shadow-xs"
                    : "text-ink-2 hover:bg-surface-2"
                )}
              >
                Indexed Vector Chunks ({inspectingDoc.sampleChunks.length})
              </button>
              <button
                onClick={() => setInspectModalTab("overview")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors",
                  inspectModalTab === "overview"
                    ? "bg-brand text-white shadow-xs"
                    : "text-ink-2 hover:bg-surface-2"
                )}
              >
                Document Metadata & Scope
              </button>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {inspectModalTab === "chunks" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" />
                      <input
                        type="text"
                        value={chunkFilter}
                        onChange={(e) => setChunkFilter(e.target.value)}
                        placeholder="Search inside indexed chunks..."
                        className={cn(inputClass, "h-8 pl-8 text-xs")}
                      />
                    </div>
                    <span className="text-xs text-ink-3 whitespace-nowrap">
                      Vector Model: <span className="font-mono text-ink">text-embedding-3-large</span>
                    </span>
                  </div>

                  {inspectingDoc.sampleChunks
                    .filter(
                      (c) =>
                        chunkFilter === "" ||
                        c.content.toLowerCase().includes(chunkFilter.toLowerCase()) ||
                        c.section.toLowerCase().includes(chunkFilter.toLowerCase())
                    )
                    .map((chunk) => (
                      <div
                        key={chunk.id}
                        className="rounded-xl border border-line bg-surface-2/40 p-4 text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between border-b border-line/60 pb-1.5">
                          <div className="font-semibold text-brand flex items-center gap-1.5">
                            <Layers className="size-3.5" />
                            Chunk #{chunk.chunkIndex} — {chunk.section}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-ink-3 font-mono">
                            <span>Tokens: {chunk.tokens}</span>
                            <span>•</span>
                            <span>Page {chunk.pageNumber}</span>
                            <span>•</span>
                            <span className="text-teal font-semibold">
                              {(chunk.confidence * 100).toFixed(1)}% embedding quality
                            </span>
                          </div>
                        </div>
                        <p className="text-ink leading-relaxed font-sans">{chunk.content}</p>
                      </div>
                    ))}
                </div>
              )}

              {inspectModalTab === "overview" && (
                <div className="space-y-4 text-sm">
                  <div className="rounded-xl border border-line bg-surface-2/30 p-4 space-y-2">
                    <h4 className="font-semibold text-ink text-xs uppercase tracking-wider text-ink-3">Description</h4>
                    <p className="text-ink text-xs leading-relaxed">{inspectingDoc.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-line p-3 bg-surface space-y-1">
                      <span className="text-ink-3">Institutional Scope</span>
                      <div className="font-semibold text-ink">{inspectingDoc.scope}</div>
                    </div>

                    <div className="rounded-xl border border-line p-3 bg-surface space-y-1">
                      <span className="text-ink-3">Embedding Pipeline</span>
                      <div className="font-semibold text-ink">{inspectingDoc.vectorModel}</div>
                    </div>

                    <div className="rounded-xl border border-line p-3 bg-surface space-y-1">
                      <span className="text-ink-3">Issuing Authority</span>
                      <div className="font-semibold text-ink">{inspectingDoc.owner}</div>
                    </div>

                    <div className="rounded-xl border border-line p-3 bg-surface space-y-1">
                      <span className="text-ink-3">Grounding Status</span>
                      <div>
                        <Badge tone={toneForStatus(inspectingDoc.status)}>{inspectingDoc.status}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-ink text-xs uppercase tracking-wider text-ink-3">
                      Grounded AI Agents
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {inspectingDoc.groundedAgents.map((ag) => (
                        <span
                          key={ag}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand"
                        >
                          <Bot className="size-3" /> {ag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between border-t border-line pt-3">
              <div className="flex items-center gap-2">
                {inspectingDoc.status === "Pending approval" ? (
                  <Button
                    size="sm"
                    onClick={() => handleApprove(inspectingDoc.id)}
                    className="gap-1.5"
                  >
                    <Check className="size-3.5" /> Approve for AI Grounding
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={(e) => handleReindex(inspectingDoc.id, e)}
                    disabled={isReindexing === inspectingDoc.id}
                    className="gap-1.5"
                  >
                    <RefreshCw className={cn("size-3.5", isReindexing === inspectingDoc.id && "animate-spin text-brand")} />
                    Re-index Chunks
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Download sample document text
                    const blob = new Blob([
                      `# ${inspectingDoc.doc}\n\nCategory: ${inspectingDoc.type}\nOwner: ${inspectingDoc.owner}\nScope: ${inspectingDoc.scope}\n\n${inspectingDoc.description}\n\n## Chunks\n\n` +
                        inspectingDoc.sampleChunks.map((c) => `### ${c.section}\n${c.content}\n`).join("\n")
                    ], { type: "text/markdown;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${inspectingDoc.doc.replace(/[^a-z0-9]/gi, "_")}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                    triggerToast("Downloaded document export.");
                  }}
                  className="gap-1.5"
                >
                  <Download className="size-3.5" /> Download Export
                </Button>
              </div>

              <Button variant="secondary" size="sm" onClick={() => setInspectingDoc(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
