'use client';

import { useEffect, useState } from 'react';
import { Trash2, Plus, Wifi, WifiOff, Shield } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface IPAddress {
  id: string;
  ip_address: string;
  label?: string;
  is_trusted: boolean;
  created_at: string;
}

interface IPAddressManagerProps {
  userId: string;
}

const IPAddressManager = ({ userId }: IPAddressManagerProps) => {
  const [ipAddresses, setIpAddresses] = useState<IPAddress[]>([]);
  const [currentIP, setCurrentIP] = useState<string>('');
  const [newIP, setNewIP] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  // Fetch user's saved IP addresses
  const fetchIPAddresses = async () => {
    try {
      const { data, error } = await supabase
        .from('user_ip_addresses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIpAddresses(data || []);
    } catch (error) {
      logger.error('Error fetching IP addresses:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch saved IP addresses',
        variant: 'destructive',
      });
    }
  };

  // Detect current IP address
  const detectCurrentIP = async () => {
    setDetecting(true);
    try {
      // Using a public IP detection service
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      setCurrentIP(data.ip);
      setNewIP(data.ip);

      // Check if this IP is in the saved list
      const isSaved = ipAddresses.some(addr => addr.ip_address === data.ip);
      if (!isSaved) {
        toast({
          title: 'Current IP Detected',
          description: `Your current IP is ${data.ip}. You can add it to your trusted list.`,
        });
      }
    } catch (error) {
      logger.error('Error detecting IP:', error);
      toast({
        title: 'Error',
        description: 'Failed to detect current IP address',
        variant: 'destructive',
      });
    } finally {
      setDetecting(false);
    }
  };

  // Add new IP address
  const addIPAddress = async () => {
    if (!newIP) {
      toast({
        title: 'Error',
        description: 'Please enter an IP address',
        variant: 'destructive',
      });
      return;
    }

    // Basic IP validation
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(newIP)) {
      toast({
        title: 'Error',
        description: 'Please enter a valid IP address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('user_ip_addresses')
        .insert({
          user_id: userId,
          ip_address: newIP,
          label: newLabel || null,
          is_trusted: true,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'IP address added successfully',
      });

      setNewIP('');
      setNewLabel('');
      fetchIPAddresses();
    } catch (error: any) {
      logger.error('Error adding IP address:', error);
      if (error?.code === '23505') {
        toast({
          title: 'Error',
          description: 'This IP address is already saved',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add IP address',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete IP address
  const deleteIPAddress = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_ip_addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'IP address removed successfully',
      });

      fetchIPAddresses();
    } catch (error) {
      logger.error('Error deleting IP address:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove IP address',
        variant: 'destructive',
      });
    }
  };

  // Toggle trusted status
  const toggleTrusted = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_ip_addresses')
        .update({ is_trusted: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      fetchIPAddresses();
      toast({
        title: 'Success',
        description: `IP address marked as ${!currentStatus ? 'trusted' : 'untrusted'}`,
      });
    } catch (error) {
      logger.error('Error updating IP address:', error);
      toast({
        title: 'Error',
        description: 'Failed to update IP address',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchIPAddresses();
    detectCurrentIP();
  }, [userId]);

  const isCurrentIPSaved = ipAddresses.some(addr => addr.ip_address === currentIP);

  return (
    <div className="space-y-6">
      {/* Current IP Detection */}
      <div className="rounded-lg bg-foreground/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm text-foreground/70">Current IP Address</p>
              {detecting ? (
                <p className="font-mono text-sm">Detecting...</p>
              ) : currentIP ? (
                <div className="flex items-center gap-2">
                  <p className="font-mono">{currentIP}</p>
                  {isCurrentIPSaved && (
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-500">
                      Saved
                    </span>
                  )}
                  {!isCurrentIPSaved && (
                    <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-500">
                      Not in VPN list
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-foreground/50">Unable to detect</p>
              )}
            </div>
          </div>
          <button
            onClick={detectCurrentIP}
            disabled={detecting}
            className="rounded-lg bg-accent/10 px-3 py-1.5 text-sm text-accent hover:bg-accent/20 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Add New IP */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 font-medium">
          <Shield className="h-4 w-4" />
          Known IP Addresses (Non-VPN)
        </h3>
        <p className="text-sm text-foreground/70">
          Add your home, work, or other known public IP addresses. You&apos;ll be warned when browsing without a VPN from these locations.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            placeholder="IP Address (e.g., 192.168.1.1)"
            value={newIP}
            onChange={(e) => setNewIP(e.target.value)}
            className="flex-1 rounded-lg bg-foreground/10 px-4 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Label (optional, e.g., Home)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="flex-1 rounded-lg bg-foreground/10 px-4 py-2 text-sm sm:max-w-[200px]"
          />
          <button
            onClick={addIPAddress}
            disabled={loading || !newIP}
            className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add IP
          </button>
        </div>
      </div>

      {/* Saved IP Addresses List */}
      <div className="space-y-2">
        {ipAddresses.length === 0 ? (
          <div className="rounded-lg border border-foreground/10 p-8 text-center">
            <WifiOff className="mx-auto h-8 w-8 text-foreground/30" />
            <p className="mt-2 text-sm text-foreground/50">
              No IP addresses saved yet
            </p>
            <p className="mt-1 text-xs text-foreground/40">
              Add your known public IP addresses to get VPN warnings
            </p>
          </div>
        ) : (
          ipAddresses.map((ip) => (
            <div
              key={ip.id}
              className="flex items-center justify-between rounded-lg bg-foreground/5 p-3"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleTrusted(ip.id, ip.is_trusted)}
                  className={`rounded-full p-1.5 ${
                    ip.is_trusted
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-yellow-500/20 text-yellow-500'
                  }`}
                >
                  {ip.is_trusted ? (
                    <Shield className="h-4 w-4" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm">{ip.ip_address}</p>
                    {ip.label && (
                      <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs">
                        {ip.label}
                      </span>
                    )}
                    {ip.ip_address === currentIP && (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground/50">
                    Added {new Date(ip.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => deleteIPAddress(ip.id)}
                className="rounded-lg p-2 text-foreground/50 hover:bg-foreground/10 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default IPAddressManager;