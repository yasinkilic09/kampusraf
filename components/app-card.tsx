import type { ComponentPropsWithoutRef } from "react";

type AppCardProps = ComponentPropsWithoutRef<"section"> & {
  tone?: "default" | "soft" | "green" | "amber";
};

const toneClasses = {
  default: "bg-white shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-900/[0.04]",
  soft: "bg-[#FAF7F0] ring-1 ring-[#2E7D5B]/10",
  green: "bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15",
  amber: "bg-[#FFFBEB] ring-1 ring-[#F59E0B]/15",
};

export function AppCard({ tone = "default", className = "", ...props }: AppCardProps) {
  return (
    <section
      className={[
        "rounded-[1.75rem] p-5 transition md:p-6",
        toneClasses[tone],
        className,
      ].join(" ")}
      {...props}
    />
  );
}
