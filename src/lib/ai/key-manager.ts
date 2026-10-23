/**
 * AI Key Manager — Core service for key selection, failover, and usage tracking
 */

import type { AIKey } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { decryptApiKey } from './encryption';


export interface AIContext {
  sessionId: string;
  estimatedTokens: number;
  currentModel?: string;
}

export interface KeyWithDecrypted extends AIKey {
  apiKey: string; // decrypted
}

/**
 * Gets all active keys ordered by priority
 */
export async function getActiveKeys(): Promise<AIKey[]> {
  return prisma.aIKey.findMany({
    where: {
      status: 'ACTIVE',
    },
    orderBy: [
      { priority: 'asc' },
      { currentMonthUsed: 'asc' }, // prefer less used keys at same priority
    ],
  });
}

/**
 * Gets a key with decrypted API key (server-side only)
 */
export async function getKeyWithDecrypted(keyId: string): Promise<KeyWithDecrypted | null> {
  const key = await prisma.aIKey.findUnique({ where: { id: keyId } });
  if (!key) return null;
  
  try {
    const apiKey = decryptApiKey({
      iv: key.apiKeyEncrypted.split(':')[0],
      ciphertext: key.apiKeyEncrypted.split(':')[1],
      authTag: key.apiKeyEncrypted.split(':')[2],
      version: 1
    } as any);
    
    return { ...key, apiKey };
  } catch (error) {
    console.error(`Failed to decrypt key ${keyId}:`, error);
    return null;
  }
}

/**
 * Selects the next available key for a request
 * Implements failover logic: tries keys in priority order, skips exhausted/errored/rate-limited
 */
export async function getNextAvailableKey(
  context: AIContext,
  excludeKeyIds: string[] = []
): Promise<KeyWithDecrypted | null> {
  const keys = await getActiveKeys();
  
  for (const key of keys) {
    if (excludeKeyIds.includes(key.id)) continue;

    // Check if key has sufficient quota
    const available = key.monthlyTokenLimit - key.currentMonthUsed;
    if (available < context.estimatedTokens) {
      // Mark as exhausted if not already
      if (key.status !== 'EXHAUSTED') {
        await prisma.aIKey.update({
          where: { id: key.id },
          data: { status: 'EXHAUSTED' }
        });
      }
      continue;
    }
    
    // Check error count (circuit breaker)
    if (key.errorCount >= 3) {
      continue;
    }
    
    // Check rate limit (last 60 seconds)
    const recentUsage = await prisma.aIUsageLog.count({
      where: {
        keyId: key.id,
        createdAt: { gte: new Date(Date.now() - 60000) },
      },
    });
    
    // Rough rate limit: 60 requests/minute per key
    if (recentUsage >= 60) {
      continue;
    }
    
    // Decrypt and return
    const decrypted = await getKeyWithDecrypted(key.id);
    if (!decrypted) continue;
    
    return decrypted;
  }
  
  return null; // No available key
}

/**
 * Records usage after a successful request
 */
export async function recordUsage(
  keyId: string,
  usage: { promptTokens: number; completionTokens: number; totalTokens: number },
  metadata: { model: string; endpoint: string; success: boolean; errorMessage?: string; latencyMs: number }
): Promise<void> {
  await prisma.$transaction([
    // Update key usage counters
    prisma.aIKey.update({
      where: { id: keyId },
      data: {
        currentMonthUsed: { increment: usage.totalTokens },
        totalLifetimeUsed: { increment: usage.totalTokens },
        lastUsedAt: new Date(),
        errorCount: metadata.success ? 0 : { increment: 1 },
        status: metadata.success ? undefined : (await getErrorCount(keyId) >= 3 ? 'ERROR' : undefined),
      },
    }),
    // Log usage
    prisma.aIUsageLog.create({
      data: {
        keyId,
        model: metadata.model,
        promptTokens: usage.promptTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.totalTokens,
        endpoint: metadata.endpoint,
        success: metadata.success,
        errorMessage: metadata.errorMessage,
        latencyMs: metadata.latencyMs,
      },
    }),
  ]);
}

