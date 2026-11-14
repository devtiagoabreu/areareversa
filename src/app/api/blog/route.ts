import { publishedFilter, localizePost } from "@/lib/posts";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 9;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = searchParams.get("locale") || "pt-BR";
  const categoria = searchParams.get("categoria") || undefined;
  const q = searchParams.get("q") || undefined;
  const pagina = searchParams.get("pagina") || "1";
  const page = Math.max(1, parseInt(pagina, 10) || 1);

  const where = {
    ...publishedFilter(),
    ...(categoria ? { category: categoria } : {}),
    ...(q
      ? { OR: [{ title: { contains: q, mode: "insensitive" as const } }, { excerpt: { contains: q, mode: "insensitive" as const } }] }
      : {}),
  };

  const [posts, total, grouped] = await Promise.all([
    prisma.post.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }).catch(() => []),
    prisma.post.count({ where }).catch(() => 0),
    prisma.post.groupBy({ by: ["category"], where: publishedFilter(), _count: { _all: true }, orderBy: { category: "asc" } }).catch(() => []),
  ]);

  const localizedPosts = posts.map((p) => localizePost(p, locale));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return Response.json({
    posts: localizedPosts,
    total,
    grouped,
    searchParams: { categoria, q, locale },
    page,
    pages,
  });
}