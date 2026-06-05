import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  reportAudioContentAction,
  toggleAudioFavoriteAction,
} from "@/app/actions/audio-raf";

type PageParams = {
  audioBookId: string;
};

type AudioBookRow = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  description: string | null;
  category: string | null;
  source_type: string | null;
  created_at: string;
};

type AudioChapterRow = {
  id: string;
  audio_book_id: string;
  title: string;
  chapter_number: number;
  storage_path: string;
  listen_count: number;
};

type ProfileRow = {
  full_name: string | null;
  username: string | null;
  email: string | null;
  university: string | null;
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

export default async function AudioBookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const { audioBookId } = await params;
  const query = (await searchParams) || {};
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: audioBookData } = await supabase
    .from("audio_books")
    .select("id, user_id, title, author, description, category, source_type, created_at")
    .eq("id", audioBookId)
    .eq("status", "approved")
    .eq("is_active", true)
    .maybeSingle();

  if (!audioBookData) {
    redirect("/sesli-raf");
  }

  const audioBook = audioBookData as AudioBookRow;

  const { data: chaptersData } = await supabase
    .from("audio_chapters")
    .select("id, audio_book_id, title, chapter_number, storage_path, listen_count")
    .eq("audio_book_id", audioBook.id)
    .eq("status", "approved")
    .order("chapter_number", { ascending: true });

  const chapters = (chaptersData || []) as AudioChapterRow[];

  const { data: narratorProfile } = await supabase
    .from("profiles")
    .select("full_name, username, email, university")
    .eq("id", audioBook.user_id)
    .maybeSingle();

  const { data: favorite } = await supabase
    .from("audio_favorites")
    .select("id")
    .eq("user_id", user.id)
    .eq("audio_book_id", audioBook.id)
    .maybeSingle();

  const chaptersWithSignedUrls = await Promise.all(
    chapters.map(async (chapter) => {
      const { data } = await supabase.storage
        .from("audio-raf")
        .createSignedUrl(chapter.storage_path, 60 * 60);

      return {
        ...chapter,
        signedUrl: data?.signedUrl || "",
      };
    })
  );

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/sesli-raf" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">🎧</div>
            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">Sesli içerik detayı</p>
            </div>
          </Link>

          <Link
            href="/sesli-raf"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Tüm Sesler
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        {query.success && (
          <div className="mb-4 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B]">
            Bildirim alındı. Teşekkürler.
          </div>
        )}

        <section className="overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />
            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">Sesli Raf</p>
                <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                  {audioBook.title}
                </h1>
                <p className="mt-3 text-base font-bold text-white/80">
                  {audioBook.author || "Yazar bilgisi yok"}
                </p>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  {audioBook.description || "Bu sesli içerik için açıklama eklenmemiş."}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
                    {getSourceLabel(audioBook.source_type)}
                  </span>
                  <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
                    {chapters.length} bölüm
                  </span>
                  {audioBook.category && (
                    <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black text-white">
                      {audioBook.category}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-[1.5rem] bg-white/10 p-4 backdrop-blur sm:min-w-[320px]">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/60">Anlatıcı</p>
                <p className="mt-2 text-2xl font-black">{getDisplayName(narratorProfile)}</p>
                <p className="mt-2 text-sm font-semibold text-white/65">
                  {narratorProfile?.university || "Üniversite bilgisi yok"}
                </p>
                <form action={toggleAudioFavoriteAction} className="mt-5">
                  <input type="hidden" name="audioBookId" value={audioBook.id} />
                  <input type="hidden" name="redirectTo" value={`/sesli-raf/${audioBook.id}`} />
                  <button
                    type="submit"
                    className="w-full rounded-full bg-white px-5 py-3 text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
                  >
                    {favorite ? "Favoriden Kaldır" : "Favoriye Ekle"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {chaptersWithSignedUrls.length === 0 ? (
              <section className="rounded-[1.8rem] border border-dashed border-[#2E7D5B]/30 bg-white p-8 text-center shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">🎧</div>
                <h2 className="mt-5 text-2xl font-black">Henüz onaylı bölüm yok</h2>
                <p className="mt-3 text-sm leading-7 text-slate-500">Bu içerik yayında olsa bile bölümler henüz admin onayından geçmemiş olabilir.</p>
              </section>
            ) : (
              chaptersWithSignedUrls.map((chapter) => (
                <article key={chapter.id} className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[1.8rem] md:p-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#F59E0B]">
                        Bölüm {chapter.chapter_number}
                      </p>
                      <h2 className="mt-2 break-words text-xl font-black text-[#1F2933]">{chapter.title}</h2>
                      <p className="mt-2 text-xs font-bold text-slate-400">Dinlenme: {chapter.listen_count}</p>
                    </div>
                  </div>

                  {chapter.signedUrl ? (
                    <audio controls preload="none" className="mt-5 w-full">
                      <source src={chapter.signedUrl} />
                      Tarayıcın ses oynatmayı desteklemiyor.
                    </audio>
                  ) : (
                    <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-600">
                      Ses bağlantısı oluşturulamadı.
                    </p>
                  )}
                </article>
              ))
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">Hızlı Erişim</p>
              <div className="mt-5 grid gap-3">
                <Link href="/sesli-raf" className="rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5">
                  Diğer Sesli İçerikler
                </Link>
                <Link href="/sesli-raf/yukle" className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5">
                  Ben de Seslendireyim
                </Link>
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-red-100 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-600">İçerik Bildir</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Telif, uygunsuz içerik veya kalite sorunu görürsen admin ekibine bildirebilirsin.
              </p>
              <form action={reportAudioContentAction} className="mt-4 grid gap-3">
                <input type="hidden" name="audioBookId" value={audioBook.id} />
                <input type="hidden" name="redirectTo" value={`/sesli-raf/${audioBook.id}`} />
                <select name="reason" className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-semibold outline-none">
                  <option value="copyright">Telif şüphesi</option>
                  <option value="inappropriate">Uygunsuz içerik</option>
                  <option value="quality">Ses kalitesi sorunu</option>
                  <option value="other">Diğer</option>
                </select>
                <textarea
                  name="note"
                  rows={3}
                  className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-semibold outline-none"
                  placeholder="Kısa açıklama"
                />
                <button type="submit" className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5">
                  Bildir
                </button>
              </form>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}
