import { NewsletterForm } from "@/components/NewsletterForm";
import { ShareButtons } from "@/components/ShareButtons";
import LandingPodcast from "@/components/LandingPodcast";
import { publishedFilter } from "@/lib/posts";
import { fetchEpisodes } from "@/lib/podcast";
import Link from "next/link";
import { site } from "@/lib/site";
import { prisma } from "@/lib/prisma";

export const metadata = {
  alternates: { canonical: site.url },
};

export const revalidate = 60;

export default async function Home() {
  let posts: { slug: string; title: string; excerpt: string; createdAt: Date; readingMinutes: number | null }[] = [];
  let categories: string[] = [];
  try {
    posts = await prisma.post.findMany({
      where: publishedFilter(),
      orderBy: { createdAt: "desc" },
      take: 6,
      // readingMinutes vem do banco (calculado por trigger). Trazer o campo
      // content inteiro aqui aumentava o HTML em ~30 KB so para contar palavras.
      select: { slug: true, title: true, excerpt: true, createdAt: true, readingMinutes: true },
    });
    const grouped = await prisma.post.groupBy({
      by: ["category"],
      where: publishedFilter(),
      _count: { _all: true },
      orderBy: { category: "asc" },
    });
    categories = grouped.map((g) => g.category);
  } catch {}

  const topClicks = await prisma.event
    .groupBy({ by: ["target"], where: { type: "click", createdAt: { gte: new Date(Date.now() - 7 * 86400000) } }, _count: { _all: true }, orderBy: { _count: { target: "desc" } }, take: 5 })
    .catch(() => []);
  const topPostSlugs = topClicks.map((t) => t.target).filter(Boolean) as string[];
  const topPosts = topPostSlugs.length
    ? await prisma.post.findMany({ where: { slug: { in: topPostSlugs } }, select: { slug: true, title: true, excerpt: true } }).catch(() => [])
    : [];

  /*
    Último episódio do podcast. O feed é lido com cache de 10 min: o mesmo
    caminho da página /podcast, sem depender de publicar nada aqui.
  */
  const episode = (await fetchEpisodes({ revalidate: 600 }).catch(() => null))?.episodes?.[0];

  return (
    <div className="flex flex-col gap-24">
      <section className="flex flex-col items-start gap-6 pt-10">
        <p className="rounded-full border border-[#9333ea]/40 bg-[#9333ea]/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#a855f7]">
          Método · Contexto · Sem filtro
        </p>
        <h1 className="max-w-3xl text-5xl font-bold leading-[1.05] tracking-[-0.04em] sm:text-7xl">
          {site.tagline}
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-[#4b5563] dark:text-[#d4d4d8]">
          Engenharia reversa de ideias, discursos e políticas. De qualquer lado.
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            href="/blog"
            className="rounded-[14px] bg-[#0f0f12] px-6 py-3.5 text-base font-semibold text-white transition hover:scale-105 active:scale-95 dark:bg-white dark:text-[#0f0f12]"
          >
            Começar agora →
          </Link>
          <Link
            href="/podcast"
            className="rounded-full border border-[#e5e7eb] px-6 py-3 text-base font-semibold transition hover:border-[#9333ea] hover:text-[#9333ea] dark:border-[#2a2a30]"
          >
            Ouvir o podcast
          </Link>
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-4">
            {categories.map((c) => (
              <Link
                key={c}
                href={`/blog?categoria=${encodeURIComponent(c)}`}
                className="rounded-full border border-[#e5e7eb] bg-[#f9f7fa] px-4 py-1.5 text-sm text-[#4b5563] transition hover:border-[#9333ea]/60 hover:text-[#9333ea] dark:border-[#2a2a30] dark:bg-[#17171c] dark:text-[#d4d4d8]"
              >
                {c}
              </Link>
            ))}
          </div>
        )}
      </section>

      {episode?.audioUrl && (
        <LandingPodcast episode={{ ...episode, audioUrl: episode.audioUrl }} />
      )}

      <section className="flex flex-col gap-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9ca3af]">Últimas do blog</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="flex flex-col gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_#0f172a1f] dark:border-[#2a2a30] dark:bg-[#17171c] dark:hover:shadow-[0_8px_24px_#00000066]"
            >
              <h3 className="text-lg font-semibold leading-snug tracking-tight">{p.title}</h3>
              <p className="text-sm text-[#4b5563] dark:text-[#d4d4d8]">{p.excerpt}</p>
              <p className="text-xs text-[#9ca3af]">{p.readingMinutes ?? 1} min de leitura</p>
            </Link>
          ))}
          {posts.length === 0 && <p className="text-[#4b5563] dark:text-[#d4d4d8]">Em breve as primeiras postagens.</p>}
        </div>
      </section>

      {topPosts.length > 0 && (
        <section className="flex flex-col gap-8">
          <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9ca3af]">Mais lidas da semana</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topPosts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
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
        <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[#9ca3af]">Onde nos encontrar</h2>
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
        <h2 className="text-2xl font-bold tracking-[-0.02em]">Compartilhe a área reversa</h2>
        <ShareButtons title="área reversa — Desmontando narrativas" url={site.url} />
      </section>

      <section className="flex flex-col gap-5 rounded-3xl border border-[#e5e7eb] bg-[#f9f7fa] p-10 dark:border-[#2a2a30] dark:bg-[#17171c]">
        <h2 className="text-2xl font-bold tracking-[-0.02em]">Receba as análises por e-mail</h2>
        <p className="text-sm text-[#4b5563] dark:text-[#d4d4d8]">Sem spam. Só quando sair post novo.</p>
        <NewsletterForm />
      </section>

      <section className="flex flex-col items-start gap-6 rounded-3xl border border-[#9333ea]/40 bg-[#9333ea]/5 p-10">
        <h2 className="max-w-2xl text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
          Toda narrativa tem um código-fonte. Vamos desmontá-lo juntos.
        </h2>
        <Link
          href="/blog"
          className="rounded-[14px] bg-[#0f0f12] px-6 py-3.5 text-base font-semibold text-white transition hover:scale-105 active:scale-95 dark:bg-white dark:text-[#0f0f12]"
        >
          Explorar o blog →
        </Link>
      </section>

      <section className="flex flex-col items-start gap-6 rounded-3xl border border-[#e5e7eb] bg-[#f9f7fa] p-10 dark:border-[#2a2a30] dark:bg-[#17171c]">
        <h2 className="text-2xl font-bold tracking-[0.22em]">Apoie a área reversa</h2>
        <p className="text-sm text-[#4b5563] dark:text-[#d4d4d8]">Seu apoio ajuda a manter o projeto independente e semanário.</p>
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="flex flex-col gap-2">
            <span className="text-xl">📱</span>
            <div>
              <p className="font-medium text-primary">Chave PIX: tiago@areareversa.com.br</p>
              <p className="text-xs text-[#6b7280]">Tiago de Abreu Alves</p>
              <p className="text-xs text-[#6b7280]">São Paulo, SP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="pix://00020126580014br.gov.bcb.pix01365d5b4252-6d17-4b1f-9081-e0746509225c5204000053039865802BR5924Tiago%20de%20Abreu%20Alves%20de%206009Sao%20Paul62230519daqr15110173136507163041A3B"
              className="relative inline-flex items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="inline-flex items-center">
                <svg className="h-4 w-4 me-2 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path className="stroke-2" d="M12 2l3 9h5l-9 20l-7-4h2l-2-7 2-7h7l-9-20h5l3-9zm0 7.586l-4.586 4L12 15l7.293-2.828-1.414-4.284 4.586-4L12 10.586l-7.293 2.828L12 7.586z"/>
                </svg>
                Doar via PIX
              </span>
            </a>
            <img
              src="/apoiar/pix/qrcode/qr-code-pix.png"
              alt="QR Code PIX para doar"
              className="w-24 h-24 object-cover rounded-lg"
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-primary">
          <span className="text-xs">Copie este código PIX:</span>
          <button
            onClick={() => navigator.clipboard.writeText('00020126580014br.gov.bcb.pix01365d5b4252-6d17-4b1f-9081-e0746509225c5204000053039865802BR5924Tiago de Abreu Alves de 6009Sao Paulo62230519daqr15110173136507163041A3B')}
            className="text-xs font-medium underline underline-offset-2 hover:no-underline"
            aria-label="Copiar código PIX"
          >
            Copiar
          </button>
        </div>
        <p className="text-xs text-[#6b7280] mt-2 dark:text-[#9ca3af]">
          Escaneie o QR Code ou copie o código acima para doar via seu aplicativo bancário
        </p>
      </section>
    </div>
  );
}
