import { exec } from 'child_process';
import { promisify } from 'util';
import { app } from 'electron';
import path from 'path';

const execAsync = promisify(exec);

export interface RunningApp {
  name: string;
  bundleId?: string;
  path: string;
  pid: number;
}

/**
 * Service to detect running applications on macOS
 */
export class RunningAppsService {
  /**
   * Get all currently running applications
   */
  async getRunningApps(): Promise<RunningApp[]> {
    try {
      // Use osascript to get running applications
      // This is more reliable than ps for GUI apps
      const script = `
        tell application "System Events"
          set appList to {}
          repeat with proc in processes
            try
              set appName to name of proc
              set appPath to POSIX path of (path of proc)
              set appBundleId to bundle identifier of proc
              set appPid to unix id of proc
              set end of appList to {appName, appBundleId, appPath, appPid}
            end try
          end repeat
          return appList
        end tell
      `;

      const { stdout } = await execAsync(`osascript -e '${script}'`);
      
      // Parse the output - osascript returns a list of lists
      // Format: {{"App Name", "com.bundle.id", "/path/to/app", 12345}, ...}
      const apps: RunningApp[] = [];
      const lines = stdout.trim().split('\n');
      
      // Alternative approach: use ps command which is simpler
      return await this.getRunningAppsViaPS();
    } catch (error) {
      console.error('Error getting running apps via osascript:', error);
      // Fallback to ps command
      return await this.getRunningAppsViaPS();
    }
  }

  /**
   * Get running apps using ps command (more reliable)
   */
  private async getRunningAppsViaPS(): Promise<RunningApp[]> {
    try {
      // Get all processes that are applications (have .app in path)
      // Use ps with more specific filtering
      const { stdout } = await execAsync(
        `ps aux | grep -E '\\.app/Contents/MacOS/' | grep -v grep | grep -v 'Launchpad'`
      );

      const apps: RunningApp[] = [];
      const seenPaths = new Set<string>();

      const lines = stdout.trim().split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        try {
          // Parse ps output: USER PID %CPU %MEM VSZ RSS TT STAT STARTED TIME COMMAND
          const parts = line.trim().split(/\s+/);
          if (parts.length < 11) continue;

          const pid = parseInt(parts[1], 10);
          if (isNaN(pid)) continue;

          // Extract the command path
          const commandIndex = line.indexOf(parts[10]);
          const command = line.substring(commandIndex);
          
          // Find .app path in command
          const appMatch = command.match(/(\/[^\s]+\.app\/Contents\/MacOS\/[^\s]+)/);
          if (!appMatch) continue;

          const executablePath = appMatch[1];
          const appPath = executablePath.replace(/\/Contents\/MacOS\/[^/]+$/, '');
          
          if (seenPaths.has(appPath)) continue;
          seenPaths.add(appPath);

          // Get app name from path
          const appName = path.basename(appPath, '.app');
          
          // Try to get bundle ID
          let bundleId: string | undefined;
          try {
            const plistPath = path.join(appPath, 'Contents', 'Info.plist');
            const { stdout: bundleIdOutput } = await execAsync(
              `defaults read "${plistPath}" CFBundleIdentifier 2>/dev/null || echo ""`
            );
            bundleId = bundleIdOutput.trim() || undefined;
          } catch {
            // Ignore bundle ID errors
          }

          apps.push({
            name: appName,
            bundleId,
            path: appPath,
            pid,
          });
        } catch (error) {
          console.error('Error parsing process line:', error);
          continue;
        }
      }

      // Sort by name
      apps.sort((a, b) => a.name.localeCompare(b.name));

      // Filter out system apps and duplicates
      return apps.filter(app => {
        // Filter out Launchpad itself
        if (app.bundleId === 'com.launchpad.app' || app.name === 'Launchpad') {
          return false;
        }
        // Filter out system processes
        if (app.path.startsWith('/System/') || app.path.startsWith('/usr/')) {
          return false;
        }
        return true;
      });
    } catch (error) {
      console.error('Error getting running apps via ps:', error);
      return [];
    }
  }

  /**
   * Get app information from a bundle path
   */
  async getAppInfo(appPath: string): Promise<{ name: string; bundleId?: string } | null> {
    try {
      const appName = path.basename(appPath, '.app');
      
      let bundleId: string | undefined;
      try {
        const plistPath = path.join(appPath, 'Contents', 'Info.plist');
        const { stdout: bundleIdOutput } = await execAsync(
          `defaults read "${plistPath}" CFBundleIdentifier 2>/dev/null || echo ""`
        );
        bundleId = bundleIdOutput.trim() || undefined;
      } catch {
        // Ignore bundle ID errors
      }

      return { name: appName, bundleId };
    } catch (error) {
      console.error('Error getting app info:', error);
      return null;
    }
  }
}
