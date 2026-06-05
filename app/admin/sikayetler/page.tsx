import Link from "next/link";
import { redirect } from "next/navigation";
import { updateUserReportAction } from "@/app/actions/user-reports";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  status?: string;
  reason?: string;
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

const reportReasons = [
  { value: "spam", label: "Spam / Rahatsız Edici" },
  { value: "harassment", label: "Taciz / Kötü Davranış" },
  { value: "fraud", label: "Dolandırıcılık Şüphesi" },
  { value: "inappropriate", label: "Uygunsuz İçerik" },
  { value: "unsafe_exchange", label: "Güvensiz Takas" },
  { value: "other", label: "Diğer" },
];

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

function getReasonIcon(reason: string) {
  if (reason === "spam") return "📨";
  if (reason === "harassment") return "⚠️";
  if (reason === "fraud") return "🚨";
  if (reason === "inappropriate") return "🚫";
  if (reason === "unsafe_exchange") return "🤝";
  return "🚩";
}

function getReasonClass(reason: string) {
  if (reason === "fraud") return "bg-red-50 text-red-600";
  if (reason === "harassment") return "bg-red-50 text-red-600";
  if (reason === "unsafe_exchange") return "bg-[#F59E0B]/10 text-[#B45309]";
  if (reason === "inappropriate") return "bg-purple-50 text-purple-700";
  if (reason === "spam") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-600";
}

function getStatusLabel(status: string) {
  if (status === "pending") return "Bekliyor";
  if (status === "reviewed") return "İncelendi";
  if (status === "action_taken") return "Aksiyon Alındı";
  if (status === "rejected") return "Reddedildi";
  return "Bekliyor";
}

function getStatusClass(status: string) {
  if (status === "pending") return "bg-[#F59E0B]/10 text-[#B45309]";
  if (status === "reviewed") return "bg-blue-50 text-blue-700";
  if (status === "action_taken") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "rejected") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
}

function getAccountStatusLabel(status?: string | null) {
  if (status === "suspended") return "Askıda";
  if (status === "banned") return "Engelli";
  return "Aktif";
}

function getAccountStatusClass(status?: string | null) {
  if (status === "banned") return "bg-red-50 text-red-600";
  if (status === "suspended") return "bg-[#F59E0B]/10 text-[#B45309]";
  return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
}

function getVerificationLabel(status?: string | null) {
  if (status === "verified") return "Doğrulanmış";
  if (status === "pending") return "Doğrulama Bekliyor";
  if (status === "rejected") return "Doğrulama Reddedildi";
  return "Doğrulanmadı";
}

function getVerificationClass(status?: string | null) {
  if (status === "verified") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "pending") return "bg-[#F59E0B]/10 text-[#B45309]";
  if (status === "rejected") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
}

function getDisplayName(profile?: ReportProfile | null) {
  return (
    profile?.full_name ||
    profile?.username ||
    profile?.email ||
    "KampüsRaf kullanıcısı"
  );
}

