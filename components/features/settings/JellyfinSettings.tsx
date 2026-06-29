'use client';

import {
  Server,
  Link,
  Unlink,
  Copy,
  Check,
  Loader2,
  Power,
  Play,
  Bug,
} from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger';
import {
  getJellyfinConfig,
  setJellyfinSyncEnabled,
  deleteJellyfinConfig,
} from '@/lib/db/mutations';

/** Resolved Jellyfin connection for the current user (member link + family integration). */
interface JellyfinConfigRow {
  /** integration_member_links.id */
  id: string;
  server_url: string;
  jellyfin_user_id: string;
  jellyfin_username: string | null;
  sync_enabled: boolean;
  webhook_secret: string;
  created_at: string;
}

interface JellyfinSettingsProps {
  userId: string;
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

const JellyfinSettings = ({ userId }: JellyfinSettingsProps) => {
  // Form state
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(true);

  // UI state
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [serverName, setServerName] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingConfig, setExistingConfig] = useState<JellyfinConfigRow | null>(null);
  const [copied, setCopied] = useState(false);
  const [debugLoading, setDebugLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const { toast } = useToast();

  // Load existing config on mount
  const loadExistingConfig = useCallback(async () => {
    if (!userId) return;
    try {
      const config = await getJellyfinConfig(userId);
      if (config) {
        setExistingConfig(config);
        setServerUrl(config.server_url);
        setSyncEnabled(config.sync_enabled);
        setWebhookSecret(config.webhook_secret);
        setConnectionState('connected');
      }
    } catch (error) {
      logger.error('Error loading Jellyfin config:', error);
    }
  }, [userId]);

  useEffect(() => {
    loadExistingConfig();
  }, [loadExistingConfig]);

  // Sign in to Jellyfin with username and password
  const signIn = async () => {
    if (!serverUrl || !username || !password) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setConnectionState('connecting');
    try {
      const response = await fetch('/api/jellyfin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server_url: serverUrl, username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed');
      }

      setServerName(data.serverName);
      setConnectionState('connected');
      setPassword('');

      // Reload config to get the webhook secret and full config
      await loadExistingConfig();

      toast({
        title: 'Connected',
        description: `Signed in as ${data.jellyfinUserName} on ${data.serverName}`,
      });
    } catch (error) {
      logger.error('Error signing in to Jellyfin:', error);
      setConnectionState('error');
      toast({
        title: 'Connection failed',
        description: error instanceof Error ? error.message : 'Could not connect to Jellyfin',
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
      await setJellyfinSyncEnabled(existingConfig.id, newState);

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
      await deleteJellyfinConfig(existingConfig.id);

      // Reset all state
      setExistingConfig(null);
      setServerUrl('');
      setUsername('');
      setPassword('');
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
            Connect your Jellyfin server to sync watch progress bidirectionally. Sign in with your
            Jellyfin username and password.
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

          {/* Username */}
          <div>
            <label className="mb-1 block text-sm font-medium">Username</label>
            <input
              type="text"
              placeholder="Your Jellyfin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg bg-foreground/10 px-4 py-2 text-sm"
            />
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-sm font-medium">Password</label>
            <input
              type="password"
              placeholder="Your Jellyfin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-foreground/10 px-4 py-2 text-sm"
            />
          </div>

          {/* Sign In Button */}
          <button
            onClick={signIn}
            disabled={loading || !serverUrl || !username || !password}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link className="h-4 w-4" />
            )}
            Sign In
          </button>
        </div>
      ) : (
        /* Connected State */
        <div className="space-y-4">
          {/* Webhook URL */}
          <div>
            <label className="mb-1 block text-sm font-medium">Webhook URL</label>
            <p className="mb-2 text-xs text-foreground/50">
              One webhook URL handles all users on the server who have connected their accounts. Only
              the Jellyfin admin needs to set this up once.
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

          {/* Webhook Setup Guide */}
          <div className="rounded-lg border border-foreground/10 p-3">
            <p className="mb-2 text-sm font-medium">Webhook Setup (Jellyfin Admin)</p>
            <ol className="list-inside list-decimal space-y-1.5 text-xs text-foreground/60">
              <li>
                Install the{' '}
                <span className="font-medium text-foreground/80">Webhook</span> plugin in Jellyfin
                (Dashboard &rarr; Plugins &rarr; Catalog &rarr; Webhook)
              </li>
              <li>Restart Jellyfin after installing the plugin</li>
              <li>
                Go to Dashboard &rarr; Plugins &rarr; Webhook &rarr;{' '}
                <span className="font-medium text-foreground/80">Add Generic Destination</span>
              </li>
              <li>Paste the webhook URL from above into the Webhook URL field</li>
              <li>
                Enable these notification types:{' '}
                <span className="font-medium text-foreground/80">
                  Playback Start, Playback Stop, Playback Progress, Mark Played
                </span>
              </li>
              <li>Leave the User filter empty so it works for all users on the server</li>
              <li>Check &quot;Send All Properties&quot; and save</li>
            </ol>
            <p className="mt-2 text-xs text-foreground/40">
              Other users on the server just need to sign in here with their own Jellyfin
              credentials — no extra webhook setup needed.
            </p>
          </div>

          {/* Server Info */}
          <div className="rounded-lg border border-foreground/10 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-foreground/50">Server</div>
              <div className="truncate font-mono text-xs">{existingConfig.server_url}</div>
              <div className="text-foreground/50">Jellyfin User</div>
              <div className="truncate text-xs">
                {existingConfig.jellyfin_username || existingConfig.jellyfin_user_id}
              </div>
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
