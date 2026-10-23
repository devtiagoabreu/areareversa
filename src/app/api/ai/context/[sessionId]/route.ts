import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthed } from '@/lib/auth';
import { createContextSession, loadContextSession, saveContextSession, addMessageToContext } from '@/lib/ai/context-manager';

async function unauthorized() {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (!(await isAuthed())) return unauthorized();
  try {
    const { sessionId } = await params;
    
    const session = await prisma.aIContextSession.findUnique({
      where: { sessionId },
    });
    
    if (!session) {
      return NextResponse.json({ error: 'Sessão não encontrada' }, { status: 404 });
    }
    
    return NextResponse.json(session);
  } catch (error) {
    console.error('Error fetching context:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar contexto' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  if (!(await isAuthed())) return unauthorized();
  try {
    const { sessionId } = await params;
    const body = await request.json();
    
    const { messages, systemPrompt, currentTask, artifacts, tokenBudget, metadata } = body;
    
    const session = await prisma.aIContextSession.upsert({
      where: { sessionId },
      create: {
        sessionId,
        messages: messages ?? [],
        systemPrompt: systemPrompt ?? '',
        currentTask: currentTask ?? null,
        artifacts: artifacts ?? [],
        tokenBudget: tokenBudget ?? 4000,
        metadata: metadata ?? {},
      },
      update: {
        messages: messages ?? undefined,
        systemPrompt: systemPrompt ?? undefined,
        currentTask: currentTask ?? undefined,
        artifacts: artifacts ?? undefined,
        tokenBudget: tokenBudget ?? undefined,
        metadata: metadata ?? undefined,
      },
    });
    
    return NextResponse.json(session);
  } catch (error) {
    console.error('Error saving context:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar contexto' },
      { status: 500 }
    );
  }
}