-- Popula campos de tradução para posts existentes.
-- Define o título e o resumo em inglês/espanhol como fallback ao texto em português.
-- Após criar esta migration, rode: npx prisma migrate deploy
-- Depois, preencha manualmente as traduções no admin ou via SQL quando desejar.

UPDATE "posts"
SET 
  "title_en" = COALESCE("title_en", "title"),
  "excerpt_en" = COALESCE("excerpt_en", "excerpt"),
  "title_es" = COALESCE("title_es", "title"),
  "excerpt_es" = COALESCE("excerpt_es", "excerpt")
WHERE "title_en" IS NULL OR "excerpt_en" IS NULL OR "title_es" IS NULL OR "excerpt_es" IS NULL;