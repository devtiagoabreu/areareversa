import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { decryptApiKey } from '@/lib/ai/encryption';
import { getDashboardStats, testKey, getKeyUsageHistory } from '@/lib/ai/key-manager';
import { isAuthed } from '@/lib/auth';

async function unauthorized() {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthed())) return unauthorized();
  try {
    const { id } = await params;
    
    const key = await prisma.aIKey.findUnique({
      where: { id },
      include: {
        usageLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        fromFailoverEvents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        toFailoverEvents: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        contextSessions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
    
    if (!key) {
      return NextResponse.json({ error: 'Chave não encontrada' }, { status: 404 });
    }
    
    // Remove encrypted key from response
    const { apiKeyEncrypted, ...safeKey } = key;
    
    return NextResponse.json({ key: safeKey });
  } catch (error) {
    console.error('Error fetching key:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar chave' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthed())) return unauthorized();
  try {
    const { id } = await params;
    const contentType = request.headers.get('content-type') ?? '';
    const body: any = contentType.includes('application/json')
      ? await request.json()
      : Object.fromEntries(await request.formData());
    
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.provider) updateData.provider = body.provider;
    if (body.model) updateData.model = body.model;
    if (body.baseUrl !== undefined) updateData.baseUrl = body.baseUrl;
    if (body.monthlyTokenLimit !== undefined && body.monthlyTokenLimit !== '') updateData.monthlyTokenLimit = Number(body.monthlyTokenLimit);
    if (body.priority !== undefined && body.priority !== '') updateData.priority = Number(body.priority);
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.status) updateData.status = body.status;
    
    // Handle API key update if provided
    if (body.apiKey) {
      const { encryptApiKey } = await import('@/lib/ai/encryption');
      const encrypted = encryptApiKey(body.apiKey);
      updateData.apiKeyEncrypted = `${encrypted.iv}:${encrypted.ciphertext}:${encrypted.authTag}`;
    }
    
    const { prisma } = await import('@/lib/prisma');
    
    const key = await prisma.aIKey.update({
      where: { id },
      data: updateData,
    });
    
    const { apiKeyEncrypted, ...safeKey } = key;
    return NextResponse.json(safeKey);
  } catch (error) {
    console.error('Error updating key:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar chave' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthed())) return unauthorized();
  try {
    const { id } = await params;
    
    const { prisma } = await import('@/lib/prisma');
    
    await prisma.aIKey.delete({ where: { id } });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting key:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir chave' },
      { status: 500 }
    );
  }
}