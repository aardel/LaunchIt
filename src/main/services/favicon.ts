import { net } from 'electron';
import { writeFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { app } from 'electron';

interface FaviconMetadata {
  lastFetched: number;
  url: string;
}

export class FaviconService {
  private cacheDir: string;
  private memoryCache: Map<string, string> = new Map();
  private metadataCache: Map<string, FaviconMetadata> = new Map();
  private readonly REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.cacheDir = join(app.getPath('userData'), 'favicons');
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
    this.loadMetadata();
  }

  private getMetadataPath(cacheKey: string): string {
    return join(this.cacheDir, `${cacheKey}.meta.json`);
  }

  private getCachePath(cacheKey: string): string {
    return join(this.cacheDir, `${cacheKey}.txt`);
  }

  private loadMetadata(): void {
    try {
      const metadataFile = join(this.cacheDir, 'metadata.json');
      if (existsSync(metadataFile)) {
        const data = JSON.parse(readFileSync(metadataFile, 'utf-8'));
        Object.entries(data).forEach(([key, value]) => {
          this.metadataCache.set(key, value as FaviconMetadata);
        });
      }
    } catch (error) {
      console.error('Error loading favicon metadata:', error);
    }
  }

  private saveMetadata(): void {
    try {
      const metadataFile = join(this.cacheDir, 'metadata.json');
      const data: Record<string, FaviconMetadata> = {};
      this.metadataCache.forEach((value, key) => {
        data[key] = value;
      });
      writeFileSync(metadataFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving favicon metadata:', error);
    }
  }

  /**
   * Get favicon for a URL, returns base64 data URL or null
   * @param url - The URL to get favicon for
   * @param forceRefresh - If true, bypass cache and fetch fresh
   */
  async getFavicon(url: string, forceRefresh: boolean = false): Promise<string | null> {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const cacheKey = domain.replace(/[^a-zA-Z0-9]/g, '_');

      // Check memory cache first (unless forcing refresh)
      if (!forceRefresh && this.memoryCache.has(cacheKey)) {
        return this.memoryCache.get(cacheKey) || null;
      }

      // Check file cache and metadata
      const cachePath = this.getCachePath(cacheKey);
      const metadata = this.metadataCache.get(cacheKey);
      const now = Date.now();

      if (!forceRefresh && existsSync(cachePath) && metadata) {
        const age = now - metadata.lastFetched;
        
        // If cached and not expired, return cached version
        if (age < this.REFRESH_INTERVAL_MS) {
          const cached = readFileSync(cachePath, 'utf-8');
          this.memoryCache.set(cacheKey, cached);
          return cached;
        }
        // If expired, we'll fetch fresh below
      }

      // Fetch fresh favicon
      const faviconUrl = await this.fetchFavicon(domain);
      
      if (faviconUrl) {
        // Cache the result
        writeFileSync(cachePath, faviconUrl, 'utf-8');
        this.memoryCache.set(cacheKey, faviconUrl);
        
        // Update metadata
        this.metadataCache.set(cacheKey, {
          lastFetched: now,
          url: url,
        });
        this.saveMetadata();
        
        return faviconUrl;
      } else if (existsSync(cachePath)) {
        // If fetch failed but we have old cache, return it
        const cached = readFileSync(cachePath, 'utf-8');
        this.memoryCache.set(cacheKey, cached);
        return cached;
      }

      return null;
    } catch (error) {
      console.error('Error fetching favicon:', error);
      return null;
    }
  }

  /**
   * Check if a favicon exists and is fresh (not expired)
   */
  hasFavicon(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const cacheKey = domain.replace(/[^a-zA-Z0-9]/g, '_');
      
      const cachePath = this.getCachePath(cacheKey);
      if (!existsSync(cachePath)) {
        return false;
      }

      const metadata = this.metadataCache.get(cacheKey);
      if (!metadata) {
        return false; // No metadata means it's an old cache file
      }

      const age = Date.now() - metadata.lastFetched;
      return age < this.REFRESH_INTERVAL_MS;
    } catch {
      return false;
    }
  }

  /**
   * Get favicons that need refreshing (expired)
   */
  getExpiredFavicons(urls: string[]): string[] {
    const expired: string[] = [];
    const now = Date.now();

    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        const cacheKey = domain.replace(/[^a-zA-Z0-9]/g, '_');
        
        const metadata = this.metadataCache.get(cacheKey);
        if (!metadata) {
          continue; // Not cached yet, will be fetched separately
        }

        const age = now - metadata.lastFetched;
        if (age >= this.REFRESH_INTERVAL_MS) {
          expired.push(url);
        }
      } catch {
        continue;
      }
    }

    return expired;
  }

  private async fetchFavicon(domain: string): Promise<string | null> {
    // Try Google's favicon service first (most reliable)
    const googleUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    const googleFavicon = await this.downloadImage(googleUrl);
    if (googleFavicon) return googleFavicon;

    // Try DuckDuckGo's favicon service
    const ddgUrl = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
    const ddgFavicon = await this.downloadImage(ddgUrl);
    if (ddgFavicon) return ddgFavicon;

    // Try direct favicon.ico
    const directUrl = `https://${domain}/favicon.ico`;
    const directFavicon = await this.downloadImage(directUrl);
    if (directFavicon) return directFavicon;

    return null;
  }

  private downloadImage(url: string): Promise<string | null> {
    return new Promise((resolve) => {
      const request = net.request(url);
      const chunks: Buffer[] = [];

      request.on('response', (response) => {
        if (response.statusCode !== 200) {
          resolve(null);
          return;
        }

        const contentType = response.headers['content-type'];
        let mimeType = 'image/x-icon';
        
        if (contentType) {
          const ct = Array.isArray(contentType) ? contentType[0] : contentType;
          if (ct.includes('png')) mimeType = 'image/png';
          else if (ct.includes('jpeg') || ct.includes('jpg')) mimeType = 'image/jpeg';
          else if (ct.includes('gif')) mimeType = 'image/gif';
          else if (ct.includes('svg')) mimeType = 'image/svg+xml';
          else if (ct.includes('webp')) mimeType = 'image/webp';
        }

        response.on('data', (chunk) => {
          chunks.push(chunk);
        });

        response.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks);
            if (buffer.length < 100) {
              // Too small, probably not a valid image
              resolve(null);
              return;
            }
            const base64 = buffer.toString('base64');
            resolve(`data:${mimeType};base64,${base64}`);
          } catch {
            resolve(null);
          }
        });

        response.on('error', () => resolve(null));
      });

      request.on('error', () => resolve(null));
      
      // Timeout after 5 seconds
      setTimeout(() => {
        request.abort();
        resolve(null);
      }, 5000);

      request.end();
    });
  }

  /**
   * Fetch favicons for multiple URLs in parallel
   * @param urls - URLs to fetch favicons for
   * @param forceRefresh - If true, bypass cache for all
   */
  async getFavicons(urls: string[], forceRefresh: boolean = false): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    const uniqueUrls = [...new Set(urls)];

    // Process in batches of 5 to avoid overwhelming
    const batchSize = 5;
    for (let i = 0; i < uniqueUrls.length; i += batchSize) {
      const batch = uniqueUrls.slice(i, i + batchSize);
      const promises = batch.map(async (url) => {
        const favicon = await this.getFavicon(url, forceRefresh);
        results.set(url, favicon);
      });
      await Promise.all(promises);
    }

    return results;
  }

  /**
   * Clear the favicon cache
   */
  clearCache(): void {
    this.memoryCache.clear();
    // Note: File cache remains for persistence
  }
}

