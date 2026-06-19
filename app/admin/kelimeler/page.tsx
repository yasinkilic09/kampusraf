import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createDailyWordAction,
  deleteDailyWordAction,
  updateDailyWordAction,
  updateDailyWordStatusAction,
} from "@/app/actions/daily-words";
import { AppHeader, adminNavItems } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  success?: string;
  error?: string;
};

type DailyWordRow = {
  id: string;
  word: string;
  meaning: string;
  example_sentence: string | null;
  category: string | null;
  source_note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
};

function getSuccessMessage(value?: string) {
  if (value === "created") return "Kelime havuza eklendi.";
  if (value === "updated") return "Kelime güncellendi.";
  if (value === "activated") return "Kelime tekrar yayına alındı.";
  if (value === "hidden") return "Kelime günlük seçimlerden gizlendi.";
  if (value === "deleted") return "Kelime silindi.";
  return "";
}

function getWordErrorMessage(error?: string) {
  if (!error) return "";
  return error;
}

function isDailyWordsSetupError(
  error?: { code?: string; message?: string } | null
) {
  if (!error) return false;

  const message = error.message?.toLocaleLowerCase("tr-TR") || "";

  return (
    error.code === "42P01" ||
    message.includes("daily_words") ||
    message.includes("schema cache")
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Belirtilmemiş";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${
        active ? "bg-[#2E7D5B]/10 text-[#2E7D5B]" : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? "Yayında" : "Gizli"}
    </span>
  );
}

