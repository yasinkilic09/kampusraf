import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAudioBookWithFirstChapterAction } from "@/app/actions/audio-raf";

type SearchParams = {
  success?: string;
  error?: string;
  audioBookId?: string;
};

type AudioBookRow = {
  id: string;
  title: string;
  author: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  audio_chapters?: {
    id: string;
    title: string;
    chapter_number: number;
    status: string;
    rejection_reason: string | null;
  }[] | null;
};

function getStatusMeta(status: string) {
  if (status === "approved") {
    return {
      label: "Yayında",
      className: "bg-[#2E7D5B]/10 text-[#2E7D5B]",
    };
  }

  if (status === "rejected") {
    return {
      label: "Reddedildi",
      className: "bg-red-50 text-red-600",
    };
  }

  if (status === "hidden") {
    return {
      label: "Gizlendi",
      className: "bg-slate-100 text-slate-600",
    };
  }

  return {
    label: "Admin Onayı Bekliyor",
    className: "bg-[#F59E0B]/10 text-[#B45309]",
  };
}

function getSuccessMessage(value?: string) {
  if (value === "audio-submission-created") {
    return "Sesli içerik ve ilk bölüm tek başvuru olarak admin onayına gönderildi.";
  }

  return "İşlem başarıyla kaydedildi. İçerik admin onayından sonra yayına alınacak.";
}

