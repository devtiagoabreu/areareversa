# área reversa

Blog e podcast de engenharia reversa de narrativas — ideias, discursos e políticas desmontados sem filtro.

<div align="center">

[![Visits](https://api.countapi.xyz/hit/areareversa/readme?theme=default)](https://github.com/devtiagoabreu/areareversa)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/devtiagoabreu/areareversa/blob/main/LICENSE)
[![Vercel](https://vercel.com/badge-vercel?vercel-url=https%3A%2F%2Fpdmprotextil.vercel.app&slug=areareversa&rgb=black)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdevtiagoabreu%2Fareareversa)
[![GitHub stars](https://img.shields.io/github/stars/devtiagoabreu/areareversa?style=social)](https://github.com/devtiagoabreu/areareversa/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/devtiagoabreu/areareversa?style=social)](https://github.com/devtiagoabreu/areareversa/forks)

</div>

---

## Visão geral.com/8e285d6c04022c2a7b4d9c10ab4261dae0236525c30a21caddeb90740d2294bb/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4e6578742e6a732d31352d626c61636b3f6c6f676f3d6e6578742e6a73)](https://nextjs.org/) [![TypeScript](https://camo.githubusercontent.com/97fc638db3dd58f0590d3cc254cd7a8a65369aad17049aba215575dd3ec55dcb/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f547970655363726970742d352d626c75653f6c6f676f3d74797065736372697074)](https://www.typescriptlang.org/) [![React](https://camo.githubusercontent.e60320c5d99fc86fbe369cd429977c14ff9bfe8990faa535ffe5587ceb2c8ee3/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f52656163742d31392d3631444146423f6c6f676f3d7265616374)](https://react.dev/) [![Tailwind](https://camo.githubusercontent.e62ad0925f75ed69f7c0de18ef7332fbbe1634421ad079194369102544bfb375/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f5461696c77696e642d332e342d3338423241433f6c6f676f3d7461696c77696e642d637373)](https://tailwindcss.com/) [![Prisma](https://camo.githubusercontent.e62ad0925f75ed69f7c0de18ef7332fbbe1634421ad079194369102544bfb375/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f507269736d612d302e34352d4342413646373f6c6f676f3d6472697a7a6c65)](https://www.prisma.io/) [![Gemini](https://camo.githubusercontent.e62ad0925f75ed69f7c0de18ef7332fbbe1634421ad079194369102544bfb375/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f47696e696d692d6d65646961)](https://gemini.google.com/) [![Nodemailer](https://camo.githubusercontent.e62ad0925f75ed69f7c0de18ef7332fbbe1634421ad079194369102544bfb375/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4e6f646d61696c6572)](https://nodemailer.com/) [![Leaflet](https://camo.githubusercontent.e62ad0925f75ed69f7c0de18ef7332fbbe1634421ad079194369102544bfb375/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f4c656166656c65742d6d6574686f64)](https://leafletjs.com/) [![RSS Parser](https://camo.githubusercontent.e62ad0925f75ed69f7c0de18ef7332fbbe1634421ad079194369102544bfb375/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f7273732d706173737764)](https://github.com/rbriaverso/rss-parser)

---

## Visão geral

[](#visão-geral)

**área reversa** é um blog e podcast que analisa criticamente narrativas, discursos e políticas públicas, desmontando argumentos com evidências e pesquisa. A plataforma publica artigos semanais, episódios de podcast e oferece recursos de busca, tags e newsletter para acompanhamento do conteúdo.

O projeto visa criar um espaço de transparência e análise profunda sobre temas políticos e sociais, utilizando engenharia reversa de discursos como método de investigação.

| Funcionalidade | Descrição |
| --- | --- |
| **Publicação de posts** | Sistema de criação, edição e gerenciamento de posts de blog |
| **Podcast** | Integração com RSS do Anchor, player embutido e cache de episódios |
| **Newsletter** | Envio automático por e-mail via Gmail SMTP quando um novo post é publicado |
| **Busca avançada** | Pesquisa global (Ctrl+K), filtros por tags, modo leitura, favoritos |
| **Comentários** | Sistema de comentários com moderação por admin e respostas geradas por IA |
| **Analytics próprio** | Rastreamento de pageviews, cliques, dados de dispositivo e geográficos |
| **PWA** | Aplicativo instalável com manifest e ícones para tema claro/escuro |

---

## Stack

[](#stack)

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript 5 |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui |
| ORM | Prisma 7 + PostgreSQL (Neon) |
| IA | Gemini `gemini-3.5-flash-lite` |
| E-mail | Nodemailer + Gmail SMTP |
| Mapas | Leaflet |
| RSS/Feed | rss-parser |
| Testes | Vitest + Testing Library |
| Deploy | Vercel |

---

## Começando

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

## Funcionalidades principais

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

## Créditos

[](#créditos)

Desenvolvido por **Projeto área reversa**.