export default async function AdminDailyWordsPage({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  const { data: wordsData, error: wordsError } = await supabase
    .from("daily_words")
    .select(
      "id, word, meaning, example_sentence, category, source_note, is_active, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  const words = wordsError ? [] : ((wordsData || []) as DailyWordRow[]);
  const activeWordsCount = words.filter((word) => word.is_active).length;
  const hiddenWordsCount = words.length - activeWordsCount;
  const setupError = isDailyWordsSetupError(wordsError);
  const successMessage = getSuccessMessage(params.success);
  const errorMessage = getWordErrorMessage(params.error);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <AppHeader
        subtitle="Kelime Sözlüğü Yönetimi"
        active="admin-kelimeler"
        isAdmin
        navItems={adminNavItems}
        actions={
          <Link
            href="/kelime-sozlugu"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Kullanıcı görünümü
          </Link>
        }
      />

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Günlük Kelime Havuzu
                </p>
                <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight md:text-5xl">
                  Her gün kullanıcının karşısına anlamlı bir kelime çıkar.
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
                  Kelimeyi, anlamını, örnek cümlesini ve kategorisini buradan
                  yönet. Aktif kelimeler kullanıcı panelinde ve Kelime Sözlüğü
                  ekranında günlük olarak döner.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-2xl font-black">{words.length}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">Toplam</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-2xl font-black">{activeWordsCount}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">Aktif</p>
                </div>
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-2xl font-black">{hiddenWordsCount}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">Gizli</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {successMessage ? (
          <div className="mt-5 rounded-[1.4rem] bg-[#2E7D5B]/10 p-4 text-sm font-bold text-[#2E7D5B]">
            {successMessage}
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-5 rounded-[1.4rem] bg-red-50 p-4 text-sm font-bold text-red-600">
            {errorMessage}
          </div>
        ) : null}

        {setupError ? (
          <section className="mt-5 rounded-[1.5rem] border border-[#F59E0B]/30 bg-[#FFF7E6] p-5 text-sm leading-6 text-[#92400E]">
            <p className="font-black">Kelime tablosu henüz kurulmamış görünüyor.</p>
            <p className="mt-2 font-semibold">
              Supabase SQL Editor içinde{" "}
              <span className="font-black">supabase-daily-words.sql</span>{" "}
              dosyasındaki kodu bir kez çalıştır. Sonra bu sayfayı yenileyerek
              kelime eklemeye başlayabilirsin.
            </p>
          </section>
        ) : null}

        <section className="mt-6 grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6 lg:sticky lg:top-28 lg:self-start">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
              Yeni Kelime
            </p>
            <h2 className="mt-2 text-2xl font-black">Havuza ekle</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Kısa, anlaşılır ve örnek cümleyle desteklenmiş kelimeler günlük
              keşfi daha değerli hale getirir.
            </p>

            <form action={createDailyWordAction} className="mt-5 grid gap-4">
              <label className="grid gap-2 text-sm font-black text-[#1F2933]">
                Kelime
                <input
                  name="word"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="Örn. Muvazene"
                  className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-[#1F2933]">
                Kategori
                <input
                  name="category"
                  maxLength={80}
                  placeholder="Düşünce, edebiyat, eğitim..."
                  className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-[#1F2933]">
                Anlam
                <textarea
                  name="meaning"
                  required
                  minLength={3}
                  maxLength={700}
                  rows={5}
                  placeholder="Kelimenin sade ve anlaşılır anlamı..."
                  className="resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-[#2E7D5B]"
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-[#1F2933]">
                Örnek cümle
                <textarea
                  name="exampleSentence"
                  maxLength={260}
                  rows={3}
                  placeholder="Kelimeyi doğal bir cümlede kullan..."
                  className="resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-[#2E7D5B]"
                />
              </label>

              <label className="grid gap-2 text-sm font-black text-[#1F2933]">
                Kaynak notu
                <input
                  name="sourceNote"
                  maxLength={180}
                  placeholder="İsteğe bağlı editör notu"
                  className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                />
              </label>

              <button className="rounded-full bg-[#2E7D5B] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]">
                Kelimeyi Ekle
              </button>
            </form>
          </aside>

          <section className="grid gap-4">
            {words.length === 0 && !setupError ? (
              <div className="rounded-[1.8rem] bg-white p-8 text-center shadow-sm ring-1 ring-[#2E7D5B]/5">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                  Boş Havuz
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  İlk günlük kelimeyi ekleyerek başla.
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                  Aktif kelimeler çoğaldıkça kullanıcıların karşısına daha
                  çeşitli ve öğretici bir günlük keşif çıkar.
                </p>
              </div>
            ) : null}

            {words.map((item) => (
              <article
                key={item.id}
                className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6"
              >
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge active={item.is_active} />
                      {item.category ? (
                        <span className="rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-black text-[#B45309]">
                          {item.category}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-3 text-2xl font-black text-[#1F2933]">
                      {item.word}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      Son güncelleme: {formatDate(item.updated_at || item.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <form action={updateDailyWordStatusAction}>
                      <input type="hidden" name="wordId" value={item.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={item.is_active ? "false" : "true"}
                      />
                      <button className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-[#1F2933] transition hover:-translate-y-0.5">
                        {item.is_active ? "Gizle" : "Yayına Al"}
                      </button>
                    </form>

                    <form action={deleteDailyWordAction}>
                      <input type="hidden" name="wordId" value={item.id} />
                      <button className="rounded-full bg-red-50 px-4 py-2 text-xs font-black text-red-600 transition hover:-translate-y-0.5">
                        Sil
                      </button>
                    </form>
                  </div>
                </div>

                <form
                  action={updateDailyWordAction}
                  className="mt-5 grid gap-4 rounded-[1.5rem] bg-[#FAF7F0] p-4"
                >
                  <input type="hidden" name="wordId" value={item.id} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-black text-[#1F2933]">
                      Kelime
                      <input
                        name="word"
                        required
                        minLength={2}
                        maxLength={80}
                        defaultValue={item.word}
                        className="rounded-2xl border border-transparent bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-black text-[#1F2933]">
                      Kategori
                      <input
                        name="category"
                        maxLength={80}
                        defaultValue={item.category || ""}
                        className="rounded-2xl border border-transparent bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-[#2E7D5B]"
                      />
                    </label>
                  </div>

                  <label className="grid gap-2 text-sm font-black text-[#1F2933]">
                    Anlam
                    <textarea
                      name="meaning"
                      required
                      minLength={3}
                      maxLength={700}
                      rows={4}
                      defaultValue={item.meaning}
                      className="resize-none rounded-2xl border border-transparent bg-white px-4 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-[#2E7D5B]"
                    />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-black text-[#1F2933]">
                      Örnek cümle
                      <textarea
                        name="exampleSentence"
                        maxLength={260}
                        rows={3}
                        defaultValue={item.example_sentence || ""}
                        className="resize-none rounded-2xl border border-transparent bg-white px-4 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-[#2E7D5B]"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-black text-[#1F2933]">
                      Kaynak notu
                      <textarea
                        name="sourceNote"
                        maxLength={180}
                        rows={3}
                        defaultValue={item.source_note || ""}
                        className="resize-none rounded-2xl border border-transparent bg-white px-4 py-3 text-sm font-semibold leading-6 outline-none transition focus:border-[#2E7D5B]"
                      />
                    </label>
                  </div>

                  <button className="justify-self-start rounded-full bg-[#1F2933] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5">
                    Güncelle
                  </button>
                </form>
              </article>
            ))}
          </section>
        </section>
      </section>
    </main>
  );
}
