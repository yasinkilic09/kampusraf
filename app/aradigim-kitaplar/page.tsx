import Link from "next/link";
import { redirect } from "next/navigation";
import {
  closeBookRequestAction,
  createBookRequestAction,
  deleteBookRequestAction,
  reopenBookRequestAction,
} from "@/app/actions/book-requests";
import { createClient } from "@/lib/supabase/server";

type BookRequest = {
  id: string;
  title: string;
  author: string | null;
  category: string | null;
  city: string | null;
  university: string | null;
  note: string | null;
  status: string;
  is_active: boolean | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function getStatusLabel(status: string) {
  if (status === "active") return "Aktif Aranıyor";
  if (status === "matched") return "Eşleşme Bulundu";
  if (status === "closed") return "Kapalı";
  return status;
}

function getStatusClass(status: string) {
  if (status === "active") {
    return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  }

  if (status === "matched") {
    return "bg-[#F59E0B]/10 text-[#F59E0B]";
  }

  return "bg-slate-100 text-slate-500";
}

export default async function BookRequestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("city, university")
    .eq("id", user.id)
    .single();

  const { data, error } = await supabase
    .from("book_requests")
    .select(
      `
      id,
      title,
      author,
      category,
      city,
      university,
      note,
      status,
      is_active,
      created_at
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const requests = (data || []) as BookRequest[];

  const activeRequests = requests.filter((request) => request.status === "active");
  const closedRequests = requests.filter((request) => request.status === "closed");

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
              <p className="text-xs font-semibold text-slate-500">
                Aradığım kitaplar
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/kitap-ara" className="hover:text-[#2E7D5B]">
              Kitap Ara
            </Link>
            <Link href="/kitap-ekle" className="hover:text-[#2E7D5B]">
              Kitap Ekle
            </Link>
            <Link href="/mesajlar" className="hover:text-[#2E7D5B]">
              Mesajlar
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Kitap Talep Takibi
          </p>
          <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
  Bulamadığın kitabı kaydet.
</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
            Aradığın kitabı buraya ekle. İleride başka bir öğrenci bu kitabı
            sisteme eklediğinde bildirim altyapısına hazır olacak.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-5">
          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Toplam Arama</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B] md:mt-3 md:text-4xl">
              {requests.length}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Aktif Aranan</p>
            <p className="mt-2 text-3xl font-black text-[#F59E0B] md:mt-3 md:text-4xl">
              {activeRequests.length}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-7">
            <p className="text-sm font-bold text-slate-500">Kapatılan</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B] md:mt-3 md:text-4xl">
              {closedRequests.length}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:mt-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
          <section className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-9">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
              Yeni Arama
            </p>
            <h2 className="mt-3 text-2xl font-black md:text-3xl">Aradığın kitabı ekle</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Kitap adı zorunlu. Yazar ve kategori bilgisi arama eşleşmelerini
              daha güçlü hale getirir.
            </p>

            <form action={createBookRequestAction} className="mt-5 space-y-4 md:mt-7 md:space-y-5">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Kitap Adı
                </label>
                <input
                  required
                  name="title"
                  placeholder="Kürk Mantolu Madonna"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Yazar
                  </label>
                  <input
                    name="author"
                    placeholder="Sabahattin Ali"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Kategori
                  </label>
                  <input
                    name="category"
                    placeholder="Roman, ders kitabı..."
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 md:gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Şehir
                  </label>
                  <input
                    name="city"
                    defaultValue={profile?.city || ""}
                    placeholder="Aydın"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700">
                    Üniversite
                  </label>
                  <input
                    name="university"
                    defaultValue={profile?.university || ""}
                    placeholder="Aydın Adnan Menderes Üniversitesi"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Not
                </label>
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Bu kitabı sınav dönemi için arıyorum, ödünç de olabilir..."
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c]"
              >
                Aradığım Kitaplara Ekle
              </button>
            </form>
          </section>

          <section>
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-black md:text-3xl">Kayıtlı Aramalarım</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Aradığın kitapların aktiflik durumunu buradan yönetebilirsin.
                </p>
              </div>

              <Link
  href="/kitap-ara"
  className="w-full rounded-full bg-white px-6 py-3 text-center text-sm font-black text-[#2E7D5B] shadow-sm transition hover:-translate-y-0.5 sm:w-auto"
>
  Kitap Ara
</Link>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 md:mt-6 md:p-5">
                Aradığım kitaplar yüklenirken hata oluştu: {error.message}
              </div>
            )}

            {!error && requests.length === 0 ? (
              <div className="mt-5 rounded-[1.7rem] border border-dashed border-[#2E7D5B]/30 bg-white p-6 text-center shadow-sm md:mt-6 md:rounded-[2rem] md:p-10">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
                  🔎
                </div>
                <h3 className="mt-5 text-xl font-black md:text-2xl">
  Henüz arama kaydı yok
</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
                  Bulamadığın kitapları buraya ekleyerek daha sonra takip
                  edebilirsin.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3 md:mt-6 md:space-y-4">
                {requests.map((request) => (
                  <article
  key={request.id}
  className="rounded-[1.7rem] bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6"
>
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
  <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                              request.status
                            )}`}
                          >
                            {getStatusLabel(request.status)}
                          </span>

                          {request.category && (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                              {request.category}
                            </span>
                          )}
                        </div>

                        <h3 className="mt-3 line-clamp-2 text-xl font-black leading-tight text-[#1F2933] md:mt-4 md:text-2xl">
  {request.title}
</h3>

                        {request.author && (
                          <p className="mt-1 line-clamp-1 text-sm font-bold text-slate-500">
  {request.author}
</p>
                        )}

                        <div className="mt-3 rounded-2xl bg-[#FAF7F0] p-3 text-xs font-semibold text-slate-500 md:mt-4 md:p-4">
                          <p className="line-clamp-1">
  {request.university || "Üniversite bilgisi yok"}
</p>
<p className="mt-1 line-clamp-1">
  {request.city || "Şehir bilgisi yok"}
</p>
                          <p className="mt-1">
                            Oluşturulma: {formatDate(request.created_at)}
                          </p>
                        </div>

                        {request.note && (
                          <p className="mt-3 line-clamp-3 text-sm leading-7 text-slate-600 md:mt-4">
  {request.note}
</p>
                        )}
                      </div>

                      <div className="grid w-full shrink-0 gap-2 sm:w-auto">
                        <Link
  href={`/kitap-ara?q=${encodeURIComponent(request.title)}`}
  className="w-full rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-xs font-black text-white transition hover:-translate-y-0.5"
>
  Sistemde Ara
</Link>

                        {request.status === "active" ? (
                          <form action={closeBookRequestAction} className="w-full">
                            <input
                              type="hidden"
                              name="requestId"
                              value={request.id}
                            />
                            <button
                              type="submit"
                              className="w-full rounded-full border border-[#F59E0B]/30 px-5 py-3 text-xs font-black text-[#F59E0B] transition hover:-translate-y-0.5 hover:bg-[#F59E0B]/5"
                            >
                              Aramayı Kapat
                            </button>
                          </form>
                        ) : (
                          <form action={reopenBookRequestAction} className="w-full">
                            <input
                              type="hidden"
                              name="requestId"
                              value={request.id}
                            />
                            <button
                              type="submit"
                              className="w-full rounded-full border border-[#2E7D5B]/30 px-5 py-3 text-xs font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                            >
                              Tekrar Aktif Et
                            </button>
                          </form>
                        )}

                        <form action={deleteBookRequestAction} className="w-full">
                          <input
                            type="hidden"
                            name="requestId"
                            value={request.id}
                          />
                          <button
                            type="submit"
                            className="w-full rounded-full border border-red-200 px-5 py-3 text-xs font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-50"
                          >
                            Sil
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}