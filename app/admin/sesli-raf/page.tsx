import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateAudioSubmissionStatusAction } from "@/app/actions/audio-raf";

type SearchParams = {
  success?: string;
  error?: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
};

type AudioChapterRow = {
  id: string;
  audio_book_id: string;
  user_id: string;
  title: string;
  chapter_number: number;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  file_name: string | null;
  file_size_bytes: number | null;
  storage_path: string;
  signedUrl?: string | null;
};

type AudioBookRow = {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  description: string | null;
  category: string | null;
  source_type: string | null;
  copyright_note: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  audio_chapters?: AudioChapterRow[] | null;
};

type AudioSubmissionRow = AudioBookRow & {
  audio_chapters: (AudioChapterRow & { signedUrl: string })[];
};

function getStatusMeta(status: string) {
  if (status === "approved") {
    return { label: "Yayında", className: "bg-[#2E7D5B]/10 text-[#2E7D5B]" };
  }

  if (status === "rejected") {
    return { label: "Reddedildi", className: "bg-red-50 text-red-600" };
  }

  if (status === "hidden") {
    return { label: "Gizli", className: "bg-slate-100 text-slate-600" };
  }

  return { label: "Bekliyor", className: "bg-[#F59E0B]/10 text-[#B45309]" };
}

function getSubmissionStatus(item: AudioBookRow) {
  const chapters = Array.isArray(item.audio_chapters) ? item.audio_chapters : [];

  if (item.status === "rejected" || chapters.some((chapter) => chapter.status === "rejected")) {
    return "rejected";
  }

  if (item.status === "hidden" || chapters.some((chapter) => chapter.status === "hidden")) {
    return "hidden";
  }

  if (item.status === "approved" && chapters.length > 0 && chapters.every((chapter) => chapter.status === "approved")) {
    return "approved";
  }

  return "pending";
}

function getSourceLabel(sourceType?: string | null) {
  if (sourceType === "own_work") return "Kendi Eseri";
  if (sourceType === "permission_granted") return "İzinli İçerik";
  if (sourceType === "short_review") return "Kısa İnceleme";
  return "Kamu Malı";
}

function getDisplayName(profile?: ProfileRow | null) {
  return profile?.full_name || profile?.username || profile?.email || "KampüsRaf kullanıcısı";
}

