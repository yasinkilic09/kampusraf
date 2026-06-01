import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type RestrictedProfile = {
  full_name: string | null;
  email: string | null;
  account_status: string | null;
};

function getStatusLabel(status?: string | null) {
  if (status === "banned") return "Hesap Engellendi";
  if (status === "suspended") return "Hesap Askıya Alındı";
  return "Hesap Aktif";
}

export default async function RestrictedAccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data } = await supabase
    .from("profiles")
    .select("full_name, email, account_status")
    .eq("id", user.id)
    .single();

  const profile = data as RestrictedProfile | null;
  const accountStatus = profile?.account_status || "active";

  if (accountStatus === "active") {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAF7F0] px-4 py-10 text-[#1F2933]">
      <section className="w-full max-w-2xl rounded-[2rem] bg-white p-6 text-center shadow-sm md:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-red-50 text-4xl">
          🚫
        </div>

        <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-red-500">
          {getStatusLabel(accountStatus)}
        </p>

        <h1 className="mt-3 text-3xl font-black md:text-5xl">
          Hesabın kısıtlandı
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500 md:text-base">
          Bu hesap şu anda KampüsRaf içindeki bazı işlemleri kullanamaz.
          Bunun yanlış olduğunu düşünüyorsan platform yöneticisiyle iletişime
          geçebilirsin.
        </p>

        <div className="mt-6 rounded-2xl bg-[#FAF7F0] p-4 text-left">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-400">
            Hesap
          </p>
          <p className="mt-2 break-words text-sm font-bold text-slate-700">
            {profile?.full_name || profile?.email || "KampüsRaf kullanıcısı"}
          </p>

          <p className="mt-4 text-xs font-black uppercase tracking-[0.15em] text-slate-400">
            Durum
          </p>
          <p className="mt-2 text-sm font-black text-red-600">
            {getStatusLabel(accountStatus)}
          </p>
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/profilim"
            className="rounded-full bg-[#2E7D5B] px-7 py-3 text-sm font-black text-white transition hover:-translate-y-0.5"
          >
            Profilime Git
          </Link>

          <Link
            href="/auth/login"
            className="rounded-full bg-slate-100 px-7 py-3 text-sm font-black text-slate-600 transition hover:-translate-y-0.5"
          >
            Giriş Sayfası
          </Link>
        </div>
      </section>
    </main>
  );
}