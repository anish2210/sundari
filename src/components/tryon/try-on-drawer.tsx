"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { PhotoUploadStep } from "./photo-upload-step";
import { GeneratingStep } from "./generating-step";
import { ResultStep } from "./result-step";
import { useTryOnResult } from "@/hooks/useTryOnResult";

type Step = "upload" | "generating" | "result" | "error";

interface Props {
  skuId: string;
  productName: string;
  open: boolean;
  onClose: () => void;
  onAddToCart: () => void;
}

export function TryOnDrawer({ skuId, productName, open, onClose, onAddToCart }: Props) {
  const [step, setStep]           = useState<Step>("upload");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [jobId, setJobId]         = useState<string | null>(null);
  const [regenCount, setRegenCount] = useState(0);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);
  const drawerRef                 = useRef<HTMLDivElement>(null);

  const REGEN_LIMIT = 3;

  const { status, resultUrl } = useTryOnResult(step === "generating" ? jobId : null);

  // Transition generating → result/error
  useEffect(() => {
    if (status === "complete") setStep("result");
    if (status === "failed")   { setStep("error"); setErrorMsg("Try-on generation failed. Please try again."); }
  }, [status]);

  // Reset when drawer closes
  useEffect(() => {
    if (!open) {
      setStep("upload");
      setSessionId(null);
      setJobId(null);
      setRegenCount(0);
      setErrorMsg(null);
    }
  }, [open]);

  // Trap focus + close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handlePhotoSelected = useCallback(async (file: File) => {
    setStep("generating");
    setErrorMsg(null);

    const fd = new FormData();
    fd.append("photo", file);
    fd.append("skuId", skuId);

    try {
      const res  = await fetch("/api/tryon/session", { method: "POST", body: fd });
      const data = await res.json() as { sessionId?: string; jobId?: string; error?: string };

      if (!res.ok || !data.sessionId || !data.jobId) {
        setStep("error");
        setErrorMsg(
          data.error === "rate_limit_exceeded"
            ? "You've reached the daily try-on limit. Please try again tomorrow."
            : "Something went wrong. Please try again."
        );
        return;
      }

      setSessionId(data.sessionId);
      setJobId(data.jobId);
    } catch {
      setStep("error");
      setErrorMsg("Network error. Please check your connection.");
    }
  }, [skuId]);

  const handleRegenerate = useCallback(async () => {
    if (!sessionId) return;
    setStep("generating");

    try {
      const res  = await fetch("/api/tryon/regenerate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ sessionId }),
      });
      const data = await res.json() as { jobId?: string; regenCount?: number };
      if (data.jobId) {
        setJobId(data.jobId);
        setRegenCount(data.regenCount ?? regenCount + 1);
      }
    } catch {
      setStep("error");
      setErrorMsg("Could not regenerate. Please try again.");
    }
  }, [sessionId, regenCount]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Virtual Try-On"
        className="fixed bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col bg-[var(--bg-dark)] shadow-2xl"
        style={{ borderLeft: "1px solid rgba(138,106,58,0.2)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[rgba(138,106,58,0.15)] px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-[var(--gold)] opacity-80">Virtual Try-On</p>
            <h2 className="font-cormorant mt-0.5 text-lg text-[var(--parchment)]">{productName}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--parchment-dim)] transition-colors hover:text-[var(--parchment)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {step === "upload" && (
            <PhotoUploadStep onPhotoSelected={handlePhotoSelected} />
          )}

          {step === "generating" && <GeneratingStep />}

          {step === "result" && resultUrl && sessionId && jobId && (
            <ResultStep
              resultUrl={resultUrl}
              skuId={skuId}
              sessionId={sessionId}
              jobId={jobId}
              regenCount={regenCount}
              regenLimit={REGEN_LIMIT}
              onAddToCart={onAddToCart}
              onRegenerate={handleRegenerate}
              onClose={onClose}
            />
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              <p className="text-[var(--parchment-dim)]">{errorMsg}</p>
              <button
                onClick={() => { setStep("upload"); setErrorMsg(null); }}
                className="rounded-lg border border-[rgba(138,106,58,0.4)] px-6 py-2.5 text-sm text-[var(--parchment)] hover:border-[var(--gold)]"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
