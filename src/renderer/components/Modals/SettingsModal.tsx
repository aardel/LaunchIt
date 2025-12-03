import { useState, useEffect } from 'react';
import { 
  X, Monitor, Moon, Sun, RefreshCw, Download, Upload, FileUp, Check, Globe,
  Settings, Wifi, Database, Info, Terminal, Palette, Image, Loader2, Shield,
  Lock, Eye, EyeOff, AlertCircle, Keyboard, Command, Cloud, CloudOff, CheckCircle2
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { ImportBrowserModal } from './ImportBrowserModal';
import type { NetworkProfile } from '@shared/types';

type SettingsTab = 'general' | 'security' | 'network' | 'terminal' | 'shortcuts' | 'data' | 'about';

const TABS: { id: SettingsTab; label: string; icon: typeof Settings }[] = [
  { id: 'general', label: 'General', icon: Palette },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'network', label: 'Network', icon: Wifi },
  { id: 'terminal', label: 'Terminal', icon: Terminal },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'about', label: 'About', icon: Info },
];

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const cmdKey = isMac ? '⌘' : 'Ctrl';

const SHORTCUTS = [
  { keys: [`${cmdKey}`, 'N'], description: 'New item' },
  { keys: [`${cmdKey}`, 'G'], description: 'New group' },
  { keys: [`${cmdKey}`, ','], description: 'Open settings' },
  { keys: [`${cmdKey}`, 'K'], description: 'Focus search' },
  { keys: [`${cmdKey}`, 'L'], description: 'Lock vault' },
  { keys: ['1-9'], description: 'Select group' },
  { keys: ['0'], description: 'Show all groups' },
  { keys: ['Esc'], description: 'Close modal / Clear search' },
];