function formatBytes(value?: number | null) {
  if (!value) return "Belirtilmemiş";
  const mb = value / (1024 * 1024);
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function SubmissionStatusButtons({ audioBookId }: { audioBookId: string }) {
  return (
    <div className="mt-5 grid gap-2 sm:grid-cols-3">
      <form action={updateAudioSubmissionStatusAction}>
        <input type="hidden" name="audioBookId" value={audioBookId} />
        <input type="hidden" name="status" value="approved" />
        <button
          type="submit"
          className="w-full rounded-full bg-[#2E7D5B] px-4 py-3 text-xs font-black text-white transition hover:-translate-y-0.5"
        >
          Başvuruyu Onayla
        </button>
      </form>

      <form action={updateAudioSubmissionStatusAction}>
        <input type="hidden" name="audioBookId" value={audioBookId} />
        <input type="hidden" name="status" value="hidden" />
        <button
          type="submit"
          className="w-full rounded-full bg-slate-700 px-4 py-3 text-xs font-black text-white transition hover:-translate-y-0.5"
        >
          Başvuruyu Gizle
        </button>
      </form>

      <form action={updateAudioSubmissionStatusAction}>
        <input type="hidden" name="audioBookId" value={audioBookId} />
        <input type="hidden" name="status" value="rejected" />
        <input
          name="rejectionReason"
          className="mb-2 w-full rounded-full border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 outline-none"
          placeholder="Red nedeni"
        />
        <button
          type="submit"
          className="w-full rounded-full bg-red-600 px-4 py-3 text-xs font-black text-white transition hover:-translate-y-0.5"
        >
          Başvuruyu Reddet
        </button>
      </form>
    </div>
  );
}

export default async function AdminAudioShelfPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (currentProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { count: pendingBooksCount } = await supabase
    .from("audio_books")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: approvedBooksCount } = await supabase
    .from("audio_books")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");

  const { count: pendingChaptersCount } = await supabase
    .from("audio_chapters")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: approvedChaptersCount } = await supabase
    .from("audio_chapters")
    .select("*", { count: "exact", head: true })
    .eq("status", "approved");

  const { count: pendingReportsCount } = await supabase
    .from("audio_reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

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
      copyright_note,
      status,
      rejection_reason,
      created_at,
      audio_chapters (
        id,
        audio_book_id,
        user_id,
        title,
        chapter_number,
        status,
        rejection_reason,
        created_at,
        file_name,
        file_size_bytes,
        storage_path
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(60);

  const rawAudioBooks = (audioBooksData || []) as AudioBookRow[];

  const audioBooks: AudioSubmissionRow[] = await Promise.all(
    rawAudioBooks.map(async (item) => {
      const chapters = Array.isArray(item.audio_chapters) ? item.audio_chapters : [];
      const sortedChapters = [...chapters].sort((a, b) => a.chapter_number - b.chapter_number);

      const chaptersWithSignedUrl = await Promise.all(
        sortedChapters.map(async (chapter) => {
          const { data } = await supabase.storage
            .from("audio-raf")
            .createSignedUrl(chapter.storage_path, 60 * 60);

          return {
            ...chapter,
            signedUrl: data?.signedUrl || "",
          };
        })
      );

      return {
        ...item,
        audio_chapters: chaptersWithSignedUrl,
      };
    })
  );

  const userIds = Array.from(new Set(audioBooks.map((item) => item.user_id)));

  const { data: profilesData } =
    userIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, username, email")
          .in("id", userIds)
      : { data: [] };

  const profileMap = new Map(
    ((profilesData || []) as ProfileRow[]).map((profile) => [profile.id, profile])
  );

  const pendingSubmissionsCount = audioBooks.filter((item) => getSubmissionStatus(item) === "pending").length;
  const approvedSubmissionsCount = audioBooks.filter((item) => getSubmissionStatus(item) === "approved").length;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🎧
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Sesli Raf admin merkezi
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/admin" className="hover:text-[#2E7D5B]">Admin</Link>
            <Link href="/admin/alintilar" className="hover:text-[#2E7D5B]">Alıntılar</Link>
            <Link href="/admin/sikayetler" className="hover:text-[#2E7D5B]">Şikayetler</Link>
            <Link href="/sesli-raf" className="hover:text-[#2E7D5B]">Sesli Raf</Link>
          </nav>

          <Link
            href="/sesli-raf"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Kullanıcı Görünümü
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
                  Sesli Raf Admin
                </p>
                <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                  Sesli içerikleri tek başvuru olarak onayla.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  İçerik bilgisi, telif beyanı ve ses bölümleri aynı kartta
                  görünür. Onay, gizleme veya red işlemi tüm başvuruya uygulanır.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[340px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">{pendingSubmissionsCount}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">Bekleyen Başvuru</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">{approvedSubmissionsCount}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">Yayında Başvuru</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">{pendingChaptersCount || 0}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">Bekleyen Bölüm</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">{pendingReportsCount || 0}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">Bildirim</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success && (
          <div className="mt-4 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B] md:mt-6">
            İşlem başarıyla güncellendi.
          </div>
        )}

        {params.error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700 md:mt-6">
            {decodeURIComponent(params.error)}
          </div>
        )}

        <section className="mt-6 grid gap-3 md:mt-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
            <p className="text-sm font-bold text-slate-500">Bekleyen Başvuru</p>
            <p className="mt-2 text-3xl font-black text-[#F59E0B]">{pendingSubmissionsCount}</p>
          </div>
          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
            <p className="text-sm font-bold text-slate-500">Yayında İçerik</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B]">{approvedBooksCount || 0}</p>
          </div>
          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
            <p className="text-sm font-bold text-slate-500">Yayında Bölüm</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B]">{approvedChaptersCount || 0}</p>
          </div>
          <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem]">
            <p className="text-sm font-bold text-slate-500">Telif Bildirimi</p>
            <p className="mt-2 text-3xl font-black text-red-600">{pendingReportsCount || 0}</p>
          </div>
        </section>

        <section className="mt-6 rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:mt-8 md:rounded-[2rem] md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                Sesli İçerik Başvuruları
              </p>
              <h2 className="mt-2 text-2xl font-black">
                İçerik + bölüm + telif notu tek kartta
              </h2>
            </div>
            <span className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-500">
              Toplam: {audioBooks.length}
            </span>
          </div>

          <div className="mt-5 grid gap-4">
            {audioBooks.length === 0 ? (
              <p className="rounded-2xl bg-[#FAF7F0] p-4 text-sm font-bold text-slate-500">
                Henüz sesli içerik başvurusu yok.
              </p>
            ) : (
              audioBooks.map((item) => {
                const submissionStatus = getSubmissionStatus(item);
                const status = getStatusMeta(submissionStatus);
                const profile = profileMap.get(item.user_id);
                const chapters = item.audio_chapters || [];

                return (
                  <article
                    key={item.id}
                    className="rounded-[1.5rem] border border-[#2E7D5B]/10 bg-[#FAF7F0] p-4 md:rounded-[1.8rem] md:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${status.className}`}>
                            {status.label}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-[#B45309]">
                            {getSourceLabel(item.source_type)}
                          </span>
                          {item.category && (
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-600">
                              {item.category}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 break-words text-xl font-black text-[#1F2933]">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {item.author || "Yazar bilgisi yok"}
                        </p>
                        <p className="mt-2 text-xs font-bold text-slate-400">
                          Yükleyen: {getDisplayName(profile)} · {formatDate(item.created_at)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white px-4 py-3 text-xs font-black text-slate-500">
                        {chapters.length} bölüm
                      </div>
                    </div>

                    {item.description && (
                      <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-semibold leading-6 text-slate-600">
                        {item.description}
                      </p>
                    )}

                    {item.copyright_note && (
                      <div className="mt-3 rounded-2xl border border-[#F59E0B]/20 bg-white p-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#B45309]">
                          Telif / İzin Notu
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                          {item.copyright_note}
                        </p>
                      </div>
                    )}

                    {(item.rejection_reason || chapters.some((chapter) => chapter.rejection_reason)) && (
                      <div className="mt-3 rounded-2xl bg-red-50 p-4 text-sm font-bold leading-6 text-red-600">
                        {item.rejection_reason || chapters.find((chapter) => chapter.rejection_reason)?.rejection_reason}
                      </div>
                    )}

                    <div className="mt-4 grid gap-3">
                      {chapters.length === 0 ? (
                        <p className="rounded-2xl bg-white p-4 text-sm font-bold text-slate-500">
                          Bu başvuruya bağlı ses bölümü bulunamadı.
                        </p>
                      ) : (
                        chapters.map((chapter) => {
                          const chapterStatus = getStatusMeta(chapter.status);

                          return (
                            <div key={chapter.id} className="rounded-2xl bg-white p-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-black ${chapterStatus.className}`}>
                                      Bölüm: {chapterStatus.label}
                                    </span>
                                    <span className="rounded-full bg-[#FAF7F0] px-3 py-1 text-[11px] font-black text-slate-600">
                                      {formatBytes(chapter.file_size_bytes)}
                                    </span>
                                  </div>
                                  <p className="mt-3 text-sm font-black text-[#1F2933]">
                                    {chapter.chapter_number}. {chapter.title}
                                  </p>
                                  <p className="mt-1 text-xs font-bold text-slate-400">
                                    Dosya: {chapter.file_name || "Belirtilmemiş"}
                                  </p>
                                </div>
                              </div>

                              {chapter.signedUrl ? (
                                <audio controls preload="metadata" className="mt-3 w-full">
                                  <source src={chapter.signedUrl} />
                                  Tarayıcın ses oynatmayı desteklemiyor.
                                </audio>
                              ) : (
                                <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
                                  Ses dosyası için geçici bağlantı oluşturulamadı.
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    <SubmissionStatusButtons audioBookId={item.id} />
                  </article>
                );
              })
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
