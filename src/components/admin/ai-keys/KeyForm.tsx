'use client';

import React, { useState, useEffect } from 'react';
import { AIKey, AIProvider } from '@/generated/prisma/client';

interface KeyFormProps {
  key?: AIKey | null;
  onSubmit: (data: FormData) => Promise<void>;
  onCancel: () => void;
}

const PROVIDERS = [
  { value: 'OPENAI', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'] },
  { value: 'ANTHROPIC', label: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'] },
  { value: 'GOOGLE', label: 'Google (Gemini)', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.0-pro'] },
  { value: 'GROQ', label: 'Groq', models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'] },
  { value: 'DEEPSEEK', label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-coder'] },
  { value: 'CUSTOM', label: 'Custom (OpenAI-compatible)', models: [] },
];

export function KeyForm({ key, onSubmit, onCancel }: KeyFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    provider: 'OPENAI' as AIProvider,
    model: '',
    baseUrl: '',
    apiKey: '',
    monthlyTokenLimit: 1000000,
    priority: 1,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Initialize form with existing key data
  useEffect(() => {
    if (key) {
      setFormData({
        name: key.name,
        provider: key.provider,
        model: key.model,
        baseUrl: key.baseUrl || '',
        apiKey: '', // Never populate existing key for security
        monthlyTokenLimit: key.monthlyTokenLimit,
        priority: key.priority,
        notes: key.notes || '',
      });
    }
  }, [key]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Nome é obrigatório';
    if (!formData.provider) newErrors.provider = 'Provedor é obrigatório';
    if (!formData.model.trim()) newErrors.model = 'Modelo é obrigatório';
    if (!key && !formData.apiKey.trim()) newErrors.apiKey = 'Chave da API é obrigatória para novas chaves';
    if (formData.monthlyTokenLimit < 1000) newErrors.monthlyTokenLimit = 'Limite mínimo: 1.000 tokens';
    if (formData.priority < 1) newErrors.priority = 'Prioridade deve ser >= 1';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      const formDataToSubmit = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSubmit.append(key, String(value));
      });
      
      await onSubmit(formDataToSubmit);
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
    // Clear error on change
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleProviderChange = (provider: AIProvider) => {
    setFormData(prev => ({ ...prev, provider }));
    // Auto-set default model for provider
    const providerConfig = PROVIDERS.find(p => p.value === provider);
    if (providerConfig?.models?.length) {
      setFormData(prev => ({ ...prev, model: providerConfig.models[0] }));
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, model: e.target.value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {key ? 'Editar Chave de API' : 'Nova Chave de API'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome da Chave <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Ex: OpenAI - Conta Principal"
              className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-500' : ''}`}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Provedor <span className="text-red-500">*</span>
            </label>
            <select
              name="provider"
              value={formData.provider}
              onChange={(e) => handleProviderChange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {PROVIDERS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Modelo <span className="text-red-500">*</span>
            </label>
            <select
              name="model"
              value={formData.model}
              onChange={handleModelChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!formData.provider}
            >
              {PROVIDERS.find(p => p.value === formData.provider)?.models.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL Base (opcional)
            </label>
            <input
              type="url"
              name="baseUrl"
              value={formData.baseUrl}
              onChange={handleChange}
              placeholder="https://api.custom-provider.com/v1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Para provedores customizados ou proxies. Deixe em branco para padrão.
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Chave da API <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showKey ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                name="apiKey"
                value={formData.apiKey}
                onChange={handleChange}
                placeholder={key ? 'Deixe em branco para manter a atual' : 'sk-... ou equivalent'}
                className={`w-full px-3 py-2 pr-10 border rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.apiKey ? 'border-red-500' : ''}`}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showKey ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88a3 3 0 114.243-4.242M12 6a3 3 0 110 6 3 3 0 010-6z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.apiKey && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.apiKey}</p>}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {key ? 'Deixe em branco para manter a chave atual. A chave nunca é exibida após salvar.' : 'A chave será criptografada e nunca exibida em texto plano.'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Limite Mensal (tokens) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="monthlyTokenLimit"
                value={formData.monthlyTokenLimit}
                onChange={handleChange}
                min="1000"
                step="1000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prioridade (Failover) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                1 = primeira a ser usada. Menor número = maior prioridade.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Observações
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Notas internas sobre esta chave..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Salvando...
            </span>
          ) : key ? 'Salvar Alterações' : 'Criar Chave'}
        </button>
      </div>
    </form>
  );
}