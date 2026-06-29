'use client';

import { Users, UserPlus, Copy, Check, Loader2, LogOut, Trash2, Crown } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import type { FamilyWithMembers } from '@/lib/family/server';
import { logger } from '@/lib/logger';

interface FamilySettingsProps {
  userId: string;
  initialFamilies: FamilyWithMembers[];
}

const FamilySettings = ({ userId, initialFamilies }: FamilySettingsProps) => {
  const [families, setFamilies] = useState<FamilyWithMembers[]>(initialFamilies);
  const [newName, setNewName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [inviteCodes, setInviteCodes] = useState<Record<string, string>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/family');
      if (!res.ok) return;
      const data = await res.json();
      setFamilies(data.families ?? []);
    } catch (error) {
      logger.error('Failed to refresh families:', error);
    }
  }, []);

  // Allow ?code=XYZ to prefill the join box (e.g. from a shared invite link).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) setJoinCode(code);
  }, []);

  const createFamily = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create family');
      setNewName('');
      await refresh();
      toast({ title: 'Family created', description: `"${newName.trim()}" is ready.` });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create family',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const joinFamily = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await fetch('/api/family/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: joinCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to join family');
      setJoinCode('');
      await refresh();
      toast({ title: 'Joined family', description: `You're now part of "${data.familyName}".` });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to join family',
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  };

  const generateInvite = async (familyId: string) => {
    try {
      const res = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId, expiresInDays: 7 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invite');
      setInviteCodes((prev) => ({ ...prev, [familyId]: data.code }));
      toast({ title: 'Invite created', description: 'Share the code or link below (valid 7 days).' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create invite',
        variant: 'destructive',
      });
    }
  };

  const copyInvite = async (familyId: string) => {
    const code = inviteCodes[familyId];
    if (!code) return;
    const link = `${window.location.origin}/protected/settings/family?code=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedCode(familyId);
      setTimeout(() => setCopiedCode(null), 2000);
      toast({ title: 'Copied', description: 'Invite link copied to clipboard' });
    } catch {
      toast({ title: 'Error', description: 'Failed to copy', variant: 'destructive' });
    }
  };

  const removeMember = async (familyId: string, targetUserId: string, isSelf: boolean) => {
    try {
      const res = await fetch('/api/family/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyId, userId: targetUserId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove member');
      await refresh();
      toast({ title: isSelf ? 'Left family' : 'Member removed' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove member',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Existing families */}
      <div className="space-y-4">
        {families.length === 0 && (
          <p className="text-sm text-foreground/60">
            You&apos;re not part of any family yet. Create one below to share your integrations
            (like Jellyfin) with the people you add.
          </p>
        )}

        {families.map((family) => {
          const isAdmin = family.role === 'owner' || family.role === 'admin';
          return (
            <div key={family.id} className="rounded-lg border border-foreground/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-accent" />
                  <div>
                    <p className="font-medium">{family.name}</p>
                    <p className="text-xs capitalize text-foreground/50">You are {family.role}</p>
                  </div>
                </div>
                {family.role !== 'owner' && (
                  <button
                    onClick={() => removeMember(family.id, userId, true)}
                    className="flex items-center gap-1.5 rounded-lg bg-foreground/10 px-3 py-1.5 text-xs hover:bg-foreground/20"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Leave
                  </button>
                )}
              </div>

              {/* Members */}
              <div className="space-y-1.5">
                {family.members.map((m) => (
                  <div
                    key={m.user_id}
                    className="flex items-center justify-between rounded-md bg-foreground/5 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-sm">
                      {m.role === 'owner' && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
                      <span>{m.user?.name || m.user?.username || m.user_id.slice(0, 8)}</span>
                      <span className="text-xs capitalize text-foreground/40">{m.role}</span>
                    </div>
                    {isAdmin && m.role !== 'owner' && m.user_id !== userId && (
                      <button
                        onClick={() => removeMember(family.id, m.user_id, false)}
                        className="rounded-md p-1 text-red-500 hover:bg-red-500/10"
                        title="Remove member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Invite (admins only) */}
              {isAdmin && (
                <div className="mt-3 border-t border-foreground/10 pt-3">
                  {inviteCodes[family.id] ? (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 truncate rounded-lg bg-foreground/10 px-3 py-2 text-xs">
                        {inviteCodes[family.id]}
                      </code>
                      <button
                        onClick={() => copyInvite(family.id)}
                        className="rounded-lg bg-foreground/10 p-2 hover:bg-foreground/20"
                        title="Copy invite link"
                      >
                        {copiedCode === family.id ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => generateInvite(family.id)}
                      className="flex items-center gap-2 rounded-lg bg-foreground/10 px-3 py-1.5 text-sm hover:bg-foreground/20"
                    >
                      <UserPlus className="h-4 w-4" />
                      Create invite link
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create a family */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Create a family</label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. The Dobras Household"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded-lg bg-foreground/10 px-4 py-2 text-sm"
          />
          <button
            onClick={createFamily}
            disabled={creating || !newName.trim()}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
            Create
          </button>
        </div>
      </div>

      {/* Join a family */}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Join a family</label>
        <p className="text-xs text-foreground/50">Paste an invite code shared with you.</p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Invite code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            className="flex-1 rounded-lg bg-foreground/10 px-4 py-2 text-sm"
          />
          <button
            onClick={joinFamily}
            disabled={joining || !joinCode.trim()}
            className="flex items-center gap-2 rounded-lg bg-foreground/10 px-4 py-2 text-sm hover:bg-foreground/20 disabled:opacity-50"
          >
            {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Join
          </button>
        </div>
      </div>
    </div>
  );
};

export default FamilySettings;
