# KampusRaf domain baglama notlari

Alan adi: `kampusraf.com`

## Mevcut secilen yontem

Natro tarafinda alan adinin DNS sunuculari Vercel'e devredildi:

- `NS1.VERCEL-DNS.COM`
- `NS2.VERCEL-DNS.COM`

Bu yontem kullanildiginda DNS kayitlari artik Natro DNS kayit ekranindan degil,
Vercel domain/DNS ekranindan yonetilir. Natro'da ayrica `A` veya `CNAME`
kaydi eklemek gerekmez.

## Vercel domain durumu

Vercel Project > Settings > Domains alaninda:

- `www.kampusraf.com` production domain olarak duruyor.
- `kampusraf.com`, `www.kampusraf.com` adresine `308` kalici yonlendirme yapiyor.
- SSL sertifikasi Vercel tarafinda otomatik uretiliyor.

Bu kurulum temizdir. Ana adres olarak `https://www.kampusraf.com` kullanilir.

## Vercel ortam degiskenleri

Production ortaminda:

- `NEXT_PUBLIC_SITE_URL=https://www.kampusraf.com`
- `NEXT_PUBLIC_APP_URL=https://www.kampusraf.com`
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...`
- `STUDENT_VERIFICATION_SECRET=...`
- `STUDENT_VERIFICATION_TEST_MODE=false`

## Supabase Auth URL ayarlari

Supabase Dashboard > Authentication > URL Configuration:

- Site URL: `https://www.kampusraf.com`
- Redirect URLs:
  - `https://www.kampusraf.com/auth/reset-password`
  - `https://www.kampusraf.com/**`
  - `https://kampusraf.com/**`
  - `http://localhost:3000/**`
  - Vercel preview kullaniliyorsa Vercel'in preview wildcard URL'i

## Kontrol

DNS ve SSL tamamlandiktan sonra:

- `https://www.kampusraf.com` uygulamayi acmali.
- `https://kampusraf.com` otomatik olarak `https://www.kampusraf.com` adresine gitmeli.

DNS yayilimi ve SSL uretimi yeni degisikliklerde bir sure alabilir.
