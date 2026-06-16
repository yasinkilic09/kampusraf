import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import {
  bulkUpdateQuoteStatusAction,
  importAuthorInternetQuotesAction,
  importCuratedQuoteResearchAction,
  importGutenbergQuotesAction,
  importManualTurkishTextQuotesAction,
  importTurkishWikisourceQuotesAction,
  updateQuoteStatusAction,
} from "@/app/actions/admin-quotes";
import { AdminQuoteBulkSelector } from "@/components/admin-quote-bulk-selector";
import { AppHeader, adminNavItems } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<{
  success?: string;
  error?: string;
  books?: string;
  quotes?: string;
  status?: string;
  q?: string;
  source?: string;
  language?: string;
  translation?: string;
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

const statusFilters = [
  { label: "Bekleyen", value: "pending" },
  { label: "Yayında", value: "approved" },
  { label: "Reddedilen", value: "rejected" },
];

const sourceFilters = [
  { label: "Tüm kaynaklar", value: "all" },
  { label: "Vikikaynak", value: "wikisource" },
  { label: "Gutendex", value: "gutendex" },
  { label: "Manuel", value: "manual" },
];

const languageFilters = [
  { label: "Tüm diller", value: "all" },
  { label: "Türkçe", value: "tr" },
  { label: "İngilizce", value: "en" },
  { label: "Fransızca", value: "fr" },
  { label: "Almanca", value: "de" },
];

const translationFilters = [
  { label: "Tüm çeviri durumları", value: "all" },
  { label: "Çevirisi var", value: "translated" },
  { label: "Çeviri eksik", value: "missing" },
  { label: "Çeviri gerekmiyor", value: "not_needed" },
];

const turkishSearchSuggestions = [
  "Yunus Emre",
  "Ömer Seyfettin",
  "Namık Kemal",
  "Mehmet Akif",
  "Dede Korkut",
  "Evliya Çelebi",
  "Tevfik Fikret",
  "Karacaoğlan",
];

const gutenbergSearchSuggestions = [
  "austen",
  "dickens",
  "sherlock",
  "adventure",
  "philosophy",
  "poetry",
];

const authorResearchSuggestions = [
  "Yunus Emre",
  "Ömer Seyfettin",
  "Namık Kemal",
  "Mehmet Akif",
  "Jane Austen",
  "Charles Dickens",
  "Victor Hugo",
  "Fyodor Dostoyevsky",
];

const editorialCollections = [
  {
    label: "Türk Klasikleri",
    value: "turkish_classics",
    description: "Divan, halk şiiri, tasavvuf ve erken dönem klasik kaynaklar.",
  },
  {
    label: "Modern Türk Edebiyatı",
    value: "modern_turkish",
    description: "Tanzimat, Servet-i Fünun, Milli Edebiyat ve erken modern dönem.",
  },
  {
    label: "Düşünce ve Eğitim",
    value: "thought_and_education",
    description: "İlim, irfan, fikir, hakikat, maarif ve medeniyet temaları.",
  },
  {
    label: "Hayat ve Duygu",
    value: "life_and_emotion",
    description: "Gönül, sevgi, umut, çocukluk, gençlik ve hayat temaları.",
  },
];

const workflowSteps = [
  {
    title: "Kaynak Bul",
    text: "Vikikaynak, Gutendex veya manuel metinle kontrollü aday havuzu oluştur.",
  },
  {
    title: "Kalite Süz",
    text: "Uzunluk, kaynak, dil ve çeviri uyarılarına göre zayıf adayları ayır.",
  },
  {
    title: "Toplu Karar",
    text: "Güvenli gördüğün kayıtları seçip tek işlemle onayla veya beklemeye al.",
  },
  {
    title: "Yayına Aktar",
    text: "Onaylanan içerikler Rastgele Raf tarafında görünür hale gelir.",
  },
];

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
  if (error === "book-select-failed") {
    return "Kitap kaydı kontrol edilirken hata oluştu.";
  }
  if (error === "book-update-failed") return "Mevcut kitap kaydı güncellenemedi.";
  if (error === "book-insert-failed") return "Kitap veritabanına kaydedilemedi.";
  if (error === "import-zero") {
    return "Kaynak bulundu ancak veritabanına kitap veya alıntı kaydedilemedi. Farklı bir arama veya daha geniş limit dene.";
  }
  if (error === "empty-search") return "Arama kelimesi boş olamaz.";
  if (error === "author-required") return "Yazar adı boş olamaz.";
  if (error === "gutendex-fetch-failed") {
    return "Gutendex bağlantısı başarısız oldu.";
  }
  if (error === "manual-required") {
    return "Manuel import için başlık ve metin alanı zorunludur.";
  }
  if (error === "manual-text-too-short") {
    return "Manuel metin çok kısa. Alıntı çıkarmak için daha uzun bir metin gir.";
  }
  if (error === "manual-no-quotes") {
    return "Manuel metinden uygun alıntı adayı çıkarılamadı.";
  }
  if (error === "quote-insert-failed") {
    return "Alıntılar veritabanına kaydedilemedi.";
  }
  if (error === "no-wikisource-pages") {
    return "Türkçe Vikikaynak üzerinde bu arama için uygun sayfa bulunamadı.";
  }
  if (error === "no-books") {
    return "Bu arama için düz metin formatında uygun kitap bulunamadı.";
  }
  if (error === "invalid-status") return "Geçersiz alıntı durumu.";
  if (error === "no-selection") return "Toplu işlem için en az bir alıntı seçmelisin.";
  if (error === "quote-bulk-update-failed") {
    return "Toplu durum güncellemesi tamamlanamadı.";
  }
  return "İşlem tamamlanamadı.";
}

