'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

interface ConfigItem {
  id: string;
  provider: 'google' | 'llama' | 'deepseek';
  model_name: string;
  api_key: string | null;
  base_url: string | null;
  is_active: boolean;
  fallback_order: number | null;
  created_at: string;
  updated_at: string;
}

export function AiConfigManager() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [provider, setProvider] = useState<'google' | 'llama' | 'deepseek'>('google');
  const [modelName, setModelName] = useState('gemini-1.5-flash');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [fallbackOrder, setFallbackOrder] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-config');
      if (!res.ok) throw new Error('Failed to load AI configurations.');
      const data = await res.json();
      setConfigs(data.configs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configurations.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPreset = (presetType: 'google' | 'llama' | 'deepseek') => {
    setProvider(presetType);
    if (presetType === 'google') {
      setModelName('gemini-1.5-flash');
      setBaseUrl('');
      setApiKey('');
    } else if (presetType === 'llama') {
      setModelName('llama3');
      setBaseUrl('http://localhost:8080');
      setApiKey('');
    } else if (presetType === 'deepseek') {
      setModelName('deepseek-chat');
      setBaseUrl('https://api.deepseek.com/v1');
      setApiKey('');
    }
  };

  const handleEdit = (config: ConfigItem) => {
    setEditingId(config.id);
    setProvider(config.provider);
    setModelName(config.model_name);
    setApiKey(config.api_key || '');
    setBaseUrl(config.base_url || '');
    setIsActive(config.is_active);
    setFallbackOrder(config.fallback_order !== null ? String(config.fallback_order) : '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    resetForm();
    setShowForm(false);
  };

  const resetForm = () => {
    setEditingId(null);
    setProvider('google');
    setModelName('gemini-1.5-flash');
    setApiKey('');
    setBaseUrl('');
    setIsActive(false);
    setFallbackOrder('');
    setShowApiKey(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    const order = fallbackOrder.trim() === '' ? null : parseInt(fallbackOrder, 10);
    if (order !== null && (isNaN(order) || order < 1)) {
      setError('Fallback order must be a positive integer.');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          provider,
          model_name: modelName,
          api_key: apiKey || null,
          base_url: baseUrl || null,
          is_active: isActive,
          fallback_order: order,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save configuration.');

      setSuccessMsg(editingId ? 'Configuration updated successfully.' : 'Configuration created successfully.');
      resetForm();
      setShowForm(false);
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    setDeletingId(id);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/admin/ai-config/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete configuration.');
      }
      setSuccessMsg('Configuration deleted successfully.');
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetActive = async (config: ConfigItem) => {
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: config.id,
          provider: config.provider,
          model_name: config.model_name,
          api_key: '••••••••', // use mask so it doesn't overwrite with null
          base_url: config.base_url,
          is_active: true,
          fallback_order: config.fallback_order,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update active status.');

      setSuccessMsg(`Activated ${config.provider} (${config.model_name}) as primary AI.`);
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Notifications */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          <p className="font-semibold">Error</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <p className="font-semibold">Success</p>
          <p className="mt-1">{successMsg}</p>
        </div>
      )}

      {/* Control Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium text-white">AI Provider Implementations</h2>
          <p className="text-sm text-slate-400">Configure primary active models and fallback schedules for redundancy.</p>
        </div>
        {!showForm && (
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="shadow-lg shadow-sky-500/15">
            Add Configuration
          </Button>
        )}
      </div>

      {/* Editor Form */}
      {showForm && (
        <Card className="border border-slate-800 bg-slate-950/60 p-6 shadow-2xl backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-lg font-medium text-white">{editingId ? 'Edit Configuration' : 'Add New Configuration'}</h3>
            
            {/* Presets */}
            {!editingId && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick Presets</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('google')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    Google Gemini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('deepseek')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    DeepSeek API
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('llama')}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    Llama Local Server
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Provider</label>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value as 'google' | 'llama' | 'deepseek')}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-500"
                >
                  <option value="google">Google Gemini</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="llama">Llama (OpenAI Compatible)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-medium">Model Name</label>
                <Input
                  required
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="e.g. gemini-1.5-flash, deepseek-chat, llama3"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">API Key</label>
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={editingId ? '•••••••• (leave unchanged to keep current)' : 'Enter API provider key'}
                    required={!editingId}
                  />
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-2.5 text-xs font-medium text-slate-400 hover:text-slate-200"
                    >
                      {showApiKey ? 'Hide' : 'Show'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500">API keys are encrypted symmetrically at rest using AES-256-GCM.</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Base URL (Endpoint)</label>
                <Input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={
                    provider === 'llama'
                      ? 'e.g. http://localhost:8080'
                      : provider === 'deepseek'
                      ? 'e.g. https://api.deepseek.com/v1 (defaults to this if empty)'
                      : 'Optional custom endpoint base URL'
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Fallback Priority Order</label>
                <Input
                  type="number"
                  min="1"
                  value={fallbackOrder}
                  onChange={(e) => setFallbackOrder(e.target.value)}
                  placeholder="e.g. 1 (First fallback), 2 (Second fallback)"
                />
                <p className="text-xs text-slate-500">Determines query order if the active primary provider fails.</p>
              </div>

              <div className="flex items-center space-x-3 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-sky-500"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-300">
                  Set as Active Primary AI
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
              <Button type="button" variant="secondary" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit" isLoading={saving}>
                Save Configuration
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Config Items List */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <Spinner />
        </div>
      ) : configs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-slate-800 bg-transparent">
          <div className="rounded-full bg-slate-900/50 p-4 text-slate-600">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">No AI configuration</h3>
          <p className="mt-2 text-sm text-slate-500 max-w-sm">No configurations found. The application is running using legacy environment variables fallback.</p>
          <Button onClick={() => setShowForm(true)} className="mt-6">
            Configure First Provider
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {configs.map((config) => {
            const isGoogle = config.provider === 'google';
            const isDeepseek = config.provider === 'deepseek';
            const isLlama = config.provider === 'llama';

            return (
              <Card
                key={config.id}
                className={`relative flex flex-col justify-between border transition-all duration-300 ${
                  config.is_active
                    ? 'border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-950 shadow-emerald-950/5'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between p-5 pb-3">
                    <div className="flex items-center space-x-3">
                      {/* Styled Logo SVGs */}
                      <div className={`rounded-xl p-2.5 ${
                        isGoogle ? 'bg-blue-500/10 text-blue-400' :
                        isDeepseek ? 'bg-purple-500/10 text-purple-400' : 'bg-orange-500/10 text-orange-400'
                      }`}>
                        {isGoogle && (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.002 16.59H11v-2.02h2.002v2.02zm0-3.37H11V7.36h2.002v7.86z"/>
                          </svg>
                        )}
                        {isDeepseek && (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {isLlama && (
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white">
                          {isGoogle ? 'Google Gemini' : isDeepseek ? 'DeepSeek API' : 'Llama Server'}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{config.model_name}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-1.5">
                      {config.is_active ? (
                        <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                          Active Primary
                        </Badge>
                      ) : config.fallback_order !== null ? (
                        <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-300">
                          Fallback #{config.fallback_order}
                        </Badge>
                      ) : (
                        <Badge className="border-slate-700 bg-slate-800 text-slate-400">
                          Disabled
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="px-5 py-3 space-y-2 text-xs border-t border-slate-900/60 bg-slate-950/20">
                    <div className="flex justify-between">
                      <span className="text-slate-500">API Endpoint:</span>
                      <span className="text-slate-300 font-mono text-[10px] max-w-[170px] truncate">
                        {config.base_url || (isGoogle ? 'https://generativelanguage.googleapis.com' : isDeepseek ? 'https://api.deepseek.com/v1' : '—')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Authentication:</span>
                      <span className="text-slate-400">
                        {config.api_key ? 'Encrypted key stored' : 'No credentials (Local)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border-t border-slate-900/60 bg-slate-950/40 rounded-b-2xl">
                  {!config.is_active ? (
                    <button
                      onClick={() => handleSetActive(config)}
                      className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition"
                    >
                      Make Primary
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-500/50 cursor-default flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Primary Active
                    </span>
                  )}

                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(config)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white transition"
                      title="Edit"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(config.id)}
                      disabled={deletingId === config.id}
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-900 hover:text-rose-400 transition"
                      title="Delete"
                    >
                      {deletingId === config.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-t-slate-400"></div>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
