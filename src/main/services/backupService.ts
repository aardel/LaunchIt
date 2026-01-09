import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { app } from 'electron';
import type { AnyItem, Group } from '../../shared/types';

export interface BackupData {
  version: string;
  timestamp: string;
  groups: Group[];
  items: AnyItem[];
}

export class BackupService {
  private backupsDir: string;
  private maxBackups: number = 10; // Keep last 10 backups

  constructor() {
    const userDataPath = app.getPath('userData');
    this.backupsDir = join(userDataPath, 'backups');
    
    // Ensure backups directory exists
    if (!existsSync(this.backupsDir)) {
      mkdirSync(this.backupsDir, { recursive: true });
    }
  }

  /**
   * Create an automatic backup before a major operation
   */
  async createBackup(groups: Group[], items: AnyItem[]): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = join(this.backupsDir, `backup-${timestamp}.json`);
      
      const backupData: BackupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        groups,
        items,
      };

      writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
      
      // Clean up old backups (keep only last maxBackups)
      this.cleanupOldBackups();
      
      return { success: true, path: backupPath };
    } catch (error) {
      console.error('Failed to create backup:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get the most recent backup
   */
  getLatestBackup(): BackupData | null {
    try {
      const backups = this.getBackupFiles();
      if (backups.length === 0) return null;

      // Sort by filename (which includes timestamp) descending
      backups.sort().reverse();
      const latestBackupPath = join(this.backupsDir, backups[0]);
      
      const content = readFileSync(latestBackupPath, 'utf-8');
      return JSON.parse(content) as BackupData;
    } catch (error) {
      console.error('Failed to get latest backup:', error);
      return null;
    }
  }

  /**
   * Get list of all backups (newest first)
   */
  getAllBackups(): Array<{ path: string; timestamp: string }> {
    try {
      const backups = this.getBackupFiles();
      return backups
        .map(filename => {
          const path = join(this.backupsDir, filename);
          try {
            const content = readFileSync(path, 'utf-8');
            const data = JSON.parse(content) as BackupData;
            return {
              path,
              timestamp: data.timestamp,
            };
          } catch {
            return null;
          }
        })
        .filter((backup): backup is { path: string; timestamp: string } => backup !== null)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Failed to get backups:', error);
      return [];
    }
  }

  /**
   * Restore from a backup
   */
  restoreBackup(backupPath: string): BackupData | null {
    try {
      const content = readFileSync(backupPath, 'utf-8');
      return JSON.parse(content) as BackupData;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return null;
    }
  }

  /**
   * Get backup files from directory
   */
  private getBackupFiles(): string[] {
    if (!existsSync(this.backupsDir)) {
      return [];
    }
    
    return readdirSync(this.backupsDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'));
  }

  /**
   * Clean up old backups, keeping only the most recent maxBackups
   */
  private cleanupOldBackups(): void {
    try {
      const backups = this.getBackupFiles();
      
      if (backups.length <= this.maxBackups) {
        return;
      }

      // Sort by filename (timestamp) and remove oldest
      backups.sort().reverse();
      const backupsToDelete = backups.slice(this.maxBackups);
      
      for (const backup of backupsToDelete) {
        const backupPath = join(this.backupsDir, backup);
        try {
          unlinkSync(backupPath);
        } catch (error) {
          console.error(`Failed to delete old backup ${backup}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * Get backup directory path
   */
  getBackupsDirectory(): string {
    return this.backupsDir;
  }
}



