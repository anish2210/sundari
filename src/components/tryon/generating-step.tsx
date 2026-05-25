"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

const MESSAGES = [
  "Analysing your features…",
  "Placing the jewellery…",
  "Refining the details…",
  "Almost there…",
];

export function GeneratingStep() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setMsgIdx((i) => (i + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-8 py-8">
      {/* Animated ring */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--gold)]" />
        <span className="absolute inset-3 animate-spin rounded-full border border-transparent border-t-[var(--gold)] opacity-50" style={{ animationDirection: "reverse", animationDuration: "1.4s" }} />
        <Sparkles size={28} className="text-[var(--gold)]" />
      </div>

      <div className="text-center">
        <p className="font-cormorant text-2xl text-[var(--parchment)]">{MESSAGES[msgIdx]}</p>
        <p className="mt-2 text-sm text-[var(--parchment-dim)]">This usually takes 30–60 seconds</p>
      </div>

      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-[rgba(138,106,58,0.15)]">
        <div className="h-full animate-[generating-bar_3s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-dim)]" />
      </div>
    </div>
  );
}
