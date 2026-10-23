/**
 * Groq Provider Adapter (OpenAI-compatible)
 */

import { ProviderConfig, CompletionOptions, CompletionResult } from './base';

export class GroqProvider {
  readonly provider = 'GROQ';
  readonly defaultModel = 'llama-3.1-70b-versatile';
  readonly contextWindow = 131072;
  
  private config: { apiKey: string; model: string; baseUrl?: string };
  
  constructor(config: { apiKey: string; model: string; baseUrl?: string }) {
    this.config = config;
  }
  
  getEndpoint(): string {
    return this.config.baseUrl || 'https://api.groq.com/openai/v1/chat/completions';
  }
  
  async validateKey(apiKey: string): Promise<{ valid: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 1,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        return { valid: false, latencyMs: Date.now() - start, error: error.error?.message || `HTTP ${response.status}` };
      }
      
      return { valid: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { valid: false, latencyMs: Date.now() - start, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
  
  async complete(options: any): Promise<any> {
    const { messages, systemPrompt, temperature = 0.3, maxTokens, tools, toolChoice, responseFormat } = options;
    
    const payload: any = {
      model: this.config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role,
          content: m.content,
          ...(m.toolCalls && { tool_calls: m.toolCalls }),
          ...(m.toolCallId && { tool_call_id: m.toolCallId }),
        })),
      ],
      temperature,
      max_tokens: maxTokens,
      stream: false,
    };
    
    if (tools?.length) payload.tools = tools;
    if (toolChoice) payload.tool_choice = toolChoice;
    if (responseFormat) payload.response_format = responseFormat;
    
    const response = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Groq API Error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const choice = data.choices[0];
    
    return {
      content: choice.message.content || '',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      model: data.model,
      finishReason: choice.finish_reason,
      toolCalls: choice.message.tool_calls,
    };
  }
}