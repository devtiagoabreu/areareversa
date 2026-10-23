/**
 * AI Context Manager — Persists and manages conversation context across key/model switches
 */

import type { AIContextSession } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';


export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: string;
  toolCalls?: any[];
  toolCallId?: string;
}

export interface Artifact {
  id: string;
  type: 'table' | 'chart' | 'code' | 'source' | 'analysis' | 'data';
  title: string;
  content: any;
  source?: string;
  createdAt: string;
}

export interface AIContext {
  sessionId: string;
  messages: ChatMessage[];
  systemPrompt: string;
  currentTask?: string;
  artifacts: Artifact[];
  tokenBudget: number;
  metadata: {
    originalModel: string;
    keySwitches: KeySwitchEvent[];
    totalTokensUsed: number;
    createdAt: string;
    updatedAt: string;
  };
}

export interface KeySwitchEvent {
  fromKeyId?: string;
  toKeyId?: string;
  fromModel?: string;
  toModel?: string;
  timestamp: string;
  reason: 'exhausted' | 'error' | 'rate_limit' | 'manual' | 'model_switch';
  tokensUsedBeforeSwitch: number;
}

/**
 * Creates a new context session
 */
export async function createContextSession(data: {
  sessionId: string;
  systemPrompt: string;
  initialMessages?: ChatMessage[];
  currentTask?: string;
  tokenBudget?: number;
  keyId?: string;
  initialModel?: string;
}): Promise<AIContext> {
  const now = new Date().toISOString();
  
  const context: AIContext = {
    sessionId: data.sessionId,
    messages: data.initialMessages ?? [],
    systemPrompt: data.systemPrompt,
    currentTask: data.currentTask,
    artifacts: [],
    tokenBudget: data.tokenBudget ?? 4000,
    metadata: {
      originalModel: data.initialModel ?? 'unknown',
      keySwitches: [],
      totalTokensUsed: 0,
      createdAt: now,
      updatedAt: now,
    },
  };
  
  await prisma.aIContextSession.create({
    data: {
      sessionId: data.sessionId,
      keyId: data.keyId,
      messages: (data.initialMessages ?? []) as any,
      systemPrompt: data.systemPrompt,
      currentTask: data.currentTask,
      artifacts: [] as any,
      tokenBudget: data.tokenBudget ?? 4000,
      metadata: context.metadata as any,
    },
  });
  
  return context;
}

/**
 * Loads an existing context session
 */
export async function loadContextSession(sessionId: string): Promise<AIContext | null> {
  const session = await prisma.aIContextSession.findUnique({
    where: { sessionId },
  });
  
  if (!session) return null;
  
  return {
    sessionId: session.sessionId,
    messages: (session.messages ?? []) as unknown as ChatMessage[],
    systemPrompt: session.systemPrompt,
    currentTask: session.currentTask ?? undefined,
    artifacts: (session.artifacts ?? []) as unknown as Artifact[],
    tokenBudget: session.tokenBudget,
    metadata: session.metadata as unknown as AIContext['metadata'],
  };
}

/**
 * Saves/updates a context session
 */
export async function saveContextSession(context: AIContext): Promise<void> {
  await prisma.aIContextSession.upsert({
    where: { sessionId: context.sessionId },
    create: {
      sessionId: context.sessionId,
      messages: context.messages as any,
      systemPrompt: context.systemPrompt,
      currentTask: context.currentTask,
      artifacts: context.artifacts as any,
      tokenBudget: context.tokenBudget,
      metadata: context.metadata as any,
    },
    update: {
      messages: context.messages as any,
      systemPrompt: context.systemPrompt,
      currentTask: context.currentTask,
      artifacts: context.artifacts as any,
      tokenBudget: context.tokenBudget,
      metadata: context.metadata as any,
    },
  });
}

/**
 * Adds a message to the context
 */
