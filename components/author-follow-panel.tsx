"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

export type AuthorFollowCard = {
  name: string;
  period: string;
  focus: string;
  description: string;
  searchQuery: string;
  tags: string[];
  starterBooks: string[];
};

const storageKey = "kampusraf.followed_authors";
const storeListeners = new Set<() => void>();

function readFollowedAuthors() {
  if (typeof localStorage === "undefined") return new Set<string>();

  try {
    const rawValue = localStorage.getItem(storageKey);
    const parsed = rawValue ? (JSON.parse(rawValue) as unknown) : [];

    if (!Array.isArray(parsed)) return new Set<string>();

    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set<string>();
  }
}

function searchHref(query: string) {
  return `/kitap-ara?q=${encodeURIComponent(query)}`;
}

function getFollowedSnapshot() {
  return JSON.stringify(Array.from(readFollowedAuthors()).sort());
}

function getServerFollowedSnapshot() {
  return "[]";
}

function subscribeToFollowedAuthors(onStoreChange: () => void) {
  storeListeners.add(onStoreChange);

  function handleStorage(event: StorageEvent) {
    if (event.key === storageKey) {
      onStoreChange();
    }
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorage);
  }

  return () => {
    storeListeners.delete(onStoreChange);

    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorage);
    }
  };
}

function writeFollowedAuthors(next: Set<string>) {
  if (typeof localStorage === "undefined") return;

  localStorage.setItem(storageKey, JSON.stringify(Array.from(next)));
  storeListeners.forEach((listener) => listener());
}

export function AuthorFollowPanel({ authors }: { authors: AuthorFollowCard[] }) {
  const followedSnapshot = useSyncExternalStore(
    subscribeToFollowedAuthors,
    getFollowedSnapshot,
    getServerFollowedSnapshot
  );

  const followedAuthors = useMemo(() => {
    try {
      const parsed = JSON.parse(followedSnapshot) as unknown;

      if (!Array.isArray(parsed)) return new Set<string>();

      return new Set(parsed.filter((item): item is string => typeof item === "string"));
    } catch {
      return new Set<string>();
    }
  }, [followedSnapshot]);
  const followedCount = followedAuthors.size;
  const followedNames = useMemo(
    () => authors.filter((author) => followedAuthors.has(author.name)),
    [authors, followedAuthors]
  );

  function toggleAuthor(authorName: string) {
    const next = new Set(followedAuthors);

    if (next.has(authorName)) {
      next.delete(authorName);
    } else {
      next.add(authorName);
    }

    writeFollowedAuthors(next);
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-5 md:grid-cols-2">
        {authors.map((author) => {
          const isFollowed = followedAuthors.has(author.name);

          return (
            <article
              key={author.name}
              className={[
                "rounded-[2rem] bg-white p-5 shadow-sm ring-1 transition md:p-6",
                isFollowed
                  ? "ring-[#2E7D5B]/25 shadow-[#2E7D5B]/10"
                  : "ring-[#2E7D5B]/5 hover:-translate-y-0.5",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#F59E0B]">
                    {author.period}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    {author.name}
                  </h2>
                  <p className="mt-1 text-sm font-black text-[#2E7D5B]">
                    {author.focus}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => toggleAuthor(author.name)}
                  className={[
                    "shrink-0 rounded-full px-4 py-2 text-xs font-black transition",
                    isFollowed
                      ? "bg-[#2E7D5B] text-white hover:bg-[#25684c]"
                      : "bg-[#FAF7F0] text-[#1F2933] hover:bg-[#EAF5EF] hover:text-[#2E7D5B]",
                  ].join(" ")}
                >
                  {isFollowed ? "Takipte" : "Takip Et"}
                </button>
              </div>

              <p className="mt-4 text-sm font-semibold leading-7 text-slate-500">
                {author.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {author.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#FAF7F0] px-3 py-1 text-xs font-black text-slate-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-5 rounded-[1.4rem] bg-[#FAF7F0] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F59E0B]">
                  Başlangıç kitapları
                </p>
                <div className="mt-3 grid gap-2">
                  {author.starterBooks.map((book) => (
                    <Link
                      key={book}
                      href={searchHref(`${book} ${author.name}`)}
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#1F2933] ring-1 ring-slate-900/[0.04] transition hover:text-[#2E7D5B]"
                    >
                      {book}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <Link
                  href={searchHref(author.searchQuery)}
                  className="rounded-full bg-[#2E7D5B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#25684c]"
                >
                  Kitaplarını Ara
                </Link>
                <Link
                  href={`/paylas?text=${encodeURIComponent(`${author.name} okuma rotama başladım.`)}`}
                  className="rounded-full bg-[#FAF7F0] px-5 py-3 text-center text-sm font-black text-[#1F2933] transition hover:-translate-y-0.5"
                >
                  Rotayı Paylaş
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <aside className="self-start rounded-[2rem] bg-[#1F2933] p-6 text-white shadow-xl shadow-slate-900/15 lg:sticky lg:top-28">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F59E0B]">
          Yazar Radarın
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight">
          {followedCount > 0
            ? `${followedCount} yazar takipte`
            : "İlk yazarını seç"}
        </h2>
        <p className="mt-3 text-sm font-semibold leading-7 text-white/65">
          Takip ettiğin yazarlar bu cihazda saklanır. Bir sonraki aşamada bu
          alan hesap bazlı bildirim ve yeni kitap önerileriyle genişletilebilir.
        </p>

        <div className="mt-5 grid gap-2">
          {followedNames.length > 0 ? (
            followedNames.map((author) => (
              <Link
                key={author.name}
                href={searchHref(author.searchQuery)}
                className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                {author.name}
              </Link>
            ))
          ) : (
            <div className="rounded-2xl bg-white/10 px-4 py-4 text-sm font-semibold leading-6 text-white/60">
              Yazar kartlarından birini takip ederek kişisel okuma radarını
              başlat.
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-2">
          <Link
            href="/okuma-listeleri"
            className="rounded-full bg-[#F59E0B] px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5"
          >
            Okuma Listelerine Git
          </Link>
          <Link
            href="/rastgele-raf"
            className="rounded-full bg-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/15"
          >
            Alıntı Keşfet
          </Link>
        </div>
      </aside>
    </section>
  );
}
