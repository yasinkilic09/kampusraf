"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const conditions = [
  { value: "yeni", label: "Yeni" },
  { value: "temiz", label: "Temiz" },
  { value: "az_kullanilmis", label: "Az Kullanılmış" },
  { value: "orta", label: "Orta" },
  { value: "yipranmis", label: "Yıpranmış" },
];

const exchangeTypes = [
  { value: "takas", label: "Takas" },
  { value: "odunc", label: "Ödünç" },
  { value: "satis", label: "Satış" },
  { value: "bagis", label: "Bağış" },
];

export default function AddBookPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [isbn, setIsbn] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [bookCondition, setBookCondition] = useState("temiz");
  const [exchangeType, setExchangeType] = useState("takas");
  const [note, setNote] = useState("");
  const [city, setCity] = useState("");
  const [university, setUniversity] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: profile } = await supabase
  .from("profiles")
  .select("monthly_book_limit, account_status, city, university")
  .eq("id", user.id)
  .single();

if (profile?.account_status === "banned") {
  window.location.href = "/hesap-kisitlandi";
  return;
}

if (profile?.account_status === "suspended") {
  setError("Hesabın geçici olarak askıya alındığı için kitap ekleyemezsin.");
  return;
}

      if (profile?.city) setCity(profile.city);
      if (profile?.university) setUniversity(profile.university);
    }

    loadProfile();
  }, [router, supabase]);

function getCurrentMonthStart() {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0)
  ).toISOString();
}

async function checkBookLimit(userId: string) {
  const monthStart = getCurrentMonthStart();

  const { data: profile } = await supabase
    .from("profiles")
    .select("monthly_book_limit")
    .eq("id", userId)
    .single();

  const { count } = await supabase
    .from("user_books")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  const limit = profile?.monthly_book_limit ?? 10;
  const currentUsage = count ?? 0;

  return {
    allowed: currentUsage < limit,
    currentUsage,
    limit,
    remaining: Math.max(limit - currentUsage, 0),
  };
}

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setMessage("Oturum bulunamadı. Lütfen tekrar giriş yap.");
      setIsLoading(false);
      router.push("/auth/login");
      return;
    }

    const limitCheck = await checkBookLimit(user.id);

if (!limitCheck.allowed) {
  setMessage(
    `Aylık kitap ekleme limitine ulaştın. Mevcut limitin: ${limitCheck.limit}/ay.`
  );
  setIsLoading(false);
  return;
}

    const { data: book, error: bookError } = await supabase
      .from("books")
      .insert({
        title: title.trim(),
        author: author.trim(),
        category: category.trim(),
        isbn: isbn.trim() || null,
        cover_url: coverUrl.trim() || null,
      })
      .select("id")
      .single();

    if (bookError || !book) {
      console.error("Kitap kayıt hatası:", bookError);
      setMessage(`Kitap kaydedilemedi: ${bookError?.message || "Bilinmeyen hata"}`);
      setIsLoading(false);
      return;
    }

    const { data: userBook, error: userBookError } = await supabase
  .from("user_books")
  .insert({
    user_id: user.id,
    book_id: book.id,
    condition: bookCondition,
    exchange_type: exchangeType,
    status: "mevcut",
    custom_title: title.trim(),
    custom_author: author.trim(),
    image_url: coverUrl.trim() || null,
    note: note.trim() || null,
    city: city.trim(),
    university: university.trim(),
    is_active: true,
  })
  .select("id")
  .single();

    if (userBookError) {
      console.error("Kullanıcı kitabı kayıt hatası:", userBookError);
      setMessage(`Kitap rafa eklenemedi: ${userBookError.message}`);
      setIsLoading(false);
      return;
    }

if (userBook?.id) {
  const { error: matchError } = await supabase.rpc(
    "create_matches_for_user_book",
    {
      p_user_book_id: userBook.id,
    }
  );

 if (matchError) {
  console.warn("Eşleşme oluşturma uyarısı:", {
    code: matchError.code,
    message: matchError.message,
    details: matchError.details,
    hint: matchError.hint,
  });
}
}

    setMessage("Kitap başarıyla rafa eklendi. Kitaplarım sayfasına yönlendiriliyorsun.");

    setTimeout(() => {
      router.push("/kitaplarim");
      router.refresh();
    }, 1000);
  }

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              📚
            </div>
            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">Kitap ekle</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/kitaplarim" className="hover:text-[#2E7D5B]">
              Kitaplarım
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 md:px-6 md:py-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-8">
        <aside className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-8">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Kitap Ekle
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight md:text-4xl">
  Rafındaki kitabı kampüsle paylaş.
</h1>
          <p className="mt-4 text-sm leading-7 text-white/75 md:text-base">
            Kitabını ekledikten sonra diğer öğrenciler arama yaptığında bu kitabı
            görebilecek. Takas, ödünç, satış veya bağış seçeneklerinden birini
            seçebilirsin.
          </p>

          <div className="mt-6 space-y-3 md:mt-8 md:space-y-4">
            {[
              "Kitap adı ve yazar bilgisi girilir.",
              "Kitabın durumu ve paylaşım türü seçilir.",
              "Şehir ve üniversite bilgisiyle görünür hale gelir.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/10 p-3 text-sm font-semibold text-white/85 md:rounded-3xl md:p-4"
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-9">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
              Yeni Kitap
            </p>
            <h2 className="mt-3 text-2xl font-black md:text-3xl">Kitap bilgileri</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              İlk MVP’de kitap fotoğrafı yükleme yerine kapak görseli URL alanı
              kullanıyoruz. Sonraki aşamada Supabase Storage ile fotoğraf yükleme
              ekleyeceğiz.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4 md:mt-8 md:space-y-5">
            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Kitap Adı
                </label>
                <input
                  required
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Suç ve Ceza"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">Yazar</label>
                <input
                  required
                  value={author}
                  onChange={(event) => setAuthor(event.target.value)}
                  placeholder="Dostoyevski"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Kategori
                </label>
                <input
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Roman, Ders Kitabı, Akademik..."
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">ISBN</label>
                <input
                  value={isbn}
                  onChange={(event) => setIsbn(event.target.value)}
                  placeholder="İsteğe bağlı"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Kapak Görseli URL
              </label>
              <input
                value={coverUrl}
                onChange={(event) => setCoverUrl(event.target.value)}
                placeholder="https://..."
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Kitap Durumu
                </label>
                <select
                  value={bookCondition}
                  onChange={(event) => setBookCondition(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                >
                  {conditions.map((condition) => (
                    <option key={condition.value} value={condition.value}>
                      {condition.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Paylaşım Türü
                </label>
                <select
                  value={exchangeType}
                  onChange={(event) => setExchangeType(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                >
                  {exchangeTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              <div>
                <label className="text-sm font-bold text-slate-700">Şehir</label>
                <input
                  required
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Aydın"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Üniversite
                </label>
                <input
                  required
                  value={university}
                  onChange={(event) => setUniversity(event.target.value)}
                  placeholder="Aydın Adnan Menderes Üniversitesi"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">
                Açıklama / Not
              </label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Kitabın durumu, teslim şekli veya takas tercihin hakkında kısa bilgi yazabilirsin."
                rows={3}
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              />
            </div>

            {message && (
              <div className="break-words rounded-2xl bg-[#FAF7F0] px-4 py-3 text-sm font-semibold text-[#2E7D5B]">
  {message}
</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Kitap ekleniyor..." : "Kitabı Rafa Ekle"}
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}