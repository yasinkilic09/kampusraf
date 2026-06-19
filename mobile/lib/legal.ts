export const legalEffectiveDate = "19 Haziran 2026";

export const legalVersions = {
  kvkk: "2026-06-19",
  terms: "2026-06-19",
} as const;

export const legalContactEmail = "destek@kampusraf.com";

export type LegalSection = {
  title: string;
  items: string[];
};

export const kvkkSections: LegalSection[] = [
  {
    title: "Veri sorumlusu ve kapsam",
    items: [
      "Bu metin, KampusRaf web sitesi ve mobil uygulamasinda hesap olusturan, kitap ekleyen, sosyal akisa katilan ve harita/eslesme ozelliklerini kullanan kisiler icin hazirlanmistir.",
      "KampusRaf; hesap, kitap, iletisim, yaklasik konum, guvenlik ve kullanim verilerini yalnizca platformun sunulmasi, gelistirilmesi ve yasal yukumluluklerin yerine getirilmesi amaclariyla isler.",
    ],
  },
  {
    title: "Islenen veri kategorileri",
    items: [
      "Ad soyad, kullanici adi, e-posta adresi, universite, bolum, sehir ve profil bilgileri.",
      "Kitap ilanlari, kapak gorselleri, takas/odunc/satis/bagis tercihleri, sosyal paylasimlar, alintilar, yorumlar ve mesajlasma verileri.",
      "Kullanici izin verirse yaklasik konum, mesafe ve konum guncelleme bilgileri.",
      "Oturum, cihaz, hata, guvenlik, bildirim, paket, reklam ve kullanim limiti bilgileri.",
    ],
  },
  {
    title: "Isleme amaclari",
    items: [
      "Hesap olusturma, kimlik dogrulama, sanal raf, kitap arama, eslesme, mesajlasma, bildirim ve topluluk ozelliklerini sunmak.",
      "Yakindaki kitaplari gostermek ve eslesmeleri mesafe tercihine gore daha anlamli hale getirmek.",
      "Platform guvenligini, kotuye kullanim onlemlerini, paket limitlerini ve reklamsiz deneyim tercihlerini yurutmek.",
      "Konum, pazarlama ve kisisellestirilmis reklam gibi alanlari kullanicinin ayri izni veya acik rizasi ile islemek.",
    ],
  },
  {
    title: "Aktarim, saklama ve haklar",
    items: [
      "Veriler; barindirma, veritabani, kimlik dogrulama, bildirim, reklam ve analitik hizmet saglayicilarla yalnizca hizmetin gerektirdigi olcude paylasilabilir.",
      "Kullaniciya ait kitap ilanlari ve sosyal paylasimlar, kullanicinin secimlerine gore diger kullanicilar tarafindan gorulebilir.",
      "Kullanici; verisini ogrenme, duzeltme, silme/yok etme, aktarim yapilan kisileri bilme, otomatik sonuclara itiraz etme ve zararinin giderilmesini talep etme haklarina sahiptir.",
      `Hak talepleri ve riza geri alma basvurulari icin ${legalContactEmail} adresi kullanilabilir.`,
    ],
  },
];

export const termsSections: LegalSection[] = [
  {
    title: "Hesap ve uygun kullanim",
    items: [
      "KampusRaf; kitap paylasimi, takas, odunc, satis, bagis, sosyal akis, alinti, topluluk ve harita tabanli kesif ozellikleri sunar.",
      "Kullanici, kayit olurken verdigi bilgilerin dogru oldugunu ve hesabinin guvenliginden sorumlu oldugunu kabul eder.",
      "Dolandirma, taciz, spam, telif ihlali, yaniltici ilan, yetkisiz veri toplama veya hizmeti bozacak otomatik islemler yasaktir.",
    ],
  },
  {
    title: "Kitap ilanlari ve takas",
    items: [
      "Kullanici ekledigi kitap, fotograf, aciklama, fiyat ve takas bilgilerinin dogrulugundan sorumludur.",
      "Takas, odunc verme, satis veya bagis anlasmalari kullanicilar arasinda kurulur. KampusRaf araci platformdur.",
      "Supheli veya kurallara aykiri davranislar platform yonetimine bildirilmelidir.",
    ],
  },
  {
    title: "Icerik, paketler ve reklamlar",
    items: [
      "Kullanici paylastigi metin, gorsel, alinti, yorum ve topluluk iceriklerinden sorumludur.",
      "Temel ozellikler ucretsiz sunulabilir; gelismis limitler, gorunurluk, mesafe/eslesme tercihleri veya reklamsiz deneyim paketlerle saglanabilir.",
      "Reklamlar kullanici deneyimini bozmayacak olcude gosterilir. Reklamsiz paketlerde platform ici reklam alanlari kaldirilir.",
    ],
  },
  {
    title: "Sorumluluk sinirlari",
    items: [
      "KampusRaf, kullanicilar arasindaki kitap teslimi, odeme, bulusma veya takas sonucunu garanti etmez.",
      "Hizmetin kesintisiz veya hatasiz olacagi garanti edilmez; guvenlik, performans ve bakim icin gecici kesintiler olabilir.",
      `Kosullar hakkinda sorular icin ${legalContactEmail} adresinden iletisime gecilebilir.`,
    ],
  },
];

export function createLegalConsentMetadata({
  source,
  marketingConsent = false,
}: {
  source: "mobile-sign-up";
  marketingConsent?: boolean;
}) {
  const acceptedAt = new Date().toISOString();

  return {
    kvkk_notice_read: true,
    kvkk_notice_version: legalVersions.kvkk,
    kvkk_notice_read_at: acceptedAt,
    terms_accepted: true,
    terms_version: legalVersions.terms,
    terms_accepted_at: acceptedAt,
    marketing_consent: marketingConsent,
    marketing_consent_at: marketingConsent ? acceptedAt : null,
    legal_consent_source: source,
  };
}
