/**
 * Google Gemini Provider Adapter
 */

import { ProviderConfig, CompletionOptions, CompletionResult } from './base';

export class GoogleProvider {
  readonly provider = 'GOOGLE';
  readonly defaultModel = 'gemini-3.5-flash-lite';
  readonly contextWindow = 1000000;
  
  private config: { apiKey: string; model: string; baseUrl?: string };
  
  constructor(config: { apiKey: string; model: string; baseUrl?: string }) {
    this.config = config;
  }
  
  getEndpoint(): string {
    return this.config.baseUrl || `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.config.model)}:generateContent`;
  }
  
  async validateKey(apiKey: string): Promise<{ valid: boolean; latencyMs: number; error?: string }> {
    const start = Date.now();
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.config.model)}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'test' }] }],
            generationConfig: { maxOutputTokens: 1 },
          }),
        }
      );
      
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
    if (!text) return 0;
    // Gemini uses similar tokenization
    return Math.ceil(text.length / 4);
  }
  
  async complete(options: any): Promise<any> {
    const { messages, systemPrompt, temperature = 0.3, maxTokens, tools, toolChoice, responseFormat } = options;
    
    // Convert messages to Gemini format
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    
    // Add system prompt as first user message if present
    if (systemPrompt) {
      contents.unshift({ role: 'user', parts: [{ text: `System: ${systemPrompt}` }] });
      contents.unshift({ role: 'model', parts: [{ text: 'Entendido.' }] });
    }
    
    const payload: any = {
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        responseMimeType: responseFormat?.type === 'json_object' ? 'application/json' : 'text/plain',
      },
    };
    
    if (tools?.length) {
      payload.tools = tools.map((t: any) => ({
        functionDeclarations: [{
          name: t.function.name,
          description: t.function.description,
          parameters: t.function.parameters,
        }],
      }));
    }
    
    const url = `${this.getEndpoint()}?key=${this.config.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Gemini API Error: ${error.error?.message || response.statusText}`);
    }
    
    const data = await response.json();
    const candidate = data.candidates?.[0];
    
    return {
      content: candidate?.content?.parts?.[0]?.text || '',
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      model: data.modelVersion || this.defaultModel,
      finishReason: candidate?.finishReason || 'STOP',
      toolCalls: candidate?.content?.parts?.filter((p: any) => p.functionCall)?.map((p: any) => ({
        id: p.functionCall.name,
        type: 'function',
        function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args) },
      })),
    };
  }
}