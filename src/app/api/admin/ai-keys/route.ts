import { NextRequest, NextResponse } from 'next/server';
import { getActiveKeys, getDashboardStats, getKeyWithDecrypted } from '@/lib/ai/key-manager';
import { createProvider } from '@/lib/ai/providers';
import { isAuthed } from '@/lib/auth';

async function unauthorized() {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
}

export async function GET() {
  if (!(await isAuthed())) return unauthorized();
  try {
    const [keys, stats] = await Promise.all([
      getActiveKeys(),
      getDashboardStats(),
    ]);
    
    // Remove encrypted keys from response
    const safeKeys = keys.map(({ apiKeyEncrypted, ...rest }) => rest);
    
    return NextResponse.json({ keys: safeKeys, stats });
  } catch (error) {
    console.error('Error fetching keys:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar chaves' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!(await isAuthed())) return unauthorized();
  try {
    const formData = await request.formData();
    
    const name = formData.get('name') as string;
    const provider = formData.get('provider') as string;
    const model = formData.get('model') as string;
    const baseUrl = formData.get('baseUrl') as string;
    const apiKey = formData.get('apiKey') as string;
    const monthlyTokenLimit = parseInt(formData.get('monthlyTokenLimit') as string);
    const priority = parseInt(formData.get('priority') as string);
    const notes = formData.get('notes') as string;
    
    if (!name || !provider || !model || !apiKey) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: name, provider, model, apiKey' },
        { status: 400 }
      );
    }
    
    // Encrypt the API key
    const { encryptApiKey } = await import('@/lib/ai/encryption');
    const encrypted = encryptApiKey(apiKey);
    const encryptedString = `${encrypted.iv}:${encrypted.ciphertext}:${encrypted.authTag}`;
    
    // Get max priority for new key
    const { prisma } = await import('@/lib/prisma');
    const maxPriority = await prisma.aIKey.aggregate({
      _max: { priority: true },
    });
    
    const key = await prisma.aIKey.create({
      data: {
        name,
        provider: provider as any,
        apiKeyEncrypted: encryptedString,
        model,
        baseUrl: baseUrl || null,
        monthlyTokenLimit: isNaN(monthlyTokenLimit) ? 1000000 : monthlyTokenLimit,
        priority: isNaN(priority) ? (maxPriority._max.priority ?? 0) + 1 : priority,
        notes: notes || null,
      },
    });
    
    // Remove encrypted key from response
    const { apiKeyEncrypted, ...safeKey } = key;
    
    return NextResponse.json(safeKey, { status: 201 });
  } catch (error) {
    console.error('Error creating key:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar chave' },
      { status: 500 }
    );
  }
}