export default async function AudioUploadPage({
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

  const { data: audioBooksData } = await supabase
    .from("audio_books")
    .select(
      `
      id,
      title,
      author,
      status,
      rejection_reason,
      created_at,
      audio_chapters (
        id,
        title,
        chapter_number,
        status,
        rejection_reason
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const audioBooks = (audioBooksData || []) as AudioBookRow[];

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/sesli-raf" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🎙️
            </div>
            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Sesli içerik yükleme
              </p>
            </div>
          </Link>

          <Link
            href="/sesli-raf"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Sesli Raf
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[1.8rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />
            <div className="relative">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                Sesli Raf Stüdyosu
              </p>
              <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                Sesli içeriği ve ilk bölümü tek başvuruda gönder.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                Başlık, telif beyanı ve ses dosyası artık tek formda alınır.
                Gönderdiğin kayıt admin panelinde tek başvuru kartı olarak
                incelenir.
              </p>
            </div>
          </div>
        </section>

        {params.success && (
          <div className="mt-4 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B] md:mt-6">
            {getSuccessMessage(params.success)}
          </div>
        )}

        {params.error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700 md:mt-6">
            {decodeURIComponent(params.error)}
          </div>
        )}

        <section className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                Tek Parça Başvuru
              </p>
              <h2 className="mt-2 text-2xl font-black">
                İçerik bilgisi + ilk ses bölümü
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ana sesli içerik kaydı ve ilk bölüm dosyası aynı anda oluşturulur.
                Böylece admin tarafında iki ayrı onay yerine tek bir başvuru
                incelenir.
              </p>

              <form
  action={createAudioBookWithFirstChapterAction}
  className="mt-5 grid gap-5"
>
                <div className="rounded-[1.4rem] border border-[#2E7D5B]/10 bg-[#FAF7F0] p-4 md:p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2E7D5B]">
                    1. İçerik Bilgileri
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-black text-slate-600">
                      Başlık
                      <input
                        name="title"
                        required
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                        placeholder="Örn. Küçük Prens - Sesli Okuma"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-black text-slate-600">
                      Yazar / Kaynak
                      <input
                        name="author"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                        placeholder="Örn. Anonim, kendi metnim, yazar adı"
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <label className="grid gap-2 text-sm font-black text-slate-600">
                      Telif durumu
                      <select
                        name="sourceType"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                      >
                        <option value="public_domain">Kamu malı eser</option>
                        <option value="own_work">Kendi eserim</option>
                        <option value="permission_granted">İzinli içerik</option>
                        <option value="short_review">Kısa yorum / inceleme</option>
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm font-black text-slate-600">
                      Dil
                      <input
                        name="language"
                        defaultValue="tr"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-black text-slate-600">
                      Kategori
                      <input
                        name="category"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                        placeholder="Roman, deneme, şiir..."
                      />
                    </label>
                  </div>

                  <label className="mt-4 grid gap-2 text-sm font-black text-slate-600">
                    Açıklama
                    <textarea
                      name="description"
                      rows={4}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                      placeholder="Bu sesli içeriğin ne olduğunu kısaca anlat."
                    />
                  </label>

                  <label className="mt-4 grid gap-2 text-sm font-black text-slate-600">
                    Telif / izin notu
                    <textarea
                      name="copyrightNote"
                      rows={3}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                      placeholder="Kamu malı bilgisi, izin açıklaması veya kendi eserim notu."
                    />
                  </label>
                </div>

                <div className="rounded-[1.4rem] border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4 md:p-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#B45309]">
                    2. İlk Bölüm Dosyası
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-[120px_minmax(0,1fr)]">
                    <label className="grid gap-2 text-sm font-black text-slate-600">
                      Bölüm No
                      <input
                        name="chapterNumber"
                        type="number"
                        min="1"
                        defaultValue={1}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-black text-slate-600">
                      Bölüm başlığı
                      <input
                        name="chapterTitle"
                        required
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                        placeholder="Örn. Bölüm 1 - Başlangıç"
                      />
                    </label>
                  </div>

                  <label className="mt-4 grid gap-2 text-sm font-black text-slate-600">
                    Ses dosyası
                    <input
                      name="audioFile"
                      type="file"
                      accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/webm,audio/mp4,audio/x-m4a,video/webm"
                      required
                      className="rounded-2xl border border-dashed border-[#2E7D5B]/30 bg-white px-4 py-5 text-sm font-semibold outline-none transition file:mr-4 file:rounded-full file:border-0 file:bg-[#2E7D5B] file:px-4 file:py-2 file:text-sm file:font-black file:text-white"
                    />
                  </label>

                  <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
                    MP3, M4A, WAV ve WEBM desteklenir. Maksimum dosya boyutu 100 MB.
                  </p>
                </div>

                <label className="flex gap-3 rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4 text-sm font-bold leading-6 text-slate-700">
                  <input
                    name="copyrightConfirmed"
                    type="checkbox"
                    required
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <span>
                    Bu ses kaydını yükleme/yayınlama hakkına sahip olduğumu,
                    izinsiz telifli kitap paylaşmadığımı ve içeriğin KampüsRaf
                    kurallarına uygun olduğunu onaylıyorum.
                  </span>
                </label>

                <button
                  type="submit"
                  className="rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                >
                  Tek Parça Onaya Gönder
                </button>
              </form>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                Başvurularım
              </p>
              <div className="mt-5 grid gap-3">
                {audioBooks.length === 0 ? (
                  <p className="rounded-2xl bg-[#FAF7F0] p-4 text-sm font-bold leading-6 text-slate-500">
                    Henüz sesli içerik başvurusu göndermedin.
                  </p>
                ) : (
                  audioBooks.map((item) => {
                    const status = getStatusMeta(item.status);
                    const chapters = Array.isArray(item.audio_chapters)
                      ? item.audio_chapters
                      : [];

                    return (
                      <div key={item.id} className="rounded-2xl bg-[#FAF7F0] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-black text-[#1F2933]">
                              {item.title}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {item.author || "Yazar bilgisi yok"}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black ${status.className}`}>
                            {status.label}
                          </span>
                        </div>

                        {item.rejection_reason && (
                          <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-600">
                            Red nedeni: {item.rejection_reason}
                          </p>
                        )}

                        <div className="mt-3 grid gap-2">
                          {chapters.length === 0 ? (
                            <p className="text-xs font-bold text-slate-400">
                              Başvuruya bağlı bölüm bulunamadı.
                            </p>
                          ) : (
                            chapters.map((chapter) => {
                              const chapterStatus = getStatusMeta(chapter.status);
                              return (
                                <div key={chapter.id} className="rounded-xl bg-white p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="line-clamp-1 text-xs font-black text-slate-700">
                                      {chapter.chapter_number}. {chapter.title}
                                    </p>
                                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${chapterStatus.className}`}>
                                      {chapterStatus.label}
                                    </span>
                                  </div>
                                  {chapter.rejection_reason && (
                                    <p className="mt-2 text-[11px] font-semibold text-red-600">
                                      {chapter.rejection_reason}
                                    </p>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-[#F59E0B]/20 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Yükleme Kuralları
              </p>
              <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-slate-600">
                <p className="rounded-2xl bg-[#FAF7F0] p-3">
                  ✓ Güncel telifli kitapların tamamını izinsiz okumamalısın.
                </p>
                <p className="rounded-2xl bg-[#FAF7F0] p-3">
                  ✓ Kamu malı, kendi eserin veya izinli içerik tercih edilmeli.
                </p>
                <p className="rounded-2xl bg-[#FAF7F0] p-3">
                  ✓ İçerik ve ses bölümü tek başvuru olarak admin onayına gider.
                </p>
                <p className="rounded-2xl bg-[#FAF7F0] p-3">
                  ✓ Aylık bölüm yükleme hakkı pakete göre değişir.
                </p>
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}