function getSafeStatus(value?: string) {
  if (value === "approved" || value === "rejected" || value === "pending") {
    return value;
  }

  return "pending";
}

function buildAdminQuoteUrl(params: {
  status: string;
  q?: string;
  source?: string;
  language?: string;
  translation?: string;
  success?: string;
  error?: string;
}) {
  const query = new URLSearchParams();
  query.set("status", params.status);

  if (params.q) query.set("q", params.q);
  if (params.source && params.source !== "all") query.set("source", params.source);
  if (params.language && params.language !== "all") {
    query.set("language", params.language);
  }
  if (params.translation && params.translation !== "all") {
    query.set("translation", params.translation);
  }
  if (params.success) query.set("success", params.success);
  if (params.error) query.set("error", params.error);

  return `/admin/alintilar?${query.toString()}`;
}

function getSourceGroup(book: QuoteBook | null) {
  const sourceName = (book?.source_name || "").toLocaleLowerCase("tr-TR");

  if (sourceName.includes("vikikaynak") || sourceName.includes("wikisource")) {
    return "wikisource";
  }
  if (sourceName.includes("gutenberg") || sourceName.includes("gutendex")) {
    return "gutendex";
  }
  if (sourceName.includes("manuel") || sourceName.includes("manual")) {
    return "manual";
  }

  return "other";
}

function matchesTranslationFilter(quote: QuoteItem, selectedTranslation: string) {
  if (selectedTranslation === "all") return true;
  if (selectedTranslation === "translated") return Boolean(quote.quote_text_tr);
  if (selectedTranslation === "missing") {
    return quote.original_language !== "tr" && !quote.quote_text_tr;
  }
  if (selectedTranslation === "not_needed") {
    return quote.original_language === "tr" || quote.translation_status === "not_needed";
  }

  return true;
}

