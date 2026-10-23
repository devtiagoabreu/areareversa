'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface UsageDataPoint {
  date: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  keyName?: string;
  provider?: string;
}

interface UsageChartProps {
  data: UsageDataPoint[];
  height?: number;
  showLegend?: boolean;
  groupedByKey?: boolean;
}

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

export function UsageChart({ 
  data, 
  height = 300, 
  showLegend = true, 
  groupedByKey = false 
}: UsageChartProps) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [tooltipData, setTooltipData] = useState<{ active: boolean; payload: any[]; label: string }>({
    active: false,
    payload: [],
    label: '',
  });

  // Process data for chart
  useEffect(() => {
    if (!data.length) {
      setChartData([]);
      return;
    }

    if (groupedByKey) {
      // Group by key and date
      const grouped: Record<string, Record<string, { total: number; prompt: number; completion: number }>> = {};
      
      data.forEach(d => {
        const key = d.keyName || d.provider || 'unknown';
        if (!grouped[key]) grouped[key] = {};
        if (!grouped[key][d.date]) grouped[key][d.date] = { total: 0, prompt: 0, completion: 0 };
        grouped[key][d.date].total += d.totalTokens;
        grouped[key][d.date].prompt += d.promptTokens;
        grouped[key][d.date].completion += d.completionTokens;
      });

      // Convert to array format for Recharts
      const dates = [...new Set(data.map(d => d.date))].sort();
      const processed = dates.map(date => {
        const row: any = { date };
        Object.entries(grouped).forEach(([key, dates]) => {
          row[`${key} - total`] = dates[date]?.total || 0;
          row[`${key} - prompt`] = dates[date]?.prompt || 0;
          row[`${key} - completion`] = dates[date]?.completion || 0;
        });
        return row;
      });
      setChartData(processed);
    } else {
      // Simple time series
      const aggregated = data.reduce((acc, d) => {
        if (!acc[d.date]) acc[d.date] = { total: 0, prompt: 0, completion: 0 };
        acc[d.date].total += d.totalTokens;
        acc[d.date].prompt += d.promptTokens;
        acc[d.date].completion += d.completionTokens;
        return acc;
      }, {} as Record<string, { total: number; prompt: number; completion: number }>);

      const processed = Object.entries(aggregated)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, values]) => ({ date, ...values }));
      setChartData(processed);
    }
  }, [data, groupedByKey]);

  if (!chartData.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          <svg className="w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 012-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v6a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v6a2 2 0 00-2 2z" />
          </svg>
          <p className="text-lg font-medium">Nenhum dado de uso disponível</p>
          <p className="text-sm">Os dados aparecerão após as primeiras requisições</p>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatTooltipValue = (value: number, name: string) => {
    if (name.includes('total')) return [`${formatNumber(value)} tokens`, 'Total'];
    if (name.includes('prompt')) return [`${formatNumber(value)} tokens`, 'Prompt'];
    if (name.includes('completion')) return [`${formatNumber(value)} tokens`, 'Completion'];
    return [formatNumber(value), name];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">{label}</p>
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-600 dark:text-gray-300">{item.name}:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatNumber(item.value)} tokens
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Uso de Tokens ao Longo do Tempo</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" defaultChecked />
            <span>Total</span>
          </label>
          <label className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" defaultChecked />
            <span>Prompt</span>
          </label>
          <label className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
            <input type="checkbox" />
            <span>Completion</span>
          </label>
        </div>
      </div>
      
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value >= 1000000 ? `${(value/1000000).toFixed(1)}M` : value >= 1000 ? `${(value/1000).toFixed(1)}K` : value}
            />
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {chartData.length > 0 && Object.keys(chartData[0]).filter(k => k !== 'date').map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                name={key.replace(' - total', '').replace(' - prompt', ' (prompt)').replace(' - completion', ' (completion)')}
                isAnimationActive={true}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
