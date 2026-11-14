"use client";

import { Link } from "@/i18n/routing";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { usePlayer } from "@/lib/PlayerContext";
import { site } from "@/lib/site";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  createdAt: string;
  updatedAt: string | null;
  coverImage: string | null;
  views: number;
  tags: string[];
  content: string;
  readingMinutes: number | null;
};

type Episode = {
  title: string;
  link?: string;
  pubDate?: string;
  duration?: string;
  audioUrl?: string;
  contentSnippet?: string;
};

type TopPost = { slug: string; title: string; excerpt: string };

/**
 * Landing traduzida (en-US / es-ES).
 *
 * Espelha a landing em pt-BR (`src/app/page.tsx`): mesma ordem de seções, mesmo
 * alinhamento à esquerda, mesmos elementos. O que muda é só o idioma dos
 * textos, que vêm de `home.landing.*` — antes daqui saía uma home genérica de
 * blog, centralizada, sem as seções que o site tem.
 */
export default function HomePageClient({
  initialLocale,
  initialPosts,
  initialEpisode,
  initialCategories,
  initialTopPosts,
}: {
  initialLocale: string;
  initialPosts: Post[];
  initialEpisode: Episode | null;
  initialCategories: string[];
  initialTopPosts: TopPost[];
}) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [episode, setEpisode] = useState<Episode | null>(initialEpisode);
  const [loading, setLoading] = useState(!initialPosts?.length);
  const t = useTranslations("home.landing");
  const fmt = useFormatter();
  const { play } = usePlayer();

  useEffect(() => {
    if (initialPosts?.length) {
      setLoading(false);
      return;
    }
    Promise.all([
      fetch(`/api/blog?locale=${initialLocale}`).then((r) => r.json()),
      fetch("/api/podcast").then((r) => r.json()),
    ])
      .then(([postsData, podcastData]) => {
        setPosts(postsData.posts ?? []);
        setEpisode(podcastData.episodes?.[0] ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [initialPosts, initialEpisode]);

  if (loading) {
    return (
      <div className="flex flex-col gap-24">
        <div className="animate-pulse flex flex-col gap-6 pt-10">
          <div className="h-6 w-48 rounded-full bg-[#e5e7eb] dark:bg-[#2a2a30]" />
          <div className="h-16 w-3/4 rounded bg-[#e5e7eb] dark:bg-[#2a2a30]" />
          <div className="h-6 w-1/2 rounded bg-[#e5e7eb] dark:bg-[#2a2a30]" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-6 dark:border-[#2a2a30] dark:bg-[#17171c]">
              <div className="h-6 w-3/4 rounded bg-[#e5e7eb] dark:bg-[#2a2a30]" />
              <div className="h-4 w-full rounded bg-[#e5e7eb] dark:bg-[#2a2a30]" />
              <div className="h-4 w-1/2 rounded bg-[#e5e7eb] dark:bg-[#2a2a30]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-24">
      <section className="flex flex-col items-start gap-6 pt-10">
        <p className="rounded-full border border-[#9333ea]/40 bg-[#9333ea]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#a855f7]">
          {t("badge")}
        </p>
        <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-7xl">
          {t("heroTitle")}
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-[#4b5563] dark:text-[#d4d4d8]">
          {t("subtitle")}
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            href="/blog"
            className="rounded-[14px] bg-[#0f0f12] px-6 py-3.5 text-base font-semibold text-white transition hover:scale-105 active:scale-95 dark:bg-white dark:text-[#0f0f12]"
          >
            {t("start")}
          </Link>
          <Link
            href="/podcast"
            className="rounded-full border border-[#e5e7eb] px-6 py-3 text-base font-semibold transition hover:border-[#9333ea] hover:text-[#9333ea] dark:border-[#2a2a30]"
          >
            {t("listenPodcast")}
          </Link>
        </div>

        {initialCategories.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4">
            {initialCategories.map((c) => (
              <Link
                key={c}
                href={{ pathname: "/blog", query: { categoria: c } }}
                className="rounded-full border border-[#e5e7eb] bg-[#f9f7fa] px-4 py-1.5 text-sm text-[#4b5563] transition hover:border-[#9333ea]/60 hover:text-[#9333ea] dark:border-[#2a2a30] dark:bg-[#17171c] dark:text-[#d4d4d8]"
              >
                {c}
              </Link>
            ))}
          </div>
        )}
      </section>

      {episode?.audioUrl && (
        <section
          aria-labelledby="ultimo-episodio"
          className="flex flex-col items-start gap-4 rounded-3xl border border-[#9333ea]/30 bg-[#9333ea]/5 p-8 dark:border-[#9333ea]/40 dark:bg-[#17171c]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#9333ea]">
            {t("latestPodcast")}
          </p>
          <h2
            id="ultimo-episodio"
            className="max-w-3xl text-2xl font-bold leading-snug tracking-[-0.02em]"
          >
            {episode.title}
          </h2>
          {episode.pubDate && (
            <p className="text-xs text-[#9ca3af]">
              <time dateTime={episode.pubDate}>
                {fmt.dateTime(new Date(episode.pubDate), { dateStyle: "medium" })}
              </time>
              {episode.duration ? ` · ${episode.duration}` : ""}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() =>
                play({
                  title: episode.title,
                  audioUrl: episode.audioUrl!,
                  pubDate: episode.pubDate,
                  link: episode.link,
                  contentSnippet: episode.contentSnippet,
                })
              }
              className="rounded-[14px] bg-[#0f0f12] px-6 py-3.5 text-base font-semibold text-white transition hover:scale-105 active:scale-95 dark:bg-white dark:text-[#0f0f12]"
            >
              {t("listenEpisode")}
            </button>
            {episode.link && (
              <a
                href={episode.link}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-[#9333ea] underline underline-offset-4"
              >
                {t("openSpotify")}
              </a>
            )}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9ca3af]">{t("latestPosts")}</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={{ pathname: "/blog/[slug]", params: { slug: p.slug } }}
              className="flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_#0f172a1f] dark:border-[#2a2a30] dark:bg-[#17171c] dark:hover:shadow-[0_8px_24px_#00000066]"
            >
              {p.coverImage && (
                <Image
                  src={p.coverImage}
                  alt=""
                  width={640}
                  height={360}
                  className="aspect-video w-full rounded-xl bg-[#f9f7fa] object-contain dark:bg-[#1a1a20]"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              )}
              <h3 className="text-lg font-semibold leading-snug tracking-tight">{p.title}</h3>
              <p className="text-sm text-[#4b5563] dark:text-[#d4d4d8]">{p.excerpt}</p>
              <p className="text-xs text-[#9ca3af]">{t("readingMinutes", { minutes: p.readingMinutes ?? 1 })}</p>
            </Link>
          ))}
          {posts.length === 0 && <p className="text-[#4b5563] dark:text-[#d4d4d8]">{t("noPosts")}</p>}
        </div>
      </section>

      {initialTopPosts.length > 0 && (
        <section className="flex flex-col gap-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9ca3af]">{t("topPosts")}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {initialTopPosts.map((p) => (
              <Link
                key={p.slug}
                href={{ pathname: "/blog/[slug]", params: { slug: p.slug } }}
                className="flex flex-col gap-3 rounded-2xl border border-[#9333ea]/30 bg-[#9333ea]/5 p-6 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_#9333ea22]"
              >
                <h3 className="text-lg font-semibold leading-snug tracking-tight">{p.title}</h3>
                <p className="text-sm text-[#4b5563] dark:text-[#d4d4d8]">{p.excerpt}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9ca3af]">{t("findUs")}</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(site.links).map(([k, v]) => (
            <a
              key={k}
              href={v}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-[#e5e7eb] bg-[#f9f7fa] px-5 py-3 text-sm font-semibold transition hover:border-[#9333ea]/60 hover:text-[#9333ea] dark:border-[#ac4bff4d] dark:bg-[#17171c]"
            >
              {k}
            </a>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-5 rounded-3xl border border-[#e5e7eb] bg-[#f9f7fa] p-10 dark:border-[#2a2a30] dark:bg-[#17171c]">
        <h2 className="text-2xl font-bold tracking-[-0.02em]">{t("share")}</h2>
        <ShareRow title={t("shareTitle")} url={site.url} />
      </section>

      <section className="flex flex-col gap-5 rounded-3xl border border-[#e5e7eb] bg-[#f9f7fa] p-10 dark:border-[#2a2a30] dark:bg-[#17171c]">
        <h2 className="text-2xl font-bold tracking-[-0.02em]">{t("newsletterTitle")}</h2>
        <p className="text-sm text-[#4b5563] dark:text-[#d4d4d8]">{t("newsletterDescription")}</p>
        <form className="flex w-full max-w-md flex-col gap-2 sm:flex-row" action="/api/newsletter" method="POST">
          <input
            type="email"
            name="email"
            required
            placeholder={t("newsletterPlaceholder")}
            className="w-full rounded-xl border border-[#e5e7eb] bg-[#f9f7fa] px-4 py-2.5 text-sm outline-none focus:border-[#9333ea] dark:border-[#2a2a30] dark:bg-[#17171c]"
          />
          <button className="rounded-xl bg-[#0f0f12] px-4 py-2 text-sm font-semibold text-white transition hover:scale-105 active:scale-95 dark:bg-white dark:text-[#0f0f12]">
            {t("newsletterButton")}
          </button>
        </form>
      </section>

      <section className="flex flex-col items-start gap-6 rounded-3xl border border-[#9333ea]/40 bg-[#9333ea]/5 p-10">
        <h2 className="max-w-2xl text-3xl font-bold tracking-[-0.02em] sm:text-4xl">{t("ctaTitle")}</h2>
        <Link
          href="/blog"
          className="rounded-[14px] bg-[#0f0f12] px-6 py-3.5 text-base font-semibold text-white transition hover:scale-105 active:scale-95 dark:bg-white dark:text-[#0f0f12]"
        >
          {t("ctaButton")}
        </Link>
      </section>
    </div>
  );
}

/**
 * Botões de compartilhar só com os links (sem rótulo em português) — o
 * `ShareButtons` do site é fixo em pt-BR; aqui a landing é traduzida, então o
 * próprio texto do botão fica fora e as plataformas aparecem pelo nome.
 */
function ShareRow({ title, url }: { title: string; url: string }) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const btn =
    "rounded-full border border-[#e5e7eb] px-4 py-2 text-xs transition hover:border-[#9333ea] hover:text-[#9333ea] dark:border-[#2a2a30]";
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a className={btn} target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}>
        whatsapp
      </a>
      <a className={btn} target="_blank" rel="noreferrer" href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}>
        x
      </a>
      <a className={btn} target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}>
        linkedin
      </a>
      <a className={btn} target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}>
        facebook
      </a>
    </div>
  );
}
