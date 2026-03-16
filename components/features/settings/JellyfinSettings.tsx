'use client';

import {
  Server,
  Link,
  Unlink,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Power,
  Play,
  Bug,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import { createClient } from '@/lib/supabase/client';

interface JellyfinUser {
  Id: string;
  Name: string;
}

interface JellyfinConfigRow {
  id: string;
  user_id: string;
  server_url: string;
  api_key: string;
  jellyfin_user_id: string;
  sync_enabled: boolean;
  webhook_secret: string;
  created_at: string;
  updated_at: string;
}

interface JellyfinSettingsProps {
  userId: string;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const JellyfinSettings = ({ userId }: JellyfinSettingsProps) => {
  // Form state
  const [serverUrl, setServerUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [jellyfinUsers, setJellyfinUsers] = useState<JellyfinUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(true);

  // UI state
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [serverName, setServerName] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [existingConfig, setExistingConfig] = useState<JellyfinConfigRow | null>(null);
  const [copied, setCopied] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const { toast } = useToast();
  const supabase = createClient();

  // Load existing config on mount
  const loadExistingConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_jellyfin_config')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching Jellyfin config:', error);
        return;
      }

      if (data) {
        const config = data as JellyfinConfigRow;
        setExistingConfig(config);
        setServerUrl(config.server_url);
        setApiKey(config.api_key);
        setSelectedUserId(config.jellyfin_user_id);
        setSyncEnabled(config.sync_enabled);
        setWebhookSecret(config.webhook_secret);
        setConnectionState('connected');
      }
    } catch (error) {
      logger.error('Error loading Jellyfin config:', error);
    }
  }, [userId, supabase]);

  useEffect(() => {
    loadExistingConfig();
  }, [loadExistingConfig]);

  // Fetch Jellyfin users from the server
  const fetchJellyfinUsers = async () => {
    if (!serverUrl || !apiKey) {
      toast({
        title: 'Error',
        description: 'Enter a server URL and API key first',
        variant: 'destructive',
      });
      return;
    }

    setFetchingUsers(true);
    try {
      const response = await fetch('/api/jellyfin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_url: serverUrl, api_key: apiKey }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users');
      }

      setJellyfinUsers(data.users);

      if (data.users.length > 0 && !selectedUserId) {
        setSelectedUserId(data.users[0].Id);
      }

      setConnectionState('connecting');
      toast({
        title: 'Users loaded',
        description: `Found ${data.users.length} user(s). Select one and save.`,
      });
    } catch (error) {
      logger.error('Error fetching Jellyfin users:', error);
      setConnectionState('error');
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Could not reach Jellyfin server',
        variant: 'destructive',
      });
    } finally {
      setFetchingUsers(false);
    }
  };

  // Validate and save the configuration
  const saveConfig = async () => {
    if (!serverUrl || !apiKey || !selectedUserId) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields and select a user',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/jellyfin/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          server_url: serverUrl,
          api_key: apiKey,
          jellyfin_user_id: selectedUserId,
          save: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Validation failed');
      }

      setServerName(data.serverName);
      setConnectionState('connected');

      // Reload config to get the webhook secret
      await loadExistingConfig();

      toast({
        title: 'Connected',
        description: `Successfully connected to ${data.serverName}`,
      });
    } catch (error) {
      logger.error('Error saving Jellyfin config:', error);
      setConnectionState('error');
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Failed to validate connection',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Toggle sync enabled/disabled
  const toggleSync = async () => {
    if (!existingConfig) return;

    try {
      const newState = !syncEnabled;
      const { error } = await supabase
        .from('user_jellyfin_config')
        .update({ sync_enabled: newState, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) throw error;

      setSyncEnabled(newState);
      toast({
        title: newState ? 'Sync enabled' : 'Sync disabled',
        description: newState
          ? 'Watch history will sync with Jellyfin'
          : 'Watch history sync is paused',
      });
    } catch (error) {
      logger.error('Error toggling sync:', error);
      toast({
        title: 'Error',
        description: 'Failed to update sync setting',
        variant: 'destructive',
      });
    }
  };

  // Disconnect / delete configuration
  const disconnect = async () => {
    if (!existingConfig) return;

    try {
      const { error } = await supabase.from('user_jellyfin_config').delete().eq('user_id', userId);

      if (error) throw error;

      // Reset all state
      setExistingConfig(null);
      setServerUrl('');
      setApiKey('');
      setSelectedUserId('');
      setJellyfinUsers([]);
      setWebhookSecret('');
      setSyncEnabled(true);
      setConnectionState('disconnected');
      setServerName('');

      toast({
        title: 'Disconnected',
        description: 'Jellyfin integration has been removed',
      });
    } catch (error) {
      logger.error('Error disconnecting Jellyfin:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect',
        variant: 'destructive',
      });
    }
  };

  // Copy webhook URL to clipboard
  const copyWebhookUrl = async () => {
    if (!webhookSecret) return;

    const webhookUrl = `${window.location.origin}/api/jellyfin/webhook?token=${webhookSecret}`;

    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied',
        description: 'Webhook URL copied to clipboard',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  // Run Jellyfin diagnostics
  const runDiagnostics = async () => {
    setDebugLoading(true);
    setDebugInfo(null);
    try {
      const response = await fetch('/api/jellyfin/debug', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      setDebugInfo(data);
      toast({
        title: 'Diagnostics complete',
        description: `Server reachable: ${data.serverReachable}, Jellyfin history items: ${data.jellyfinWatchHistory?.length || 0}`,
      });
    } catch (error) {
      logger.error('Error running diagnostics:', error);
      toast({
        title: 'Error',
        description: 'Failed to run diagnostics',
        variant: 'destructive',
      });
    } finally {
      setDebugLoading(false);
    }
  };

  // Trigger manual sync (poll)
  const triggerSync = async () => {
    setSyncLoading(true);
    try {
      const response = await fetch('/api/jellyfin/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      toast({
        title: 'Sync complete',
        description: `Synced ${data.itemsSynced} items, skipped ${data.itemsSkipped}`,
      });
    } catch (error) {
      logger.error('Error triggering sync:', error);
      toast({
        title: 'Error',
        description: 'Failed to trigger sync',
        variant: 'destructive',
      });
    } finally {
      setSyncLoading(false);
    }
  };

  // Connection status indicator
  const StatusDot = () => {
    const colors = {
      disconnected: 'bg-foreground/30',
      connecting: 'bg-yellow-500',
      connected: 'bg-green-500',
      error: 'bg-red-500',
    };

    return <span className={`inline-block h-2.5 w-2.5 rounded-full ${colors[connectionState]}`} />;
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Header */}
      <div className="rounded-lg bg-foreground/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm text-foreground/70">Jellyfin Server</p>
              <div className="flex items-center gap-2">
                <StatusDot />
                <p className="text-sm">
                  {connectionState === 'connected' && (serverName || existingConfig?.server_url)}
                  {connectionState === 'connecting' && 'Connecting...'}
                  {connectionState === 'disconnected' && 'Not connected'}
                  {connectionState === 'error' && 'Connection error'}
                </p>
              </div>
            </div>
          </div>
          {existingConfig && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleSync}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  syncEnabled
                    ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                    : 'bg-foreground/10 text-foreground/50 hover:bg-foreground/20'
                }`}
              >
                <Power className="mr-1 inline h-3.5 w-3.5" />
                {syncEnabled ? 'Sync On' : 'Sync Off'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Form */}
      {!existingConfig ? (
        <div className="space-y-4">
          <p className="text-sm text-foreground/70">
            Connect your Jellyfin server to sync watch progress bidirectionally. You will need your
            server URL and an API key (generate one in Jellyfin Dashboard &rarr; API Keys).
          </p>

          {/* Server URL */}
          <div>
            <label className="mb-1 block text-sm font-medium">Server URL</label>
            <input
              type="text"
              placeholder="http://10.10.20.30:8096 or https://jellyfin.example.com"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="w-full rounded-lg bg-foreground/10 px-4 py-2 text-sm"
            />
          </div>

          {/* API Key */}
          <div>
            <label className="mb-1 block text-sm font-medium">API Key</label>
            <input
              type="password"
              placeholder="Your Jellyfin API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full rounded-lg bg-foreground/10 px-4 py-2 text-sm"
            />
          </div>

          {/* Fetch Users Button */}
          <button
            onClick={fetchJellyfinUsers}
            disabled={fetchingUsers || !serverUrl || !apiKey}
            className="flex items-center gap-2 rounded-lg bg-foreground/10 px-4 py-2 text-sm hover:bg-foreground/20 disabled:opacity-50"
          >
            {fetchingUsers ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Fetch Users
          </button>

          {/* User Selection */}
          {jellyfinUsers.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium">Jellyfin User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-lg bg-foreground/10 px-4 py-2 text-sm"
              >
                {jellyfinUsers.map((u) => (
                  <option key={u.Id} value={u.Id}>
                    {u.Name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Save Button */}
          {jellyfinUsers.length > 0 && selectedUserId && (
            <button
              onClick={saveConfig}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link className="h-4 w-4" />
              )}
              Connect & Save
            </button>
          )}
        </div>
      ) : (
        /* Connected State */
        <div className="space-y-4">
          {/* Webhook URL */}
          <div>
            <label className="mb-1 block text-sm font-medium">Webhook URL</label>
            <p className="mb-2 text-xs text-foreground/50">
              Paste this URL into your Jellyfin Webhook plugin configuration. Events to enable:
              Playback Start, Playback Stop, Playback Progress, Mark Played.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-foreground/10 px-3 py-2 text-xs">
                {`${typeof window !== 'undefined' ? window.location.origin : ''}/api/jellyfin/webhook?token=${webhookSecret}`}
              </code>
              <button
                onClick={copyWebhookUrl}
                className="rounded-lg bg-foreground/10 p-2 hover:bg-foreground/20"
                title="Copy webhook URL"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Server Info */}
          <div className="rounded-lg border border-foreground/10 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-foreground/50">Server</div>
              <div className="truncate font-mono text-xs">{existingConfig.server_url}</div>
              <div className="text-foreground/50">User ID</div>
              <div className="truncate font-mono text-xs">{existingConfig.jellyfin_user_id}</div>
              <div className="text-foreground/50">Connected</div>
              <div className="text-xs">
                {new Date(existingConfig.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Diagnostic & Sync Buttons */}
          <div className="flex gap-2">
            <button
              onClick={runDiagnostics}
              disabled={debugLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-foreground/10 px-4 py-2 text-sm hover:bg-foreground/20 disabled:opacity-50"
            >
              {debugLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bug className="h-4 w-4" />
              )}
              Debug
            </button>
            <button
              onClick={triggerSync}
              disabled={syncLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-foreground/10 px-4 py-2 text-sm hover:bg-foreground/20 disabled:opacity-50"
            >
              {syncLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Sync Now
            </button>
          </div>

          {/* Debug Info Display */}
          {debugInfo && (
            <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
              <p className="mb-2 text-sm font-medium text-yellow-500">Diagnostic Results</p>
              <div className="space-y-1 font-mono text-xs">
                <p>Sync Enabled: {debugInfo.syncEnabled ? 'Yes' : 'No'}</p>
                <p>Server Reachable: {debugInfo.serverReachable ? 'Yes' : 'No'}</p>
                <p>Server Name: {debugInfo.serverName || 'N/A'}</p>
                <p>Webhook URL: {debugInfo.webhookUrl ? 'Configured' : 'Missing'}</p>
                <p>Jellyfin History Items: {debugInfo.jellyfinWatchHistory?.length || 0}</p>
                {debugInfo.recentLogs?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-foreground/50">Recent Sync Logs:</p>
                    {debugInfo.recentLogs.slice(0, 5).map((log: any, i: number) => (
                      <p key={i} className="text-foreground/70">
                        {log.direction} {log.media_type} {log.status} -{' '}
                        {new Date(log.created_at).toLocaleTimeString()}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Disconnect Button */}
          <button
            onClick={disconnect}
            className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-500 hover:bg-red-500/20"
          >
            <Unlink className="h-4 w-4" />
            Disconnect Jellyfin
          </button>
        </div>
      )}
    </div>
  );
};

export default JellyfinSettings;
