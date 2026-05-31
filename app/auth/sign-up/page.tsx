"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [university, setUniversity] = useState("");
  const [department, setDepartment] = useState("");
  const [city, setCity] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const cleanUsername = username
      .trim()
      .toLowerCase()
      .replaceAll(" ", "-")
      .replaceAll("ı", "i")
      .replaceAll("ğ", "g")
      .replaceAll("ü", "u")
      .replaceAll("ş", "s")
      .replaceAll("ö", "o")
      .replaceAll("ç", "c");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: cleanUsername,
          university,
          department,
          city,
        },
      },
    });

    if (error) {
  console.error("Supabase kayıt hatası:", error);
  setMessage(`Kayıt hatası: ${error.message}`);
  setIsLoading(false);
  return;
}

    setMessage("Kayıt başarılı. Şimdi giriş sayfasına yönlendiriliyorsun.");

    setTimeout(() => {
      router.push("/auth/login");
    }, 1200);
  }

  return (
    <main className="min-h-screen bg-[#FAF7F0] px-6 py-10 text-[#1F2933]">
      <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-6xl items-center gap-10 md:grid-cols-[0.9fr_1fr]">
        <section className="order-2 md:order-1">
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
            Rafındaki kitap başka bir öğrencinin aradığı kitap olabilir.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            KampüsRaf’a katıl, kitaplarını paylaş, aradığın kitaplara daha kolay
            ulaş ve kitaplar üzerinden yeni öğrencilerle tanış.
          </p>

          <div className="mt-8 rounded-[2rem] bg-white p-6 shadow-sm">
            <p className="text-sm font-black text-[#2E7D5B]">
              İlk sürümde seni neler bekliyor?
            </p>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
              <p>✓ Kitap ekleme ve listeleme</p>
              <p>✓ Üniversite / şehir bazlı kitap arama</p>
              <p>✓ Kitap sahibiyle mesajlaşma</p>
              <p>✓ Aynı kitabı okuyan öğrencilerle eşleşme</p>
            </div>
          </div>
        </section>

        <section className="order-1 rounded-[2rem] border border-white/70 bg-white p-7 shadow-2xl shadow-slate-900/10 md:order-2 md:p-9">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#F59E0B]">
              Kayıt Ol
            </p>
            <h2 className="mt-3 text-3xl font-black">
              KampüsRaf hesabını oluştur
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Öğrenci profilini oluştur ve kitap paylaşım ağına katıl.
            </p>
          </div>

          <form onSubmit={handleSignUp} className="mt-8 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Ad Soyad
                </label>
                <input
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Yağmur Baltacı"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Kullanıcı adı
                </label>
                <input
                  required
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="kampusrafli"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                <label className="text-sm font-bold text-slate-700">
                  Şifre
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="En az 6 karakter"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-700">
                  Bölüm
                </label>
                <input
                  value={department}
                  onChange={(event) => setDepartment(event.target.value)}
                  placeholder="Radyo, Televizyon ve Sinema"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-slate-700">
                  Şehir
                </label>
                <input
                  required
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Aydın"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
                />
              </div>
            </div>

            {message && (
              <div className="rounded-2xl bg-[#FAF7F0] px-4 py-3 text-sm font-semibold text-[#2E7D5B]">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-full bg-[#2E7D5B] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-semibold text-slate-500">
            Zaten hesabın var mı?{" "}
            <Link href="/auth/login" className="font-black text-[#2E7D5B]">
              Giriş yap
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}