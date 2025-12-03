import { net } from 'electron';
import type { BookmarkItem, NetworkProfile } from '../../shared/types';

export interface HealthCheckResult {
  itemId: string;
  url: string | null;
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  checkedAt: string;
}

export class HealthCheckService {
  private results: Map<string, HealthCheckResult> = new Map();
  private checkTimeout = 10000; // 10 seconds

  async checkBookmark(item: BookmarkItem, profile: NetworkProfile): Promise<HealthCheckResult> {
    const url = this.buildUrl(item, profile);
    const startTime = Date.now();
    
    const result: HealthCheckResult = {
      itemId: item.id,
      url,
      status: 'unknown',
      checkedAt: new Date().toISOString(),
    };

    if (!url) {
      result.status = 'error';
      result.error = 'No URL configured for this profile';
      this.results.set(item.id, result);
      return result;
    }

    try {
      const response = await this.fetchWithTimeout(url, this.checkTimeout);
      result.responseTime = Date.now() - startTime;
      result.statusCode = response.statusCode;

      if (response.statusCode >= 200 && response.statusCode < 300) {
        result.status = 'healthy';
      } else if (response.statusCode >= 300 && response.statusCode < 400) {
        result.status = 'warning'; // Redirects
      } else if (response.statusCode >= 400) {
        result.status = 'error';
        result.error = `HTTP ${response.statusCode}`;
      }
    } catch (error: any) {
      result.responseTime = Date.now() - startTime;
      result.status = 'error';
      result.error = error.message || 'Connection failed';
    }

    this.results.set(item.id, result);
    return result;
  }

  async checkMultipleBookmarks(
    items: BookmarkItem[], 
    profile: NetworkProfile,
    onProgress?: (current: number, total: number, result: HealthCheckResult) => void
  ): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const result = await this.checkBookmark(items[i], profile);
      results.push(result);
      
      if (onProgress) {
        onProgress(i + 1, items.length, result);
      }
      
      // Small delay between checks to avoid overwhelming
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  getResult(itemId: string): HealthCheckResult | undefined {
    return this.results.get(itemId);
  }

  getAllResults(): HealthCheckResult[] {
    return Array.from(this.results.values());
  }

  clearResults(): void {
    this.results.clear();
  }

  private buildUrl(item: BookmarkItem, profile: NetworkProfile): string | null {
    const addresses = item.networkAddresses;
    let host: string | undefined;

    switch (profile) {
      case 'local':
        host = addresses.local || addresses.tailscale || addresses.vpn;
        break;
      case 'tailscale':
        host = addresses.tailscale || addresses.local;
        break;
      case 'vpn':
        host = addresses.vpn || addresses.local;
        break;
      default:
        host = addresses.local;
    }

    if (!host) return null;

    const protocol = item.protocol || 'https';
    const port = item.port;
    const path = item.path || '';

    let url = `${protocol}://`;
    
    if (host.includes(':') && !host.startsWith('[')) {
      url += `[${host}]`;
    } else {
      url += host;
    }

    if (port) {
      const isDefaultPort = 
        (protocol === 'http' && port === 80) ||
        (protocol === 'https' && port === 443);
      
      if (!isDefaultPort) {
        url += `:${port}`;
      }
    }

    if (path) {
      url += path.startsWith('/') ? path : `/${path}`;
    }

    return url;
  }

  private fetchWithTimeout(url: string, timeout: number): Promise<{ statusCode: number }> {
    return new Promise((resolve, reject) => {
      const request = net.request({
        url,
        method: 'HEAD', // Just check if reachable, don't download content
      });

      const timeoutId = setTimeout(() => {
        request.abort();
        reject(new Error('Request timeout'));
      }, timeout);

      request.on('response', (response) => {
        clearTimeout(timeoutId);
        resolve({ statusCode: response.statusCode });
      });

      request.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });

      request.end();
    });
  }
}

