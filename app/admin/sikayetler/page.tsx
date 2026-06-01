import Link from "next/link";
import { redirect } from "next/navigation";
import { updateUserReportAction } from "@/app/actions/user-reports";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  status?: string;
  success?: string;
  error?: string;
};

type ReportProfile = {
  full_name: string | null;
  username: string | null;
  email: string | null;
  account_status: string | null;
  verification_status: string | null;
};

type UserReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  conversation_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  reporter: ReportProfile | ReportProfile[] | null;
  reported_user: ReportProfile | ReportProfile[] | null;
};

function first<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

function getReasonLabel(reason: string) {
  if (reason === "spam") return "Spam / Rahatsız Edici Mesaj";
  if (reason === "harassment") return "Taciz / Kötü Davranış";
  if (reason === "fraud") return "Dolandırıcılık Şüphesi";
  if (reason === "inappropriate") return "Uygunsuz İçerik";
  if (reason === "unsafe_exchange") return "Güvensiz Takas";
  return "Diğer";
}

function getStatusLabel(status: string) {
  if (status === "pending") return "Bekliyor";
  if (status === "reviewed") return "İncelendi";
  if (status === "action_taken") return "Aksiyon Alındı";
  if (status === "rejected") return "Reddedildi";
  return "Bekliyor";
}

function getStatusClass(status: string) {
  if (status === "pending") return "bg-[#F59E0B]/10 text-[#F59E0B]";
  if (status === "reviewed") return "bg-blue-50 text-blue-600";
  if (status === "action_taken") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "rejected") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
}

