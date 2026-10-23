'use client';

import React, { useState } from 'react';
import { AIKey } from '@/generated/prisma/client';

interface KeyCardProps {
  data: AIKey & {
    usagePercent: number;
    availableTokens: number;
  };
  onEdit: (key: AIKey) => void;
  onDelete: (keyId: string) => void;
  onTest: (keyId: string) => void;
  onToggleStatus: (keyId: string, status: string) => void;
}

export function KeyCard({ data: key, onEdit, onDelete, onTest, onToggleStatus }: KeyCardProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latencyMs: number; error?: string } | null>(null);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'EXHAUSTED': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'ERROR': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'DISABLED': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Ativa';
      case 'EXHAUSTED': return 'Exaurida';
      case 'ERROR': return 'Erro';
      case 'DISABLED': return 'Desativada';
      default: return status;
    }
  };
  
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };
  
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/admin/ai-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key.id }),
      });
      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, latencyMs: 0, error: 'Erro ao testar' });
    } finally {
      setTesting(false);
    }
  };
  
  const providerIcons: Record<string, string> = {
    OPENAI: '🟢',
    ANTHROPIC: '🟣',
    GOOGLE: '🔵',
    GROQ: '🟠',
    DEEPSEEK: '🔴',
  };
  
  const progressColor = key.usagePercent >= 95 ? 'bg-red-500' :
    key.usagePercent >= 90 ? 'bg-orange-500' :
    key.usagePercent >= 80 ? 'bg-yellow-500' :
    'bg-green-500';
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{providerIcons[key.provider] || '🤖'}</span>
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white truncate">{key.name}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(key.status)}`}>
              {getStatusLabel(key.status)}
            </span>
            {key.errorCount >= 3 && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                ⚠ {key.errorCount} erros
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
            <span className="flex items-center gap-1">
              <span className="font-mono">{key.provider}</span>
              <span className="text-gray-400">|</span>
              <span className="font-mono">{key.model}</span>
            </span>
            <span className="flex items-center gap-1">
              Prioridade: <span className="font-medium">{key.priority}</span>
            </span>
          </div>
          
          {/* Token Usage Progress */}
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Uso do mês</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {key.usagePercent}% ({key.usagePercent >= 90 ? '⚠' : ''})
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${progressColor}`}
                style={{ width: `${Math.min(key.usagePercent, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Usados: {formatNumber(key.currentMonthUsed)}</span>
              <span>Disponíveis: {formatNumber(key.availableTokens)}</span>
              <span>Limite: {formatNumber(key.monthlyTokenLimit)}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>Total lifetime: {formatNumber(key.totalLifetimeUsed)} tokens</span>
            {key.lastUsedAt && (
              <span>Último uso: {new Date(key.lastUsedAt).toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {testing ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Testando...
              </span>
            ) : 'Testar'}
          </button>
          
          <button
            onClick={() => onEdit(key)}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            Editar
          </button>
          
          <button
            onClick={() => onToggleStatus(key.id, key.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              key.status === 'ACTIVE'
                ? 'text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
            }`}
          >
            {key.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
          </button>
          
          <button
            onClick={() => onDelete(key.id)}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            Excluir
          </button>
        </div>
      </div>
      
      {/* Test Result */}
      {testResult && (
        <div className={`mt-4 p-3 rounded-lg ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
          <div className="flex items-center gap-2">
            <span className={testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
              {testResult.success ? '✓ Sucesso' : '✗ Falha'}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Latência: {testResult.latencyMs}ms
            </span>
            {testResult.error && (
              <span className="text-sm text-red-600 dark:text-red-400 ml-2">
                {testResult.error}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}