"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");

  async function handleResetRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) return;

    setIsLoading(true);
    setMessage("");
    setMessageType("");

    const redirectTo = `${window.location.origin}/auth/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo,
      }
    );

    if (error) {
      setMessage(`Şifre sıfırlama bağlantısı gönderilemedi: ${error.message}`);
      setMessageType("error");
      setIsLoading(false);
      return;
    }

    setMessage(
      "Şifre sıfırlama bağlantısı e-posta adresine gönderildi. Gelen kutunu ve spam klasörünü kontrol et."
    );
    setMessageType("success");
    setIsLoading(false);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#FAF7F0] text-[#1F2933]">
      <section className="relative flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-[#2E7D5B]/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[#F59E0B]/15 blur-3xl" />

        <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <section className="rounded-[2rem] bg-[#2E7D5B] p-6 text-white shadow-2xl shadow-[#2E7D5B]/20 sm:p-8">
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

            <div className="mt-12 max-w-xl">
              <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#F5EBDD]">
                Hesap erişimi
              </div>

              <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                Şifreni güvenli şekilde yenile.
              </h1>

              <p className="mt-5 text-base font-medium leading-8 text-white/72">
                E-posta adresini yaz. Sana şifre yenileme bağlantısı gönderelim.
                Bağlantı üzerinden yeni şifreni belirleyebilirsin.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Güvenli bağlantı",
                "Yeni şifre belirleme",
                "Hesaba hızlı dönüş",
                "KampüsRaf hesabını koru",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/10 bg-white/10 p-4 text-sm font-black backdrop-blur"
                >
                  ✓ {item}
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-center">
            <div className="w-full max-w-[520px] rounded-[2rem] border border-white bg-white/90 p-5 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-7 lg:p-8">
              <div className="rounded-[1.6rem] bg-[#FAF7F0] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F59E0B]">
                      Şifre Sıfırlama
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                      E-postanı gir
                    </h2>
                  </div>

                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-[#2E7D5B] text-2xl text-white shadow-lg shadow-[#2E7D5B]/20">
                    🔑
                  </div>
                </div>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  Kayıtlı e-posta adresine şifre yenileme bağlantısı
                  gönderilecek.
                </p>
              </div>

              <form onSubmit={handleResetRequest} className="mt-7 space-y-5">
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
                      className="min-h-[52px] w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {message && (
                  <div
                    className={`rounded-2xl border px-4 py-3 text-sm font-bold leading-6 ${
                      messageType === "error"
                        ? "border-red-100 bg-red-50 text-red-700"
                        : "border-[#2E7D5B]/10 bg-[#2E7D5B]/10 text-[#2E7D5B]"
                    }`}
                  >
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group flex w-full items-center justify-center gap-2 rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {isLoading ? "Bağlantı gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
                  {!isLoading && (
                    <span className="transition group-hover:translate-x-0.5">
                      →
                    </span>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-sm font-semibold text-slate-500">
                Şifreni hatırladın mı?{" "}
                <Link
                  href="/auth/login"
                  className="font-black text-[#2E7D5B] transition hover:text-[#25684c]"
                >
                  Giriş yap
                </Link>
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}