import { exec } from 'child_process';
import { promisify } from 'util';
import { TailscaleStatus } from '../../shared/types';

const execAsync = promisify(exec);

export class TailscaleService {
  private cachedStatus: TailscaleStatus | null = null;
  private lastCheck: number = 0;
  private cacheTimeout = 30000; // 30 seconds

  async getStatus(): Promise<TailscaleStatus> {
    const now = Date.now();
    
    // Return cached status if still valid
    if (this.cachedStatus && now - this.lastCheck < this.cacheTimeout) {
      return this.cachedStatus;
    }

    try {
      const status = await this.fetchStatus();
      this.cachedStatus = status;
      this.lastCheck = now;
      return status;
    } catch (error) {
      console.error('Failed to get Tailscale status:', error);
      return { connected: false };
    }
  }

  private async fetchStatus(): Promise<TailscaleStatus> {
    const platform = process.platform;
    
    try {
      let cmd: string;
      
      if (platform === 'darwin') {
        // macOS - try both CLI locations
        cmd = '/Applications/Tailscale.app/Contents/MacOS/Tailscale status --json 2>/dev/null || /usr/local/bin/tailscale status --json 2>/dev/null || tailscale status --json 2>/dev/null';
      } else if (platform === 'win32') {
        // Windows
        cmd = 'tailscale status --json';
      } else {
        // Linux
        cmd = 'tailscale status --json';
      }

      const { stdout } = await execAsync(cmd, { timeout: 5000 });
      const data = JSON.parse(stdout);

      if (data.BackendState !== 'Running') {
        return { connected: false };
      }

      // Extract tailnet name from MagicDNSSuffix or CurrentTailnet
      let tailnetName = data.CurrentTailnet?.Name || '';
      if (!tailnetName && data.MagicDNSSuffix) {
        // MagicDNSSuffix is like "tailnet-name.ts.net"
        tailnetName = data.MagicDNSSuffix;
      }

      // Get self info
      const selfKey = Object.keys(data.Peer || {}).find(key => data.Self?.PublicKey === key) || '';
      const selfNode = data.Self || {};

      return {
        connected: true,
        tailnetName: tailnetName,
        ipAddress: selfNode.TailscaleIPs?.[0],
        hostname: selfNode.HostName,
      };
    } catch (error) {
      // Tailscale not installed or not running
      return { connected: false };
    }
  }

  async isConnected(): Promise<boolean> {
    const status = await this.getStatus();
    return status.connected;
  }

  // Check if we can reach a specific Tailscale address
  async canReach(address: string): Promise<boolean> {
    try {
      const cmd = process.platform === 'win32'
        ? `ping -n 1 -w 1000 ${address}`
        : `ping -c 1 -W 1 ${address}`;
      
      await execAsync(cmd, { timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  // Get the best profile to use based on network conditions
  async detectBestProfile(localAddress?: string, tailscaleAddress?: string): Promise<'local' | 'tailscale'> {
    // First check if Tailscale is connected
    const status = await this.getStatus();
    
    if (!status.connected) {
      return 'local';
    }

    // If we have a local address, check if we can reach it
    if (localAddress) {
      try {
        const canReachLocal = await this.canReach(localAddress);
        if (canReachLocal) {
          return 'local';
        }
      } catch {
        // Can't reach local, try Tailscale
      }
    }

    // Default to Tailscale if connected
    if (tailscaleAddress && status.connected) {
      return 'tailscale';
    }

    return 'local';
  }

  clearCache(): void {
    this.cachedStatus = null;
    this.lastCheck = 0;
  }
}

