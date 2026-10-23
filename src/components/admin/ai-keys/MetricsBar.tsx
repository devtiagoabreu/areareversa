'use client';

import React from 'react';
import { formatNumber } from '@/lib/utils';

interface MetricsBarProps {
  stats: {
    totalKeys: number;
    activeKeys: number;
    totalLimit: number;
    totalUsed: number;
    totalAvailable: number;
    globalUsagePercent: number;
    monthlyTotal: number;
    recentFailovers: Array<{
      id: string;
      fromKeyId?: string | null;
      toKeyId?: string | null;
      fromModel?: string | null;
      toModel?: string | null;
      reason: string;
      tokensUsed: number;
      createdAt: string;
    }>;
  };
}

export function MetricsBar({ stats }: MetricsBarProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getUsageColor = (percent: number) => {
    if (percent >= 95) return 'bg-red-500';
    if (percent >= 90) return 'bg-orange-500';
    if (percent >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatReason = (reason: string) => {
    const labels: Record<string, string> = {
      EXHAUSTED: 'Exaurida',
      ERROR: 'Erro',
      RATE_LIMIT: 'Rate Limit',
      MANUAL: 'Manual',
      MODEL_SWITCH: 'Troca de Modelo',
    };
    return labels[reason] || reason;
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'EXHAUSTED': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'ERROR': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'RATE_LIMIT': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'MANUAL': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'MODEL_SWITCH': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          label="Chaves Totais"
          value={stats.totalKeys}
          icon="🔑"
          color="blue"
        />
        <MetricCard
          label="Chaves Ativas"
          value={stats.activeKeys}
          icon="✅"
          color="green"
        />
        <MetricCard
          label="Limite Total/Mês"
          value={formatNumber(stats.totalLimit)}
          suffix="tokens"
          icon="📊"
          color="blue"
        />
        <MetricCard
          label="Usados (Mês)"
          value={formatNumber(stats.monthlyTotal)}
          suffix="tokens"
          icon="📈"
          color="orange"
        />
        <MetricCard
          label="Uso Global"
          value={`${stats.globalUsagePercent}%`}
          icon={stats.globalUsagePercent >= 90 ? '🔴' : stats.globalUsagePercent >= 80 ? '🟡' : '🟢'}
          color={stats.globalUsagePercent >= 90 ? 'red' : stats.globalUsagePercent >= 80 ? 'yellow' : 'green'}
        />
      </div>

      {/* Global Usage Progress Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Uso Global do Mês</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {formatNumber(stats.totalUsed)} / {formatNumber(stats.totalLimit)} tokens
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${getUsageColor(stats.globalUsagePercent)}`}
            style={{ width: `${Math.min(stats.globalUsagePercent, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
          <span>Disponível: {formatNumber(stats.totalAvailable)} tokens</span>
          <span>Reset mensal: dia 1</span>
        </div>
      </div>

      {/* Recent Failovers */}
      {stats.recentFailovers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Failovers Recentes</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Últimos {stats.recentFailovers.length} eventos
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Quando</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">De → Para</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Modelo</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Motivo</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500 dark:text-gray-400">Tokens</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentFailovers.map((event) => (
                  <tr key={event.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-300">
                      {new Date(event.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 px-3 text-gray-900 dark:text-white font-mono text-xs">
                      {event.fromKeyId ? 'Chave #' + event.fromKeyId.slice(0, 8) : '—'} 
                      {' → '}
                      {event.toKeyId ? 'Chave #' + event.toKeyId.slice(0, 8) : '—'}
                    </td>
                    <td className="py-2 px-3 text-gray-600 dark:text-gray-300 font-mono text-xs">
                      {event.fromModel || '—'} → {event.toModel || '—'}
                    </td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getReasonColor(event.reason)}`}>
                        {formatReason(event.reason)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-300 font-mono">
                      {event.tokensUsed > 0 ? event.tokensUsed.toLocaleString('pt-BR') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Global Usage Progress (Detailed) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-4">Distribuição de Uso por Chave</h3>
        <div className="space-y-3">
          {/* This would be populated with key-specific data in the full page */}
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            Detalhes por chave são mostrados nos cards acima
          </p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, suffix, icon, color }: { 
  label: string; 
  value: string | number; 
  suffix?: string; 
  icon: string; 
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  const lightColorMap: Record<string, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <span className={`p-2 rounded-lg ${colorMap[color] || 'bg-blue-500'}`}>
          <span className="text-xl">{icon}</span>
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
        {suffix && <span className="text-sm text-gray-500 dark:text-gray-400">{suffix}</span>}
      </div>
    </div>
  )
}