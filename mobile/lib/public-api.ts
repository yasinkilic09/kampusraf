const defaultSiteUrl = "https://www.kampusraf.com";

export function getPublicSiteUrl() {
  const configuredUrl =
    process.env.EXPO_PUBLIC_SITE_URL || process.env.EXPO_PUBLIC_APP_URL;
  const rawUrl = (configuredUrl || defaultSiteUrl).trim();

  return rawUrl.startsWith("http") ? rawUrl.replace(/\/+$/, "") : `https://${rawUrl}`;
}

export function getPublicApiUrl(path: string) {
  const safePath = path.startsWith("/") ? path : `/${path}`;

  return `${getPublicSiteUrl()}${safePath}`;
}

export async function readApiJson<T>(response: Response) {
  const payload = await response.json().catch(() => null);

  if (payload && typeof payload === "object") {
    return payload as T;
  }

  return {} as T;
}
