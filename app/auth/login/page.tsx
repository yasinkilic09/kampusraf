"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
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
    <main className="min-h-screen bg-[#FAF7F0] px-6 py-10 text-[#1F2933]">
      <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl items-center gap-10 md:grid-cols-[1fr_0.9fr]">
        <section>
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2E7D5B] text-xl text-white">
              📚
            </div>
            <div>
              <p className="text-2xl font-black">
                Kampüs<span className="text-[#F59E0B]">Raf</span>
              </p>
              <p className="text-xs font-semibold text-slate-500">
                Sosyal kitap paylaşım ağı
              </p>
            </div>
          </Link>

          <h1 className="mt-10 max-w-2xl text-5xl font-black leading-tight tracking-tight md:text-6xl">
            Aradığın kitap, kampüste birkaç adım uzağında olabilir.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Hesabına giriş yap, kitaplarını yönet, yakındaki öğrencilerle
            iletişime geç ve KampüsRaf topluluğuna katıl.
          </p>

          <div className="mt-8 grid max-w-xl gap-4 sm:grid-cols-3">
            {["Kitap bul", "Takas yap", "Mesajlaş"].map((item) => (
              <div key={item} className="rounded-3xl bg-white p-5 shadow-sm">
                <p className="font-black text-[#2E7D5B]">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/70 bg-white p-7 shadow-2xl shadow-slate-900/10 md:p-9">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
              Giriş Yap
            </p>
            <h2 className="mt-3 text-3xl font-black">Hesabına giriş yap</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Kitaplarını paylaşmaya ve yakındaki kitapları keşfetmeye devam et.
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="text-sm font-bold text-slate-700">
                E-posta
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="ornek@mail.com"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-slate-700">Şifre</label>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
              />
            </div>

            {message && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-semibold text-slate-500">
            Hesabın yok mu?{" "}
            <Link href="/auth/sign-up" className="font-black text-[#2E7D5B]">
              Kayıt ol
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}