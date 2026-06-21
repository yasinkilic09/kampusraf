"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { insertContactMessage } from "@/lib/contact-messages";
import { createClient } from "@/lib/supabase/server";

export async function submitContactMessageAction(formData: FormData) {
  const headerList = await headers();
  const clientIp = getClientIp(headerList);
  const rateLimit = checkRateLimit(`contact:${clientIp}`, {
    limit: 4,
    windowMs: 15 * 60_000,
  });

  if (!rateLimit.allowed) {
    redirect(
      `/bize-ulasin?error=${encodeURIComponent(
        `Cok hizli mesaj gonderiyorsun. Lutfen ${rateLimit.retryAfterSeconds} saniye sonra tekrar dene.`
      )}`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result = await insertContactMessage(supabase, {
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    source: "web",
    userId: user?.id || null,
    userAgent: headerList.get("user-agent"),
  });

  if (!result.ok) {
    redirect(`/bize-ulasin?error=${encodeURIComponent(result.message)}`);
  }

  redirect("/bize-ulasin?success=sent");
}
