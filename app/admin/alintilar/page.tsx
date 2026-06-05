import Link from "next/link";
import { redirect } from "next/navigation";
import {
  importGutenbergQuotesAction,
  importManualTurkishTextQuotesAction,
  importTurkishWikisourceQuotesAction,
  updateQuoteStatusAction,
} from "@/app/actions/admin-quotes";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  success?: string;
  error?: string;
  books?: string;
  quotes?: string;
  status?: string;
}>;

type QuoteBook = {
  title: string | null;
  author: string | null;
  source_name: string | null;
  source_url: string | null;
};

type QuoteItem = {
  id: string;
  quote_text: string;
  quote_text_tr: string | null;
  original_language: string | null;
  translation_status: string | null;
  mood: string | null;
  topic: string | null;
  estimated_read_seconds: number | null;
  status: string;
  is_active: boolean;
  created_at: string;
  quote_books: QuoteBook | QuoteBook[] | null;
};

function first<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getStatusLabel(status?: string | null) {
  if (status === "approved") return "Yayında";
  if (status === "rejected") return "Reddedildi";
  return "Onay Bekliyor";
}

function getStatusClass(status?: string | null) {
  if (status === "approved") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "rejected") return "bg-red-50 text-red-600";
  return "bg-[#F59E0B]/10 text-[#B45309]";
}

