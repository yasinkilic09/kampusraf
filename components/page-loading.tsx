type PageLoadingProps = {
  label?: string;
};

export function PageLoading({ label = "KampüsRaf hazırlanıyor" }: PageLoadingProps) {
  return (
    <main className="min-h-screen bg-[#FAF7F0] px-4 pb-24 pt-4 text-[#1F2933] md:pb-0 md:px-6 md:pt-5">
      <div className="mx-auto max-w-7xl">
        <div className="flex items-center gap-3 rounded-[1.5rem] border border-[#2E7D5B]/10 bg-white/85 p-4 shadow-sm">
          <div className="h-12 w-12 animate-pulse rounded-2xl bg-[#2E7D5B]/10" />
          <div className="min-w-0 flex-1">
            <div className="h-5 w-36 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-2 h-3 w-48 animate-pulse rounded-full bg-slate-100" />
          </div>
        </div>

        <section className="mt-5 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] bg-white p-5 shadow-sm">
            <div className="h-4 w-32 animate-pulse rounded-full bg-[#F59E0B]/20" />
            <div className="mt-5 h-8 w-3/4 animate-pulse rounded-full bg-slate-200" />
            <div className="mt-3 h-8 w-1/2 animate-pulse rounded-full bg-slate-100" />
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-28 animate-pulse rounded-[1.5rem] bg-[#FAF7F0]" />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-[#2E7D5B]/10 p-5">
            <div className="h-5 w-40 animate-pulse rounded-full bg-[#2E7D5B]/15" />
            <div className="mt-5 space-y-3">
              {[0, 1, 2, 3].map((item) => (
                <div key={item} className="h-16 animate-pulse rounded-[1.25rem] bg-white/80" />
              ))}
            </div>
          </div>
        </section>

        <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </p>
      </div>
    </main>
  );
}
