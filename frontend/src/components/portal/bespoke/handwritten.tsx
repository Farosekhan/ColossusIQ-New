"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, FileImage, FileText, Loader2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { EvaluationResult } from "@/lib/api/schemas";
import { acceptAttr, validateUpload } from "@/lib/security/upload";
import { EvaluationCard } from "@/components/portal/evaluation-card";
import { Button, Card, CardBody, CardHeader, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const PIPELINE = [
  "Image quality enhancement",
  "Handwriting detection",
  "OCR / handwriting recognition",
  "Answer segmentation",
  "Question mapping",
  "Semantic evaluation",
  "Rubric evaluation",
  "Score & feedback",
];

// In live mode OCR runs server-side; the mock uses this transcription of the sample sheet.
const SAMPLE_OCR =
  "3NF: a relation is in third normal form if it is in 2NF and has no transitive dependency. Example Student(RollNo, Name, DeptId, DeptName). DeptId -> DeptName so RollNo -> DeptName is transitive. We decompose into Student(RollNo, Name, DeptId) and Department(DeptId, DeptName).";

export function HandwrittenModule() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(-1);

  const evaluate = useMutation({
    mutationFn: () =>
      apiFetch("/api/v1/ai/evaluate", EvaluationResult, {
        method: "POST",
        body: { answer: SAMPLE_OCR, testId: "dbms-normalization", questionId: "q5", max: 10 },
      }),
  });

  // Revoke object URLs so previews don't leak memory or linger after navigation.
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  useEffect(() => {
    if (stage < 0 || stage >= PIPELINE.length) return;
    const t = setTimeout(() => {
      if (stage === PIPELINE.length - 1) evaluate.mutate();
      setStage((s) => s + 1);
    }, 450);
    return () => clearTimeout(t);
  }, [stage, evaluate]);

  const onFile = async (f: File | undefined) => {
    setError(null);
    evaluate.reset();
    setStage(-1);
    if (!f) return;
    const check = await validateUpload(f, "answer-sheet");
    if (!check.ok) {
      setFile(null);
      setPreview(null);
      setError(check.reason);
      return;
    }
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <div className="space-y-6">
        <Card>
          <CardHeader title="Upload answer sheet" subtitle="PDF, PNG or JPG · up to 15 MB" />
          <CardBody className="space-y-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void onFile(e.dataTransfer.files[0]);
              }}
              className="bg-notebook flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line px-4 py-10 text-center hover:border-brand"
            >
              <Upload className="size-6 text-brand" aria-hidden />
              <span className="text-sm font-medium text-ink">Drop a file or click to choose</span>
              <span className="text-xs text-ink-3">Files are type-checked by content before upload</span>
            </button>
            <input ref={inputRef} type="file" accept={acceptAttr("answer-sheet")} className="sr-only" aria-label="Answer sheet file" onChange={(e) => void onFile(e.target.files?.[0])} />
            {error ? (
              <p className="text-sm text-rose" role="alert">
                {error}
              </p>
            ) : null}
            {file ? (
              <div className="flex items-center gap-3 rounded-lg border border-line p-3">
                {file.type === "application/pdf" ? <FileText className="size-5 text-rose" /> : <FileImage className="size-5 text-sky" />}
                <div className="min-w-0 flex-1">
                  {/* File name is rendered as text; never used in URLs or HTML. */}
                  <p className="truncate text-sm font-medium text-ink">{file.name}</p>
                  <p className="text-xs text-ink-3">{(file.size / 1024).toFixed(0)} KB · verified</p>
                </div>
              </div>
            ) : null}
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Answer sheet preview" className="max-h-72 w-full rounded-lg border border-line object-contain" />
            ) : null}
            <div className="flex gap-2">
              <Button className="flex-1" disabled={!file || (stage >= 0 && stage < PIPELINE.length)} onClick={() => setStage(0)}>
                Evaluate
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  setError(null);
                  evaluate.reset();
                  setStage(0);
                }}
              >
                Use sample sheet
              </Button>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Evaluation pipeline" />
          <CardBody>
            <ol className="space-y-2">
              {PIPELINE.map((p, i) => (
                <li key={p} className="flex items-center gap-3 text-sm">
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs",
                      stage > i ? "bg-teal text-white" : stage === i ? "bg-gold-soft text-amber" : "bg-surface-2 text-ink-3",
                    )}
                  >
                    {stage > i ? <Check className="size-3.5" /> : stage === i ? <Loader2 className="size-3.5 animate-spin" /> : i + 1}
                  </span>
                  <span className={stage >= i ? "text-ink" : "text-ink-3"}>{p}</span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      </div>

      <div className="space-y-6">
        {evaluate.data ? (
          <>
            <Card>
              <CardHeader title="Recognised text (Q5)" subtitle="Shown so you can check what the AI read" />
              <CardBody>
                <p className="whitespace-pre-wrap rounded-lg bg-surface-2 p-4 font-mono text-sm leading-relaxed text-ink">{SAMPLE_OCR}</p>
              </CardBody>
            </Card>
            <EvaluationCard result={evaluate.data} />
          </>
        ) : evaluate.isError ? (
          <p className="text-sm text-rose" role="alert">
            {evaluate.error instanceof ApiError ? evaluate.error.message : "Evaluation failed."}
          </p>
        ) : (
          <EmptyState title="No evaluation yet" body="Upload a handwritten answer sheet (or use the sample) to see expected points, missing concepts, estimated marks and improvement suggestions." />
        )}
      </div>
    </div>
  );
}
