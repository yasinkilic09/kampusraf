function getPublisherId() {
  const admobPublisherId = process.env.ADMOB_PUBLISHER_ID || "";
  const adsensePublisherId = process.env.ADSENSE_PUBLISHER_ID || "";
  const publicClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "";

  if (admobPublisherId.startsWith("pub-")) return admobPublisherId;
  if (adsensePublisherId.startsWith("pub-")) return adsensePublisherId;
  if (publicClientId.startsWith("ca-pub-")) {
    return publicClientId.replace(/^ca-/, "");
  }

  return "";
}

export function GET() {
  const publisherId = getPublisherId();
  const body = publisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : [
        "# KampusRaf app-ads.txt",
        "# AdMob hesabi acilinca ADMOB_PUBLISHER_ID=pub-... ortama eklenmeli.",
        "# Bu dosya mobil reklam envanterinin yetkili satici beyanidir.",
        "",
      ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

