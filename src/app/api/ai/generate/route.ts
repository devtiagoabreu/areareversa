import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { generateText, NoKeyAvailableError, AIRequestFailedError } from "@/lib/ai/run";

export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  const { tema, instrucoes } = await req.json();
  const prompt = `Você é um redator do blog "área reversa" (engenharia reversa de ideias, discursos e políticas, tom crítico, direto, sem filtro). Escreva uma postagem em Markdown bem estruturada (título H1, subtítulos, parágrafos curtos) sobre: ${tema}. ${instrucoes ?? ""}`;

  try {
    // Usa a chave cadastrada em ai_keys (com failover), não a do .env
    const result = await generateText({ prompt, endpoint: "generate", maxTokens: 8000 });
    return NextResponse.json({ texto: result.content });
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
