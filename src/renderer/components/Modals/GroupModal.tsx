import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { NetworkProfile } from '@shared/types';

const defaultColors = [
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#ef4444', // Red
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
];

const defaultIcons = ['📁', '🖥️', '🔒', '🚀', '🎬', '📊', '🎮', '💼', '🛠️', '📡', '🌐', '💾'];

export function GroupModal() {
  const { isGroupModalOpen, closeGroupModal, editingGroup, createGroup, updateGroup } = useStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState('#6366f1');
  const [defaultProfile, setDefaultProfile] = useState<NetworkProfile>('local');
  const [batchOpenDelay, setBatchOpenDelay] = useState('500');

  const isEditing = !!editingGroup;

  // Populate form when editing
  useEffect(() => {
    if (isGroupModalOpen) {
      if (editingGroup) {
        setName(editingGroup.name);
        setIcon(editingGroup.icon || '📁');
        setColor(editingGroup.color || '#6366f1');
        setDefaultProfile(editingGroup.defaultProfile || 'local');
        setBatchOpenDelay(editingGroup.batchOpenDelay?.toString() || '500');
      } else {
        setName('');
        setIcon('📁');
        setColor('#6366f1');
        setDefaultProfile('local');
        setBatchOpenDelay('500');
      }
    }
  }, [isGroupModalOpen, editingGroup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);

    try {
      if (isEditing) {
        await updateGroup({
          id: editingGroup.id,
          name: name.trim(),
          icon,
          color,
          defaultProfile,
          batchOpenDelay: parseInt(batchOpenDelay, 10) || 500,
        });
      } else {
        await createGroup({
          name: name.trim(),
          icon,
          color,
          defaultProfile,
          batchOpenDelay: parseInt(batchOpenDelay, 10) || 500,
        });
      }
      closeGroupModal();
    } catch (error) {
      console.error('Failed to save group:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isGroupModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-dark-950/80 backdrop-blur-sm"
        onClick={closeGroupModal}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-dark-900 border border-dark-700 rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-dark-800">
          <h2 className="text-xl font-semibold text-dark-100">
            {isEditing ? 'Edit Group' : 'New Group'}
          </h2>
          <button
            onClick={closeGroupModal}
            className="p-2 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Preview */}
            <div className="flex items-center justify-center py-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg"
                style={{ backgroundColor: `${color}20`, borderColor: color, borderWidth: 2 }}
              >
                {icon}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="input-label">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Servers"
                className="input-base"
                required
                autoFocus
              />
            </div>

            {/* Icon selection */}
            <div>
              <label className="input-label">Icon</label>
              <div className="flex flex-wrap gap-2 p-3 bg-dark-800/50 rounded-lg">
                {defaultIcons.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center
                              transition-all duration-150
                              ${icon === emoji 
                                ? 'bg-accent-primary/20 ring-2 ring-accent-primary' 
                                : 'bg-dark-700 hover:bg-dark-600'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Or type an emoji..."
                className="input-base mt-2 text-center"
              />
            </div>

            {/* Color selection */}
            <div>
              <label className="input-label">Color</label>
              <div className="flex flex-wrap gap-2 p-3 bg-dark-800/50 rounded-lg">
                {defaultColors.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all duration-150
                              ${color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-800' : ''}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="input-base flex-1"
                />
              </div>
            </div>

            {/* Default profile */}
            <div>
              <label className="input-label">Default Network Profile</label>
              <select
                value={defaultProfile}
                onChange={(e) => setDefaultProfile(e.target.value as NetworkProfile)}
                className="input-base"
              >
                <option value="local">Local (LAN)</option>
                <option value="tailscale">Tailscale</option>
                <option value="vpn">VPN</option>
              </select>
              <p className="text-xs text-dark-500 mt-1">
                Used when opening all items in this group
              </p>
            </div>

            {/* Batch open delay */}
            <div>
              <label className="input-label">Batch Open Delay (ms)</label>
              <input
                type="number"
                value={batchOpenDelay}
                onChange={(e) => setBatchOpenDelay(e.target.value)}
                placeholder="500"
                min="0"
                max="5000"
                step="100"
                className="input-base"
              />
              <p className="text-xs text-dark-500 mt-1">
                Delay between opening each item when using "Open All"
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-dark-800">
              <button
                type="button"
                onClick={closeGroupModal}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className="btn-primary"
              >
                {isSubmitting 
                  ? (isEditing ? 'Saving...' : 'Creating...') 
                  : (isEditing ? 'Save Changes' : 'Create Group')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

