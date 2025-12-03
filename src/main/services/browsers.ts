import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

export interface Browser {
  id: string;
  name: string;
  path: string;
  icon: string;
}

// Common browsers for each platform
const BROWSERS_MAC: Omit<Browser, 'path'>[] = [
  { id: 'default', name: 'Default Browser', icon: '🌐' },
  { id: 'chrome', name: 'Google Chrome', icon: '🔵' },
  { id: 'firefox', name: 'Firefox', icon: '🦊' },
  { id: 'safari', name: 'Safari', icon: '🧭' },
  { id: 'brave', name: 'Brave', icon: '🦁' },
  { id: 'edge', name: 'Microsoft Edge', icon: '🌊' },
  { id: 'arc', name: 'Arc', icon: '🌈' },
  { id: 'opera', name: 'Opera', icon: '🔴' },
  { id: 'vivaldi', name: 'Vivaldi', icon: '🎨' },
  { id: 'chromium', name: 'Chromium', icon: '⚪' },
  { id: 'orion', name: 'Orion', icon: '🪐' },
  { id: 'waterfox', name: 'Waterfox', icon: '🌊' },
  { id: 'tor', name: 'Tor Browser', icon: '🧅' },
  { id: 'duckduckgo', name: 'DuckDuckGo', icon: '🦆' },
  { id: 'sidekick', name: 'Sidekick', icon: '🦸' },
  { id: 'sigma', name: 'SigmaOS', icon: '📐' },
  { id: 'atlas', name: 'Atlas', icon: '🗺️' },
  { id: 'zen', name: 'Zen Browser', icon: '☯️' },
  { id: 'floorp', name: 'Floorp', icon: '🌸' },
  { id: 'librewolf', name: 'LibreWolf', icon: '🐺' },
  { id: 'mullvad', name: 'Mullvad Browser', icon: '🔒' },
  { id: 'min', name: 'Min', icon: '➖' },
  { id: 'beam', name: 'Beam', icon: '✨' },
  { id: 'chatgpt', name: 'ChatGPT', icon: '🤖' },
];

const BROWSER_PATHS_MAC: Record<string, string[]> = {
  chrome: ['/Applications/Google Chrome.app', '/Applications/Chrome.app'],
  firefox: ['/Applications/Firefox.app'],
  safari: ['/Applications/Safari.app'],
  brave: ['/Applications/Brave Browser.app', '/Applications/Brave.app'],
  edge: ['/Applications/Microsoft Edge.app'],
  arc: ['/Applications/Arc.app'],
  opera: ['/Applications/Opera.app', '/Applications/Opera GX.app'],
  vivaldi: ['/Applications/Vivaldi.app'],
  chromium: ['/Applications/Chromium.app'],
  orion: ['/Applications/Orion.app'],
  waterfox: ['/Applications/Waterfox.app'],
  tor: ['/Applications/Tor Browser.app'],
  duckduckgo: ['/Applications/DuckDuckGo.app'],
  sidekick: ['/Applications/Sidekick.app'],
  sigma: ['/Applications/SigmaOS.app'],
  atlas: ['/Applications/Atlas.app'],
  zen: ['/Applications/Zen Browser.app', '/Applications/Zen.app'],
  floorp: ['/Applications/Floorp.app'],
  librewolf: ['/Applications/LibreWolf.app'],
  mullvad: ['/Applications/Mullvad Browser.app'],
  min: ['/Applications/Min.app'],
  beam: ['/Applications/Beam.app'],
  chatgpt: ['/Applications/ChatGPT.app'],
};

const BROWSERS_WIN: Omit<Browser, 'path'>[] = [
  { id: 'default', name: 'Default Browser', icon: '🌐' },
  { id: 'chrome', name: 'Google Chrome', icon: '🔵' },
  { id: 'firefox', name: 'Firefox', icon: '🦊' },
  { id: 'edge', name: 'Microsoft Edge', icon: '🌊' },
  { id: 'brave', name: 'Brave', icon: '🦁' },
  { id: 'opera', name: 'Opera', icon: '🔴' },
  { id: 'vivaldi', name: 'Vivaldi', icon: '🎨' },
];

const BROWSER_PATHS_WIN: Record<string, string> = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  firefox: 'C:\\Program Files\\Mozilla Firefox\\firefox.exe',
  edge: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  opera: 'C:\\Program Files\\Opera\\launcher.exe',
  vivaldi: 'C:\\Program Files\\Vivaldi\\Application\\vivaldi.exe',
};

