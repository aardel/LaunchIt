import { existsSync, readFileSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { execSync } from 'child_process';

export interface BrowserBookmark {
  name: string;
  url: string;
  folder?: string;
}

export interface BrowserWithBookmarks {
  id: string;
  name: string;
  icon: string;
  hasBookmarks: boolean;
  bookmarkCount?: number;
}

// Browser bookmark file locations on macOS
const BROWSER_BOOKMARK_PATHS: Record<string, { path: string; type: 'json' | 'sqlite' | 'plist' }> = {
  chrome: {
    path: '~/Library/Application Support/Google/Chrome/Default/Bookmarks',
    type: 'json',
  },
  'chrome-alt': {
    path: '~/Library/Application Support/Chrome/Default/Bookmarks',
    type: 'json',
  },
  brave: {
    path: '~/Library/Application Support/BraveSoftware/Brave-Browser/Default/Bookmarks',
    type: 'json',
  },
  edge: {
    path: '~/Library/Application Support/Microsoft Edge/Default/Bookmarks',
    type: 'json',
  },
  arc: {
    path: '~/Library/Application Support/Arc/User Data/Default/Bookmarks',
    type: 'json',
  },
  vivaldi: {
    path: '~/Library/Application Support/Vivaldi/Default/Bookmarks',
    type: 'json',
  },
  opera: {
    path: '~/Library/Application Support/com.operasoftware.Opera/Bookmarks',
    type: 'json',
  },
  chromium: {
    path: '~/Library/Application Support/Chromium/Default/Bookmarks',
    type: 'json',
  },
  firefox: {
    path: '~/Library/Application Support/Firefox/Profiles',
    type: 'sqlite',
  },
  safari: {
    path: '~/Library/Safari/Bookmarks.plist',
    type: 'plist',
  },
};

const BROWSER_INFO: Record<string, { name: string; icon: string }> = {
  chrome: { name: 'Google Chrome', icon: '🔵' },
  'chrome-alt': { name: 'Chrome', icon: '🔵' },
  brave: { name: 'Brave', icon: '🦁' },
  edge: { name: 'Microsoft Edge', icon: '🌊' },
  arc: { name: 'Arc', icon: '🌈' },
  vivaldi: { name: 'Vivaldi', icon: '🎨' },
  opera: { name: 'Opera', icon: '🔴' },
  chromium: { name: 'Chromium', icon: '⚪' },
  firefox: { name: 'Firefox', icon: '🦊' },
  safari: { name: 'Safari', icon: '🧭' },
};

export class BrowserBookmarksService {
  private expandPath(path: string): string {
    return path.replace('~', homedir());
  }

  async getBrowsersWithBookmarks(): Promise<BrowserWithBookmarks[]> {
    const browsers: BrowserWithBookmarks[] = [];

    for (const [id, config] of Object.entries(BROWSER_BOOKMARK_PATHS)) {
      const info = BROWSER_INFO[id];
      if (!info) continue;

      const fullPath = this.expandPath(config.path);
      let hasBookmarks = false;
      let bookmarkCount = 0;

      try {
        if (config.type === 'sqlite') {
          // Firefox - check if profiles directory exists with places.sqlite
          if (existsSync(fullPath)) {
            const profiles = readdirSync(fullPath);
            for (const profile of profiles) {
              const placesPath = join(fullPath, profile, 'places.sqlite');
              if (existsSync(placesPath)) {
                hasBookmarks = true;
                // Don't count for Firefox as it requires SQLite query
                break;
              }
            }
          }
        } else if (config.type === 'plist') {
          // Safari
          hasBookmarks = existsSync(fullPath);
        } else {
          // JSON (Chromium-based)
          if (existsSync(fullPath)) {
            const content = readFileSync(fullPath, 'utf-8');
            const data = JSON.parse(content);
            const bookmarks = this.extractChromiumBookmarks(data);
            hasBookmarks = bookmarks.length > 0;
            bookmarkCount = bookmarks.length;
          }
        }
      } catch (error) {
        // Browser data not accessible
        continue;
      }

      if (hasBookmarks) {
        browsers.push({
          id,
          name: info.name,
          icon: info.icon,
          hasBookmarks,
          bookmarkCount: bookmarkCount || undefined,
        });
      }
    }

    return browsers;
  }

  async getBookmarksFromBrowser(browserId: string): Promise<BrowserBookmark[]> {
    const config = BROWSER_BOOKMARK_PATHS[browserId];
    if (!config) {
      throw new Error(`Unknown browser: ${browserId}`);
    }

    const fullPath = this.expandPath(config.path);

    switch (config.type) {
      case 'json':
        return this.readChromiumBookmarks(fullPath);
      case 'sqlite':
        return this.readFirefoxBookmarks(fullPath);
      case 'plist':
        return this.readSafariBookmarks(fullPath);
      default:
        return [];
    }
  }

  private readChromiumBookmarks(path: string): BrowserBookmark[] {
    try {
      const content = readFileSync(path, 'utf-8');
      const data = JSON.parse(content);
      return this.extractChromiumBookmarks(data);
    } catch (error) {
      console.error('Error reading Chromium bookmarks:', error);
      return [];
    }
  }

  private extractChromiumBookmarks(data: any, folder: string = ''): BrowserBookmark[] {
    const bookmarks: BrowserBookmark[] = [];

    const processNode = (node: any, currentFolder: string) => {
      if (!node) return;

      if (node.type === 'url' && node.url) {
        bookmarks.push({
          name: node.name || 'Untitled',
          url: node.url,
          folder: currentFolder || undefined,
        });
      } else if (node.type === 'folder' && node.children) {
        const newFolder = currentFolder ? `${currentFolder}/${node.name}` : node.name;
        for (const child of node.children) {
          processNode(child, newFolder);
        }
      }
    };

    // Process bookmark bar and other folders
    if (data.roots) {
      if (data.roots.bookmark_bar) {
        processNode(data.roots.bookmark_bar, 'Bookmark Bar');
      }
      if (data.roots.other) {
        processNode(data.roots.other, 'Other Bookmarks');
      }
      if (data.roots.synced) {
        processNode(data.roots.synced, 'Mobile Bookmarks');
      }
    }

    return bookmarks;
  }

  private readFirefoxBookmarks(profilesPath: string): BrowserBookmark[] {
    const bookmarks: BrowserBookmark[] = [];

    try {
      const profiles = readdirSync(profilesPath);
      
      for (const profile of profiles) {
        const placesPath = join(profilesPath, profile, 'places.sqlite');
        if (!existsSync(placesPath)) continue;

        // Copy database to temp location (Firefox locks the file)
        const tempPath = `/tmp/firefox_places_${Date.now()}.sqlite`;
        execSync(`cp "${placesPath}" "${tempPath}"`);

        try {
          // Use sqlite3 command line to extract bookmarks
          const result = execSync(
            `sqlite3 "${tempPath}" "SELECT b.title, p.url FROM moz_bookmarks b JOIN moz_places p ON b.fk = p.id WHERE b.type = 1 AND p.url NOT LIKE 'place:%'"`,
            { encoding: 'utf-8' }
          );

          const lines = result.trim().split('\n');
          for (const line of lines) {
            const [title, url] = line.split('|');
            if (url && url.startsWith('http')) {
              bookmarks.push({
                name: title || 'Untitled',
                url,
              });
            }
          }
        } finally {
          // Clean up temp file
          try {
            execSync(`rm "${tempPath}"`);
          } catch {}
        }

        // Only read from first profile with bookmarks
        if (bookmarks.length > 0) break;
      }
    } catch (error) {
      console.error('Error reading Firefox bookmarks:', error);
    }

    return bookmarks;
  }

  private readSafariBookmarks(plistPath: string): BrowserBookmark[] {
    const bookmarks: BrowserBookmark[] = [];

    try {
      // Convert plist to JSON using plutil
      const result = execSync(
        `plutil -convert json -o - "${plistPath}"`,
        { encoding: 'utf-8' }
      );

      const data = JSON.parse(result);
      this.extractSafariBookmarks(data, bookmarks);
    } catch (error) {
      console.error('Error reading Safari bookmarks:', error);
    }

    return bookmarks;
  }

  private extractSafariBookmarks(node: any, bookmarks: BrowserBookmark[], folder: string = ''): void {
    if (!node) return;

    if (node.WebBookmarkType === 'WebBookmarkTypeLeaf' && node.URLString) {
      bookmarks.push({
        name: node.URIDictionary?.title || node.Title || 'Untitled',
        url: node.URLString,
        folder: folder || undefined,
      });
    } else if (node.WebBookmarkType === 'WebBookmarkTypeList' && node.Children) {
      const newFolder = node.Title ? (folder ? `${folder}/${node.Title}` : node.Title) : folder;
      for (const child of node.Children) {
        this.extractSafariBookmarks(child, bookmarks, newFolder);
      }
    }
  }
}