function getErrorMessage(error?: string) {
    if (error === "book-select-failed")
  return "Kitap kaydı kontrol edilirken hata oluştu.";
if (error === "book-update-failed")
  return "Mevcut kitap kaydı güncellenemedi.";
if (error === "book-insert-failed")
  return "Kitap veritabanına kaydedilemedi.";
if (error === "import-zero")
  return "Gutendex kitap buldu ancak veritabanına kitap veya alıntı kaydedilemedi. Terminal hata çıktısını kontrol et.";
  if (error === "empty-search") return "Arama kelimesi boş olamaz.";
  if (error === "gutendex-fetch-failed")
    return "Gutendex bağlantısı başarısız oldu.";
if (error === "manual-required")
  return "Manuel import için başlık ve metin alanı zorunludur.";
if (error === "manual-text-too-short")
  return "Manuel metin çok kısa. Alıntı çıkarmak için daha uzun bir metin gir.";
if (error === "manual-no-quotes")
  return "Manuel metinden uygun alıntı adayı çıkarılamadı.";
if (error === "quote-insert-failed")
  return "Alıntılar veritabanına kaydedilemedi.";
if (error === "no-wikisource-pages")
  return "Türkçe Vikikaynak üzerinde bu arama için uygun sayfa bulunamadı.";
  if (error === "no-books")
    return "Bu arama için düz metin formatında uygun kitap bulunamadı.";
  if (error === "invalid-status") return "Geçersiz alıntı durumu.";
  return "İşlem tamamlanamadı.";
}

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
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

  const selectedStatus = params.status || "pending";

  const { count: pendingCount } = await supabase
    .from("quote_items")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: approvedCount } = await supabase
    .from("quote_items")
    .select("id", { count: "exact", head: true })
    .eq("status", "approved");

  const { count: rejectedCount } = await supabase
    .from("quote_items")
    .select("id", { count: "exact", head: true })
    .eq("status", "rejected");

  const { data: quoteItemsData } = await supabase
    .from("quote_items")
    .select(
      `
      id,
      quote_text,
      quote_text_tr,
      original_language,
      translation_status,
      mood,
      topic,
      estimated_read_seconds,
      status,
      is_active,
      created_at,
      quote_books (
        title,
        author,
        source_name,
        source_url
      )
    `
    )
    .eq("status", selectedStatus)
    .order("created_at", { ascending: false })
    .limit(40);

  const quoteItems = (quoteItemsData || []) as QuoteItem[];

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              🎲
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">Alıntı Merkezi</p>
              <p className="text-xs font-semibold text-slate-500">
                Rastgele Raf içerik yönetimi
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/rastgele-raf"
              className="rounded-full border border-[#2E7D5B]/20 px-4 py-2 text-sm font-black text-[#2E7D5B] transition hover:bg-[#2E7D5B]/5"
            >
              Kullanıcı Sayfası
            </Link>

            <Link
              href="/admin"
              className="rounded-full bg-[#2E7D5B] px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5"
            >
              Admin
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[2rem] bg-[#2E7D5B] text-white shadow-xl shadow-[#2E7D5B]/15">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F5EBDD]">
                  Admin İçerik Havuzu
                </p>
                <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight md:text-5xl">
                  Gutendex’ten alıntı adayları üret, onayla ve Rastgele Raf’a aktar.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Otomatik gelen içerikler doğrudan yayına alınmaz. Önce pending
                  havuzuna düşer, admin kontrolünden sonra kullanıcıya görünür.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[360px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-2xl font-black">{pendingCount || 0}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Bekleyen
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-2xl font-black">{approvedCount || 0}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Yayında
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-2xl font-black">{rejectedCount || 0}</p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Reddedilen
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {params.success === "imported" && (
          <div className="mt-5 rounded-2xl border border-[#2E7D5B]/10 bg-[#2E7D5B]/10 px-4 py-3 text-sm font-bold text-[#2E7D5B]">
            İçe aktarma tamamlandı. Kitap: {params.books || 0}, alıntı adayı:{" "}
            {params.quotes || 0}
          </div>
        )}

        {params.success === "status-updated" && (
          <div className="mt-5 rounded-2xl border border-[#2E7D5B]/10 bg-[#2E7D5B]/10 px-4 py-3 text-sm font-bold text-[#2E7D5B]">
            Alıntı durumu güncellendi.
          </div>
        )}

        {params.error && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {getErrorMessage(params.error)}
          </div>
        )}

        <section className="mt-6 grid gap-6 xl:grid-cols-3">
            <form
  action={importTurkishWikisourceQuotesAction}
  className="rounded-[2rem] bg-white p-5 shadow-sm md:p-7"
>
  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
    Türkçe Vikikaynak Importer
  </p>

  <h2 className="mt-2 text-2xl font-black">
    Türkçe alıntı adayı üret
  </h2>

  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
    Türkçe kaynakları güçlendirmek için Vikikaynak sayfalarından kısa alıntı
    adayları üretir. İçerikler önce onay havuzuna düşer.
  </p>

  <div className="mt-6 grid gap-4">
    <div>
      <label className="text-sm font-black text-slate-700">
        Türkçe arama kelimesi
      </label>

      <input
        name="search"
        required
        placeholder="Örn: Yunus Emre, Namık Kemal, Ömer Seyfettin"
        className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
      />
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="text-sm font-black text-slate-700">
          Sayfa
        </label>

        <select
          name="maxPages"
          defaultValue="1"
          className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
        >
          <option value="1">1 sayfa</option>
          <option value="2">2 sayfa</option>
          <option value="3">3 sayfa</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-black text-slate-700">
          Alıntı
        </label>

        <select
          name="maxQuotesPerPage"
          defaultValue="10"
          className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
        >
          <option value="5">5 aday</option>
          <option value="10">10 aday</option>
          <option value="15">15 aday</option>
          <option value="20">20 aday</option>
        </select>
      </div>
    </div>

    <button
      type="submit"
      className="rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
    >
      🇹🇷 Türkçe Alıntı Adayı Üret
    </button>
  </div>
</form>
<form
  action={importManualTurkishTextQuotesAction}
  className="rounded-[2rem] bg-white p-5 shadow-sm md:p-7"
>
  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
    Manuel Türkçe Metin
  </p>

  <h2 className="mt-2 text-2xl font-black">
    Güvenilir metinden alıntı üret
  </h2>

  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
    Kamu malı, izinli veya güvenilir bir Türkçe metni yapıştır. Sistem kısa ve
    anlamlı alıntı adayları çıkarır; içerikler önce onay havuzuna düşer.
  </p>

  <div className="mt-6 grid gap-4">
    <div>
      <label className="text-sm font-black text-slate-700">
        Kaynak / eser başlığı
      </label>

      <input
        name="title"
        required
        placeholder="Örn: Safahat, Dede Korkut, Seçme Şiirler"
        className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
      />
    </div>

    <div>
      <label className="text-sm font-black text-slate-700">
        Yazar / kaynak kişi
      </label>

      <input
        name="author"
        placeholder="Örn: Mehmet Akif Ersoy"
        className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
      />
    </div>

    <div>
      <label className="text-sm font-black text-slate-700">
        Kaynak linki
      </label>

      <input
        name="sourceUrl"
        placeholder="Varsa kaynak URL"
        className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
      />
    </div>

    <div>
      <label className="text-sm font-black text-slate-700">
        Kaynak / lisans notu
      </label>

      <input
        name="sourceNote"
        placeholder="Örn: Kamu malı olduğu kontrol edilecek"
        className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
      />
    </div>

    <div>
      <label className="text-sm font-black text-slate-700">
        Türkçe metin
      </label>

      <textarea
        name="rawText"
        required
        rows={10}
        placeholder="Buraya uzun Türkçe metni yapıştır..."
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] p-4 text-sm font-semibold leading-6 outline-none transition focus:border-[#2E7D5B] focus:bg-white"
      />
    </div>

    <div>
      <label className="text-sm font-black text-slate-700">
        Maksimum alıntı
      </label>

      <select
        name="maxQuotes"
        defaultValue="15"
        className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
      >
        <option value="5">5 aday</option>
        <option value="10">10 aday</option>
        <option value="15">15 aday</option>
        <option value="25">25 aday</option>
        <option value="40">40 aday</option>
      </select>
    </div>

    <button
      type="submit"
      className="rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
    >
      📝 Manuel Türkçe Alıntı Üret
    </button>
  </div>
</form>
          <form
            action={importGutenbergQuotesAction}
            className="rounded-[2rem] bg-white p-5 shadow-sm md:p-7"
          >
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
              Gutendex Importer
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Otomatik alıntı adayı üret
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Öneri: İlk test için “austen”, “dickens”, “sherlock” veya
              “adventure” gibi İngilizce aramalarla başla.
            </p>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-sm font-black text-slate-700">
                  Arama kelimesi
                </label>
                <input
                  name="search"
                  required
                  placeholder="Örn: austen, dickens, adventure"
                  className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-black text-slate-700">
                    Dil
                  </label>
                  <select
                    name="language"
                    defaultValue="en"
                    className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  >
                    <option value="en">İngilizce</option>
                    <option value="tr">Türkçe</option>
                    <option value="fr">Fransızca</option>
                    <option value="de">Almanca</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-black text-slate-700">
                    Kitap
                  </label>
                  <select
                    name="maxBooks"
                    defaultValue="1"
                    className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  >
                    <option value="1">1 kitap</option>
                    <option value="2">2 kitap</option>
                    <option value="3">3 kitap</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-black text-slate-700">
                    Alıntı
                  </label>
                  <select
                    name="maxQuotesPerBook"
                    defaultValue="10"
                    className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  >
                    <option value="5">5 aday</option>
                    <option value="10">10 aday</option>
                    <option value="15">15 aday</option>
                    <option value="20">20 aday</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                🎲 Alıntı Adayı Üret
              </button>
            </div>
          </form>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm md:p-7">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
              Kalite Kontrol
            </p>
            <h2 className="mt-2 text-2xl font-black">Yayın mantığı</h2>

            <div className="mt-5 grid gap-3">
              {[
                "İçe aktarılan alıntılar pending olarak kaydedilir.",
                "Pending alıntılar Rastgele Raf kullanıcısına görünmez.",
                "Admin onaylarsa status approved ve is_active true olur.",
                "Reddedilen alıntılar sistemde kalır ama yayınlanmaz.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-[#FAF7F0] p-4 text-sm font-bold leading-6 text-slate-600"
                >
                  ✓ {item}
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Alıntı Havuzu
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {getStatusLabel(selectedStatus)} alıntılar
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { label: "Bekleyen", value: "pending" },
                { label: "Yayında", value: "approved" },
                { label: "Reddedilen", value: "rejected" },
              ].map((item) => (
                <Link
                  key={item.value}
                  href={`/admin/alintilar?status=${item.value}`}
                  className={`rounded-full px-4 py-2 text-xs font-black transition ${
                    selectedStatus === item.value
                      ? "bg-[#2E7D5B] text-white"
                      : "bg-[#FAF7F0] text-slate-600 hover:bg-[#2E7D5B]/5"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {quoteItems.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#2E7D5B]/20 bg-[#FAF7F0] p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-3xl">
                🎲
              </div>
              <h3 className="mt-4 text-lg font-black">Bu durumda alıntı yok</h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Gutendex importer ile yeni alıntı adayları oluşturabilirsin.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {quoteItems.map((quote) => {
                const book = first(quote.quote_books);

                return (
                  <article
                    key={quote.id}
                    className="rounded-[1.5rem] border border-slate-100 bg-[#FAF7F0] p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                              quote.status
                            )}`}
                          >
                            {getStatusLabel(quote.status)}
                          </span>

                          {quote.mood && (
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                              {quote.mood}
                            </span>
                          )}

                          {quote.topic && (
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                              {quote.topic}
                            </span>
                          )}
                        </div>

                        <p className="mt-4 text-lg font-black leading-8 text-[#1F2933]">
                          “{quote.quote_text}”
                        </p>

                        {quote.original_language !== "tr" && quote.quote_text_tr && (
  <div className="mt-4 rounded-2xl bg-white p-4">
    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2E7D5B]">
      Türkçe Çeviri
    </p>
    <p className="mt-2 text-sm font-bold leading-7 text-slate-700">
      “{quote.quote_text_tr}”
    </p>
  </div>
)}

{quote.original_language !== "tr" && !quote.quote_text_tr && (
  <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
    Türkçe çeviri üretilemedi. Bu alıntıyı onaylamadan önce manuel kontrol et.
  </div>
)}

                        <div className="mt-4 rounded-2xl bg-white p-4">
                          <p className="text-sm font-black">
                            {book?.title || "Kitap bilgisi yok"}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {book?.author || "Yazar bilgisi yok"}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">
                            {book?.source_name || "Kaynak bilgisi yok"} · ~
                            {quote.estimated_read_seconds || 12} sn
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
                        {quote.status !== "approved" && (
                          <form action={updateQuoteStatusAction}>
                            <input
                              type="hidden"
                              name="quoteId"
                              value={quote.id}
                            />
                            <input
                              type="hidden"
                              name="status"
                              value="approved"
                            />
                            <button
                              type="submit"
                              className="w-full rounded-full bg-[#2E7D5B] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
                            >
                              Onayla
                            </button>
                          </form>
                        )}

                        {quote.status !== "rejected" && (
                          <form action={updateQuoteStatusAction}>
                            <input
                              type="hidden"
                              name="quoteId"
                              value={quote.id}
                            />
                            <input
                              type="hidden"
                              name="status"
                              value="rejected"
                            />
                            <button
                              type="submit"
                              className="w-full rounded-full bg-red-50 px-5 py-3 text-sm font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100"
                            >
                              Reddet
                            </button>
                          </form>
                        )}

                        {quote.status !== "pending" && (
                          <form action={updateQuoteStatusAction}>
                            <input
                              type="hidden"
                              name="quoteId"
                              value={quote.id}
                            />
                            <input
                              type="hidden"
                              name="status"
                              value="pending"
                            />
                            <button
                              type="submit"
                              className="w-full rounded-full bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:-translate-y-0.5"
                            >
                              Beklemeye Al
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}