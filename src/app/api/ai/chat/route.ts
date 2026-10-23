/**
 * Unified AI Chat Endpoint with Automatic Failover
 * 
 * This endpoint handles all AI chat requests with automatic failover
 * across multiple API keys and providers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { getNextAvailableKey, recordUsage, recordFailover, getErrorCount, incrementErrorCount } from '@/lib/ai/key-manager';
import { loadContextSession, createContextSession, saveContextSession, prepareMessagesForModel, addMessageToContext } from '@/lib/ai/context-manager';
import { createProvider, getProviderMetadata } from '@/lib/ai/providers';
import { estimateTokensForProvider } from '@/lib/ai/providers';

interface ChatRequest {
  sessionId: string;
  prompt: string;
  systemPrompt?: string;
  currentTask?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string; // optional override
  provider?: string; // optional override
  tools?: any[];
  toolChoice?: 'auto' | 'none' | 'required';
  responseFormat?: { type: 'json_object' | 'text' };
  contextWindowOverride?: number;
}

interface ChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
  keyId: string;
  finishReason: string;
  keySwitched: boolean;
  fromKeyId?: string;
  fromModel?: string;
  latencyMs: number;
}

const DEFAULT_SYSTEM_PROMPT = `Você é um analista da Área Reversa, um site de engenharia reversa de discursos políticos.
Sua missão: desmontar narrativas, separar fato de enquadramento, e apresentar dados verificáveis.

Diretrizes:
- Use o método: DOCUMENTO (fonte primária) → CHECAGEM (verificação) → ENQUADRAMENTO (opinião)
- Cite fontes com link e data. Se não há fonte, diga "não há fonte auditável".
- Não force simetria onde não há. Aplique o mesmo padrão de prova aos dois lados.
- Distinga: FATO (documentável), CHECAGEM (verificação com método), OPINIÃO (juízo de valor), ENQUADRAMENTO (rótulo político).
- Tom: crítico, direto, sem filtro, mas rigoroso nos dados.
- Estruture respostas longas com: FATOS → ANÁLISE → CONCLUSÃO.
- Se houver dúvida, declare a incerteza. Não invente.`;

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-4-turbo': 128000,
  'gpt-4': 8192,
  'gpt-3.5-turbo': 16384,
  'claude-3-5-sonnet-20241022': 200000,
  'claude-3-opus-20240229': 200000,
  'claude-3-haiku-20240307': 200000,
  'gemini-1.5-pro': 2000000,
  'gemini-1.5-flash': 1000000,
  'llama-3.1-70b-versatile': 131072,
  'llama-3.1-8b-instant': 131072,
  'deepseek-chat': 65536,
  'deepseek-coder': 65536,
};

export async function POST(request: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  const startTime = Date.now();
  
  try {
    const body: ChatRequest = await request.json();
    const {
      sessionId,
      prompt,
      systemPrompt = DEFAULT_SYSTEM_PROMPT,
      currentTask,
      temperature = 0.3,
      maxTokens = 4000,
      model,
      provider,
      tools,
      toolChoice,
      responseFormat,
      contextWindowOverride,
    } = body;
    
    // Validate required fields
    if (!sessionId || !prompt) {
      return NextResponse.json(
        { error: 'sessionId and prompt are required' },
        { status: 400 }
      );
    }
    
    // Load or create context session
    let context = await loadOrCreateContext(sessionId, systemPrompt, currentTask);
    
    // Add user message to context
    await addMessageToContext(context.sessionId, { role: 'user', content: prompt });
    context = await loadOrCreateContext(sessionId, systemPrompt, currentTask);
    
    // Prepare messages for the model
    const targetModel = model || 'gpt-4o';
    const contextWindow = contextWindowOverride || MODEL_CONTEXT_WINDOWS[targetModel] || 128000;
    const messages = prepareMessagesForModel(
      context,
      targetModel,
      MODEL_CONTEXT_WINDOWS
    );
    
    // Estimate tokens for this request
    const promptText = [systemPrompt, ...messages.map((m: any) => m.content)].join('\n');
    const estimatedTokens = estimateTokensForProvider(promptText, provider || 'OPENAI') + (maxTokens || 4000);
    
    // Get next available key with failover
    const key = await getNextAvailableKey({
      sessionId: context.sessionId,
      estimatedTokens: estimatedTokens,
    });
    
    if (!key) {
      return NextResponse.json(
        { error: 'Nenhuma chave de API disponível. Todas as chaves exauridas ou com erro.' },
        { status: 503 }
      );
    }
    
    // Execute request with failover
    const result = await executeWithFailover({
      key,
      model: targetModel,
      provider: provider || key.provider,
      systemPrompt,
      messages,
      temperature,
      maxTokens,
      tools,
      toolChoice,
      responseFormat,
    }, context);
    
    // Save assistant response to context
    await addMessageToContext(context.sessionId, {
      role: 'assistant',
      content: result.content,
    });
    
    // Record usage for the key that actually served the request
    const usedKeyId = result.keyId || key.id;
    await recordUsage(usedKeyId, result.usage, {
      model: result.model,
      endpoint: 'chat',
      success: true,
      latencyMs: Date.now() - startTime,
    });
    
    // Update context with usage
    context.metadata.totalTokensUsed += result.usage.totalTokens;
    context.metadata.updatedAt = new Date().toISOString();
    await saveContextSession(context);
    
    const latencyMs = Date.now() - startTime;
    
    return NextResponse.json({
      content: result.content,
      usage: result.usage,
      model: result.model,
      provider: key.provider,
      keyId: key.id,
      finishReason: result.finishReason,
      keySwitched: result.keySwitched,
      fromKeyId: result.fromKeyId,
      fromModel: result.fromModel,
      latencyMs,
    } as ChatResponse);
    
  } catch (error) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions
async function loadOrCreateContext(sessionId: string, systemPrompt: string, currentTask?: string): Promise<import('@/lib/ai/context-manager').AIContext> {
  let context = await loadContextSession(sessionId);
  
  if (!context) {
    context = await createContextSession({
      sessionId,
      systemPrompt,
      currentTask,
      initialModel: 'gpt-4o',
    });
  }
  
  return context;
}

async function createProviderAdapter(key: any) {
  // Dynamic import to avoid circular dependencies
  const { createProvider } = await import('@/lib/ai/providers');
  
  return createProvider({
    provider: key.provider,
    apiKey: key.apiKey,
    model: key.model,
    baseUrl: key.baseUrl,
  });
}

async function executeWithFailover(
  request: {
    key: any;
    model: string;
    provider: string;
    systemPrompt: string;
    messages: any[];
    temperature: number;
    maxTokens: number;
    tools?: any[];
    toolChoice?: 'auto' | 'none' | 'required';
    responseFormat?: { type: 'json_object' | 'text' };
  },
  context: any
) {
  const startTime = Date.now();
  let currentKey = request.key;
  let currentModel = request.model;
  let keySwitched = false;
  let fromKeyId: string | undefined;
  let fromModel: string | undefined;
  let attempt = 0;
  const maxAttempts = 3;
  const sessionId = context?.sessionId ?? '';

  while (attempt < maxAttempts) {
    try {
      const providerAdapter = await createProviderAdapter(currentKey);

      const result = await providerAdapter.complete({
        messages: request.messages,
        systemPrompt: request.systemPrompt,
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        tools: request.tools,
        toolChoice: request.toolChoice,
        responseFormat: request.responseFormat,
      });

      return {
        ...result,
        keyId: currentKey.id,
        keySwitched,
        fromKeyId: keySwitched ? fromKeyId : undefined,
        fromModel: keySwitched ? fromModel : undefined,
        latencyMs: Date.now() - startTime,
      };

    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);

      // Record error for current key (circuit breaker after 3 failures)
      await incrementErrorCount(currentKey.id);

      // Get next available key
      const nextKey = await getNextAvailableKey({
        sessionId,
        estimatedTokens: request.maxTokens,
        currentModel,
      });

      // Record failover event for audit trail
      await recordFailover({
        fromKeyId: currentKey.id,
        toKeyId: nextKey?.id,
        fromModel: currentModel,
        toModel: nextKey?.model,
        reason: classifyError(error),
        tokensUsed: 0,
        sessionId,
      });

      if (!nextKey) {
        throw new Error('No available keys for failover');
      }

      // Record the switch
      keySwitched = true;
      fromKeyId = currentKey.id;
      fromModel = currentModel;

      currentKey = nextKey;
      currentModel = nextKey.model;
      attempt++;
    }
  }

  throw new Error('Max failover attempts exceeded');
}

function classifyError(error: unknown): 'EXHAUSTED' | 'ERROR' | 'RATE_LIMIT' | 'MANUAL' | 'MODEL_SWITCH' {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes('quota') || message.includes('billing') || message.includes('insufficient')) {
      return 'EXHAUSTED';
    }
    if (message.includes('rate limit') || message.includes('too many requests') || message.includes('429')) {
      return 'RATE_LIMIT';
    }
  }
  return 'ERROR';
}