import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  updateUserAccountStatusAction,
  updateUserRoleAction,
} from "@/app/actions/admin-users";

type SearchParams = {
  q?: string;
  role?: string;
  status?: string;
  verification?: string;
  success?: string;
  error?: string;
};

type AdminUserRow = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
  university: string | null;
  department: string | null;
  city: string | null;
  role: string | null;
  account_status: string | null;
  plan_type: string | null;
  plan_status: string | null;
  verification_status: string | null;
  is_verified: boolean | null;
  trust_score: number | null;
  completed_exchange_count: number | null;
  response_score: number | null;
  created_at: string | null;
};

function getPlanLabel(plan?: string | null) {
  if (plan === "plus") return "Plus";
  if (plan === "premium") return "Premium";
  if (plan === "pro") return "Pro";
  return "Ücretsiz";
}

function getPlanClass(plan?: string | null) {
  if (plan === "pro") return "bg-slate-100 text-slate-700";
  if (plan === "premium") return "bg-purple-50 text-purple-700";
  if (plan === "plus") return "bg-[#F59E0B]/10 text-[#B45309]";
  return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
}

function getRoleLabel(role?: string | null) {
  if (role === "admin") return "Admin";
  return "Kullanıcı";
}

function getRoleClass(role?: string | null) {
  if (role === "admin") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  return "bg-slate-100 text-slate-600";
}

function getAccountStatusLabel(status?: string | null) {
  if (status === "suspended") return "Askıda";
  if (status === "banned") return "Engelli";
  return "Aktif";
}

function getAccountStatusClass(status?: string | null) {
  if (status === "active") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "suspended") return "bg-[#F59E0B]/10 text-[#B45309]";
  if (status === "banned") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
}

function getVerificationLabel(status?: string | null) {
  if (status === "pending") return "İnceleme Bekliyor";
  if (status === "verified") return "Doğrulanmış Öğrenci";
  if (status === "rejected") return "Reddedildi";
  return "Doğrulanmadı";
}

function getVerificationClass(status?: string | null) {
  if (status === "verified") return "bg-[#2E7D5B]/10 text-[#2E7D5B]";
  if (status === "pending") return "bg-[#F59E0B]/10 text-[#B45309]";
  if (status === "rejected") return "bg-red-50 text-red-600";
  return "bg-slate-100 text-slate-600";
}

