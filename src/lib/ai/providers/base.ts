/**
 * Base provider interface for AI providers
 */

import { ChatMessage, AIContext } from '../context-manager';

export interface ProviderAdapter {
  readonly provider: string;
  readonly defaultModel: string;
  readonly contextWindow: number;
  complete(options: CompletionOptions): Promise<CompletionResult>;
  validateKey(apiKey: string): Promise<{ valid: boolean; latencyMs: number; error?: string }>;
  estimateTokens(text: string): number;
  getEndpoint(): string;
}

export interface ProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface CompletionOptions {
  messages: ChatMessage[];
  systemPrompt: string;
  temperature?: number;
  maxTokens: number;
  tools?: any[];
  toolChoice?: 'auto' | 'none' | 'required';
  responseFormat?: { type: 'json_object' | 'text' };
}

export interface CompletionResult {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
  toolCalls?: any[];
}

/**
 * Base class with common functionality
 */
export abstract class BaseProvider implements ProviderAdapter {
  abstract readonly provider: string;
  abstract readonly defaultModel: string;
  abstract readonly contextWindow: number;
  
  protected config: ProviderConfig;
  
  constructor(config: ProviderConfig) {
    this.config = config;
  }
  
  abstract complete(options: CompletionOptions): Promise<CompletionResult>;
  abstract validateKey(apiKey: string): Promise<{ valid: boolean; latencyMs: number; error?: string }>;
  
  estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }
  
  abstract getEndpoint(): string;
  
  /**
   * Builds the messages array with system prompt
   */
  protected buildMessages(systemPrompt: string, messages: ChatMessage[]): any[] {
    return [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role,
        content: m.content,
        ...(m.toolCalls && { tool_calls: m.toolCalls }),
        ...(m.toolCallId && { tool_call_id: m.toolCallId }),
      })),
    ];
  }
  
  /**
   * Handles rate limit errors with exponential backoff
   */
  protected async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on auth errors or bad requests
        if (this.isNonRetryableError(lastError)) {
          throw lastError;
        }
        
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }
    
    throw lastError ?? new Error('Retry failed without an error');
  }
  
  protected isNonRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return (
      message.includes('401') ||
      message.includes('403') ||
      message.includes('invalid') ||
      message.includes('unauthorized') ||
      message.includes('invalid api key') ||
      message.includes('invalid model')
    );
  }
  
  protected calculateUsage(response: any): { promptTokens: number; completionTokens: number; totalTokens: number } {
    // Override in subclasses for provider-specific usage extraction
    return {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
  }
}