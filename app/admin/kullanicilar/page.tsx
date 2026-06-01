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
  if (status === "suspended") return "bg-[#F59E0B]/10 text-[#F59E0B]";
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
  if (status === "pending") return "bg-[#F59E0B]/10 text-[#F59E0B]";
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
  const suspendedCount = users.filter(
    (item) => item.account_status === "suspended"
  ).length;

  const baseFilterUrl = "/admin/kullanicilar";

  return (
    <main className="min-h-screen bg-[#FAF7F0] text-[#1F2933]">
      <header className="border-b border-[#2E7D5B]/10 bg-white/80 px-4 py-4 backdrop-blur md:px-6 md:py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              👥
            </div>
            <div>
              <p className="text-xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Kullanıcı Yönetimi
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-bold text-slate-600 md:flex">
            <Link href="/admin" className="hover:text-[#2E7D5B]">
              Admin Panel
            </Link>
            <Link href="/admin/dogrulamalar" className="hover:text-[#2E7D5B]">
              Doğrulamalar
            </Link>
            <Link href="/dashboard" className="hover:text-[#2E7D5B]">
              Panel
            </Link>
            <Link href="/profilim" className="hover:text-[#2E7D5B]">
              Profilim
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="rounded-[1.7rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 md:rounded-[2rem] md:p-12">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F5EBDD]">
            Admin Yönetimi
          </p>

          <h1 className="mt-3 break-words text-3xl font-black tracking-tight md:text-6xl">
            Kullanıcılar
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
            Kullanıcıları, hesap durumlarını, doğrulama seviyelerini ve admin
            rollerini tek ekrandan takip edebilirsin.
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
            Kullanıcılar yüklenirken hata oluştu: {error.message}
          </div>
        )}

        <div className="mt-6 grid gap-3 md:mt-8 md:grid-cols-4 md:gap-5">
          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
            <p className="text-sm font-bold text-slate-500">Listelenen</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B]">
              {totalCount}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
            <p className="text-sm font-bold text-slate-500">Admin</p>
            <p className="mt-2 text-3xl font-black text-[#2E7D5B]">
              {adminCount}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
            <p className="text-sm font-bold text-slate-500">
              Doğrulanmış Öğrenci
            </p>
            <p className="mt-2 text-3xl font-black text-[#F59E0B]">
              {verifiedCount}
            </p>
          </div>

          <div className="rounded-[1.7rem] bg-white p-5 shadow-sm md:rounded-[2rem] md:p-6">
            <p className="text-sm font-bold text-slate-500">Askıda</p>
            <p className="mt-2 text-3xl font-black text-red-500">
              {suspendedCount}
            </p>
          </div>
        </div>

        <form
          action={baseFilterUrl}
          className="mt-6 rounded-[1.7rem] bg-white p-4 shadow-sm md:mt-8 md:rounded-[2rem] md:p-6"
        >
          <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
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

            <button
              type="submit"
              className="rounded-full bg-[#2E7D5B] px-6 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
            >
              Filtrele
            </button>
          </div>

          <Link
            href="/admin/kullanicilar"
            className="mt-3 inline-block text-xs font-black text-slate-400 transition hover:text-[#2E7D5B]"
          >
            Filtreleri temizle
          </Link>
        </form>

        <div className="mt-6 grid gap-4 md:mt-8">
          {users.length === 0 ? (
            <div className="rounded-[1.7rem] border border-dashed border-[#2E7D5B]/30 bg-white p-8 text-center shadow-sm md:rounded-[2rem] md:p-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#FAF7F0] text-3xl">
                👥
              </div>

              <h2 className="mt-5 text-2xl font-black">
                Kullanıcı bulunamadı
              </h2>

              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500">
                Arama veya filtreleri değiştirerek tekrar deneyebilirsin.
              </p>
            </div>
          ) : (
            users.map((item) => (
              <article
                key={item.id}
                className="rounded-[1.7rem] bg-white p-4 shadow-sm md:rounded-[2rem] md:p-6"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
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
                        {getVerificationLabel(item.verification_status)}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
                        {getPlanLabel(item.plan_type)}
                      </span>
                    </div>

                    <h2 className="mt-3 break-words text-xl font-black md:text-2xl">
                      {item.full_name || item.username || "İsimsiz Kullanıcı"}
                    </h2>

                    <p className="mt-1 break-words text-sm font-bold text-slate-500">
                      {item.email || "E-posta yok"}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      <div className="rounded-2xl bg-[#FAF7F0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                          Üniversite
                        </p>
                        <p className="mt-2 break-words text-sm font-bold text-slate-700">
                          {item.university || "Belirtilmemiş"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FAF7F0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                          Bölüm
                        </p>
                        <p className="mt-2 break-words text-sm font-bold text-slate-700">
                          {item.department || "Belirtilmemiş"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FAF7F0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                          Şehir
                        </p>
                        <p className="mt-2 break-words text-sm font-bold text-slate-700">
                          {item.city || "Belirtilmemiş"}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FAF7F0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                          Güven Puanı
                        </p>
                        <p className="mt-2 text-sm font-black text-[#2E7D5B]">
                          {item.trust_score ?? 60}/100
                        </p>
                      </div>

                      <div className="rounded-2xl bg-[#FAF7F0] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
                          Takas
                        </p>
                        <p className="mt-2 text-sm font-black text-[#2E7D5B]">
                          {item.completed_exchange_count ?? 0} tamamlandı
                        </p>
                      </div>
                    </div>

                    <p className="mt-4 text-xs font-bold text-slate-400">
                      Kayıt tarihi: {formatDate(item.created_at)}
                    </p>
                  </div>

                  <div className="grid shrink-0 gap-3 xl:w-60">
                    <form action={updateUserAccountStatusAction}>
                      <input type="hidden" name="profileId" value={item.id} />

                      <label className="text-xs font-black text-slate-400">
                        Hesap Durumu
                      </label>

                      <select
                        name="accountStatus"
                        defaultValue={item.account_status || "active"}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-xs font-bold outline-none focus:border-[#2E7D5B]"
                      >
                        <option value="active">Aktif</option>
                        <option value="suspended">Askıda</option>
                        <option value="banned">Engelli</option>
                      </select>

                      <button
                        type="submit"
                        className="mt-2 w-full rounded-full bg-[#2E7D5B] px-5 py-3 text-xs font-black text-white transition hover:-translate-y-0.5"
                      >
                        Durumu Güncelle
                      </button>
                    </form>

                    <form action={updateUserRoleAction}>
                      <input type="hidden" name="profileId" value={item.id} />

                      <label className="text-xs font-black text-slate-400">
                        Kullanıcı Rolü
                      </label>

                      <select
                        name="role"
                        defaultValue={item.role || "user"}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-xs font-bold outline-none focus:border-[#2E7D5B]"
                      >
                        <option value="user">Kullanıcı</option>
                        <option value="admin">Admin</option>
                      </select>

                      <button
                        type="submit"
                        className="mt-2 w-full rounded-full bg-slate-100 px-5 py-3 text-xs font-black text-slate-600 transition hover:-translate-y-0.5"
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
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}