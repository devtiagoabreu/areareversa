import { NextRequest, NextResponse } from 'next/server';
import { testKey } from '@/lib/ai/key-manager';
import { isAuthed } from '@/lib/auth';

export async function POST(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json(
      { success: false, latencyMs: 0, error: 'Não autorizado' },
      { status: 401 }
    );
  }
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json(
        { success: false, latencyMs: 0, error: 'id é obrigatório' },
        { status: 400 }
      );
    }
    const result = await testKey(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing key:', error);
    return NextResponse.json(
      { success: false, latencyMs: 0, error: error instanceof Error ? error.message : 'Erro ao testar chave' },
      { status: 500 }
    );
  }
}