"use client";

import { useState } from "react";
import { copyTextSafely } from "@/lib/safe-clipboard";

type FeedShareButtonProps = {
  url: string;
  title: string;
  text?: string;
  className?: string;
};

export function FeedShareButton({
  url,
  title,
  text,
  className,
}: FeedShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareNavigator = navigator as Navigator & {
      share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
    };

    try {
      if (typeof shareNavigator.share === "function") {
        await shareNavigator.share({ title, text, url });
        return;
      }
    } catch {
      // Native share can be cancelled by the user; fall back to copy.
    }

    const ok = await copyTextSafely(url);
    setCopied(ok);

    if (ok) {
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className={
        className ||
        "rounded-full bg-[#FAF7F0] px-4 py-2 text-sm font-black text-slate-600 transition hover:bg-[#2E7D5B]/5"
      }
    >
      {copied ? "Link kopyalandi" : "Paylas"}
    </button>
  );
}
