"use client";

import { useRef, useState, useTransition } from "react";
import { sendMessageFastAction } from "@/app/actions/conversations";

type ChatMessageFormProps = {
  conversationId: string;
};

export function ChatMessageForm({ conversationId }: ChatMessageFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const message = String(formData.get("message") || "").trim();

    if (!message) {
      setError("Mesaj boş olamaz.");
      return;
    }

    setError("");

    const previousMessage = message;

    formRef.current?.reset();
    textareaRef.current?.focus();

    startTransition(async () => {
      const result = await sendMessageFastAction(formData);

      if (!result.success) {
        setError(result.error || "Mesaj gönderilemedi.");

        if (textareaRef.current) {
          textareaRef.current.value = previousMessage;
          textareaRef.current.focus();
        }
      }
    });
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="mt-5 border-t border-slate-100 pt-4 md:mt-6 md:pt-5"
    >
      <input type="hidden" name="conversationId" value={conversationId} />

      <label className="text-sm font-bold text-slate-700">Mesajın</label>

      <textarea
        ref={textareaRef}
        name="message"
        required
        rows={3}
        maxLength={2000}
        placeholder="Merhaba, kitap hâlâ sende mevcut mu?"
        className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#FAF7F0] px-4 py-3 text-sm outline-none transition focus:border-[#2E7D5B] focus:bg-white"
      />

      {error && (
        <p className="mt-2 rounded-2xl bg-red-50 px-4 py-3 text-xs font-bold text-red-600">
          {error}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-400">
          Güvenliğin için kişisel bilgilerini paylaşmadan önce kullanıcıyla
          uygulama içinde konuş.
        </p>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-full bg-[#2E7D5B] px-7 py-4 text-sm font-black text-white shadow-lg shadow-[#2E7D5B]/20 transition hover:-translate-y-0.5 hover:bg-[#25684c] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isPending ? "Gönderiliyor..." : "Mesaj Gönder"}
        </button>
      </div>
    </form>
  );
}