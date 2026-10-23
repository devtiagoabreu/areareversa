import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/ai/key-manager';
import { isAuthed } from '@/lib/auth';

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}