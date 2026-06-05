"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const featureCards = [
  {
    icon: "📚",
    title: "Kitaplarını yönet",
    description: "Rafındaki kitapları düzenle, arayan öğrencilerle eşleş.",
  },
  {
    icon: "🤝",
    title: "Güvenli takas yap",
    description: "Doğrulanmış öğrenci profilleriyle daha güvenli iletişim kur.",
  },
  {
    icon: "💬",
    title: "Mesajlaş",
    description: "Kitap üzerinden başlayan sohbetlerle hızlıca anlaş.",
  },
];

const stats = [
  {
    value: "Akıllı",
    label: "Eşleşme",
  },
  {
    value: "Güvenli",
    label: "Takas",
  },
  {
    value: "Mobil",
    label: "Deneyim",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setMessage("Giriş yapılamadı. E-posta veya şifreyi kontrol et.");
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#FAF7F0] text-[#1F2933]">
      <section className="relative min-h-screen px-4 py-5 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#2E7D5B]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#F59E0B]/15 blur-3xl" />

        <div className="relative mx-auto grid min-h-[calc(100vh-40px)] max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="flex flex-col justify-between rounded-[2rem] bg-[#2E7D5B] p-5 text-white shadow-2xl shadow-[#2E7D5B]/20 sm:p-7 lg:min-h-[calc(100vh-72px)] lg:p-8">
            <div>
              <Link href="/" className="inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-lg shadow-black/10">
                  📚
                </div>

                <div>
                  <p className="text-2xl font-black tracking-tight">
                    Kampüs<span className="text-[#F59E0B]">Raf</span>
                  </p>
                  <p className="text-xs font-bold text-white/60">
                    Sosyal kitap paylaşım ağı
                  </p>
                </div>
              </Link>

              <div className="mt-12 max-w-2xl lg:mt-20">
                <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
                  Öğrenciler için güvenli kitap ağı
                </div>

                <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  Aradığın kitap kampüste sandığından daha yakın.
                </h1>

                <p className="mt-5 max-w-xl text-base font-medium leading-8 text-white/72 sm:text-lg">
                  Hesabına giriş yap, kitaplarını yönet, akıllı eşleşmeleri
                  incele ve güvenli takas sürecini kaldığın yerden sürdür.
                </p>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {stats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur"
                  >
                    <p className="text-xl font-black">{item.value}</p>
                    <p className="mt-1 text-xs font-bold text-white/60">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-3">
              {featureCards.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-white/10 p-4 backdrop-blur"
                >
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/12 text-xl">
                      {item.icon}
                    </div>

                    <div>
                      <h3 className="font-black">{item.title}</h3>
                      <p className="mt-1 text-sm font-medium leading-6 text-white/62">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-center py-6 lg:py-0">
            <div className="w-full max-w-[520px] rounded-[2rem] border border-white bg-white/90 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-7 lg:p-8">
              <div className="rounded-[1.6rem] bg-[#FAF7F0] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                      Giriş Yap
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                      Tekrar hoş geldin
                    </h2>
                  </div>

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[#2E7D5B] text-2xl text-white shadow-lg shadow-[#2E7D5B]/20">
                    🔐
                  </div>
                </div>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  KampüsRaf hesabına giriş yaparak kitap, mesaj, eşleşme ve
                  takas akışına devam edebilirsin.
                </p>
              </div>

              <form onSubmit={handleLogin} className="mt-7 space-y-5">
                <div>
                  <label className="text-sm font-black text-slate-700">
                    E-posta
                  </label>

                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 transition focus-within:border-[#2E7D5B] focus-within:bg-white">
                    <span className="text-lg">✉️</span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="ornek@mail.com"
                      autoComplete="email"
                      className="h-13 min-h-[52px] w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-black text-slate-700">
                      Şifre
                    </label>

                    <Link
  href="/auth/forgot-password"
  className="text-xs font-black text-[#2E7D5B] transition hover:text-[#25684c]"
>
  Şifremi unuttum
</Link>
                  </div>

                  <div className="mt-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 transition focus-within:border-[#2E7D5B] focus-within:bg-white">
                    <span className="text-lg">🔑</span>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="h-13 min-h-[52px] w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="shrink-0 rounded-full px-2 py-1 text-xs font-black text-[#2E7D5B] transition hover:bg-[#2E7D5B]/10"
                    >
                      {showPassword ? "Gizle" : "Göster"}
                    </button>
                  </div>
                </div>

                {message && (
                  <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold leading-6 text-red-700">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  {!isLoading && (
                    <span className="transition group-hover:translate-x-0.5">
                      →
                    </span>
                  )}
                </button>
              </form>

              <div className="mt-6 rounded-[1.4rem] border border-[#2E7D5B]/10 bg-[#2E7D5B]/5 p-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-lg">
                    🛡️
                  </div>

                  <div>
                    <p className="text-sm font-black text-[#1F2933]">
                      Güvenli öğrenci ağı
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                      Doğrulanmış öğrenci profilleri, akıllı eşleşmeler ve
                      güvenli takas süreci tek panelde.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-center text-sm font-semibold text-slate-500">
                Hesabın yok mu?{" "}
                <Link
                  href="/auth/sign-up"
                  className="font-black text-[#2E7D5B] transition hover:text-[#25684c]"
                >
                  Hemen kayıt ol
                </Link>
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}