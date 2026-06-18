# KampusRaf reklam ve paket gelir modeli

Bu kurulum web tarafinda Google AdSense'e, mobil tarafinda ise AdMob'a hazir bir altyapi saglar. Kod reklam kimlikleri olmadan calisir; kimlikler eklendiginde reklam alanlari canli envantere doner.

## Web: Google AdSense

Vercel ortam degiskenleri:

```txt
NEXT_PUBLIC_ADS_ENABLED=true
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-XXXXXXXXXXXXXXXX
NEXT_PUBLIC_ADSENSE_SLOT_DEFAULT=1234567890
NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD=1234567890
NEXT_PUBLIC_ADSENSE_SLOT_FEED=1234567890
NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR=1234567890
NEXT_PUBLIC_ADSENSE_SLOT_SEARCH=1234567890
NEXT_PUBLIC_ADSENSE_SLOT_RANDOM_QUOTE=1234567890
ADSENSE_PUBLISHER_ID=pub-XXXXXXXXXXXXXXXX
```

`/ads.txt` otomatik uretilir. `ADSENSE_PUBLISHER_ID` yoksa `NEXT_PUBLIC_ADSENSE_CLIENT_ID` icinden `pub-...` degeri turetilir.

## Mobil: Google AdMob

Expo Go, native reklam SDK'larini dogrudan calistirmak icin uygun degildir. Gercek AdMob geliri icin sonraki adim development build almaktir.

Onerilen ortam degiskeni:

```txt
ADMOB_PUBLISHER_ID=pub-XXXXXXXXXXXXXXXX
```

`/app-ads.txt` otomatik uretilir. AdMob hesabinda uygulamanin yetkili satici dosyasi olarak `https://www.kampusraf.com/app-ads.txt` kullanilabilir.

## Paket davranisi

- Ucretsiz: Dengeli sponsor/reklam alanlari gorunur.
- Plus: Web ve mobil reklamsiz kullanim.
- Premium: Web ve mobil reklamsiz kullanim + gelismis ozellikler.
- Pro: Web ve mobil reklamsiz kullanim + topluluk seviyesinde limitler.

Su an odeme sistemi MVP/test modunda oldugu icin paket secimi profil uzerinden ozellikleri acar. Gercek odeme aktif edildiginde ayni `plan_type` alani odeme webhook'lari ile guncellenmelidir.

## Yerlesim ilkeleri

- Reklam sayfanin ilk isini kapatmaz.
- Sosyal akista reklamlar seyrek gosterilir.
- Ucretli planlarda reklam bilesenleri render edilmez.
- AdSense kimligi yoksa slotlar tasarim on izlemesi olarak kalir ve harici reklam cagrisi yapmaz.