const BROWSERS_LINUX: Omit<Browser, 'path'>[] = [
  { id: 'default', name: 'Default Browser', icon: '🌐' },
  { id: 'chrome', name: 'Google Chrome', icon: '🔵' },
  { id: 'firefox', name: 'Firefox', icon: '🦊' },
  { id: 'chromium', name: 'Chromium', icon: '⚪' },
  { id: 'brave', name: 'Brave', icon: '🦁' },
  { id: 'opera', name: 'Opera', icon: '🔴' },
  { id: 'vivaldi', name: 'Vivaldi', icon: '🎨' },
];

export class BrowserService {
  private installedBrowsers: Browser[] = [];
  private cached = false;

  async getInstalledBrowsers(): Promise<Browser[]> {
    if (this.cached) {
      return this.installedBrowsers;
    }

    const platform = process.platform;
    
    if (platform === 'darwin') {
      this.installedBrowsers = await this.detectMacBrowsers();
    } else if (platform === 'win32') {
      this.installedBrowsers = await this.detectWindowsBrowsers();
    } else {
      this.installedBrowsers = await this.detectLinuxBrowsers();
    }

    this.cached = true;
    return this.installedBrowsers;
  }

  private async detectMacBrowsers(): Promise<Browser[]> {
    const browsers: Browser[] = [
      { id: 'default', name: 'Default Browser', path: '', icon: '🌐' }
    ];

    for (const browser of BROWSERS_MAC) {
      if (browser.id === 'default') continue;
      
      const paths = BROWSER_PATHS_MAC[browser.id] || [];
      for (const path of paths) {
        if (existsSync(path)) {
          browsers.push({ ...browser, path });
          break; // Found this browser, move to next
        }
      }
    }

    // Also scan Applications folder for any other browsers we might have missed
    try {
      const { readdirSync } = await import('fs');
      const apps = readdirSync('/Applications');
      
      // Look for any app with "browser" in the name that we haven't detected
      const browserKeywords = ['browser', 'web', 'surf'];
      for (const app of apps) {
        if (!app.endsWith('.app')) continue;
        
        const appLower = app.toLowerCase();
        const isKnown = browsers.some(b => b.path.includes(app));
        
        if (!isKnown && browserKeywords.some(kw => appLower.includes(kw))) {
          const appName = app.replace('.app', '');
          browsers.push({
            id: appName.toLowerCase().replace(/\s+/g, '-'),
            name: appName,
            path: `/Applications/${app}`,
            icon: '🌐',
          });
        }
      }
    } catch {
      // Ignore errors scanning Applications
    }

    return browsers;
  }

  private async detectWindowsBrowsers(): Promise<Browser[]> {
    const browsers: Browser[] = [
      { id: 'default', name: 'Default Browser', path: '', icon: '🌐' }
    ];

    for (const browser of BROWSERS_WIN) {
      if (browser.id === 'default') continue;
      
      const path = BROWSER_PATHS_WIN[browser.id];
      if (path && existsSync(path)) {
        browsers.push({ ...browser, path });
      }
    }

    // Also check for Chrome in x86 path
    const chromex86 = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
    if (existsSync(chromex86) && !browsers.find(b => b.id === 'chrome')) {
      browsers.push({ id: 'chrome', name: 'Google Chrome', path: chromex86, icon: '🔵' });
    }

    return browsers;
  }

  private async detectLinuxBrowsers(): Promise<Browser[]> {
    const browsers: Browser[] = [
      { id: 'default', name: 'Default Browser', path: '', icon: '🌐' }
    ];

    const linuxCommands: Record<string, string[]> = {
      chrome: ['google-chrome', 'google-chrome-stable'],
      firefox: ['firefox'],
      chromium: ['chromium', 'chromium-browser'],
      brave: ['brave-browser', 'brave'],
      opera: ['opera'],
      vivaldi: ['vivaldi', 'vivaldi-stable'],
    };

    for (const browser of BROWSERS_LINUX) {
      if (browser.id === 'default') continue;
      
      const commands = linuxCommands[browser.id] || [];
      for (const cmd of commands) {
        try {
          const { stdout } = await execAsync(`which ${cmd}`);
          if (stdout.trim()) {
            browsers.push({ ...browser, path: stdout.trim() });
            break;
          }
        } catch {
          // Command not found, continue
        }
      }
    }

    return browsers;
  }

  getBrowserById(id: string): Browser | undefined {
    return this.installedBrowsers.find(b => b.id === id);
  }

  clearCache(): void {
    this.cached = false;
    this.installedBrowsers = [];
  }
}

