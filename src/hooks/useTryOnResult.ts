"use client";

import { useEffect, useRef, useState } from "react";

export type TryOnStatus = "idle" | "processing" | "complete" | "failed";

interface TryOnResult {
  status: TryOnStatus;
  resultUrl: string | null;
  elapsedMs: number | null;
  errorCode: string | null;
}

const POLL_INTERVAL = 3000; // ms
const MAX_POLLS     = 40;   // 2 min max

export function useTryOnResult(jobId: string | null): TryOnResult {
  const [state, setState] = useState<TryOnResult>({
    status:    "idle",
    resultUrl: null,
    elapsedMs: null,
    errorCode: null,
  });

  const pollCount = useRef(0);

  useEffect(() => {
    if (!jobId) return;

    setState({ status: "processing", resultUrl: null, elapsedMs: null, errorCode: null });
    pollCount.current = 0;

    const timer = setInterval(async () => {
      pollCount.current++;

      try {
        const res  = await fetch(`/api/tryon/result/${jobId}`);
        const data = await res.json() as {
          status: string;
          resultUrl?: string;
          elapsedMs?: number;
          errorCode?: string;
        };

        if (data.status === "complete") {
          clearInterval(timer);
          setState({
            status:    "complete",
            resultUrl: data.resultUrl ?? null,
            elapsedMs: data.elapsedMs ?? null,
            errorCode: null,
          });
        } else if (data.status === "failed") {
          clearInterval(timer);
          setState({ status: "failed", resultUrl: null, elapsedMs: null, errorCode: data.errorCode ?? "unknown" });
        } else if (pollCount.current >= MAX_POLLS) {
          clearInterval(timer);
          setState({ status: "failed", resultUrl: null, elapsedMs: null, errorCode: "timeout" });
        }
      } catch {
        // transient network error — keep polling
      }
    }, POLL_INTERVAL);

    return () => clearInterval(timer);
  }, [jobId]);

  return state;
}
