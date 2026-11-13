import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";

const jakarta = localFont({ src: "../../public/fonts/plus-jakarta-sans.woff2", weight: "100 900", variable: "--font-jakarta", display: "optional" });
const jetbrains = localFont({ src: "../../public/fonts/jetbrains-mono.woff2", weight: "100 800", variable: "--font-jetbrains", display: "optional" });
import { Header, Footer } from "@/components/Header";
import { GAProvider } from "@/components/GAProvider";
import { StructuredDataWebSite, StructuredDataOrganization } from "@/components/StructuredData";
import { PlayerWrapper } from "@/components/PlayerWrapper";
import { FocusModeProvider } from "@/components/FocusMode";
import { LazyCookieConsent, LazyTracker, LazyWebVitals } from "@/components/LazyClient";
import { IdleMount } from "@/components/IdleMount";
import { site } from "@/lib/site";

const GA_ID = "G-FRTNFD1KQD";


export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  /**
   * O título é o que ensina ao Google o que a marca significa.
   *
   * "área reversa" sozinho é ambíguo: quem procura essa palavra no Google cai
   * em logística reversa, um termo de indústria com volume enorme e trinta anos
   * de conteúdo. Dizer explicitamente do que o site trata dá o sinal que
   * faltava — sem precisar mudar o nome.
   */
  title: {
    default: `${site.name} — engenharia reversa de narrativas e políticas públicas`,
    template: `%s · ${site.name}`,
  },
  description:
    "Engenharia reversa de ideias, discursos e políticas públicas: urna eletrônica, orçamento secreto, fundo partidário. Desmontando narrativas com método, contexto e sem filtro.",
  keywords: [
    "engenharia reversa",
    "urna eletrônica",
    "orçamento público",
    "fundo partidário",
    "narrativas políticas",
    "análise política",
    "TCU",
    "centrão",
  ],
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  publisher: site.name,
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
      "text/markdown": "/llms.txt",
    },
  },
  openGraph: {
    siteName: site.name,
    title: `${site.name} — engenharia reversa de narrativas e políticas públicas`,
    description: site.description,
    locale: "pt_BR",
    type: "website",
    url: "/",
    images: [
      {
        url: "/logo-areareversa-preto-blackbg.svg",
        width: 128,
        height: 128,
        alt: "área reversa - black background logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — engenharia reversa de narrativas`,
    description: site.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  // Favicons with black background and white logo
  icons: [
    {
      rel: "icon",
      type: "image/svg+xml",
      href: "/favicon-black.svg",
    },
    {
      rel: "apple-touch-icon",
      href: "/apple-touch-icon-black.svg",
      sizes: "180x180",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${jetbrains.variable} dark`}>
      <head>
        {/* endpoint de webmention: mesmo para todas as páginas, então vai aqui */}
        <link
          rel="webmention"
          href={`${(process.env.NEXT_PUBLIC_SITE_URL || "https://areareversa.com.br").replace(/\/+$/, "")}/api/webmention`}
        />
        <link rel="micropub" href={`${(process.env.NEXT_PUBLIC_SITE_URL || "https://areareversa.com.br").replace(/\/+$/, "")}/api/webmention`} />
      </head>
      <body className="bg-white text-[#0f0f12] antialiased dark:bg-[#0f0f12] dark:text-white">
        <script src="/theme.js" />
        <FocusModeProvider>
        <PlayerWrapper>
          <Header />
          <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-20 focus:z-50 focus:rounded-lg focus:bg-[#9333ea] focus:px-4 focus:py-2 focus:text-white">
            Pular para o conteúdo
          </a>
          <IdleMount>
            <LazyCookieConsent />
          </IdleMount>
          <GAProvider />
          <StructuredDataWebSite />
          <StructuredDataOrganization />
          {/*
            Tracking e Core Web Vitals nao atrapalham a leitura e nao precisam
            estar no primeiro carregamento. Entram quando o navegador fica
            ocioso, depois que a pagina ja apareceu.
          */}
          <IdleMount>
            <LazyTracker />
            <LazyWebVitals />
          </IdleMount>
          <main id="conteudo" className="mx-auto min-h-[60vh] w-full max-w-6xl px-6 pt-24 pb-16">{children}</main>
          <Footer />
        </PlayerWrapper>
      </FocusModeProvider>
      </body>
    </html>
  );
}
