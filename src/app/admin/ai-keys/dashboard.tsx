'use client';

import React, { useState, useEffect } from 'react';
import { KeyCard } from '@/components/admin/ai-keys/KeyCard';
import { MetricsBar } from '@/components/admin/ai-keys/MetricsBar';
import { UsageChart } from '@/components/admin/ai-keys/UsageChart';
import { KeyForm } from '@/components/admin/ai-keys/KeyForm';
import { ContextViewer } from '@/components/admin/ai-keys/ContextViewer';

export function AIKeysDashboard() {
  const [keys, setKeys] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [showForm, setShowForm] = React.useState(false);
  const [editingKey, setEditingKey] = React.useState<any | null>(null);
  const [viewingContext, setViewingContext] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [keysRes, statsRes] = await Promise.all([
        fetch('/api/admin/ai-keys'),
        fetch('/api/admin/ai-keys/stats'),
      ]);
      
      if (!keysRes.ok || !statsRes.ok) throw new Error('Erro ao carregar dados');
      
      const keysData = await keysRes.json();
      const statsData = await statsRes.json();
      
      setKeys(Array.isArray(keysData) ? keysData : keysData.keys ?? []);
      setStats(Array.isArray(keysData) ? statsData : keysData.stats ?? statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (formData: FormData) => {
    const response = await fetch('/api/admin/ai-keys', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro ao criar' }));
      throw new Error(error.error || 'Erro ao criar');
    }
    
    setShowForm(false);
    fetchData();
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingKey) return;
    
    const response = await fetch(`/api/admin/ai-keys/${editingKey.id}`, {
      method: 'PUT',
      body: formData,
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Erro ao atualizar' }));
      throw new Error(error.error || 'Erro ao atualizar');
    }
    
    setEditingKey(null);
    setShowForm(false);
    fetchData();
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta chave?')) return;
    
    setActionLoading(keyId);
    try {
      const response = await fetch(`/api/admin/ai-keys/${keyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) throw new Error('Erro ao excluir');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleStatus = async (keyId: string, newStatus: string) => {
    setActionLoading(keyId);
    try {
      const response = await fetch(`/api/admin/ai-keys/${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) throw new Error('Erro ao atualizar status');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTest = async (keyId: string) => {
    setActionLoading(keyId);
    try {
      const response = await fetch('/api/admin/ai-keys/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: keyId }),
      });
      // Result is handled by KeyCard component
    } catch (err) {
      console.error('Test error:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewContext = (sessionId: string) => {
    setViewingContext(sessionId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Carregando...</span>
      </div>
    );
  }

  // Helper functions defined outside JSX to avoid parser issues
  function renderContextViewer() {
    if (!viewingContext) return null;
    return (
      <ContextViewer
        sessionId={viewingContext}
        onClose={() => setViewingContext(null)}
      />
    );
  }

  function renderModalForm() {
    if (!showForm && !editingKey) return null;
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <KeyForm
            key={editingKey}
            onSubmit={editingKey ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingKey(null); }}
          />
        </div>
      </div>
    );
  }

  function renderKeysGrid() {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {keys.map((key: any) => (
          <KeyCard
            key={key.id}
            data={key}
            onEdit={setEditingKey}
            onDelete={handleDelete}
            onTest={handleTest}
            onToggleStatus={handleToggleStatus}
          />
        ))}
        {keys.length === 0 && (
          <div className="col-span-full text-center py-12">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A1 1 0 0111 2H3a1 1 0 01-1-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.293 3.293a1 1 0 001.414 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-2">Nenhuma chave cadastrada</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Clique em "Nova Chave" para adicionar a primeira</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciador de Chaves de IA</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gerencie chaves de API, monitore uso e configure failover automático
          </p>
        </div>
        <button
          onClick={() => { setEditingKey(null); setShowForm(true); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Chave
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-red-700 dark:text-red-300">{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Metrics Bar */}
      {stats && <MetricsBar stats={stats} />}

      {/* Keys Grid */}
      {renderKeysGrid()}

      <div>
        {renderModalForm()}
      </div>
      <div>
        {renderContextViewer()}
      </div>
    </div>
  );
}

export default AIKeysDashboard;