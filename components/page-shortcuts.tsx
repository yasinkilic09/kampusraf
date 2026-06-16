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
    <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#1F2933]">{title}</h2>
        {description ? (
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      <div
        className={`mt-5 grid gap-2 ${
          columns === "two" ? "sm:grid-cols-2" : ""
        }`}
      >
        {items.map((item) => {
          const tone = getToneClasses(item.tone);

          return (
            <Link
              key={`${item.href}-${item.title}`}
              href={item.href}
              className={`group flex items-center gap-3 rounded-[1.25rem] border border-transparent bg-[#FAF7F0] p-3.5 transition hover:-translate-y-0.5 hover:shadow-sm ${tone.card}`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black shadow-sm ${tone.icon}`}
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
