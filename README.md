# área reversa

Blog e podcast de engenharia reversa de narrativas — ideias, discursos e políticas desmontados sem filtro.

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](https://github.com/devtiagoabreu/areareversa/blob/main/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/devtiagoabreu/areareversa?style=social&color=ff79c6)](https://github.com/devtiagoabreu/areareversa/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/devtiagoabreu/areareversa?style=social&color=bd93f9)](https://github.com/devtiagoabreu/areareversa/forks)
[![Twitter](https://img.shields.io/badge/x-@devtiagoabreu-1da1f2?style=social)](https://twitter.com/devtiagoabreu)

</div>

---

## Visão geral

[](#visão-geral)

**área reversa** é um blog e podcast que analisa criticamente narrativas, discursos e políticas públicas, desmontando argumentos com evidências e pesquisa. A plataforma publica artigos semanais, episódios de podcast e oferece recursos de busca, tags e newsletter para acompanhamento do conteúdo.

<details>
<summary>📖 Sobre o projeto</summary>

O projeto visa criar um espaço de transparência e análise profunda sobre temas políticos e sociais, utilizando engenharia reversa de discursos como método de investigação. Publicamos artigos semanais com análise aprofundada de discursos políticos, políticas públicas e temas relevantes para a sociedade.

</details>

---

## Stack🧛‍♂️

[](#stack)

| Camada | Tecnologia |
| --- | --- |
| **Framework** | Next.js 16 (App Router) |
| **Linguagem** | TypeScript 5 |
| **UI** | React 19 + Tailwind CSS 4 + shadcn/ui |
| **ORM** | Prisma 7 + PostgreSQL (Neon) |
| **IA** | Gemini `gemini-3.5-flash-lite` |
| **E-mail** | Nodemailer + Gmail SMTP |
| **Mapas** | Leaflet |
| **RSS/Feed** | rss-parser |
| **Testes** | Vitest + Testing Library |
| **Deploy** | Vercel |

---

## Começando🚀

[](#começando)

```bash
npm install
npm run dev        # http://localhost:3000
```

Banco de dados (Postgres via `DATABASE_URL`):

```bash
npx prisma db push   # sincroniza o schema
npm run seed         # popula posts iniciais (não apaga posts do admin)
```

---

## Variáveis de ambiente (`.env`)

[](#variáveis-de-ambiente)

| Variável | Para que serve |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL (Neon) |
| `AUTH_SECRET` | Assina o cookie de sessão do admin |
| `ADMIN_PASSWORD` | Senha única de acesso a `/admin/login` |
| `GEMINI_API_KEY` | Geração de rascunhos e respostas com IA |
| `GMAIL_USER` / `GMAIL_APP_PASSWORD` | Envio da newsletter (novo post) por Gmail SMTP |
| `SITE_EMAIL` | E-mail exibido no rodapé |
| `NEXT_PUBLIC_SITE_URL` | URL pública usada em links/e-mails |

---

## Páginas

[](#páginas)

- `/` — landing (hero, mais lidas da semana, últimos posts, newsletter, canais)
- `/blog`, `/blog/[slug]`, `/tag/[tag]` — conteúdo com busca, tags e comentários
- `/podcast` — episódios do RSS do Anchor com player de áudio
- `/salvos` — posts salvos neste navegador (localStorage)
- `/sobre` — sobre o projeto
- `/admin` — postagens · `/admin/new` · `/admin/edit/[id]` · `/admin/ai` (gerar rascunho com IA) · `/admin/comentarios` (moderar/responder) · `/admin/analytics` (dashboard)

---

## Funcionalidades principais🔥

[](#funcionalidades-principais)

- **Admin**: criar/editar/excluir postagens, rascunho, agendamento (`publishAt`), tags, status (publicado/rascunho/agendado), preview de Markdown, toast de sucesso
- **IA**: gera rascunho de postagem (título/resumo/conteúdo/slug sugeridos) e resposta a comentários para o admin
- **Comentários**: leitores comentam (nome + texto); admin oculta/exclui/responde (resposta pode ser gerada por IA)
- **Analytics próprio** (`/api/track`): pageviews, cliques em posts, dispositivo (mobile/desktop/tablet), país/cidade (headers da Vercel/Cloudflare + fallback ipapi.co), gráfico de 30 dias, filtro 7/30/90, mapa-múndi (Leaflet), exportação CSV
- **Newsletter**: formulário em `/` e envio automático de e-mail via Gmail SMTP quando um post é publicado (cron-free, enviado na ação de salvar)
- **Podcast**: lista do RSS do Anchor com player de áudio embutido (cache de 1h)
- **Busca global Ctrl+K**, modo leitura (A+/A-), barra de progresso, tempo de leitura, "leia também", favoritos, OG image por post, PWA (manifest + ícones), tema claro/escuro

---

## Testes

[](#testes)

```bash
npm test   # smoke HTTP (tests/smoke.test.mjs) + unitários (tests/units.test.ts)
```

---

## Deploy

[](#deploy)

Next.js 16 na Vercel. Configure as mesmas envs do `.env` no painel da Vercel. O app é PWA-instalável pelo navegador.

---

## Licença

[](#licença)

MIT — © 2026 área reversa

---

## Créditos💖

[](#créditos)

Desenvolvido com ❤️ por **Tiago de Abreu** - Instagram [@devtiagoabreu](https://instagram.com/devtiagoabreu)

Projeto iniciativa pessoal - sem fins lucrativos.

Versão 1.0.1 - Novembro 2026