function matchesQuoteSearch(
  quote: QuoteItem,
  book: QuoteBook | null,
  searchQuery: string
) {
  if (!searchQuery) return true;

  const haystack = [
    quote.quote_text,
    quote.quote_text_tr,
    quote.original_language,
    quote.translation_status,
    quote.mood,
    quote.topic,
    book?.title,
    book?.author,
    book?.source_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("tr-TR");

  return haystack.includes(searchQuery.toLocaleLowerCase("tr-TR"));
}

function getWordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function getQuoteQualityScore(quote: QuoteItem, book: QuoteBook | null) {
  const text = quote.quote_text_tr || quote.quote_text;
  const wordCount = getWordCount(text);
  let score = 100;

  if (wordCount < 8) score -= 30;
  if (wordCount > 55) score -= 20;
  if (!book?.source_url) score -= 18;
  if (!book?.title) score -= 12;
  if (!book?.author) score -= 6;
  if (quote.original_language !== "tr" && !quote.quote_text_tr) score -= 28;
  if (!quote.topic) score -= 6;
  if (!quote.mood) score -= 4;
  if ((quote.quote_text.match(/\d/g) || []).length > 8) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function getQualityClass(score: number) {
  if (score >= 82) return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (score >= 62) return "bg-[#F59E0B]/10 text-[#B45309]";
  return "bg-red-50 text-red-600";
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

  const selectedStatus = getSafeStatus(params.status);
  const selectedSource = params.source || "all";
  const selectedLanguage = params.language || "all";
  const selectedTranslation = params.translation || "all";
  const quoteSearchQuery = (params.q || "").trim();
  const currentListUrl = buildAdminQuoteUrl({
    status: selectedStatus,
    q: quoteSearchQuery,
    source: selectedSource,
    language: selectedLanguage,
    translation: selectedTranslation,
  });

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
    .limit(160);

  const allQuoteItems = (quoteItemsData || []) as QuoteItem[];
  const quoteItems = allQuoteItems
    .filter((quote) => {
      const book = first(quote.quote_books);

      if (!matchesQuoteSearch(quote, book, quoteSearchQuery)) return false;
      if (selectedSource !== "all" && getSourceGroup(book) !== selectedSource) {
        return false;
      }
      if (selectedLanguage !== "all" && quote.original_language !== selectedLanguage) {
        return false;
      }
      if (!matchesTranslationFilter(quote, selectedTranslation)) return false;

      return true;
    })
    .slice(0, 40);

  const activeFilterCount = [
    quoteSearchQuery,
    selectedSource !== "all" ? selectedSource : "",
    selectedLanguage !== "all" ? selectedLanguage : "",
    selectedTranslation !== "all" ? selectedTranslation : "",
  ].filter(Boolean).length;
  const missingTranslationCount = allQuoteItems.filter(
    (quote) => quote.original_language !== "tr" && !quote.quote_text_tr
  ).length;
  const sourceCoverageCount = allQuoteItems.filter((quote) => {
    const book = first(quote.quote_books);

    return Boolean(book?.source_url);
  }).length;
  const publishReadyCount = quoteItems.filter((quote) => {
    const book = first(quote.quote_books);

    return getQuoteQualityScore(quote, book) >= 82;
  }).length;
  const sourceGroupCounts = allQuoteItems.reduce(
    (accumulator, quote) => {
      const group = getSourceGroup(first(quote.quote_books));
      accumulator[group] = (accumulator[group] || 0) + 1;

      return accumulator;
    },
    {} as Record<string, number>
  );

  return (
    <main className="min-h-screen bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <AppHeader
        subtitle="Rastgele Raf içerik yönetimi"
        active="admin-alintilar"
        isAdmin
        navItems={adminNavItems}
        actions={
          <Link
            href="/rastgele-raf"
            className="rounded-full border border-[#2E7D5B]/20 px-4 py-2 text-sm font-black text-[#2E7D5B] transition hover:bg-[#2E7D5B]/5"
          >
            Kullanıcı Sayfası
          </Link>
        }
      />

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
                  Alıntı kaynaklarını keşfet, adayları çıkar ve Rastgele Raf’a güvenle aktar.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Vikikaynak, Gutendex ve manuel metin akışları tek panelde. İçerikler önce
                  onay havuzuna düşer; yayına çıkmadan önce kaynak, dil ve çeviri kontrolü
                  yapılabilir.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[360px]">
                <StatTile label="Bekleyen" value={pendingCount || 0} />
                <StatTile label="Yayında" value={approvedCount || 0} />
                <StatTile label="Reddedilen" value={rejectedCount || 0} />
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

        {params.success === "bulk-status-updated" && (
          <div className="mt-5 rounded-2xl border border-[#2E7D5B]/10 bg-[#2E7D5B]/10 px-4 py-3 text-sm font-bold text-[#2E7D5B]">
            Toplu işlem tamamlandı. Güncellenen alıntı: {params.quotes || 0}
          </div>
        )}

        {params.error && (
          <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {getErrorMessage(params.error)}
          </div>
        )}

        <form
          action={importAuthorInternetQuotesAction}
          className="mt-6 overflow-hidden rounded-[2rem] bg-white shadow-sm"
        >
          <div className="grid gap-0 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="bg-[#10251C] p-5 text-white md:p-7">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
                Yazar İnternet Araştırması
              </p>
              <h2 className="mt-3 text-2xl font-black md:text-3xl">
                Yazarın açık kaynak eserlerini bul, içinden daha anlamlı cümleler çıkar.
              </h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-7 text-white/70">
                Sistem telifli kitapları kazımaz; Vikikaynak ve Project Gutenberg gibi açık
                kaynaklarda yazar adı, eserleri, şiirleri, hikayeleri ve başlık varyasyonlarıyla
                arama yapar. Bulunan cümleler yayınlanmadan önce onay havuzuna alınır.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {authorResearchSuggestions.map((item) => (
                  <button
                    key={item}
                    type="submit"
                    name="suggestedAuthor"
                    value={item}
                    className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white hover:text-[#10251C]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 p-5 md:p-7">
              <div>
                <label className="text-sm font-black text-slate-700">Yazar adı</label>
                <input
                  name="authorName"
                  placeholder="Örn: Sabahattin Ali, Jane Austen, Victor Hugo"
                  className="mt-2 min-h-[58px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-base font-bold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FieldSelect label="Kaynak kapsamı" name="sourceScope" defaultValue="all">
                  <option value="all">Vikikaynak + Gutenberg</option>
                  <option value="wikisource">Sadece Türkçe Vikikaynak</option>
                  <option value="gutenberg">Sadece Gutenberg</option>
                </FieldSelect>

                <FieldSelect label="Dil kapsamı" name="languageScope" defaultValue="global">
                  <option value="global">Küresel klasikler</option>
                  <option value="tr">Türkçe</option>
                  <option value="en">İngilizce</option>
                  <option value="fr">Fransızca</option>
                  <option value="de">Almanca</option>
                </FieldSelect>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FieldSelect label="Taranacak kaynak" name="maxSources" defaultValue="5">
                  <option value="3">3 kaynak</option>
                  <option value="5">5 kaynak</option>
                  <option value="8">8 kaynak</option>
                  <option value="10">10 kaynak</option>
                </FieldSelect>

                <FieldSelect
                  label="Kaynak başına aday"
                  name="maxQuotesPerSource"
                  defaultValue="12"
                >
                  <option value="8">8 aday</option>
                  <option value="12">12 aday</option>
                  <option value="18">18 aday</option>
                  <option value="24">24 aday</option>
                  <option value="30">30 aday</option>
                </FieldSelect>
              </div>

              <button
                type="submit"
                className="rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                Yazarın Açık Kaynak Kitaplarını Ara
              </button>
            </div>
          </div>
        </form>

        <section className="mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <form
            action={importCuratedQuoteResearchAction}
            className="rounded-[2rem] bg-white p-5 shadow-sm md:p-7"
          >
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
              Profesyonel Araştırma Paketi
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Geniş kapsamlı koleksiyon taraması
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Hazır editoryal paket seç; sistem birden fazla yazar/tema aramasını
              sırayla çalıştırıp yeni adayları onay havuzuna aktarır.
            </p>

            <div className="mt-6 grid gap-4">
              <FieldSelect label="Araştırma koleksiyonu" name="collection" defaultValue="turkish_classics">
                {editorialCollections.map((collection) => (
                  <option key={collection.value} value={collection.value}>
                    {collection.label}
                  </option>
                ))}
              </FieldSelect>

              <div className="grid gap-4 sm:grid-cols-2">
                <FieldSelect label="Araştırma derinliği" name="depth" defaultValue="standard">
                  <option value="focused">Odaklı: hızlı tarama</option>
                  <option value="standard">Standart: dengeli tarama</option>
                  <option value="deep">Derin: geniş tarama</option>
                </FieldSelect>

                <div className="rounded-2xl bg-[#FAF7F0] p-4">
                  <p className="text-sm font-black text-slate-700">Koleksiyon içeriği</p>
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                    Seçtiğin pakete ek olarak aşağıdaki özel aramaları da ekleyebilirsin.
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-black text-slate-700">
                  Ek aramalar
                </label>
                <textarea
                  name="customSearches"
                  rows={4}
                  placeholder="Her satıra ek bir yazar, eser veya tema yazabilirsin..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] p-4 text-sm font-semibold leading-6 outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                Koleksiyon Araştırmasını Başlat
              </button>
            </div>
          </form>

          <section className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Yayına Hazır" value={publishReadyCount} tone="green" />
              <MetricCard label="Kaynak Linkli" value={sourceCoverageCount} tone="soft" />
              <MetricCard label="Çeviri Eksik" value={missingTranslationCount} tone="red" />
              <MetricCard label="Aktif Filtre" value={activeFilterCount} tone="amber" />
            </div>

            <div className="rounded-[2rem] bg-white p-5 shadow-sm md:p-7">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                    Editoryal İş Akışı
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Profesyonel yayın hattı</h2>
                </div>

                <div className="flex flex-wrap gap-2 text-xs font-black text-slate-500">
                  <span className="rounded-full bg-[#FAF7F0] px-3 py-2">
                    Vikikaynak: {sourceGroupCounts.wikisource || 0}
                  </span>
                  <span className="rounded-full bg-[#FAF7F0] px-3 py-2">
                    Gutendex: {sourceGroupCounts.gutendex || 0}
                  </span>
                  <span className="rounded-full bg-[#FAF7F0] px-3 py-2">
                    Manuel: {sourceGroupCounts.manual || 0}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                {workflowSteps.map((step, index) => (
                  <div key={step.title} className="rounded-2xl bg-[#FAF7F0] p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-sm font-black text-[#2E7D5B]">
                      {index + 1}
                    </div>
                    <p className="mt-3 text-sm font-black">{step.title}</p>
                    <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                      {step.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.28fr_0.72fr]">
          <form
            action={importTurkishWikisourceQuotesAction}
            className="rounded-[2rem] bg-white p-5 shadow-sm md:p-7"
          >
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
              Türkçe Kaynak Keşfi
            </p>

            <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <h2 className="text-2xl font-black">Vikikaynak’ta geniş arama yap</h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                  Yazar, eser, tür veya tema yaz. Sistem aynı aramayı başlık, şiir,
                  hikaye, eser ve benzeri varyasyonlarla dener; uygun metinlerden alıntı
                  adayları çıkarır.
                </p>
              </div>

              <span className="w-fit rounded-full bg-[#2E7D5B]/10 px-4 py-2 text-xs font-black text-[#2E7D5B]">
                Öncelikli Türkçe akış
              </span>
            </div>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-sm font-black text-slate-700">
                  Aranacak yazar, eser veya tema
                </label>
                <input
                  name="search"
                  placeholder="Örn: Yunus Emre, hürriyet, hikaye, şiir, Dede Korkut"
                  className="mt-2 min-h-[58px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-base font-bold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  {turkishSearchSuggestions.map((item) => (
                    <button
                      key={item}
                      type="submit"
                      name="suggestedSearch"
                      value={item}
                      className="rounded-full bg-[#FAF7F0] px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-[#2E7D5B]/10 hover:text-[#2E7D5B]"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FieldSelect label="Taranacak sayfa" name="maxPages" defaultValue="3">
                  <option value="1">1 sayfa</option>
                  <option value="2">2 sayfa</option>
                  <option value="3">3 sayfa</option>
                  <option value="5">5 sayfa</option>
                  <option value="8">8 sayfa</option>
                </FieldSelect>

                <FieldSelect label="Sayfa başına aday" name="maxQuotesPerPage" defaultValue="15">
                  <option value="10">10 aday</option>
                  <option value="15">15 aday</option>
                  <option value="20">20 aday</option>
                  <option value="30">30 aday</option>
                  <option value="40">40 aday</option>
                </FieldSelect>

                <label className="rounded-2xl border border-[#2E7D5B]/10 bg-[#FAF7F0] p-4">
                  <span className="text-sm font-black text-slate-700">Akıllı genişletme</span>
                  <span className="mt-2 flex items-center gap-3 text-sm font-bold text-slate-600">
                    <input
                      type="checkbox"
                      name="includeFallbacks"
                      defaultChecked
                      className="h-4 w-4 accent-[#2E7D5B]"
                    />
                    Önerilen klasik kaynakları da tara
                  </span>
                </label>
              </div>

              <button
                type="submit"
                className="rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                Türkçe Alıntı Adayı Üret
              </button>
            </div>
          </form>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm md:p-7">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
              Arama Rehberi
            </p>
            <h2 className="mt-2 text-2xl font-black">Daha iyi sonuç için</h2>

            <div className="mt-5 grid gap-3">
              {[
                "Önce yazar adıyla ara; sonuç azsa tema veya tür ekle.",
                "5 sayfa ve 20 aday seçimi geniş ama hala yönetilebilir bir taramadır.",
                "Fallback açıkken Türkçe klasiklerden ek kaynaklar da denenir.",
                "Onay öncesi kaynak linkini ve metnin bağlamını mutlaka kontrol et.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-[#FAF7F0] p-4 text-sm font-bold leading-6 text-slate-600"
                >
                  {item}
                </div>
              ))}
            </div>
          </section>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <form
            action={importGutenbergQuotesAction}
            className="rounded-[2rem] bg-white p-5 shadow-sm md:p-7"
          >
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
              Gutendex / Gutenberg
            </p>
            <h2 className="mt-2 text-2xl font-black">Kamu malı yabancı kaynak ara</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Project Gutenberg metinlerinden kısa adaylar üretir. İngilizce içeriklerde
              Türkçe çeviri de denenir ve çeviri durumu havuzda filtrelenebilir.
            </p>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="text-sm font-black text-slate-700">Arama kelimesi</label>
                <input
                  name="search"
                  placeholder="Örn: austen, dickens, adventure"
                  className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  {gutenbergSearchSuggestions.map((item) => (
                    <button
                      key={item}
                      type="submit"
                      name="suggestedSearch"
                      value={item}
                      className="rounded-full bg-[#FAF7F0] px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-[#F59E0B]/10 hover:text-[#B45309]"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FieldSelect label="Dil" name="language" defaultValue="en">
                  <option value="en">İngilizce</option>
                  <option value="tr">Türkçe</option>
                  <option value="fr">Fransızca</option>
                  <option value="de">Almanca</option>
                </FieldSelect>

                <FieldSelect label="Kitap" name="maxBooks" defaultValue="1">
                  <option value="1">1 kitap</option>
                  <option value="2">2 kitap</option>
                  <option value="3">3 kitap</option>
                </FieldSelect>

                <FieldSelect label="Kitap başına aday" name="maxQuotesPerBook" defaultValue="10">
                  <option value="5">5 aday</option>
                  <option value="10">10 aday</option>
                  <option value="15">15 aday</option>
                  <option value="20">20 aday</option>
                  <option value="25">25 aday</option>
                </FieldSelect>
              </div>

              <button
                type="submit"
                className="rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                Gutenberg Adayı Üret
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
            <h2 className="mt-2 text-2xl font-black">Güvenilir metinden aday çıkar</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Kamu malı, izinli veya kontrol edilecek bir Türkçe metni yapıştır. Sistem
              kısa ve anlamlı alıntı adayları çıkarır.
            </p>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FieldInput
                  label="Kaynak / eser başlığı"
                  name="title"
                  required
                  placeholder="Örn: Safahat"
                />
                <FieldInput
                  label="Yazar / kaynak kişi"
                  name="author"
                  placeholder="Örn: Mehmet Akif Ersoy"
                />
              </div>

              <FieldInput label="Kaynak linki" name="sourceUrl" placeholder="Varsa kaynak URL" />
              <FieldInput
                label="Kaynak / lisans notu"
                name="sourceNote"
                placeholder="Örn: Kamu malı olduğu kontrol edilecek"
              />

              <div>
                <label className="text-sm font-black text-slate-700">Türkçe metin</label>
                <textarea
                  name="rawText"
                  required
                  rows={8}
                  placeholder="Buraya uzun Türkçe metni yapıştır..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] p-4 text-sm font-semibold leading-6 outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>

              <FieldSelect label="Maksimum alıntı" name="maxQuotes" defaultValue="15">
                <option value="5">5 aday</option>
                <option value="10">10 aday</option>
                <option value="15">15 aday</option>
                <option value="25">25 aday</option>
                <option value="40">40 aday</option>
              </FieldSelect>

              <button
                type="submit"
                className="rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                Manuel Türkçe Alıntı Üret
              </button>
            </div>
          </form>
        </section>

        <section className="mt-6 rounded-[2rem] bg-white p-5 shadow-sm md:p-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Alıntı Havuzu
              </p>
              <h2 className="mt-2 text-2xl font-black">
                {getStatusLabel(selectedStatus)} alıntılar
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                {allQuoteItems.length} kayıt yüklendi, filtrelerle {quoteItems.length} kayıt
                gösteriliyor.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {statusFilters.map((item) => (
                <Link
                  key={item.value}
                  href={buildAdminQuoteUrl({
                    status: item.value,
                    q: quoteSearchQuery,
                    source: selectedSource,
                    language: selectedLanguage,
                    translation: selectedTranslation,
                  })}
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

          <form
            action="/admin/alintilar"
            className="mt-5 grid gap-3 rounded-[1.5rem] bg-[#FAF7F0] p-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_auto]"
          >
            <input type="hidden" name="status" value={selectedStatus} />
            <input
              name="q"
              defaultValue={quoteSearchQuery}
              placeholder="Alıntı, kitap, yazar, kaynak içinde ara"
              className="min-h-[48px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold outline-none transition focus:border-[#2E7D5B]"
            />

            <FilterSelect name="source" defaultValue={selectedSource} options={sourceFilters} />
            <FilterSelect
              name="language"
              defaultValue={selectedLanguage}
              options={languageFilters}
            />
            <FilterSelect
              name="translation"
              defaultValue={selectedTranslation}
              options={translationFilters}
            />

            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-full bg-[#2E7D5B] px-5 py-3 text-sm font-black text-white transition hover:bg-[#25684c]"
              >
                Filtrele
              </button>
              {activeFilterCount > 0 ? (
                <Link
                  href={buildAdminQuoteUrl({ status: selectedStatus })}
                  className="rounded-full bg-white px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                >
                  Temizle
                </Link>
              ) : null}
            </div>
          </form>

          <form
            id="bulkQuoteForm"
            action={bulkUpdateQuoteStatusAction}
            className="mt-4 flex flex-col justify-between gap-3 rounded-[1.5rem] border border-[#2E7D5B]/10 bg-white p-4 lg:flex-row lg:items-center"
          >
            <div>
              <p className="text-sm font-black text-[#1F2933]">Toplu editoryal işlem</p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                Kartlardaki seçim kutularını işaretle; en fazla 80 kayıt tek işlemde güncellenir.
              </p>
            </div>

            <input type="hidden" name="returnTo" value={currentListUrl} />

            <div className="flex flex-col gap-2 lg:items-end">
              <AdminQuoteBulkSelector formId="bulkQuoteForm" total={quoteItems.length} />

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  name="status"
                  value="approved"
                  className="rounded-full bg-[#2E7D5B] px-4 py-2.5 text-xs font-black text-white transition hover:-translate-y-0.5"
                >
                  Seçilileri Onayla
                </button>
                <button
                  type="submit"
                  name="status"
                  value="pending"
                  className="rounded-full bg-[#FAF7F0] px-4 py-2.5 text-xs font-black text-slate-600 transition hover:-translate-y-0.5"
                >
                  Beklemeye Al
                </button>
                <button
                  type="submit"
                  name="status"
                  value="rejected"
                  className="rounded-full bg-red-50 px-4 py-2.5 text-xs font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-100"
                >
                  Reddet
                </button>
              </div>
            </div>
          </form>

          {quoteItems.length === 0 ? (
            <div className="mt-6 rounded-[1.5rem] border border-dashed border-[#2E7D5B]/20 bg-[#FAF7F0] p-8 text-center">
              <h3 className="text-lg font-black">Bu filtrelerde alıntı yok</h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Filtreleri gevşetebilir veya üstteki kaynak keşif araçlarıyla yeni aday
                üretebilirsin.
              </p>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              {quoteItems.map((quote) => {
                const book = first(quote.quote_books);
                const qualityScore = getQuoteQualityScore(quote, book);
                const displayText = quote.quote_text_tr || quote.quote_text;
                const wordCount = getWordCount(displayText);
                const sourceGroup = getSourceGroup(book);

                return (
                  <article
                    key={quote.id}
                    className="rounded-[1.5rem] border border-slate-100 bg-[#FAF7F0] p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                            <input
                              form="bulkQuoteForm"
                              type="checkbox"
                              name="quoteIds"
                              value={quote.id}
                              data-bulk-form="bulkQuoteForm"
                              className="h-4 w-4 accent-[#2E7D5B]"
                            />
                            Seç
                          </label>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                              quote.status
                            )}`}
                          >
                            {getStatusLabel(quote.status)}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${getQualityClass(
                              qualityScore
                            )}`}
                          >
                            Kalite {qualityScore}
                          </span>

                          <Badge>{quote.original_language || "dil yok"}</Badge>
                          <Badge>{sourceGroup}</Badge>
                          <Badge>{wordCount} kelime</Badge>
                          {quote.translation_status ? (
                            <Badge>{quote.translation_status}</Badge>
                          ) : null}
                          {quote.topic ? <Badge>{quote.topic}</Badge> : null}
                          {quote.mood ? <Badge>{quote.mood}</Badge> : null}
                        </div>

                        <p className="mt-4 text-lg font-black leading-8 text-[#1F2933]">
                          “{quote.quote_text}”
                        </p>

                        {(qualityScore < 62 || !book?.source_url) ? (
                          <div className="mt-4 rounded-2xl bg-[#FFF7ED] p-4 text-sm font-bold leading-6 text-[#B45309]">
                            {qualityScore < 62
                              ? "Kalite skoru düşük. Uzunluk, kaynak ve çeviri alanlarını kontrol et."
                              : "Kaynak linki eksik. Yayına almadan önce kaynak doğrulaması yap."}
                          </div>
                        ) : null}

                        {quote.original_language !== "tr" && quote.quote_text_tr ? (
                          <div className="mt-4 rounded-2xl bg-white p-4">
                            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2E7D5B]">
                              Türkçe Çeviri
                            </p>
                            <p className="mt-2 text-sm font-bold leading-7 text-slate-700">
                              “{quote.quote_text_tr}”
                            </p>
                          </div>
                        ) : null}

                        {quote.original_language !== "tr" && !quote.quote_text_tr ? (
                          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600">
                            Türkçe çeviri üretilemedi. Onaylamadan önce manuel kontrol et.
                          </div>
                        ) : null}

                        <div className="mt-4 rounded-2xl bg-white p-4">
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div>
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

                            {book?.source_url ? (
                              <a
                                href={book.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="w-fit rounded-full bg-[#FAF7F0] px-3 py-2 text-xs font-black text-[#2E7D5B] transition hover:bg-[#2E7D5B]/10"
                              >
                                Kaynağı Aç
                              </a>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
                        {quote.status !== "approved" && (
                          <QuoteStatusForm
                            quoteId={quote.id}
                            status="approved"
                            returnTo={currentListUrl}
                            label="Onayla"
                            className="bg-[#2E7D5B] text-white"
                          />
                        )}

                        {quote.status !== "rejected" && (
                          <QuoteStatusForm
                            quoteId={quote.id}
                            status="rejected"
                            returnTo={currentListUrl}
                            label="Reddet"
                            className="bg-red-50 text-red-600 hover:bg-red-100"
                          />
                        )}

                        {quote.status !== "pending" && (
                          <QuoteStatusForm
                            quoteId={quote.id}
                            status="pending"
                            returnTo={currentListUrl}
                            label="Beklemeye Al"
                            className="bg-white text-slate-600"
                          />
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

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 text-center">
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-[11px] font-bold text-white/65">{label}</p>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber" | "red" | "soft";
}) {
  const toneClass =
    tone === "green"
      ? "bg-[#2E7D5B] text-white"
      : tone === "amber"
        ? "bg-[#FFFBEB] text-[#B45309]"
        : tone === "red"
          ? "bg-red-50 text-red-600"
          : "bg-white text-[#1F2933]";

  return (
    <div className={`rounded-[1.5rem] p-4 shadow-sm ${toneClass}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="mt-1 text-xs font-black opacity-75">{label}</p>
    </div>
  );
}

function FieldInput({
  label,
  name,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="text-sm font-black text-slate-700">{label}</label>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
      />
    </div>
  );
}

function FieldSelect({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-black text-slate-700">{label}</label>
      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 min-h-[52px] w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 text-sm font-semibold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
      >
        {children}
      </select>
    </div>
  );
}

function FilterSelect({
  name,
  defaultValue,
  options,
}: {
  name: string;
  defaultValue: string;
  options: { label: string; value: string }[];
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="min-h-[48px] rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none transition focus:border-[#2E7D5B]"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
      {children}
    </span>
  );
}

function QuoteStatusForm({
  quoteId,
  status,
  returnTo,
  label,
  className,
}: {
  quoteId: string;
  status: string;
  returnTo: string;
  label: string;
  className: string;
}) {
  return (
    <form action={updateQuoteStatusAction}>
      <input type="hidden" name="quoteId" value={quoteId} />
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <button
        type="submit"
        className={`w-full rounded-full px-5 py-3 text-sm font-black transition hover:-translate-y-0.5 ${className}`}
      >
        {label}
      </button>
    </form>
  );
}
