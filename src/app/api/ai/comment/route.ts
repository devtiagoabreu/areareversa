import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateText, NoKeyAvailableError, AIRequestFailedError } from "@/lib/ai/run";

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: "não autorizado" }, { status: 401 });

  const { commentId } = await req.json().catch(() => ({}));
  const comment = await prisma.comment.findUnique({ where: { id: String(commentId ?? "") }, include: { post: true } }).catch(() => null);
  if (!comment) return NextResponse.json({ error: "comentário não encontrado" }, { status: 404 });

  const prompt = `Você é o editor do blog "área reversa" (tom crítico, direto, sem filtro). Escreva uma resposta CURTA (2-4 frases), em português, para o comentário de um leitor no post "${comment.post.title}". Use o conteúdo do post como contexto. Se o comentário for ofensivo, responda com firmeza e respeito, sem atacar de volta.\n\nPost:\n${comment.post.content.slice(0, 6000)}\n\nComentário de ${comment.name}:\n${comment.text}`;

  try {
    // Usa a chave cadastrada em ai_keys (com failover), não a do .env
    const result = await generateText({ prompt, endpoint: "comment", temperature: 0.6, maxTokens: 800 });
    if (!result.content) {
      return NextResponse.json({ error: "Falha ao gerar" }, { status: 502 });
    }
    return NextResponse.json({ resposta: result.content });
  } catch (error) {
    if (error instanceof NoKeyAvailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof AIRequestFailedError) {
      return NextResponse.json({ error: "Falha ao gerar", detalhe: error.message }, { status: 502 });
    }
    throw error;
  }
}
