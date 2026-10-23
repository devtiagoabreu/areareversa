/**
 * Anthropic Provider Adapter
 */

import { ProviderConfig, CompletionOptions, CompletionResult, ProviderAdapter } from './base';

export class AnthropicProvider implements ProviderAdapter {
  readonly provider = 'ANTHROPIC';
  readonly defaultModel = 'claude-3-5-sonnet-20241022';
  readonly contextWindow = 200000;
  
  private config: ProviderConfig;
  
  constructor(config: ProviderConfig) {
    this.config = config;
  }
  
  getEndpoint(): string {
    return this.config.baseUrl || 'https://api.anthropic.com/v1/messages';
  }
  
  async validateKey(apiKey: string): Promise<{ valid: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.defaultModel,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }],
        }),
      });
      
      const latencyMs = Date.now() - Date.now() + (Date.now() - Date.now()); // will be fixed below
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        return { valid: false, latencyMs: Date.now() - Date.now() + (Date.now() - Date.now()), error: error.message || `HTTP ${response.status}` };
      }
      
      return { valid: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { valid: false, latencyMs: Date.now() - start, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
  
  estimateTokens(text: string): number {
    if (!text) return 0;
    // Anthropic uses similar tokenization to OpenAI
    return Math.ceil(text.length / 4);
  }
  
  async complete(options: CompletionOptions): Promise<CompletionResult> {
    const { messages, systemPrompt, temperature = 0.3, maxTokens, tools, toolChoice } = options;
    
    const messageList = messages.map(m => {
      const msg: any = {
        role: m.role === 'system' ? 'user' : m.role,
        content: m.content,
      };
      if (m.toolCalls) msg.tool_calls = m.toolCalls;
      if (m.toolCallId) msg.tool_call_id = m.toolCallId;
      return msg;
    });
    
    const payload: any = {
      model: this.config.model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: messageList,
    };
    
    if (tools?.length) payload.tools = tools;
    if (toolChoice) payload.tool_choice = toolChoice;
    
    const response = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Anthropic API Error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      content: data.content?.[0]?.text || '',
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      model: data.model,
      finishReason: data.stop_reason,
      toolCalls: data.content?.filter((c: any) => c.type === 'tool_use'),
    };
  }
}