function getAccountStatusLabel(status?: string | null) {
  if (status === "suspended") return "Askıda";
  if (status === "banned") return "Engelli";
  return "Aktif";
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

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};
  const statusFilter = params.status || "all";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") {
    redirect("/dashboard");
  }

  let query = supabase
    .from("user_reports")
    .select(
      `
      id,
      reporter_id,
      reported_user_id,
      conversation_id,
      reason,
      description,
      status,
      admin_note,
      created_at,
      updated_at,
      reporter:profiles!user_reports_reporter_id_fkey (
        full_name,
        username,
        email,
        account_status,
        verification_status
      ),
      reported_user:profiles!user_reports_reported_user_id_fkey (
        full_name,
        username,
        email,
        account_status,
        verification_status
      )
    `
    )
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query.limit(100);
  const reports = (data || []) as UserReportRow[];

  const pendingCount = reports.filter((item) => item.status === "pending").length;
  const actionTakenCount = reports.filter(
    (item) => item.status === "action_taken"
  ).length;

    return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-600 text-xl text-white">
              🚩
            </div>
            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Şikayet Yönetimi
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/admin" className="hover:text-[#2E7D5B]">
              Admin Panel
            </Link>
            <Link href="/admin/kullanicilar" className="hover:text-[#2E7D5B]">
              Kullanıcılar
            </Link>
            <Link href="/admin/dogrulamalar" className="hover:text-[#2E7D5B]">
              Doğrulamalar
            </Link>
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-[1.7rem] bg-red-600 p-6 text-white shadow-2xl shadow-red-600/20 md:rounded-[2rem] md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-red-100">
            Güvenlik Merkezi
          </p>

          <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
            Kullanıcı şikayetleri
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 md:text-base">
            Mesajlaşma üzerinden gelen kullanıcı bildirimlerini inceleyebilir,
            gerekli durumda ilgili kullanıcıyı askıya alabilir veya
            engelleyebilirsin.
          </p>
        </div>

        {params.success && (
          <div className="mt-4 rounded-2xl bg-[#2E7D5B]/10 p-4 text-sm font-black text-[#2E7D5B] md:mt-6">
            İşlem başarıyla tamamlandı.
          </div>
        )}

        {params.error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-black text-red-700 md:mt-6">
            {decodeURIComponent(params.error)}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 md:mt-6">
            Şikayetler yüklenirken hata oluştu: {error.message}
          </div>
        )}

        <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-5">
          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
            <p className="text-sm font-bold text-slate-500">Listelenen</p>
            <p className="mt-2 text-3xl font-black text-red-600">
              {reports.length}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
            <p className="text-sm font-bold text-slate-500">Bekleyen</p>
            <p className="mt-2 text-3xl font-black text-[#F59E0B]">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
            <p className="text-sm font-bold text-slate-500">Aksiyon Alınan</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B]">
              {actionTakenCount}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-[1.7rem] bg-white p-4 shadow-sm md:mt-8 md:rounded-[2rem] md:p-6">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/sikayetler"
              className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-[#2E7D5B] hover:text-white"
            >
              Tümü
            </Link>

            <Link
              href="/admin/sikayetler?status=pending"
              className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-[#2E7D5B] hover:text-white"
            >
              Bekleyen
            </Link>

            <Link
              href="/admin/sikayetler?status=reviewed"
              className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-[#2E7D5B] hover:text-white"
            >
              İncelenen
            </Link>

            <Link
              href="/admin/sikayetler?status=action_taken"
              className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-[#2E7D5B] hover:text-white"
            >
              Aksiyon Alınan
            </Link>

            <Link
              href="/admin/sikayetler?status=rejected"
              className="rounded-full bg-[#FAF7F0] px-4 py-2 text-xs font-black text-slate-600 transition hover:bg-[#2E7D5B] hover:text-white"
            >
              Reddedilen
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:mt-8">
          {reports.length === 0 ? (
            <div className="rounded-[1.7rem] border border-dashed border-red-200 bg-white p-8 text-center shadow-sm md:rounded-[2rem] md:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl">
                🚩
              </div>

              <h2 className="mt-5 text-2xl font-black">
                Şikayet bulunamadı
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
                Kullanıcılar mesajlaşma ekranından şikayet gönderdiğinde burada
                listelenecek.
              </p>
            </div>
          ) : (
            reports.map((report) => {
              const reporter = first(report.reporter);
              const reportedUser = first(report.reported_user);

              return (
                <article
                  key={report.id}
                  className="rounded-[1.7rem] bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-black ${getStatusClass(
                            report.status
                          )}`}
                        >
                          {getStatusLabel(report.status)}
                        </span>

                        <span className="rounded-full bg-red-50 px-3 py-1 text-[11px] font-black text-red-600">
                          {getReasonLabel(report.reason)}
                        </span>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                          Bildirilen hesap:{" "}
                          {getAccountStatusLabel(reportedUser?.account_status)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-2xl bg-[#FAF7F0] p-4">
                          <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                            Şikayet Eden
                          </p>
                          <p className="mt-2 break-words text-sm font-black text-[#1F2933]">
                            {reporter?.full_name ||
                              reporter?.username ||
                              "Kullanıcı"}
                          </p>
                          <p className="mt-1 break-words text-xs font-bold text-slate-500">
                            {reporter?.email || "E-posta yok"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-red-50 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.15em] text-red-300">
                            Şikayet Edilen
                          </p>
                          <p className="mt-2 break-words text-sm font-black text-[#1F2933]">
                            {reportedUser?.full_name ||
                              reportedUser?.username ||
                              "Kullanıcı"}
                          </p>
                          <p className="mt-1 break-words text-xs font-bold text-slate-500">
                            {reportedUser?.email || "E-posta yok"}
                          </p>
                        </div>
                      </div>

                      {report.description && (
                        <div className="mt-4 rounded-2xl bg-[#FAF7F0] p-4">
                          <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                            Açıklama
                          </p>
                          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                            {report.description}
                          </p>
                        </div>
                      )}

                      {report.admin_note && (
                        <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-400">
                            Admin Notu
                          </p>
                          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">
                            {report.admin_note}
                          </p>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3 text-xs font-bold text-slate-400">
                        <span>Oluşturulma: {formatDate(report.created_at)}</span>

                        {report.conversation_id && (
                          <Link
                            href={`/mesajlar/${report.conversation_id}`}
                            className="text-[#2E7D5B] hover:underline"
                          >
                            Sohbeti Aç
                          </Link>
                        )}
                      </div>
                    </div>

                    <form
                      action={updateUserReportAction}
                      className="grid shrink-0 gap-3 xl:w-72"
                    >
                      <input type="hidden" name="reportId" value={report.id} />

                      <div>
                        <label className="text-xs font-black text-slate-400">
                          Şikayet Durumu
                        </label>
                        <select
                          name="status"
                          defaultValue={report.status}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-xs font-bold outline-none focus:border-[#2E7D5B]"
                        >
                          <option value="pending">Bekliyor</option>
                          <option value="reviewed">İncelendi</option>
                          <option value="action_taken">Aksiyon Alındı</option>
                          <option value="rejected">Reddedildi</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-black text-slate-400">
                          Kullanıcı Aksiyonu
                        </label>
                        <select
                          name="accountAction"
                          defaultValue="none"
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-xs font-bold outline-none focus:border-[#2E7D5B]"
                        >
                          <option value="none">Hesaba dokunma</option>
                          <option value="active">Aktif yap</option>
                          <option value="suspended">Askıya al</option>
                          <option value="banned">Engelle</option>
                        </select>
                      </div>

                      <textarea
                        name="adminNote"
                        rows={3}
                        defaultValue={report.admin_note || ""}
                        placeholder="Admin notu..."
                        className="w-full resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-xs outline-none focus:border-[#2E7D5B]"
                      />

                      <button
                        type="submit"
                        className="rounded-full bg-red-600 px-5 py-3 text-xs font-black text-white transition hover:-translate-y-0.5"
                      >
                        Güncelle
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </main>
  );
}