import { NextResponse } from "next/server";
import { isAuthed } from "@/lib/auth";
import { generateText, NoKeyAvailableError, AIRequestFailedError } from "@/lib/ai/run";

/**
 * Traduz um post do português para inglês ou espanhol.
 *
 * Recebe título, resumo e conteúdo em pt-BR e devolve os três traduzidos. O
 * conteúdo é Markdown e precisa continuar Markdown: por isso a instrução
 * explícita de preservar a estrutura, os links e as imagens — sem ela o modelo
 * tende a "limpar" a marcação.
 *
 * A resposta vem como JSON pedido no próprio prompt. Se o modelo devolver o
 * JSON embrulhado em ```json, o parse limpa a cerca antes de tentar.
 *
 * A chave usada vem da tabela ai_keys (admin), com failover entre chaves.
 */
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "não autorizado" }, { status: 401 });
  }

  // Corpo inválido não pode virar 500: o formulário do admin mostraria um erro
  // genérico de servidor em vez do motivo.
  let body: { title?: string; excerpt?: string; content?: string; target?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "requisição inválida" }, { status: 400 });
  }
  const { title, excerpt, content, target } = body;
  if (target !== "en" && target !== "es") {
    return NextResponse.json({ error: "idioma de destino inválido" }, { status: 400 });
  }
  if (!String(content ?? "").trim()) {
    return NextResponse.json({ error: "nada para traduzir" }, { status: 400 });
  }

  const idioma = target === "en" ? "inglês" : "espanhol";

  const prompt = `Você traduz o blog "área reversa" (engenharia reversa de ideias, discursos e políticas públicas; tom crítico, direto, sem filtro) de português para ${idioma}.

Regras:
- Traduza para ${idioma} natural, como um jornalista nativo escreveria. Nada de tradução literal.
- Preserve TODO o Markdown: títulos (#, ##), listas, links, imagens, tabelas, blocos de código e citações. Não remova nem reordene nada.
- Preserve nomes próprios, siglas brasileiras e cargos como estão (ex.: "TCU", "Centrão", "PEC", "STF"). Se fizer sentido, explique entre parênteses na primeira menção.
- Mantenha números, valores e datas idênticos.
- Não adicione comentários, avisos nem texto fora do JSON.

Responda APENAS com um JSON válido, sem cercas de código, neste formato exato:
{"title": "título traduzido", "excerpt": "resumo traduzido", "content": "conteúdo traduzido completo em Markdown"}

Título em português:
${title}

Resumo em português:
${excerpt}

Conteúdo em português:
${content}`;

  let text: string;
  try {
    const result = await generateText({
      prompt,
      endpoint: "translate",
      temperature: 0.3,
      maxTokens: 16000,
    });
    text = result.content;
  } catch (error) {
    if (error instanceof NoKeyAvailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    if (error instanceof AIRequestFailedError) {
      return NextResponse.json({ error: "Falha ao traduzir", detalhe: error.message }, { status: 502 });
    }
    throw error;
  }

  if (!text) {
    return NextResponse.json({ error: "Falha ao traduzir" }, { status: 502 });
  }

  // Remove cerca de código e pega o primeiro objeto JSON do texto.
  const limpo = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const inicio = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  try {
    const parsed = JSON.parse(limpo.slice(inicio, fim + 1));
    return NextResponse.json({
      title: parsed.title ?? "",
      excerpt: parsed.excerpt ?? "",
      content: parsed.content ?? "",
    });
  } catch {
    return NextResponse.json(
      { error: "A IA respondeu em formato inesperado. Tente novamente." },
      { status: 502 }
    );
  }
}