function getInitial(profile?: ReportProfile | null) {
  return getDisplayName(profile).trim().charAt(0).toUpperCase() || "K";
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

function ReportStatCard({
  label,
  value,
  icon,
  colorClass,
  description,
}: {
  label: string;
  value: number;
  icon: string;
  colorClass: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-red-100 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-500">{label}</p>
          <p className={`mt-2 text-3xl font-black ${colorClass}`}>{value}</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-400">
            {description}
          </p>
        </div>

        <span className="shrink-0 text-2xl">{icon}</span>
      </div>
    </div>
  );
}

function PersonBox({
  label,
  profile,
  danger,
}: {
  label: string;
  profile: ReportProfile | null;
  danger?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 ${danger ? "bg-red-50" : "bg-[#FAF7F0]"}`}>
      <div className="flex gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${
            danger
              ? "bg-white text-red-600"
              : "bg-white text-[#2E7D5B]"
          }`}
        >
          {getInitial(profile)}
        </div>

        <div className="min-w-0">
          <p
            className={`text-xs font-black uppercase tracking-[0.15em] ${
              danger ? "text-red-300" : "text-slate-400"
            }`}
          >
            {label}
          </p>

          <p className="mt-2 break-words text-sm font-black text-[#1F2933]">
            {getDisplayName(profile)}
          </p>

          <p className="mt-1 break-words text-xs font-bold text-slate-500">
            {profile?.email || "E-posta yok"}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-black ${getAccountStatusClass(
                profile?.account_status
              )}`}
            >
              {getAccountStatusLabel(profile?.account_status)}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-[11px] font-black ${getVerificationClass(
                profile?.verification_status
              )}`}
            >
              {getVerificationLabel(profile?.verification_status)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};
  const statusFilter = params.status || "all";
  const reasonFilter = params.reason || "all";

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

  if (reasonFilter !== "all") {
    query = query.eq("reason", reasonFilter);
  }

  const { data, error } = await query.limit(100);
  const reports = (data || []) as UserReportRow[];

  const pendingCount = reports.filter((item) => item.status === "pending").length;
  const reviewedCount = reports.filter((item) => item.status === "reviewed").length;
  const actionTakenCount = reports.filter(
    (item) => item.status === "action_taken"
  ).length;
  const rejectedCount = reports.filter((item) => item.status === "rejected").length;

  const highRiskCount = reports.filter(
    (item) =>
      item.reason === "fraud" ||
      item.reason === "harassment" ||
      item.reason === "unsafe_exchange"
  ).length;

  const activeFilterCount = [
    statusFilter !== "all" ? "status" : "",
    reasonFilter !== "all" ? "reason" : "",
  ].filter(Boolean).length;

  const hasFilters = activeFilterCount > 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-red-100 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-600 text-xl text-white">
              🚩
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Şikayet ve güvenlik merkezi
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/admin" className="hover:text-red-600">
              Admin
            </Link>
            <Link href="/admin/kullanicilar" className="hover:text-red-600">
              Kullanıcılar
            </Link>
            <Link href="/admin/dogrulamalar" className="hover:text-red-600">
              Doğrulamalar
            </Link>
            <Link href="/dashboard" className="hover:text-red-600">
              Panel
            </Link>
          </nav>

          <Link
            href="/admin/kullanicilar"
            className="shrink-0 rounded-full bg-red-600 px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-red-700"
          >
            Kullanıcılar
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <section className="overflow-hidden rounded-[1.8rem] bg-red-600 text-white shadow-xl shadow-red-600/15 md:rounded-[2.2rem]">
          <div className="relative p-6 md:p-8">
            <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/2 h-40 w-40 rounded-full bg-[#F59E0B]/20 blur-3xl" />

            <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.22em] text-red-100">
                  Şikayet ve Güvenlik Merkezi
                </p>

                <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                  Kullanıcı bildirimlerini güvenli şekilde incele.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 md:text-base">
                  Mesajlaşma üzerinden gelen şikayetleri inceleyebilir, admin
                  notu ekleyebilir, durumu güncelleyebilir ve gerekli durumda
                  bildirilen kullanıcı için hesap aksiyonu alabilirsin.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/admin"
                    className="rounded-full bg-white px-7 py-4 text-center text-sm font-black text-red-600 transition hover:-translate-y-0.5"
                  >
                    Admin Panele Dön
                  </Link>

                  <Link
                    href="/admin/kullanicilar"
                    className="rounded-full border border-white/25 px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    Kullanıcı Yönetimi
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[340px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {reports.length}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Listelenen
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {pendingCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Bekleyen
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {actionTakenCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Aksiyon
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {highRiskCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Riskli
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

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

        <section className="mt-6 grid gap-3 md:mt-8 md:grid-cols-2 lg:grid-cols-4">
          <ReportStatCard
            label="Listelenen"
            value={reports.length}
            icon="🚩"
            colorClass="text-red-600"
            description="Mevcut filtreye göre listelenen şikayet."
          />

          <ReportStatCard
            label="Bekleyen"
            value={pendingCount}
            icon="⏳"
            colorClass="text-[#F59E0B]"
            description="Henüz incelenmemiş güvenlik bildirimleri."
          />

          <ReportStatCard
            label="İncelenen"
            value={reviewedCount}
            icon="👁️"
            colorClass="text-blue-600"
            description="Admin tarafından incelenmiş şikayetler."
          />

          <ReportStatCard
            label="Aksiyon Alınan"
            value={actionTakenCount}
            icon="🛡️"
            colorClass="text-[#2E7D5B]"
            description="Hesap veya şikayet üzerinde işlem yapılan kayıtlar."
          />
        </section>

        <section className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <form
              action="/admin/sikayetler"
              className="rounded-[1.8rem] bg-white p-4 shadow-sm ring-1 ring-red-100 md:rounded-[2rem] md:p-6"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-red-500">
                    Filtreleme
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Şikayetleri daralt
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Şikayetleri durum ve sebep türüne göre filtreleyebilirsin.
                  </p>
                </div>

                {hasFilters && (
                  <span className="w-fit rounded-full bg-[#F59E0B]/10 px-4 py-2 text-xs font-black text-[#B45309]">
                    {activeFilterCount} filtre aktif
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-bold outline-none transition focus:border-red-500 focus:bg-white"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="pending">Bekleyen</option>
                  <option value="reviewed">İncelenen</option>
                  <option value="action_taken">Aksiyon Alınan</option>
                  <option value="rejected">Reddedilen</option>
                </select>

                <select
                  name="reason"
                  defaultValue={reasonFilter}
                  className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-bold outline-none transition focus:border-red-500 focus:bg-white"
                >
                  <option value="all">Tüm Sebepler</option>
                  {reportReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="rounded-full bg-red-600 px-7 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-red-700"
                >
                  Filtrele
                </button>

                <Link
                  href="/admin/sikayetler"
                  className="rounded-full border border-red-100 px-7 py-3 text-center text-sm font-black text-red-600 transition hover:-translate-y-0.5 hover:bg-red-50"
                >
                  Filtreleri Temizle
                </Link>
              </div>
            </form>

            {reports.length === 0 ? (
              <section className="rounded-[1.8rem] border border-dashed border-red-200 bg-white p-8 text-center shadow-sm ring-1 ring-red-100 md:rounded-[2rem] md:p-12">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl">
                  🚩
                </div>

                <h2 className="mt-5 text-2xl font-black">
                  Şikayet bulunamadı
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
                  Kullanıcılar mesajlaşma ekranından şikayet gönderdiğinde veya
                  filtrelere uygun kayıt oluştuğunda burada listelenecek.
                </p>
              </section>
            ) : (
              <div className="grid gap-4">
                {reports.map((report) => {
                  const reporter = first(report.reporter);
                  const reportedUser = first(report.reported_user);

                  return (
                    <article
                      key={report.id}
                      className="overflow-hidden rounded-[1.7rem] bg-white shadow-sm ring-1 ring-red-100 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem]"
                    >
                      <div className="p-4 md:p-6">
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

                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-black ${getReasonClass(
                                  report.reason
                                )}`}
                              >
                                {getReasonIcon(report.reason)}{" "}
                                {getReasonLabel(report.reason)}
                              </span>

                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-black ${getAccountStatusClass(
                                  reportedUser?.account_status
                                )}`}
                              >
                                Bildirilen:{" "}
                                {getAccountStatusLabel(
                                  reportedUser?.account_status
                                )}
                              </span>
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-2">
                              <PersonBox label="Şikayet Eden" profile={reporter} />

                              <PersonBox
                                label="Şikayet Edilen"
                                profile={reportedUser}
                                danger
                              />
                            </div>

                            {report.description && (
                              <div className="mt-4 rounded-2xl bg-[#FAF7F0] p-4">
                                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                                  Kullanıcı Açıklaması
                                </p>
                                <p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                                  {report.description}
                                </p>
                              </div>
                            )}

                            {report.admin_note && (
                              <div className="mt-4 rounded-2xl bg-blue-50 p-4">
                                <p className="text-xs font-black uppercase tracking-[0.15em] text-blue-400">
                                  Admin Notu
                                </p>
                                <p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-slate-600">
                                  {report.admin_note}
                                </p>
                              </div>
                            )}

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                                  Oluşturulma
                                </p>
                                <p className="mt-2 text-sm font-bold text-slate-700">
                                  {formatDate(report.created_at)}
                                </p>
                              </div>

                              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                                  Son Güncelleme
                                </p>
                                <p className="mt-2 text-sm font-bold text-slate-700">
                                  {formatDate(report.updated_at)}
                                </p>
                              </div>
                            </div>

                            {report.conversation_id && (
                              <div className="mt-4">
                                <Link
                                  href={`/mesajlar/${report.conversation_id}`}
                                  className="inline-flex rounded-full border border-[#2E7D5B]/20 px-5 py-2.5 text-xs font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                                >
                                  İlgili Sohbeti Aç
                                </Link>
                              </div>
                            )}
                          </div>

                          <form
                            action={updateUserReportAction}
                            className="grid shrink-0 gap-3 xl:w-72"
                          >
                            <input
                              type="hidden"
                              name="reportId"
                              value={report.id}
                            />

                            <div>
                              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                Şikayet Durumu
                              </label>
                              <select
                                name="status"
                                defaultValue={report.status}
                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-xs font-bold outline-none transition focus:border-red-500 focus:bg-white"
                              >
                                <option value="pending">Bekliyor</option>
                                <option value="reviewed">İncelendi</option>
                                <option value="action_taken">
                                  Aksiyon Alındı
                                </option>
                                <option value="rejected">Reddedildi</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                Bildirilen Kullanıcı Aksiyonu
                              </label>
                              <select
                                name="accountAction"
                                defaultValue="none"
                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-xs font-bold outline-none transition focus:border-red-500 focus:bg-white"
                              >
                                <option value="none">Hesaba dokunma</option>
                                <option value="active">Aktif yap</option>
                                <option value="suspended">Askıya al</option>
                                <option value="banned">Engelle</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                Admin Notu
                              </label>
                              <textarea
                                name="adminNote"
                                rows={4}
                                defaultValue={report.admin_note || ""}
                                placeholder="İnceleme notu yaz..."
                                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-xs outline-none transition focus:border-red-500 focus:bg-white"
                              />
                            </div>

                            <button
                              type="submit"
                              className="rounded-full bg-red-600 px-5 py-3 text-xs font-black text-white transition hover:-translate-y-0.5 hover:bg-red-700"
                            >
                              Şikayeti Güncelle
                            </button>
                          </form>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-red-100 md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-500">
                Güvenlik Özeti
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-red-400">
                    Yüksek Risk
                  </p>
                  <p className="mt-2 text-2xl font-black text-red-600">
                    {highRiskCount}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Dolandırıcılık, taciz veya güvensiz takas bildirimleri.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F59E0B]/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#B45309]">
                    Bekleyen
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#B45309]">
                    {pendingCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#2E7D5B]/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2E7D5B]">
                    Aksiyon Alınan
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#2E7D5B]">
                    {actionTakenCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-100 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Reddedilen
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-700">
                    {rejectedCount}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-red-600 p-5 text-white shadow-sm md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-red-100">
                İnceleme Notu
              </p>

              <h3 className="mt-2 text-xl font-black">
                Hesap aksiyonu almadan önce şikayeti kontrol et.
              </h3>

              <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-white/80">
                <p className="rounded-2xl bg-white/10 p-3">
                  ✓ Açıklama ve sohbet bağlamını kontrol et.
                </p>
                <p className="rounded-2xl bg-white/10 p-3">
                  ✓ Askıya alma geçici kısıtlama için daha uygundur.
                </p>
                <p className="rounded-2xl bg-white/10 p-3">
                  ✓ Engelleme kararını yüksek riskli durumlarda kullan.
                </p>
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-[#F59E0B]/20 bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                Hızlı Erişim
              </p>

              <div className="mt-4 grid gap-3">
                <Link
                  href="/admin"
                  className="rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  Admin Panel
                </Link>

                <Link
                  href="/admin/kullanicilar"
                  className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                >
                  Kullanıcı Yönetimi
                </Link>

                <Link
                  href="/admin/dogrulamalar"
                  className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                >
                  Doğrulamalar
                </Link>

                <Link
                  href="/dashboard"
                  className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                >
                  Kullanıcı Paneli
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}