export async function getErrorCount(keyId: string): Promise<number> {
  const key = await prisma.aIKey.findUnique({
    where: { id: keyId },
    select: { errorCount: true },
  });
  return key?.errorCount ?? 0;
}

/**
 * Increments error count for a key
 */
export async function incrementErrorCount(keyId: string): Promise<void> {
  const key = await prisma.aIKey.update({
    where: { id: keyId },
    data: { errorCount: { increment: 1 } },
    select: { errorCount: true },
  });

  // Circuit breaker: only disable the key after 3 consecutive failures
  if (key.errorCount >= 3) {
    await prisma.aIKey.update({
      where: { id: keyId },
      data: { status: 'ERROR' },
    });
  }
}

/**
 * Records a failover event for audit trail
 */
export async function recordFailover(event: {
  fromKeyId?: string;
  toKeyId?: string;
  fromModel?: string;
  toModel?: string;
  reason: 'EXHAUSTED' | 'ERROR' | 'RATE_LIMIT' | 'MANUAL' | 'MODEL_SWITCH';
  tokensUsed: number;
  sessionId: string;
}): Promise<void> {
  await prisma.aIFailoverEvent.create({
    data: {
      fromKeyId: event.fromKeyId,
      toKeyId: event.toKeyId,
      fromModel: event.fromModel,
      toModel: event.toModel,
      reason: event.reason,
      tokensUsed: event.tokensUsed,
      sessionId: event.sessionId,
    },
  });
}

/**
 * Resets monthly usage counters (called by cron on configured day)
 */
export async function resetMonthlyUsage(): Promise<void> {
  await prisma.aIKey.updateMany({
    where: { status: { in: ['ACTIVE', 'EXHAUSTED'] } },
    data: {
      currentMonthUsed: 0,
      status: 'ACTIVE',
    },
  });
}

/**
 * Gets dashboard statistics
 */
export async function getDashboardStats() {
  const [keys, totalUsage, recentFailovers] = await Promise.all([
    prisma.aIKey.findMany({
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    }),
    prisma.aIUsageLog.aggregate({
      where: {
        createdAt: { gte: new Date(new Date().setDate(1)) }, // current month
      },
      _sum: { totalTokens: true },
    }),
    prisma.aIFailoverEvent.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  
  const totalLimit = keys.reduce((sum, k) => sum + k.monthlyTokenLimit, 0);
  const totalUsed = keys.reduce((sum, k) => sum + k.currentMonthUsed, 0);
  
  return {
    keys: keys.map(k => ({
      ...k,
      usagePercent: k.monthlyTokenLimit > 0 
        ? Math.round((k.currentMonthUsed / k.monthlyTokenLimit) * 100) 
        : 0,
      availableTokens: k.monthlyTokenLimit - k.currentMonthUsed,
    })),
    totalLimit,
    totalUsed,
    totalAvailable: totalLimit - totalUsed,
    globalUsagePercent: totalLimit > 0 ? Math.round((totalUsed / totalLimit) * 100) : 0,
    monthlyTotal: totalUsage._sum.totalTokens ?? 0,
    recentFailovers,
    activeKeys: keys.filter(k => k.status === 'ACTIVE').length,
    totalKeys: keys.length,
  };
}

/**
 * Tests a key by making a minimal request
 */
export async function testKey(keyId: string): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const key = await getKeyWithDecrypted(keyId);
  if (!key) return { success: false, latencyMs: 0, error: 'Key not found or decrypt failed' };

  try {
    const { createProvider } = await import('./providers');
    const adapter = createProvider({
      provider: key.provider,
      apiKey: key.apiKey,
      model: key.model,
      baseUrl: key.baseUrl ?? undefined,
    });
    return await adapter.validateKey(key.apiKey);
  } catch (error) {
    return {
      success: false,
      latencyMs: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Gets key usage history for a period
 */
export async function getKeyUsageHistory(keyId: string, days: number = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return prisma.aIUsageLog.findMany({
    where: { keyId, createdAt: { gte: since } },
    orderBy: { createdAt: 'asc' },
  });
}