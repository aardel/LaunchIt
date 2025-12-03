import { dialog } from 'electron';
import { readFileSync, writeFileSync } from 'fs';
import type { AnyItem, Group } from '../../shared/types';

export interface ExportData {
  version: string;
  exportedAt: string;
  groups: Group[];
  items: AnyItem[];
}

export class ImportExportService {
  async exportData(groups: Group[], items: AnyItem[]): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Launchpad Data',
        defaultPath: `launchpad-backup-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Export cancelled' };
      }

      const exportData: ExportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        groups,
        items,
      };

      writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf-8');
      
      return { success: true, path: result.filePath };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async importData(): Promise<{ success: boolean; data?: ExportData; error?: string }> {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import Launchpad Data',
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Import cancelled' };
      }

      const fileContent = readFileSync(result.filePaths[0], 'utf-8');
      const data = JSON.parse(fileContent) as ExportData;

      // Validate the data structure
      if (!data.version || !data.groups || !data.items) {
        return { success: false, error: 'Invalid file format' };
      }

      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  // Import from Chrome/Firefox bookmarks HTML
  async importBrowserBookmarks(): Promise<{ success: boolean; items?: Partial<AnyItem>[]; error?: string }> {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import Browser Bookmarks',
        filters: [
          { name: 'HTML Files', extensions: ['html', 'htm'] },
          { name: 'All Files', extensions: ['*'] },
        ],
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Import cancelled' };
      }

      const fileContent = readFileSync(result.filePaths[0], 'utf-8');
      const bookmarks = this.parseBrowserBookmarks(fileContent);

      return { success: true, items: bookmarks };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private parseBrowserBookmarks(html: string): Partial<AnyItem>[] {
    const bookmarks: Partial<AnyItem>[] = [];
    
    // Simple regex to extract bookmarks from Netscape bookmark format
    // Format: <A HREF="url" ... >name</A>
    const regex = /<A\s+HREF="([^"]+)"[^>]*>([^<]+)<\/A>/gi;
    let match;

    while ((match = regex.exec(html)) !== null) {
      const url = match[1];
      const name = match[2].trim();

      // Skip javascript: and place: URLs
      if (url.startsWith('javascript:') || url.startsWith('place:')) {
        continue;
      }

      try {
        const urlObj = new URL(url);
        bookmarks.push({
          type: 'bookmark',
          name,
          protocol: urlObj.protocol.replace(':', '') as any,
          port: urlObj.port ? parseInt(urlObj.port, 10) : undefined,
          path: urlObj.pathname + urlObj.search,
          networkAddresses: {
            local: urlObj.hostname,
          },
        });
      } catch {
        // Invalid URL, skip
      }
    }

    return bookmarks;
  }
}

