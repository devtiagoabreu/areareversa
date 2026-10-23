/**
 * Provider Factory — Returns the appropriate provider adapter
 */

import { ProviderConfig } from './base';
import { OpenAIProvider } from './openai';
import { AnthropicProvider } from './anthropic';
import { GoogleProvider } from './google';
import { GroqProvider } from './groq';
import { DeepSeekProvider } from './deepseek';

export type ProviderType = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'GROQ' | 'DEEPSEEK';

export interface UnifiedProviderConfig {
  provider: string;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

/**
 * Creates a provider adapter instance
 */
export function createProvider(config: UnifiedProviderConfig): any {
  switch (config.provider.toUpperCase()) {
    case 'OPENAI':
      return new OpenAIProvider(config);
    case 'ANTHROPIC':
      return new AnthropicProvider(config);
    case 'GOOGLE':
      return new GoogleProvider(config);
    case 'GROQ':
      return new GroqProvider(config);
    case 'DEEPSEEK':
      return new DeepSeekProvider(config);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

/**
 * Gets provider metadata (context window, default model, etc.)
 */
export function getProviderMetadata(provider: string): { 
  contextWindow: number; 
  defaultModel: string;
  supportsTools: boolean;
  supportsVision: boolean;
} {
  const metadata: Record<string, any> = {
    OPENAI: {
      contextWindow: 128000,
      defaultModel: 'gpt-4o',
      supportsTools: true,
      supportsVision: true,
    },
    ANTHROPIC: {
      contextWindow: 200000,
      defaultModel: 'claude-3-5-sonnet-20241022',
      supportsTools: true,
      supportsVision: true,
    },
    GOOGLE: {
      contextWindow: 2000000,
      defaultModel: 'gemini-1.5-pro',
      supportsTools: true,
      supportsVision: true,
    },
    GROQ: {
      contextWindow: 131072,
      defaultModel: 'llama-3.1-70b-versatile',
      supportsTools: true,
      supportsVision: false,
    },
    DEEPSEEK: {
      contextWindow: 65536,
      defaultModel: 'deepseek-chat',
      supportsTools: true,
      supportsVision: false,
    },
  };
  
  return metadata[provider.toUpperCase()] ?? {
    contextWindow: 128000,
    defaultModel: 'gpt-4o',
    supportsTools: true,
    supportsVision: true,
  };
}

/**
 * Estimates tokens for a given provider
 */
export function estimateTokensForProvider(text: string, provider: string): number {
  // All current providers use similar tokenization (~4 chars per token)
  // This can be customized per provider if needed
  return Math.ceil(text.length / 4);
}