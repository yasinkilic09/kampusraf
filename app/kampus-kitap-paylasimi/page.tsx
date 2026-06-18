import { SeoLandingPage } from "@/components/seo-landing-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Kampüs Kitap Paylaşımı - Yakınındaki Kitapları Bul",
  description:
    "KampüsRaf, üniversite öğrencilerinin kampüs içinde kitap paylaşmasını, kitap ödünç almasını ve yakınındaki kitapları harita mantığıyla keşfetmesini sağlar.",
  path: "/kampus-kitap-paylasimi",
  keywords: [
    "kampüs kitap paylaşımı",
    "üniversite kitap paylaşımı",
    "yakınımdaki kitaplar",
    "kampüste kitap bul",
  ],
});

export default function KampusKitapPaylasimiPage() {
  return (
    <SeoLandingPage
      eyebrow="Kampüs kitap paylaşımı"
      title="Kampüste aradığın kitap, düşündüğünden daha yakın olabilir."
      description="KampüsRaf; öğrencilerin kitaplarını kampüs içinde dolaşıma çıkarmasını, yakınındaki paylaşım kitaplarını keşfetmesini ve kitap üzerinden yeni bağlantılar kurmasını kolaylaştırır."
      primaryKeyword="kampüs kitap paylaşımı"
      highlights={[
        "Üniversite ve şehir odaklı keşif",
        "Yakındaki kitaplar için harita mantığı",
        "Sosyal akış ve kitap paylaşımları",
        "Kampüs topluluklarıyla okuma ağı",
      ]}
      sections={[
        {
          title: "Kampüs rafını oluştur",
          text: "Kullanıcılar sahip oldukları kitapları sanal raflarına ekler ve bu kitapları paylaşım türüne göre görünür hale getirir.",
        },
        {
          title: "Yakın çevrende keşfet",
          text: "Konum izniyle takasa veya ödünce açık kitaplar yaklaşık mesafeye göre keşfedilir; bu da kampüs içi buluşmayı kolaylaştırır.",
        },
        {
          title: "Okuma kültürünü büyüt",
          text: "Kitap paylaşımı yalnızca alışveriş değil; sosyal akış, alıntılar ve topluluklarla büyüyen bir okuma deneyimidir.",
        },
      ]}
      faq={[
        {
          question: "KampüsRaf sadece üniversite öğrencileri için mi?",
          answer:
            "KampüsRaf öncelikle öğrencilerin kitap paylaşım ihtiyacına göre tasarlanmıştır; üniversite ve şehir bilgisi keşfi daha anlamlı hale getirir.",
        },
        {
          question: "Yakındaki kitaplar nasıl gösterilir?",
          answer:
            "Kitap paylaşımı açık ve konum bilgisi izinli olan kullanıcıların kitapları yaklaşık mesafeye göre haritada veya listede keşfedilebilir.",
        },
        {
          question: "Kitap paylaşımı ücretsiz mi?",
          answer:
            "Temel kitap ekleme, keşif ve paylaşım deneyimi ücretsiz başlar; paketler daha gelişmiş limitler ve ek özellikler için kullanılabilir.",
        },
      ]}
    />
  );
}
