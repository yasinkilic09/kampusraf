function getPublisherId() {
  const explicitPublisherId = process.env.ADSENSE_PUBLISHER_ID || "";
  const publicClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "";

  if (explicitPublisherId.startsWith("pub-")) return explicitPublisherId;
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
        "# KampusRaf ads.txt",
        "# Google AdSense onayi sonrasi ADSENSE_PUBLISHER_ID=pub-... ya da",
        "# NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-... ortama eklenince bu dosya otomatik dolar.",
        "",
      ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