export function SettingsModal() {
  const { isSettingsOpen, closeSettings, settings, tailscaleStatus, refreshTailscaleStatus, groups, loadData, fetchFavicons, isFetchingFavicons, faviconProgress, isVaultSetup, lockVault } = useStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [defaultProfile, setDefaultProfile] = useState<NetworkProfile>('local');
  const [defaultTerminal, setDefaultTerminal] = useState('Terminal');
  const [isRefreshingTailscale, setIsRefreshingTailscale] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [selectedImportGroup, setSelectedImportGroup] = useState<string>('');
  const [isBrowserImportOpen, setIsBrowserImportOpen] = useState(false);
  
  // Sync state
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [syncUrl, setSyncUrl] = useState('');
  const [syncUsername, setSyncUsername] = useState('');
  const [syncPassword, setSyncPassword] = useState('');
  const [showSyncPassword, setShowSyncPassword] = useState(false);
  const [hasSavedPassword, setHasSavedPassword] = useState(false);
  const [displayPassword, setDisplayPassword] = useState(''); // For showing saved password when toggled
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  
  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (settings) {
      setTheme(settings.theme);
      setDefaultProfile(settings.defaultProfile);
      setDefaultTerminal(settings.defaultTerminal || 'Terminal');
      setSyncEnabled(settings.syncEnabled || false);
      setSyncUrl(settings.syncUrl || '');
      setSyncUsername(settings.syncUsername || '');
      setHasSavedPassword(!!settings.syncPassword);
      setDisplayPassword(''); // Reset display password
      setShowSyncPassword(false); // Reset show/hide state
      // Don't load password value, but show indicator if one exists
    }
    if (groups.length > 0 && !selectedImportGroup) {
      setSelectedImportGroup(groups[0].id);
    }
  }, [settings, groups, selectedImportGroup]);

  useEffect(() => {
    if (isSettingsOpen) {
      setActiveTab('general');
      // Reset password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordError(null);
      setPasswordSuccess(null);
    }
  }, [isSettingsOpen]);

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }
    if (!newPassword) {
      setPasswordError('Please enter a new password');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await window.api.encryption.changePassword(currentPassword, newPassword);
      if (res.success) {
        setPasswordSuccess('Password changed successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setTimeout(() => setPasswordSuccess(null), 3000);
      } else {
        setPasswordError(res.error || 'Failed to change password');
      }
    } catch (err) {
      setPasswordError('Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRefreshTailscale = async () => {
    setIsRefreshingTailscale(true);
    await refreshTailscaleStatus();
    setTimeout(() => setIsRefreshingTailscale(false), 500);
  };

  const handleExport = async () => {
    setExportStatus('Exporting...');
    try {
      const result = await window.api.data.export();
      if (result.success) {
        setExportStatus(`Exported successfully!`);
        setTimeout(() => setExportStatus(null), 3000);
      } else {
        setExportStatus(result.error || 'Export failed');
      }
    } catch (error) {
      setExportStatus('Export failed');
    }
  };

  const handleImport = async () => {
    setImportStatus('Importing...');
    try {
      const result = await window.api.data.import();
      if (result.success && result.data) {
        setImportStatus(`Imported ${result.data.groupsCount} groups and ${result.data.itemsCount} items`);
        await loadData();
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus(result.error || 'Import failed');
      }
    } catch (error) {
      setImportStatus('Import failed');
    }
  };

  const handleImportBrowserBookmarks = async () => {
    if (!selectedImportGroup) {
      setImportStatus('Please select a group first');
      return;
    }
    
    setImportStatus('Importing bookmarks...');
    try {
      const result = await window.api.data.importBrowserBookmarks(selectedImportGroup);
      if (result.success && result.data) {
        setImportStatus(`Imported ${result.data.count} bookmarks`);
        await loadData();
        setTimeout(() => setImportStatus(null), 3000);
      } else {
        setImportStatus(result.error || 'Import failed');
      }
    } catch (error) {
      setImportStatus('Import failed');
    }
  };

  if (!isSettingsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
        onClick={closeSettings}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl animate-scale-in overflow-hidden flex flex-col" style={{ height: '600px' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-800">
          <h2 className="text-xl font-semibold text-dark-100">Settings</h2>
          <button
            onClick={closeSettings}
            className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs + Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Tab Sidebar */}
          <div className="w-44 bg-dark-850 border-r border-dark-800 py-2 flex-shrink-0">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                           ${activeTab === tab.id
                             ? 'bg-accent-primary/10 text-accent-primary border-r-2 border-accent-primary'
                             : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'}`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-dark-100 mb-4">Appearance</h3>
                  <label className="input-label">Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', label: 'Light', icon: Sun },
                      { id: 'dark', label: 'Dark', icon: Moon },
                      { id: 'system', label: 'System', icon: Monitor },
                    ].map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.id}
                          onClick={() => setTheme(option.id as typeof theme)}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all
                                   ${theme === option.id
                                     ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                                     : 'border-dark-700 bg-dark-800 text-dark-400 hover:border-dark-600'}`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-sm">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Favicons */}
                <div>
                  <h3 className="text-lg font-medium text-dark-100 mb-4">Website Icons</h3>
                  <div className="p-4 bg-dark-800/50 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Image className="w-5 h-5 text-dark-400" />
                        <div>
                          <p className="text-sm font-medium text-dark-200">Favicon Cache</p>
                          <p className="text-xs text-dark-500">Automatically fetches website icons</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => fetchFavicons(true)}
                      disabled={isFetchingFavicons}
                      className="btn-secondary w-full"
                    >
                      {isFetchingFavicons ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Fetching {faviconProgress.current}/{faviconProgress.total}...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Refresh All Favicons
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-dark-100 mb-4">Vault Status</h3>
                  <div className="p-4 bg-dark-800/50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isVaultSetup ? 'bg-accent-success/20' : 'bg-dark-700'
                      }`}>
                        <Shield className={`w-5 h-5 ${isVaultSetup ? 'text-accent-success' : 'text-dark-400'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-dark-100">
                          {isVaultSetup ? 'Encryption Enabled' : 'Not Set Up'}
                        </p>
                        <p className="text-xs text-dark-400">
                          {isVaultSetup 
                            ? 'Your credentials are encrypted with your master password'
                            : 'Set up a master password to encrypt credentials'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {isVaultSetup && (
                  <>
                    <div>
                      <h3 className="text-lg font-medium text-dark-100 mb-4">Quick Lock</h3>
                      <button
                        onClick={() => {
                          lockVault();
                          closeSettings();
                        }}
                        className="btn-secondary w-full"
                      >
                        <Lock className="w-4 h-4" />
                        Lock Vault Now
                      </button>
                      <p className="text-xs text-dark-500 mt-2">
                        You'll need to enter your master password to unlock
                      </p>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-dark-100 mb-4">Change Password</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="input-label text-xs">Current Password</label>
                          <div className="relative">
                            <input
                              type={showPasswords ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="input-base pr-10"
                              placeholder="Enter current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(!showPasswords)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                            >
                              {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="input-label text-xs">New Password</label>
                          <input
                            type={showPasswords ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="input-base"
                            placeholder="Enter new password"
                          />
                        </div>
                        <div>
                          <label className="input-label text-xs">Confirm New Password</label>
                          <input
                            type={showPasswords ? 'text' : 'password'}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            className="input-base"
                            placeholder="Confirm new password"
                          />
                        </div>

                        {passwordError && (
                          <div className="flex items-center gap-2 p-3 bg-accent-danger/10 text-accent-danger rounded-lg text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {passwordError}
                          </div>
                        )}

                        {passwordSuccess && (
                          <div className="flex items-center gap-2 p-3 bg-accent-success/10 text-accent-success rounded-lg text-sm">
                            <Check className="w-4 h-4 flex-shrink-0" />
                            {passwordSuccess}
                          </div>
                        )}

                        <button
                          onClick={handleChangePassword}
                          disabled={isChangingPassword}
                          className="btn-primary w-full"
                        >
                          {isChangingPassword ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Changing...
                            </>
                          ) : (
                            'Change Password'
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Network Tab */}
            {activeTab === 'network' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-dark-100 mb-4">Tailscale Status</h3>
                  <div className="p-4 bg-dark-800/50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            tailscaleStatus.connected ? 'bg-accent-success animate-pulse' : 'bg-dark-500'
                          }`}
                        />
                        <div>
                          <p className="text-sm font-medium text-dark-200">
                            {tailscaleStatus.connected ? 'Connected' : 'Disconnected'}
                          </p>
                          {tailscaleStatus.connected && tailscaleStatus.tailnetName && (
                            <p className="text-xs text-dark-400">{tailscaleStatus.tailnetName}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={handleRefreshTailscale}
                        className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-700 transition-colors"
                        disabled={isRefreshingTailscale}
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${isRefreshingTailscale ? 'animate-spin' : ''}`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-dark-100 mb-4">Default Profile</h3>
                  <select
                    value={defaultProfile}
                    onChange={(e) => setDefaultProfile(e.target.value as NetworkProfile)}
                    className="input-base"
                  >
                    <option value="local">Local (LAN)</option>
                    <option value="tailscale">Tailscale</option>
                    <option value="vpn">VPN</option>
                  </select>
                  <p className="text-xs text-dark-500 mt-2">
                    The network profile used when the app starts
                  </p>
                </div>
              </div>
            )}

            {/* Terminal Tab */}
            {activeTab === 'terminal' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-dark-100 mb-4">SSH Terminal</h3>
                  <label className="input-label">Default Terminal App</label>
                  <select
                    value={defaultTerminal}
                    onChange={(e) => setDefaultTerminal(e.target.value)}
                    className="input-base"
                  >
                    <option value="Terminal">Terminal.app</option>
                    <option value="iTerm">iTerm2</option>
                    <option value="Warp">Warp</option>
                    <option value="Alacritty">Alacritty</option>
                    <option value="Kitty">Kitty</option>
                  </select>
                  <p className="text-xs text-dark-500 mt-2">
                    Terminal application used for SSH connections
                  </p>
                </div>
              </div>
            )}

            {/* Shortcuts Tab */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-dark-100 mb-4">Keyboard Shortcuts</h3>
                  <div className="space-y-2">
                    {SHORTCUTS.map((shortcut, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 bg-dark-800/50 rounded-lg"
                      >
                        <span className="text-sm text-dark-300">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIdx) => (
                            <span key={keyIdx} className="flex items-center gap-1">
                              {keyIdx > 0 && <span className="text-dark-500 text-xs">+</span>}
                              <kbd className="px-2 py-1 text-xs font-mono bg-dark-700 border border-dark-600 rounded text-dark-200">
                                {key}
                              </kbd>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-dark-800/30 rounded-lg">
                  <p className="text-xs text-dark-500 text-center">
                    💡 Tip: Press number keys 1-9 to quickly switch between groups
                  </p>
                </div>
              </div>
            )}

            {/* Data Tab */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                {/* Status Messages */}
                {(exportStatus || importStatus || syncStatus) && (
                  <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                    (exportStatus?.includes('failed') || importStatus?.includes('failed') || syncStatus?.includes('failed') || syncStatus?.includes('Error'))
                      ? 'bg-accent-danger/10 text-accent-danger'
                      : 'bg-accent-success/10 text-accent-success'
                  }`}>
                    <Check className="w-4 h-4" />
                    {exportStatus || importStatus || syncStatus}
                  </div>
                )}

                {/* Sync */}
                <div>
                  <h3 className="text-lg font-medium text-dark-100 mb-4">Sync (WebDAV/Nextcloud)</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-dark-200">Enable Sync</label>
                        <p className="text-xs text-dark-500">Sync your bookmarks across devices</p>
                      </div>
                      <button
                        onClick={() => {
                          const newValue = !syncEnabled;
                          setSyncEnabled(newValue);
                          window.api.settings.update({ syncEnabled: newValue });
                        }}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          syncEnabled ? 'bg-accent-primary' : 'bg-dark-700'
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            syncEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {syncEnabled && (
                      <>
                        <div>
                          <label className="input-label text-xs">WebDAV URL</label>
                          <input
                            type="text"
                            value={syncUrl}
                            onChange={(e) => setSyncUrl(e.target.value)}
                            placeholder="https://nextcloud.example.com/remote.php/dav/files/username"
                            className="input-base text-sm"
                          />
                          <p className="text-xs text-dark-500 mt-1">
                            Your Nextcloud or WebDAV server URL
                          </p>
                        </div>

                        <div>
                          <label className="input-label text-xs">Username</label>
                          <input
                            type="text"
                            value={syncUsername}
                            onChange={(e) => setSyncUsername(e.target.value)}
                            placeholder="your-username"
                            className="input-base text-sm"
                          />
                        </div>

                        <div>
                          <label className="input-label text-xs">Password</label>
                          <div className="relative">
                            <input
                              type={showSyncPassword ? 'text' : 'password'}
                              value={showSyncPassword && hasSavedPassword && !syncPassword ? displayPassword : syncPassword}
                              onChange={(e) => {
                                setSyncPassword(e.target.value);
                                setHasSavedPassword(false); // Clear indicator when user types
                                setDisplayPassword(''); // Clear display password
                              }}
                              placeholder={hasSavedPassword && !syncPassword && !showSyncPassword ? '•••••••• (saved)' : 'Enter password'}
                              className="input-base text-sm pr-10"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (hasSavedPassword && !syncPassword && !showSyncPassword) {
                                  // User wants to see saved password - decrypt it
                                  if (settings?.syncPassword) {
                                    try {
                                      const decryptRes = await window.api.encryption.decrypt(settings.syncPassword);
                                      if (decryptRes.success && decryptRes.data) {
                                        setDisplayPassword(decryptRes.data);
                                      }
                                    } catch (error) {
                                      console.error('Failed to decrypt password:', error);
                                    }
                                  }
                                }
                                setShowSyncPassword(!showSyncPassword);
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                            >
                              {showSyncPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-dark-500 mt-1">
                            {hasSavedPassword && !syncPassword 
                              ? 'Password is saved. Leave empty to keep existing password, or enter a new one to change it.'
                              : 'Password is encrypted with your master password'}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (!syncUrl || !syncUsername || (!syncPassword && !hasSavedPassword)) {
                                setSyncStatus('Please fill in all fields');
                                return;
                              }
                              
                              setIsTestingConnection(true);
                              setSyncStatus(null);
                              
                              try {
                                // Use existing password if new one not provided
                                let passwordToTest = syncPassword;
                                let passwordToSave = settings?.syncPassword; // Keep existing if not changed
                                
                                if (syncPassword) {
                                  // Encrypt new password before testing
                                  const encryptRes = await window.api.encryption.encrypt(syncPassword);
                                  if (!encryptRes.success) {
                                    setSyncStatus('Error: Failed to encrypt password. Please unlock vault.');
                                    return;
                                  }
                                  passwordToSave = encryptRes.data;
                                } else if (!hasSavedPassword) {
                                  setSyncStatus('Please enter a password');
                                  return;
                                }
                                
                                // For testing, we need the plain password - decrypt if using saved
                                if (!passwordToTest && hasSavedPassword && settings?.syncPassword) {
                                  const decryptRes = await window.api.encryption.decrypt(settings.syncPassword);
                                  if (decryptRes.success) {
                                    passwordToTest = decryptRes.data;
                                  } else {
                                    setSyncStatus('Error: Could not decrypt saved password. Please enter password again.');
                                    return;
                                  }
                                }
                                
                                const testRes = await window.api.sync.testConnection(syncUrl, syncUsername, passwordToTest);
                                if (testRes.success) {
                                  // Save settings (only update password if it was changed)
                                  const updateData: any = {
                                    syncEnabled: true,
                                    syncUrl,
                                    syncUsername,
                                  };
                                  if (syncPassword) {
                                    updateData.syncPassword = passwordToSave;
                                  }
                                  await window.api.settings.update(updateData);
                                  setHasSavedPassword(true);
                                  setSyncPassword(''); // Clear field after saving
                                  setSyncStatus('Connection successful! Settings saved.');
                                } else {
                                  setSyncStatus(`Error: ${testRes.error || 'Connection failed'}`);
                                }
                              } catch (error) {
                                setSyncStatus(`Error: ${String(error)}`);
                              } finally {
                                setIsTestingConnection(false);
                              }
                            }}
                            disabled={isTestingConnection || !syncUrl || !syncUsername || (!syncPassword && !hasSavedPassword)}
                            className="btn-secondary flex-1 flex items-center justify-center gap-2"
                          >
                            {isTestingConnection ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4" />
                                Test & Save
                              </>
                            )}
                          </button>
                          
                          <button
                            onClick={async () => {
                              setIsSyncing(true);
                              setSyncStatus(null);
                              
                              try {
                                const res = await window.api.sync.upload();
                                if (res.success) {
                                  setSyncStatus('Sync successful!');
                                  // Reload settings to get updated lastSync time
                                  const settingsRes = await window.api.settings.get();
                                  if (settingsRes.success && settingsRes.data) {
                                    // Trigger a re-render by updating local state
                                    setSyncEnabled(settingsRes.data.syncEnabled || false);
                                    setSyncUrl(settingsRes.data.syncUrl || '');
                                    setSyncUsername(settingsRes.data.syncUsername || '');
                                    setHasSavedPassword(!!settingsRes.data.syncPassword);
                                  }
                                } else {
                                  setSyncStatus(`Error: ${res.error || 'Sync failed'}`);
                                }
                              } catch (error) {
                                setSyncStatus(`Error: ${String(error)}`);
                              } finally {
                                setIsSyncing(false);
                              }
                            }}
                            disabled={isSyncing || !syncEnabled || !settings?.syncUrl || !settings?.syncUsername}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                          >
                            {isSyncing ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <Cloud className="w-4 h-4" />
                                Sync Now
                              </>
                            )}
                          </button>
                        </div>

                        {settings?.lastSync && (
                          <p className="text-xs text-dark-500">
                            Last synced: {new Date(settings.lastSync).toLocaleString()}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-dark-700" />
                  </div>
                </div>

                {/* Backup & Restore */}
                <div>
                  <h3 className="text-lg font-medium text-dark-100 mb-4">Backup & Restore</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleExport} className="btn-secondary">
                      <Download className="w-4 h-4" />
                      Export Data
                    </button>
                    <button onClick={handleImport} className="btn-secondary">
                      <Upload className="w-4 h-4" />
                      Import Data
                    </button>
                  </div>
                  <p className="text-xs text-dark-500 mt-2">
                    Export or import all groups and bookmarks as JSON
                  </p>
                </div>

                {/* Browser Import */}
                <div>
                  <h3 className="text-lg font-medium text-dark-100 mb-4">Import Browser Bookmarks</h3>
                  <button 
                    onClick={() => setIsBrowserImportOpen(true)}
                    className="btn-primary w-full mb-3"
                  >
                    <Globe className="w-4 h-4" />
                    Import from Browser
                  </button>
                  <p className="text-xs text-dark-500">
                    Import directly from Chrome, Firefox, Safari, Brave, Arc, and more
                  </p>

                  <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-dark-700" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-dark-900 text-dark-500">or import from file</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <select
                      value={selectedImportGroup}
                      onChange={(e) => setSelectedImportGroup(e.target.value)}
                      className="input-base text-sm"
                    >
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.icon} {group.name}
                        </option>
                      ))}
                    </select>
                    <button 
                      onClick={handleImportBrowserBookmarks}
                      className="btn-secondary w-full"
                    >
                      <FileUp className="w-4 h-4" />
                      Import from HTML file
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-2xl flex items-center justify-center text-4xl">
                    🚀
                  </div>
                  <h3 className="text-2xl font-bold gradient-text mb-2">Launchpad</h3>
                  <p className="text-dark-400 mb-1">Version 1.0.0</p>
                  <p className="text-sm text-dark-500">
                    A powerful bookmark and app launcher
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-dark-800">
                    <span className="text-dark-400">Electron</span>
                    <span className="text-dark-200">28.0.0</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-dark-800">
                    <span className="text-dark-400">React</span>
                    <span className="text-dark-200">18.2.0</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-dark-800">
                    <span className="text-dark-400">Platform</span>
                    <span className="text-dark-200">macOS</span>
                  </div>
                </div>

                <div className="pt-4 text-center">
                  <p className="text-xs text-dark-500">
                    Built with ❤️ for productivity
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-800 flex justify-end">
          <button onClick={closeSettings} className="btn-primary">
            Done
          </button>
        </div>
      </div>

      {/* Browser Import Modal */}
      <ImportBrowserModal
        isOpen={isBrowserImportOpen}
        onClose={() => setIsBrowserImportOpen(false)}
      />
    </div>
  );
}
