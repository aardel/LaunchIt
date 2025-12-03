import { shell } from 'electron';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import {
  AnyItem,
  BookmarkItem,
  SSHItem,
  AppItem,
  NetworkProfile,
} from '../../shared/types';
import { BrowserService } from './browsers';

const execAsync = promisify(exec);

export class LauncherService {
  private browserService: BrowserService;

  constructor(browserService: BrowserService) {
    this.browserService = browserService;
  }

  async launchItem(item: AnyItem, profile: NetworkProfile, browserId?: string, decryptedPassword?: string): Promise<void> {
    switch (item.type) {
      case 'bookmark':
        await this.launchBookmark(item, profile, browserId);
        break;
      case 'ssh':
        await this.launchSSH(item, profile, decryptedPassword);
        break;
      case 'app':
        await this.launchApp(item);
        break;
      default:
        throw new Error(`Unknown item type: ${(item as any).type}`);
    }
  }

  private async launchBookmark(item: BookmarkItem, profile: NetworkProfile, browserId?: string): Promise<void> {
    const url = this.buildUrl(item, profile);
    
    // If no specific browser or default, use system default
    if (!browserId || browserId === 'default') {
      await shell.openExternal(url);
      return;
    }

    // Get the browser info
    const browser = this.browserService.getBrowserById(browserId);
    if (!browser || !browser.path) {
      // Fallback to default
      await shell.openExternal(url);
      return;
    }

    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS - use open command with specific app
      spawn('open', ['-a', browser.path, url], { detached: true, stdio: 'ignore' });
    } else if (platform === 'win32') {
      // Windows - launch browser executable with URL
      spawn(browser.path, [url], { detached: true, stdio: 'ignore' });
    } else {
      // Linux - launch browser with URL
      spawn(browser.path, [url], { detached: true, stdio: 'ignore' });
    }
  }

  private async launchSSH(item: SSHItem, profile: NetworkProfile, password?: string): Promise<void> {
    const host = this.getAddressForProfile(item.networkAddresses, profile);
    if (!host) {
      throw new Error('No address configured for this profile');
    }

    const port = item.port || 22;
    const username = item.username || 'root';
    
    const platform = process.platform;

    if (platform === 'darwin') {
      if (password) {
        // Use sshpass if available, otherwise use expect script
        const hasSshpass = await this.checkCommand('sshpass');
        
        if (hasSshpass) {
          // Use sshpass for password authentication
          const sshCommand = `sshpass -p '${this.escapeShellArg(password)}' ssh -o StrictHostKeyChecking=accept-new ${username}@${host} -p ${port}`;
          const script = `
            tell application "Terminal"
              activate
              do script "${sshCommand}"
            end tell
          `;
          await execAsync(`osascript -e '${script}'`);
        } else {
          // Use expect script for password authentication
          const expectScript = `
            spawn ssh -o StrictHostKeyChecking=accept-new ${username}@${host} -p ${port}
            expect {
              "password:" {
                send "${this.escapeExpectArg(password)}\\r"
                interact
              }
              "Password:" {
                send "${this.escapeExpectArg(password)}\\r"
                interact
              }
              "yes/no" {
                send "yes\\r"
                expect "password:"
                send "${this.escapeExpectArg(password)}\\r"
                interact
              }
              timeout {
                interact
              }
            }
          `;
          
          // Write expect script to temp file and execute
          const tempScript = `/tmp/launchpad_ssh_${Date.now()}.exp`;
          const { writeFileSync, unlinkSync } = require('fs');
          writeFileSync(tempScript, expectScript);
          
          const script = `
            tell application "Terminal"
              activate
              do script "expect '${tempScript}' && rm '${tempScript}'"
            end tell
          `;
          await execAsync(`osascript -e '${script}'`);
        }
      } else {
        // No password - standard SSH
        const sshCommand = `ssh ${username}@${host} -p ${port}`;
        const script = `
          tell application "Terminal"
            activate
            do script "${sshCommand}"
          end tell
        `;
        await execAsync(`osascript -e '${script}'`);
      }
    } else if (platform === 'win32') {
      // Windows - open in Windows Terminal or cmd
      const sshCommand = `ssh ${username}@${host} -p ${port}`;
      try {
        // Try Windows Terminal first
        spawn('wt', ['new-tab', 'cmd', '/k', sshCommand], { detached: true, stdio: 'ignore' });
      } catch {
        // Fallback to cmd
        spawn('cmd', ['/k', sshCommand], { detached: true, stdio: 'ignore' });
      }
    } else {
      // Linux - try common terminal emulators
      const sshCommand = password 
        ? `sshpass -p '${this.escapeShellArg(password)}' ssh -o StrictHostKeyChecking=accept-new ${username}@${host} -p ${port}`
        : `ssh ${username}@${host} -p ${port}`;
      
      const terminals = [
        ['gnome-terminal', '--', 'bash', '-c', `${sshCommand}; exec bash`],
        ['konsole', '-e', sshCommand],
        ['xfce4-terminal', '-e', sshCommand],
        ['xterm', '-e', sshCommand],
      ];

      let launched = false;
      for (const [terminal, ...args] of terminals) {
        try {
          spawn(terminal, args, { detached: true, stdio: 'ignore' });
          launched = true;
          break;
        } catch {
          continue;
        }
      }

      if (!launched) {
        throw new Error('No supported terminal emulator found');
      }
    }
  }

  private async checkCommand(command: string): Promise<boolean> {
    try {
      await execAsync(`which ${command}`);
      return true;
    } catch {
      return false;
    }
  }

  private escapeShellArg(arg: string): string {
    return arg.replace(/'/g, "'\\''");
  }

  private escapeExpectArg(arg: string): string {
    return arg.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/\[/g, '\\[');
  }

  private async launchApp(item: AppItem): Promise<void> {
    const platform = process.platform;
    const appPath = item.appPath;
    const args = item.arguments || [];

    if (platform === 'darwin') {
      // macOS - use open command for .app bundles
      if (appPath.endsWith('.app')) {
        spawn('open', ['-a', appPath, ...args], { detached: true, stdio: 'ignore' });
      } else {
        spawn(appPath, args, { detached: true, stdio: 'ignore' });
      }
    } else if (platform === 'win32') {
      // Windows
      spawn('cmd', ['/c', 'start', '', appPath, ...args], { detached: true, stdio: 'ignore' });
    } else {
      // Linux
      spawn(appPath, args, { detached: true, stdio: 'ignore' });
    }
  }

  private buildUrl(item: BookmarkItem, profile: NetworkProfile): string {
    const host = this.getAddressForProfile(item.networkAddresses, profile);
    if (!host) {
      throw new Error('No address configured for this profile');
    }

    const protocol = item.protocol || 'https';
    const port = item.port;
    const path = item.path || '';

    let url = `${protocol}://`;
    
    // Handle IPv6 addresses
    if (host.includes(':') && !host.startsWith('[')) {
      url += `[${host}]`;
    } else {
      url += host;
    }

    // Add port if specified and not default
    if (port) {
      const isDefaultPort = 
        (protocol === 'http' && port === 80) ||
        (protocol === 'https' && port === 443) ||
        (protocol === 'ftp' && port === 21) ||
        (protocol === 'ssh' && port === 22);
      
      if (!isDefaultPort) {
        url += `:${port}`;
      }
    }

    // Add path
    if (path) {
      url += path.startsWith('/') ? path : `/${path}`;
    }

    return url;
  }

  private getAddressForProfile(
    addresses: { local?: string; tailscale?: string; vpn?: string; custom?: string },
    profile: NetworkProfile
  ): string | undefined {
    switch (profile) {
      case 'local':
        return addresses.local || addresses.tailscale || addresses.vpn || addresses.custom;
      case 'tailscale':
        return addresses.tailscale || addresses.local;
      case 'vpn':
        return addresses.vpn || addresses.local;
      case 'custom':
        return addresses.custom || addresses.local;
      default:
        return addresses.local;
    }
  }
}
