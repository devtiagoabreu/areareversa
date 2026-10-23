'use client';

import React, { useState, useEffect } from 'react';
import { AIContextSession } from '@/generated/prisma/client';

interface ContextViewerProps {
  sessionId: string;
  onClose: () => void;
}

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp?: string;
}

interface Artifact {
  id: string;
  type: 'table' | 'chart' | 'code' | 'source' | 'analysis' | 'data';
  title: string;
  content: any;
  source?: string;
  createdAt: string;
}

export function ContextViewer({ sessionId, onClose }: ContextViewerProps) {
  const [session, setSession] = useState<AIContextSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'artifacts' | 'metadata'>('messages');
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/ai/context/${sessionId}`);
      if (!response.ok) throw new Error('Sessão não encontrada');
      const data = await response.json();
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar sessão');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    // Could add a toast notification here
  };

  const exportSession = () => {
    if (!session) return;
    const exportData = {
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      systemPrompt: session.systemPrompt,
      currentTask: session.currentTask,
      messages: session.messages,
      artifacts: session.artifacts,
      metadata: session.metadata,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${session.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportMarkdown = () => {
    if (!session) return;
    
    let md = `# Sessão de Pesquisa: ${session.sessionId}\n\n`;
    md += `**Criado em:** ${new Date(session.createdAt).toLocaleString('pt-BR')}\n`;
    md += `**Atualizado em:** ${new Date(session.updatedAt).toLocaleString('pt-BR')}\n`;
    md += `**Tarefa:** ${session.currentTask || 'Não definida'}\n\n`;
    
    md += `## System Prompt\n\n${session.systemPrompt}\n\n`;
    
    md += `## Conversa\n\n`;
    (session.messages as any[]).forEach((msg: any, i: number) => {
      const roleLabel = msg.role === 'system' ? 'Sistema' : msg.role === 'user' ? 'Usuário' : msg.role === 'assistant' ? 'Assistente' : 'Ferramenta';
      md += `### ${roleLabel} (${new Date(msg.timestamp || '').toLocaleTimeString('pt-BR')})\n\n${msg.content}\n\n`;
    });
    
    if (((session.artifacts as any[]) || []).length > 0) {
      md += `## Artifacts\n\n`;
      (session.artifacts as any[]).forEach((art: any, i: number) => {
        md += `### ${art.title} (${art.type})\n`;
        if (art.source) md += `**Fonte:** ${art.source}\n\n`;
        if (art.type === 'code') {
          md += `\`\`\`\n${art.content}\n\`\`\`\n\n`;
        } else if (art.type === 'table') {
          md += `\`\`\`json\n${JSON.stringify(art.content, null, 2)}\n\`\`\`\n\n`;
        } else {
          md += `${art.content}\n\n`;
        }
      });
    }
    
    if ((session.metadata as any)?.keySwitches?.length) {
      md += `## Trocas de Chave/Modelo\n\n`;
      (session.metadata as any).keySwitches.forEach((sw: any, i: number) => {
        md += `- **${sw.timestamp}**: ${sw.fromModel || '—'} → ${sw.toModel || '—'} (${sw.reason})\n`;
      });
    }
    
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-${session.sessionId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Carregando sessão...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4 text-center">
          <svg className="w-12 h-12 mx-auto text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.36 0L3.34 16.5c-.77 1.333.192 3 1.732 3h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.36 0L3.34 16.5c-.77 1.333.192 3 1.732 3h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.36 0L3.34 16.5c-.77 1.333.192 3 1.732 3h13.856z" />
          </svg>
          <h3 className="text-lg font-semibold mt-4">Erro ao carregar</h3>
          <p className="text-gray-500 mt-2">{error || 'Sessão não encontrada'}</p>
          <button
            onClick={onClose}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const messages = session.messages as any[];
  const artifacts = session.artifacts as any[];
  const metadata = session.metadata as any;

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      system: 'Sistema',
      user: 'Usuário',
      assistant: 'Assistente',
      tool: 'Ferramenta',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      system: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      user: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      assistant: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      tool: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sessão: {session.sessionId.slice(0, 8)}...
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {session.currentTask || 'Sem tarefa definida'} · {((session.messages as any[]) || []).length} mensagens · {((session.artifacts as any[]) || []).length} artifacts
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={exportSession}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Exportar JSON
            </button>
            <button
              onClick={exportMarkdown}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              Exportar MD
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'messages'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Mensagens ({messages.length})
            </button>
            <button
              onClick={() => setActiveTab('artifacts')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'artifacts'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Artifacts ({artifacts.length})
            </button>
            <button
              onClick={() => setActiveTab('metadata')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'metadata'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Metadados
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-4">
          {activeTab === 'messages' && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {session.systemPrompt && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                      System Prompt
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm text-purple-900 dark:text-purple-100 font-mono max-h-40 overflow-y-auto">
                    {session.systemPrompt}
                  </pre>
                </div>
              )}
              
              {messages.map((msg: any, i: number) => (
                <div key={i} className="flex gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${getRoleColor(msg.role)}`}>
                    {getRoleLabel(msg.role).charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                        {getRoleLabel(msg.role)}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('pt-BR') : ''}
                      </span>
                    </div>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'artifacts' && (
            <div className="space-y-4">
              {artifacts.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2h14a2 2 0 012 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12l7 7 7-7" />
                  </svg>
                  <p className="text-lg font-medium">Nenhum artifact</p>
                  <p className="text-sm">Artifacts aparecerão conforme a pesquisa avança</p>
                </div>
              ) : (
                artifacts.map((art: any, i: number) => (
                  <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded capitalize">
                            {art.type}
                          </span>
                          <h4 className="font-medium text-gray-900 dark:text-white">{art.title}</h4>
                        </div>
                        {art.source && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Fonte: <span className="font-mono">{art.source}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(typeof art.content === 'string' ? art.content : JSON.stringify(art.content, null, 2))}
                          className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          Copiar
                        </button>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 rounded p-3 max-h-64 overflow-auto font-mono text-sm">
                      {typeof art.content === 'string' ? (
                        <pre className="whitespace-pre-wrap">{art.content}</pre>
                      ) : (
                        <pre className="whitespace-pre-wrap">{JSON.stringify(art.content, null, 2)}</pre>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'metadata' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Informações da Sessão</h4>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">ID da Sessão</dt>
                      <dd className="font-mono text-gray-900 dark:text-white">{session.sessionId}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Criada em</dt>
                      <dd className="text-gray-900 dark:text-white">{new Date(session.createdAt).toLocaleString('pt-BR')}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Atualizada em</dt>
                      <dd className="text-gray-900 dark:text-white">{new Date(session.updatedAt).toLocaleString('pt-BR')}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Modelo Original</dt>
                      <dd className="font-mono text-gray-900 dark:text-white">{metadata.originalModel || '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Tokens Totais</dt>
                      <dd className="font-mono text-gray-900 dark:text-white">{metadata.totalTokensUsed?.toLocaleString('pt-BR') || '0'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Tarefa Atual</dt>
                      <dd className="text-gray-900 dark:text-white">{session.currentTask || 'Não definida'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Orçamento de Tokens</dt>
                      <dd className="font-mono text-gray-900 dark:text-white">{session.tokenBudget.toLocaleString('pt-BR')}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Mensagens</dt>
                      <dd className="font-mono text-gray-900 dark:text-white">{messages.length}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500 dark:text-gray-400">Artifacts</dt>
                      <dd className="font-mono text-gray-900 dark:text-white">{artifacts.length}</dd>
                    </div>
                  </dl>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">Trocas de Chave/Modelo</h4>
                  {metadata.keySwitches?.length ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {(metadata.keySwitches as any[]).map((sw: any, i: number) => (
                        <div key={i} className="bg-white dark:bg-gray-900 rounded p-3 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-sm text-gray-900 dark:text-white">
                              {sw.fromModel || '—'} → {sw.toModel || '—'}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                              sw.reason === 'EXHAUSTED' ? 'bg-orange-100 text-orange-800' :
                              sw.reason === 'ERROR' ? 'bg-red-100 text-red-800' :
                              sw.reason === 'RATE_LIMIT' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {sw.reason}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{sw.timestamp}</span>
                            <span>{sw.tokensUsed} tokens</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">Nenhuma troca de chave registrada</p>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">System Prompt</h4>
                <div className="bg-white dark:bg-gray-900 rounded p-3 max-h-64 overflow-y-auto font-mono text-sm">
                  <pre className="whitespace-pre-wrap">{session.systemPrompt}</pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}