export async function addMessageToContext(
  sessionId: string,
  message: ChatMessage
): Promise<void> {
  const session = await loadContextSession(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  
  const messageWithTimestamp: ChatMessage = {
    ...message,
    timestamp: message.timestamp ?? new Date().toISOString(),
  };
  
  session.messages.push(messageWithTimestamp);
  session.metadata.updatedAt = new Date().toISOString();
  session.metadata.totalTokensUsed += estimateTokens(message.content);
  
  await saveContextSession(session);
}

/**
 * Adds an artifact to the context
 */
export async function addArtifactToContext(
  sessionId: string,
  artifact: Artifact
): Promise<void> {
  const session = await loadContextSession(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  
  session.artifacts.push(artifact);
  session.metadata.updatedAt = new Date().toISOString();
  
  await saveContextSession(session);
}

/**
 * Records a key switch event
 */
export async function recordKeySwitch(
  sessionId: string,
  event: Omit<KeySwitchEvent, 'timestamp'>
): Promise<void> {
  const session = await loadContextSession(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);
  
  const switchEvent: KeySwitchEvent = {
    ...event,
    timestamp: new Date().toISOString(),
  };
  
  session.metadata.keySwitches.push(switchEvent);
  session.metadata.updatedAt = new Date().toISOString();
  
  // Update session's key reference if available
  await saveContextSession(session);
}

/**
 * Prepares messages for a new model after key switch
 * Handles context window limits and summarization if needed
 */
export function prepareMessagesForModel(
  context: AIContext,
  targetModel: string,
  modelContextWindows: Record<string, number> = {}
): ChatMessage[] {
  const windowSize = modelContextWindows[targetModel] ?? 128000;
  const reservedForResponse = context.tokenBudget;
  const availableForHistory = windowSize - reservedForResponse - estimateTokens(context.systemPrompt);
  
  let messages = [...context.messages];
  let totalTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
  
  // If within limits, return as-is
  if (totalTokens <= availableForHistory) {
    return messages;
  }
  
  // Need to summarize - keep system prompt, recent messages, and summarize older ones
  const recentMessages = messages.slice(-10); // Keep last 10 messages
  const olderMessages = messages.slice(0, -10);
  
  if (olderMessages.length === 0) {
    // Not enough to summarize, just truncate oldest
    return messages.slice(-Math.floor(messages.length * 0.8));
  }
  
  // Create summary of older messages
  const summary = createSummary(olderMessages);
  
  return [
    { role: 'system', content: context.systemPrompt },
    { role: 'system', content: `[Resumo do histórico anterior]: ${summary}` },
    ...recentMessages,
  ];
}

/**
 * Estimates token count (rough approximation: 1 token ≈ 4 chars for Portuguese)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Rough estimation: 1 token ≈ 4 characters for Portuguese/English
  return Math.ceil(text.length / 4);
}

/**
 * Creates a concise summary of messages for context compression
 */
function createSummary(messages: ChatMessage[]): string {
  const topics = new Set<string>();
  const entities = new Set<string>();
  let keyPoints = 0;
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      // Extract key topics from user queries
      const words = msg.content.toLowerCase().split(/\s+/);
      for (const word of words) {
        if (word.length > 5 && !isStopWord(word)) {
          topics.add(word);
        }
      }
    }
    if (msg.role === 'assistant') {
      keyPoints++;
      // Extract key entities from responses
      const words = msg.content.split(/\s+/);
      for (const word of words) {
        if (word.length > 3 && word[0] === word[0].toUpperCase() && word.length < 20) {
          entities.add(word);
        }
      }
    }
  }
  
  return [
    `${keyPoints} pontos principais discutidos`,
    `Tópicos: ${Array.from(topics).slice(0, 10).join(', ')}`,
    `Entidades: ${Array.from(entities).slice(0, 8).join(', ')}`,
  ].join('; ');
}

const stopWords = new Set([
  'para', 'com', 'uma', 'que', 'não', 'mais', 'como', 'sobre', 'entre',
  'depois', 'antes', 'muito', 'pode', 'tem', 'está', 'são', 'ser',
  'ter', 'faz', 'vai', 'vem', 'diz', 'quer', 'sabe', 'pensa',
  'acho', 'acho', 'gente', 'pessoal', 'coisa', 'lugar', 'tempo',
  'hoje', 'ontem', 'amanhã', 'agora', 'depois', 'antes', 'sempre',
  'nunca', 'também', 'ainda', 'já', 'só', 'mesmo', 'outro', 'outra',
]);

function isStopWord(word: string): boolean {
  return stopWords.has(word.toLowerCase());
}

/**
 * Creates the default system prompt for Área Reversa
 */
export function getDefaultSystemPrompt(): string {
  return `Você é um analista da Área Reversa, um site de engenharia reversa de discursos políticos.
  
Sua missão: desmontar narrativas, separar fato de enquadramento, e apresentar dados verificáveis.

Diretrizes:
- Use o método: DOCUMENTO (fonte primária) → CHECAGEM (verificação) → ENQUADRAMENTO (opinião)
- Cite fontes com link e data. Se não há fonte, diga "não há fonte auditável".
- Não force simetria onde não há. Aplique o mesmo padrão de prova aos dois lados.
- Distinga: FATO (documentável), CHECAGEM (verificação com método), OPINIÃO (juízo de valor), ENQUADRAMENTO (rótulo político).
- Tom: crítico, direto, sem filtro, mas rigoroso nos dados.
- Estruture respostas longas com: FATOS → ANÁLISE → CONCLUSÃO.
- Se houver dúvida, declare a incerteza. Não invente.`;
}