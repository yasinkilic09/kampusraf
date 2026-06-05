import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AudioBookRow = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  description: string | null;
  category: string | null;
  source_type: string | null;
  created_at: string;
  audio_chapters?: { id: string }[] | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
};

function getSourceLabel(sourceType?: string | null) {
  if (sourceType === "own_work") return "Kendi Eseri";
  if (sourceType === "permission_granted") return "İzinli İçerik";
  if (sourceType === "short_review") return "Kısa İnceleme";
  return "Kamu Malı";
}

function getDisplayName(profile?: ProfileRow | null) {
  return profile?.full_name || profile?.username || profile?.email || "KampüsRaf anlatıcısı";
}

export default async function AudioShelfPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: audioBooksData } = await supabase
    .from("audio_books")
    .select(
      `
      id,
      user_id,
      title,
      author,
      description,
      category,
      source_type,
      created_at,
      audio_chapters!inner (
        id
      )
    `
    )
    .eq("status", "approved")
    .eq("is_active", true)
    .eq("audio_chapters.status", "approved")
    .order("created_at", { ascending: false })
    .limit(40);

  const audioBooks = (audioBooksData || []) as AudioBookRow[];
  const narratorIds = Array.from(new Set(audioBooks.map((item) => item.user_id)));

  const { data: profilesData } =
    narratorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, username, email")
          .in("id", narratorIds)
      : { data: [] };

  const profileMap = new Map(
    ((profilesData || []) as ProfileRow[]).map((profile) => [profile.id, profile])
  );

  const totalChapterCount = audioBooks.reduce(
    (total, item) => total + (Array.isArray(item.audio_chapters) ? item.audio_chapters.length : 0),
    0
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🎧
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">Sesli Raf</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">Panel</Link>
            <Link href="/akis" className="hover:text-[#2E7D5B]">Akış</Link>
            <Link href="/rastgele-raf" className="hover:text-[#2E7D5B]">Rastgele Raf</Link>
            <Link href="/favori-alintilarim" className="hover:text-[#2E7D5B]">Favoriler</Link>
          </nav>

          <Link
            href="/sesli-raf/yukle"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Ses Yükle
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Sesli Raf
                </p>
                <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                  Öğrencilerin seslendirdiği kitapları ve metinleri dinle.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Vakit bulamayan öğrenciler için bölüm bölüm dinlenebilen, admin onaylı ve telif kontrolü yapılan sesli içerik alanı.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/sesli-raf/yukle"
                    className="rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
                  >
                    Sesli İçerik Oluştur
                  </Link>
                  <Link
                    href="/rastgele-raf"
                    className="rounded-full border border-white/25 px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    Rastgele Raf’a Git
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[340px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">{audioBooks.length}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">Sesli İçerik</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">{totalChapterCount}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">Bölüm</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[1.5rem] border border-[#F59E0B]/20 bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:mt-8 md:rounded-[2rem] md:p-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">Telif ve Güvenlik Notu</p>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Sesli Raf’ta yalnızca kamu malı eserler, kullanıcının kendi yazdığı metinler, izinli içerikler veya kısa yorum/inceleme formatındaki kayıtlar yayınlanır. Yüklenen her içerik yayına açılmadan önce admin onayından geçer.
          </p>
        </section>

        {audioBooks.length === 0 ? (
          <section className="mt-6 rounded-[1.8rem] border border-dashed border-[#2E7D5B]/30 bg-white p-8 text-center shadow-sm ring-1 ring-[#2E7D5B]/5 md:mt-8 md:rounded-[2rem] md:p-12">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">🎧</div>
            <h2 className="mt-5 text-2xl font-black">Henüz yayında sesli içerik yok</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
              İlk sesli içerikler admin onayından geçtiğinde burada listelenecek.
            </p>
            <Link
              href="/sesli-raf/yukle"
              className="mt-6 inline-flex rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5"
            >
              İlk Sesli İçeriği Oluştur
            </Link>
          </section>
        ) : (
          <section className="mt-6 grid gap-4 md:mt-8 md:grid-cols-2 xl:grid-cols-3">
            {audioBooks.map((item) => {
              const chapterCount = Array.isArray(item.audio_chapters) ? item.audio_chapters.length : 0;
              const narrator = profileMap.get(item.user_id);

              return (
                <article
                  key={item.id}
                  className="flex min-h-full flex-col overflow-hidden rounded-[1.7rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem] md:p-6"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B]/10 text-3xl">🎧</div>
                    <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-[11px] font-black text-[#B45309]">
                      {getSourceLabel(item.source_type)}
                    </span>
                  </div>

                  <h2 className="mt-5 break-words text-2xl font-black text-[#1F2933]">{item.title}</h2>
                  <p className="mt-2 text-sm font-bold text-slate-500">
                    {item.author || "Yazar bilgisi yok"}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-500">
                    {item.description || "Bu sesli içerik için açıklama eklenmemiş."}
                  </p>

                  <div className="mt-5 grid gap-2 rounded-2xl bg-[#FAF7F0] p-4 text-sm font-semibold text-slate-600">
                    <p>🎙 Anlatıcı: {getDisplayName(narrator)}</p>
                    <p>🎧 Bölüm sayısı: {chapterCount}</p>
                    {item.category && <p>🏷 Kategori: {item.category}</p>}
                  </div>

                  <Link
                    href={`/sesli-raf/${item.id}`}
                    className="mt-auto block rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                  >
                    Dinlemeye Başla
                  </Link>
                </article>
              );
            })}
          </section>
        )}
      </section>
    </main>
  );
}
