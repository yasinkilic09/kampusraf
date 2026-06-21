import Link from "next/link";

export type PageShortcutItem = {
  title: string;
  href: string;
  description?: string;
  icon?: string;
  badge?: string | number | null;
  tone?: "green" | "amber" | "red" | "blue" | "purple" | "slate";
};

type PageShortcutsProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  items: PageShortcutItem[];
  columns?: "one" | "two";
  compact?: boolean;
};

function getToneClasses(tone: PageShortcutItem["tone"] = "green") {
  if (tone === "amber") {
    return {
      card: "hover:border-[#F59E0B]/25 hover:bg-[#FFF7E6]",
      icon: "bg-[#FFF7E6] text-[#B45309]",
      badge: "bg-[#F59E0B] text-white",
      arrow: "text-[#B45309]",
    };
  }

  if (tone === "red") {
    return {
      card: "hover:border-red-200 hover:bg-red-50",
      icon: "bg-red-50 text-red-600",
      badge: "bg-red-600 text-white",
      arrow: "text-red-500",
    };
  }

  if (tone === "blue") {
    return {
      card: "hover:border-blue-200 hover:bg-blue-50",
      icon: "bg-blue-50 text-blue-700",
      badge: "bg-blue-600 text-white",
      arrow: "text-blue-600",
    };
  }

  if (tone === "purple") {
    return {
      card: "hover:border-purple-200 hover:bg-purple-50",
      icon: "bg-purple-50 text-purple-700",
      badge: "bg-purple-600 text-white",
      arrow: "text-purple-600",
    };
  }

  if (tone === "slate") {
    return {
      card: "hover:border-slate-200 hover:bg-slate-50",
      icon: "bg-slate-100 text-slate-700",
      badge: "bg-slate-700 text-white",
      arrow: "text-slate-400",
    };
  }

  return {
    card: "hover:border-[#2E7D5B]/25 hover:bg-[#EAF5EF]",
    icon: "bg-[#EAF5EF] text-[#2E7D5B]",
    badge: "bg-[#2E7D5B] text-white",
    arrow: "text-[#2E7D5B]",
  };
}

export function PageShortcuts({
  eyebrow = "Kısayollar",
  title = "Hızlı Erişim",
  description,
  items,
  columns = "one",
  compact = false,
}: PageShortcutsProps) {
  return (
    <section
      className={`rounded-[1.55rem] border border-[#2E7D5B]/10 bg-white/95 shadow-sm shadow-slate-900/[0.03] ring-1 ring-white/60 ${
        compact ? "p-4" : "p-4 md:p-5"
      }`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-xl font-black text-[#1F2933] md:text-2xl">
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className={`mt-4 grid gap-2.5 ${
          columns === "two" ? "sm:grid-cols-2" : ""
        }`}
      >
        {items.map((item) => {
          const tone = getToneClasses(item.tone);

          return (
            <Link
              key={`${item.href}-${item.title}`}
              href={item.href}
              prefetch={false}
              className={`group flex items-center gap-3 rounded-2xl border border-[#2E7D5B]/8 bg-[#FAF7F0]/80 p-3 transition hover:-translate-y-0.5 hover:shadow-sm hover:shadow-slate-900/5 ${tone.card}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] text-sm font-black shadow-sm ${tone.icon}`}
              >
                {item.icon || item.title.slice(0, 1)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black text-[#1F2933]">
                  {item.title}
                </span>
                {item.description ? (
                  <span
                    className={`mt-1 block text-xs font-semibold leading-5 text-slate-500 ${
                      compact ? "line-clamp-1" : "line-clamp-2"
                    }`}
                  >
                    {item.description}
                  </span>
                ) : null}
              </span>

              {item.badge ? (
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${tone.badge}`}
                >
                  {item.badge}
                </span>
              ) : (
                <span
                  className={`shrink-0 text-lg font-black opacity-70 transition group-hover:translate-x-0.5 ${tone.arrow}`}
                >
                  ›
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
