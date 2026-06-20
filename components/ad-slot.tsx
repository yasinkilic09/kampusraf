"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import type { AdPlacement } from "@/lib/monetization";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type AdSlotProps = {
  placement: AdPlacement;
  className?: string;
  compact?: boolean;
};

const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "";
const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED !== "false";

const slotMap: Record<AdPlacement, string> = {
  "dashboard-inline":
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD ||
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT ||
    "",
  "feed-inline":
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_FEED ||
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT ||
    "",
  "feed-sidebar":
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR ||
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT ||
    "",
  "search-results":
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_SEARCH ||
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT ||
    "",
  "random-quote":
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_RANDOM_QUOTE ||
    process.env.NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT ||
    "",
};

const placementCopy: Record<
  AdPlacement,
  { title: string; description: string }
> = {
  "dashboard-inline": {
    title: "KampusRaf sponsor alani",
    description:
      "Ucretsiz planda panel deneyimini bolmeden gelir uretecek dengeli reklam alani.",
  },
  "feed-inline": {
    title: "Akis sponsoru",
    description:
      "Paylasimlarin arasina seyrek yerlestirilen, akisi kapatmayan reklam alani.",
  },
  "feed-sidebar": {
    title: "Sosyal sponsor",
    description:
      "Yan panelde sabit duran, icerigin onune gecmeyen reklam alani.",
  },
  "search-results": {
    title: "Kitap kesfi sponsoru",
    description:
      "Arama sonuclarindan once tek satirlik sponsor alaniyla gelir modeli.",
  },
  "random-quote": {
    title: "Gunluk kesif sponsoru",
    description:
      "Rastgele Raf deneyimini kesmeden sayfa altinda gosterilen sponsor alani.",
  },
};

function isAdSenseConfigured(slotId: string) {
  return adsenseClientId.startsWith("ca-pub-") && slotId.length > 0;
}

export function AdSlot({ placement, className = "", compact = false }: AdSlotProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const pushedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const slotId = slotMap[placement];
  const configured = adsEnabled && isAdSenseConfigured(slotId);
  const copy = placementCopy[placement];

  useEffect(() => {
    if (!configured) return;

    const node = containerRef.current;

    if (!node || typeof IntersectionObserver === "undefined") {
      setIsReady(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setIsReady(true);
        observer.disconnect();
      },
      { rootMargin: "640px 0px" }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [configured]);

  useEffect(() => {
    if (!configured || !isReady || pushedRef.current) return;

    pushedRef.current = true;

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {
      pushedRef.current = false;
    }
  }, [configured, isReady, slotId]);

  if (!adsEnabled) return null;

  return (
    <aside
      ref={containerRef}
      className={[
        "overflow-hidden rounded-[1.5rem] border border-[#2E7D5B]/10 bg-white shadow-sm ring-1 ring-[#2E7D5B]/5",
        compact ? "p-4" : "p-4 md:p-5",
        className,
      ].join(" ")}
      aria-label="Reklam"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-[#B45309]">
          Reklam
        </span>
        <span className="text-[11px] font-bold text-slate-400">
          Plus ile reklamsiz
        </span>
      </div>

      {configured && isReady ? (
        <>
          <Script
            id="kampusraf-adsense"
            strategy="lazyOnload"
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
          <ins
            className="adsbygoogle"
            style={{
              display: "block",
              minHeight: compact ? 96 : 132,
            }}
            data-ad-client={adsenseClientId}
            data-ad-slot={slotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </>
      ) : configured ? (
        <div
          className="rounded-[1.2rem] bg-[#FAF7F0]"
          style={{
            minHeight: compact ? 96 : 132,
          }}
          aria-hidden="true"
        />
      ) : (
        <div
          className={[
            "rounded-[1.2rem] border border-dashed border-[#2E7D5B]/20 bg-[#FAF7F0] text-center",
            compact ? "p-4" : "p-5",
          ].join(" ")}
        >
          <p className="text-sm font-black text-[#1F2933]">{copy.title}</p>
          <p className="mx-auto mt-2 max-w-xl text-xs font-semibold leading-5 text-slate-500">
            {copy.description}
          </p>
        </div>
      )}
    </aside>
  );
}
