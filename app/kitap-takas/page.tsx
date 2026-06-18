import { SeoLandingPage } from "@/components/seo-landing-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Kitap Takas - Öğrenciler Arası Güvenli Kitap Paylaşımı",
  description:
    "KampüsRaf ile öğrenciler kitap takası yapabilir, kitap ödünç alabilir, satabilir veya bağışlayabilir. Yakınındaki kitapları keşfet ve güvenli iletişim kur.",
  path: "/kitap-takas",
  keywords: [
    "kitap takas",
    "kitap takas uygulaması",
    "öğrenciler arası kitap takası",
    "ikinci el kitap takası",
  ],
});

export default function KitapTakasPage() {
  return (
    <SeoLandingPage
      eyebrow="Kitap takas platformu"
      title="Öğrenciler arası kitap takası artık daha yakın ve daha güvenli."
      description="KampüsRaf, rafında duran kitapları başka öğrencilerle buluşturur. Kitabını takasa, ödünce, satışa veya bağışa açabilir; aradığın kitabı yakınındaki öğrencilerde keşfedebilirsin."
      primaryKeyword="kitap takas"
      highlights={[
        "Takas, ödünç, satış ve bağış seçenekleri",
        "Yakın konuma göre kitap keşfi",
        "Kitap sahibiyle uygulama içi mesajlaşma",
        "Öğrenci profili ve güven sinyalleri",
      ]}
      sections={[
        {
          title: "Kitabını takasa aç",
          text: "Elindeki kitabı birkaç bilgiyle rafına ekle, paylaşım türünü seç ve arayan öğrencilerle eşleşmeye başla.",
        },
        {
          title: "Yakınındaki kitabı bul",
          text: "Şehir, üniversite ve mesafe sinyalleriyle aradığın kitabın sana ne kadar yakın olduğunu daha hızlı gör.",
        },
        {
          title: "Güvenli iletişim kur",
          text: "Takas süreci uygulama içi mesajlaşmayla başlar; kullanıcılar anlaşmadan önce kitap ve profil bilgilerini inceleyebilir.",
        },
      ]}
      faq={[
        {
          question: "KampüsRaf'ta kitap takası nasıl yapılır?",
          answer:
            "Kitabını rafına eklerken takas seçeneğini açarsın. Kitabı arayan öğrenciler seni keşfedebilir ve uygulama içinden mesaj atabilir.",
        },
        {
          question: "Kitap satışı veya bağış da var mı?",
          answer:
            "Evet. Kitaplarını takas dışında ödünç, satış veya bağış seçenekleriyle de paylaşabilirsin.",
        },
        {
          question: "Konumum tam olarak görünür mü?",
          answer:
            "KampüsRaf güvenlik için yaklaşık konum ve mesafe mantığıyla çalışır; amaç kitabı yakında keşfetmek, tam adres paylaşmak değildir.",
        },
      ]}
    />
  );
}
