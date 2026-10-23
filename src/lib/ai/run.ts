/**
 * Execução de texto via chaves cadastradas no banco (tabela ai_keys).
 *
 * Ponto único usado pelas rotas de IA: escolhe a próxima chave disponível,
 * descriptografa, chama o provider, registra uso e faz failover para outra
 * chave se a atual falhar. Nenhuma rota deve ler process.env.*_API_KEY.
 */

import { createProvider } from './providers';
import {
  getNextAvailableKey,
  recordUsage,
  recordFailover,
  incrementErrorCount,
  type KeyWithDecrypted,
} from './key-manager';

export class NoKeyAvailableError extends Error {
  constructor() {
    super('Nenhuma chave de IA disponível. Cadastre uma em /admin/ai-keys.');
    this.name = 'NoKeyAvailableError';
  }
}

export class AIRequestFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIRequestFailedError';
  }
}

export interface GenerateTextOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  /** Rótulo gravado em ai_usage_logs.endpoint */
  endpoint: string;
  /** Preenchido quando a chamada pertence a uma sessão de contexto */
  sessionId?: string;
}

export interface GenerateTextResult {
  content: string;
  model: string;
  provider: string;
  keyId: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number };
  keySwitched: boolean;
}

function classifyError(error: unknown): 'EXHAUSTED' | 'ERROR' | 'RATE_LIMIT' | 'MANUAL' | 'MODEL_SWITCH' {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('quota') || message.includes('billing') || message.includes('insufficient')) {
      return 'EXHAUSTED';
    }
    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429') ||
      message.includes('resource has been exhausted')
    ) {
      return 'RATE_LIMIT';
    }
  }
  return 'ERROR';
}

function buildAdapter(key: KeyWithDecrypted) {
  return createProvider({
    provider: key.provider,
    apiKey: key.apiKey,
    model: key.model,
    baseUrl: key.baseUrl ?? undefined,
  });
}

/**
 * Gera texto usando a primeira chave do banco que responder. Em caso de falha,
 * marca a chave, registra o failover e tenta a próxima — sem repetir a mesma.
 */
export async function generateText(options: GenerateTextOptions): Promise<GenerateTextResult> {
  const {
    prompt,
    systemPrompt = '',
    temperature = 0.7,
    maxTokens = 4000,
    endpoint,
    sessionId = '',
  } = options;

  const estimatedTokens = Math.ceil((systemPrompt.length + prompt.length) / 4) + maxTokens;
  const tried: string[] = [];
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const key = await getNextAvailableKey(
      { sessionId, estimatedTokens },
      tried
    );

    if (!key) {
      if (tried.length === 0) throw new NoKeyAvailableError();
      break;
    }

    const startedAt = Date.now();

    try {
      const adapter = buildAdapter(key);
      const result = await adapter.complete({
        messages: [{ role: 'user', content: prompt }],
        systemPrompt,
        temperature,
        maxTokens,
      });

      await recordUsage(key.id, result.usage, {
        model: result.model ?? key.model,
        endpoint,
        success: true,
        latencyMs: Date.now() - startedAt,
      });

      return {
        content: result.content,
        model: result.model ?? key.model,
        provider: key.provider,
        keyId: key.id,
        usage: result.usage,
        keySwitched: tried.length > 0,
      };
    } catch (error) {
      lastError = error;
      tried.push(key.id);

      // registrar falha e seguir para próxima chave disponível
      await incrementErrorCount(key.id);
      await recordFailover({
        fromKeyId: key.id,
        toKeyId: undefined,
        fromModel: key.model,
        toModel: undefined,
        reason: classifyError(error),
        tokensUsed: 0,
        sessionId,
      });
    }
  }

  throw new AIRequestFailedError(
    lastError instanceof Error ? lastError.message : 'Nenhuma chave de IA conseguiu responder.'
  );
}