function formatDate(value?: string | null) {
  if (!value) return "Belirtilmemiş";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getDisplayName(user: AdminUserRow) {
  return user.full_name || user.username || "İsimsiz Kullanıcı";
}

function getInitial(user: AdminUserRow) {
  return getDisplayName(user).trim().charAt(0).toUpperCase() || "K";
}

function getTrustScore(user: AdminUserRow) {
  return user.trust_score ?? 60;
}

function getTrustClass(score: number) {
  if (score >= 80) return "text-[#2E7D5B]";
  if (score >= 60) return "text-[#F59E0B]";
  return "text-red-500";
}

function UserStatCard({
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
    <div className="rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem]">
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

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl bg-[#FAF7F0] p-4">
      <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-slate-700">
        {value || "Belirtilmemiş"}
      </p>
    </div>
  );
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const params = (await searchParams) || {};
  const searchQuery = (params.q || "").trim();
  const roleFilter = params.role || "all";
  const statusFilter = params.status || "all";
  const verificationFilter = params.verification || "all";

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
    .from("profiles")
    .select(
      `
      id,
      full_name,
      username,
      email,
      university,
      department,
      city,
      role,
      account_status,
      plan_type,
      plan_status,
      verification_status,
      is_verified,
      trust_score,
      completed_exchange_count,
      response_score,
      created_at
    `
    )
    .order("created_at", { ascending: false });

  if (searchQuery) {
    query = query.or(
      `full_name.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,university.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`
    );
  }

  if (roleFilter !== "all") {
    query = query.eq("role", roleFilter);
  }

  if (statusFilter !== "all") {
    query = query.eq("account_status", statusFilter);
  }

  if (verificationFilter !== "all") {
    query = query.eq("verification_status", verificationFilter);
  }

  const { data, error } = await query.limit(100);
  const users = (data || []) as AdminUserRow[];

  const totalCount = users.length;
  const adminCount = users.filter((item) => item.role === "admin").length;
  const verifiedCount = users.filter(
    (item) => item.verification_status === "verified"
  ).length;
  const pendingVerificationCount = users.filter(
    (item) => item.verification_status === "pending"
  ).length;
  const suspendedCount = users.filter(
    (item) => item.account_status === "suspended"
  ).length;
  const bannedCount = users.filter(
    (item) => item.account_status === "banned"
  ).length;

  const activeFilterCount = [
    searchQuery ? "q" : "",
    roleFilter !== "all" ? "role" : "",
    statusFilter !== "all" ? "status" : "",
    verificationFilter !== "all" ? "verification" : "",
  ].filter(Boolean).length;

  const hasFilters = activeFilterCount > 0;
  const baseFilterUrl = "/admin/kullanicilar";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] pb-24 text-[#1F2933] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#2E7D5B]/10 bg-white/85 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/admin" className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              👥
            </div>

            <div className="min-w-0">
              <p className="truncate text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Kullanıcı yönetim merkezi
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-5 text-sm font-bold text-slate-600 md:flex">
            <Link href="/admin" className="hover:text-[#2E7D5B]">
              Admin
            </Link>
            <Link href="/admin/dogrulamalar" className="hover:text-[#2E7D5B]">
              Doğrulamalar
            </Link>
            <Link href="/admin/sikayetler" className="hover:text-[#2E7D5B]">
              Şikayetler
            </Link>
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/profilim" className="hover:text-[#2E7D5B]">
              Profilim
            </Link>
          </nav>

          <Link
            href="/admin"
            className="shrink-0 rounded-full bg-[#2E7D5B] px-5 py-2.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
          >
            Admin
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
                  Kullanıcı Yönetim Merkezi
                </p>

                <h1 className="mt-3 max-w-4xl break-words text-3xl font-black tracking-tight md:text-5xl">
                  Kullanıcıları, rolleri ve hesap güvenliğini yönet.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
                  Kullanıcıları arayabilir, filtreleyebilir, hesap durumlarını
                  güncelleyebilir ve admin rollerini kontrollü şekilde
                  yönetebilirsin.
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/admin"
                    className="rounded-full bg-white px-7 py-4 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5"
                  >
                    Admin Panele Dön
                  </Link>

                  <Link
                    href="/admin/dogrulamalar"
                    className="rounded-full border border-white/25 px-7 py-4 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  >
                    Doğrulamalar
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-white/10 p-3 backdrop-blur sm:min-w-[340px]">
                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {totalCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Listelenen
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {adminCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Admin
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {verifiedCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Doğrulanan
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 text-center">
                  <p className="text-xl font-black md:text-2xl">
                    {bannedCount + suspendedCount}
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-white/65">
                    Kısıtlı
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
            Kullanıcılar yüklenirken hata oluştu: {error.message}
          </div>
        )}

        <section className="mt-6 grid gap-3 md:mt-8 md:grid-cols-2 lg:grid-cols-4">
          <UserStatCard
            label="Listelenen"
            value={totalCount}
            icon="👥"
            colorClass="text-[#2E7D5B]"
            description="Mevcut filtreye göre listelenen kullanıcı."
          />

          <UserStatCard
            label="Admin"
            value={adminCount}
            icon="🛡️"
            colorClass="text-[#2E7D5B]"
            description="Yönetim yetkisine sahip hesaplar."
          />

          <UserStatCard
            label="Doğrulanmış"
            value={verifiedCount}
            icon="🎓"
            colorClass="text-[#F59E0B]"
            description="Öğrenci doğrulaması tamamlanan kullanıcılar."
          />

          <UserStatCard
            label="Kısıtlı Hesap"
            value={suspendedCount + bannedCount}
            icon="🚩"
            colorClass="text-red-600"
            description="Askıya alınan veya engellenen hesaplar."
          />
        </section>

        <section className="mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <form
              action={baseFilterUrl}
              className="rounded-[1.8rem] bg-white p-4 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6"
            >
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                    Arama ve Filtre
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Kullanıcıları daralt
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    İsim, kullanıcı adı, e-posta, üniversite veya şehir bilgisine
                    göre arama yapabilirsin.
                  </p>
                </div>

                {hasFilters && (
                  <span className="w-fit rounded-full bg-[#F59E0B]/10 px-4 py-2 text-xs font-black text-[#B45309]">
                    {activeFilterCount} filtre aktif
                  </span>
                )}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
                <input
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="İsim, e-posta, üniversite veya şehir ara..."
                  className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />

                <select
                  name="role"
                  defaultValue={roleFilter}
                  className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                >
                  <option value="all">Tüm Roller</option>
                  <option value="user">Kullanıcı</option>
                  <option value="admin">Admin</option>
                </select>

                <select
                  name="status"
                  defaultValue={statusFilter}
                  className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                >
                  <option value="all">Tüm Hesaplar</option>
                  <option value="active">Aktif</option>
                  <option value="suspended">Askıda</option>
                  <option value="banned">Engelli</option>
                </select>

                <select
                  name="verification"
                  defaultValue={verificationFilter}
                  className="rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm font-bold outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                >
                  <option value="all">Tüm Doğrulamalar</option>
                  <option value="unverified">Doğrulanmadı</option>
                  <option value="pending">Bekliyor</option>
                  <option value="verified">Doğrulandı</option>
                  <option value="rejected">Reddedildi</option>
                </select>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="rounded-full bg-[#2E7D5B] px-7 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                >
                  Filtrele
                </button>

                <Link
                  href="/admin/kullanicilar"
                  className="rounded-full border border-[#2E7D5B]/20 px-7 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                >
                  Filtreleri Temizle
                </Link>
              </div>
            </form>

            {users.length === 0 ? (
              <section className="rounded-[1.8rem] border border-dashed border-[#2E7D5B]/30 bg-white p-8 text-center shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-12">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
                  👥
                </div>

                <h2 className="mt-5 text-2xl font-black">
                  Kullanıcı bulunamadı
                </h2>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
                  Arama veya filtreleri değiştirerek tekrar deneyebilirsin.
                </p>
              </section>
            ) : (
              <div className="grid gap-4">
                {users.map((item) => {
                  const isCurrentUser = item.id === user.id;
                  const trustScore = getTrustScore(item);

                  return (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-[1.7rem] bg-white shadow-sm ring-1 ring-[#2E7D5B]/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/5 md:rounded-[2rem]"
                    >
                      <div className="p-4 md:p-6">
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex gap-4">
                              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#2E7D5B]/10 text-xl font-black text-[#2E7D5B]">
                                {getInitial(item)}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={`rounded-full px-3 py-1 text-[11px] font-black ${getRoleClass(
                                      item.role
                                    )}`}
                                  >
                                    {getRoleLabel(item.role)}
                                  </span>

                                  <span
                                    className={`rounded-full px-3 py-1 text-[11px] font-black ${getAccountStatusClass(
                                      item.account_status
                                    )}`}
                                  >
                                    {getAccountStatusLabel(item.account_status)}
                                  </span>

                                  <span
                                    className={`rounded-full px-3 py-1 text-[11px] font-black ${getVerificationClass(
                                      item.verification_status
                                    )}`}
                                  >
                                    {getVerificationLabel(
                                      item.verification_status
                                    )}
                                  </span>

                                  <span
                                    className={`rounded-full px-3 py-1 text-[11px] font-black ${getPlanClass(
                                      item.plan_type
                                    )}`}
                                  >
                                    {getPlanLabel(item.plan_type)}
                                  </span>

                                  {isCurrentUser && (
                                    <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                                      Sen
                                    </span>
                                  )}
                                </div>

                                <h2 className="mt-3 break-words text-xl font-black leading-tight md:text-2xl">
                                  {getDisplayName(item)}
                                </h2>

                                {item.username && (
                                  <p className="mt-1 break-words text-xs font-black text-[#2E7D5B]">
                                    @{item.username}
                                  </p>
                                )}

                                <p className="mt-1 break-words text-sm font-bold text-slate-500">
                                  {item.email || "E-posta yok"}
                                </p>
                              </div>
                            </div>

                            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                              <InfoBox
                                label="Üniversite"
                                value={item.university || "Belirtilmemiş"}
                              />

                              <InfoBox
                                label="Bölüm"
                                value={item.department || "Belirtilmemiş"}
                              />

                              <InfoBox
                                label="Şehir"
                                value={item.city || "Belirtilmemiş"}
                              />

                              <InfoBox
                                label="Takas"
                                value={`${
                                  item.completed_exchange_count ?? 0
                                } tamamlandı`}
                              />

                              <InfoBox
                                label="Yanıt Skoru"
                                value={`${item.response_score ?? 0}/100`}
                              />
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                                    Güven Puanı
                                  </p>
                                  <p
                                    className={`text-sm font-black ${getTrustClass(
                                      trustScore
                                    )}`}
                                  >
                                    {trustScore}/100
                                  </p>
                                </div>

                                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                                  <div
                                    className={`h-full rounded-full ${
                                      trustScore >= 80
                                        ? "bg-[#2E7D5B]"
                                        : trustScore >= 60
                                          ? "bg-[#F59E0B]"
                                          : "bg-red-500"
                                    }`}
                                    style={{
                                      width: `${Math.min(trustScore, 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="rounded-2xl bg-[#FAF7F0] p-4">
                                <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                                  Kayıt Tarihi
                                </p>
                                <p className="mt-2 text-sm font-bold text-slate-700">
                                  {formatDate(item.created_at)}
                                </p>
                              </div>
                            </div>

                            {isCurrentUser && (
                              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-xs font-bold leading-6 text-blue-700">
                                Kendi admin hesabında rol veya hesap durumu
                                değişikliği bu ekrandan kapalıdır. Bu koruma,
                                yanlışlıkla kendi admin erişimini kaldırmanı
                                önler.
                              </div>
                            )}
                          </div>

                          <div className="grid shrink-0 gap-3 xl:w-64">
                            <form action={updateUserAccountStatusAction}>
                              <input
                                type="hidden"
                                name="profileId"
                                value={item.id}
                              />

                              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                Hesap Durumu
                              </label>

                              <select
                                name="accountStatus"
                                defaultValue={item.account_status || "active"}
                                disabled={isCurrentUser}
                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-xs font-bold outline-none transition focus:border-[#2E7D5B] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                <option value="active">Aktif</option>
                                <option value="suspended">Askıda</option>
                                <option value="banned">Engelli</option>
                              </select>

                              <button
                                type="submit"
                                disabled={isCurrentUser}
                                className="mt-2 w-full rounded-full bg-[#2E7D5B] px-5 py-3 text-xs font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Durumu Güncelle
                              </button>
                            </form>

                            <form action={updateUserRoleAction}>
                              <input
                                type="hidden"
                                name="profileId"
                                value={item.id}
                              />

                              <label className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                                Kullanıcı Rolü
                              </label>

                              <select
                                name="role"
                                defaultValue={item.role || "user"}
                                disabled={isCurrentUser}
                                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-xs font-bold outline-none transition focus:border-[#2E7D5B] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                <option value="user">Kullanıcı</option>
                                <option value="admin">Admin</option>
                              </select>

                              <button
                                type="submit"
                                disabled={isCurrentUser}
                                className="mt-2 w-full rounded-full bg-slate-100 px-5 py-3 text-xs font-black text-slate-600 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Rolü Güncelle
                              </button>
                            </form>

                            <Link
                              href="/admin/dogrulamalar"
                              className="rounded-full bg-[#F59E0B] px-5 py-3 text-center text-xs font-black text-white transition hover:-translate-y-0.5"
                            >
                              Doğrulamalar
                            </Link>

                            <Link
                              href="/admin/sikayetler"
                              className="rounded-full border border-red-100 bg-red-50 px-5 py-3 text-center text-xs font-black text-red-600 transition hover:-translate-y-0.5"
                            >
                              Şikayetleri Aç
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28 lg:self-start">
            <section className="rounded-[1.8rem] bg-white p-5 shadow-sm ring-1 ring-[#2E7D5B]/5 md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#2E7D5B]">
                Liste Özeti
              </p>

              <div className="mt-5 grid gap-3">
                <div className="rounded-2xl bg-[#FAF7F0] p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Arama Sonucu
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#2E7D5B]">
                    {totalCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#2E7D5B]/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#2E7D5B]">
                    Admin Hesap
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#2E7D5B]">
                    {adminCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-[#F59E0B]/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#B45309]">
                    Bekleyen Doğrulama
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#B45309]">
                    {pendingVerificationCount}
                  </p>
                </div>

                <div className="rounded-2xl bg-red-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-red-400">
                    Engelli / Askıda
                  </p>
                  <p className="mt-2 text-2xl font-black text-red-600">
                    {bannedCount + suspendedCount}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.8rem] bg-[#2E7D5B] p-5 text-white shadow-sm md:rounded-[2rem] md:p-6">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
                Güvenlik Notu
              </p>

              <h3 className="mt-2 text-xl font-black">
                Rol ve hesap durumu değişiklikleri kritiktir.
              </h3>

              <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-white/75">
                <p className="rounded-2xl bg-white/10 p-3">
                  ✓ Kendi admin hesabın bu ekranda kilitli görünür.
                </p>
                <p className="rounded-2xl bg-white/10 p-3">
                  ✓ Askıya alınan kullanıcılar işlem yapamaz ama verileri korunur.
                </p>
                <p className="rounded-2xl bg-white/10 p-3">
                  ✓ Engelli kullanıcılar platform erişiminden kısıtlanır.
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
                  href="/admin/dogrulamalar"
                  className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                >
                  Doğrulamalar
                </Link>

                <Link
                  href="/admin/sikayetler"
                  className="rounded-full border border-[#2E7D5B]/20 px-5 py-3 text-center text-sm font-black text-[#2E7D5B] transition hover:-translate-y-0.5 hover:bg-[#2E7D5B]/5"
                >
                  Şikayetler
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