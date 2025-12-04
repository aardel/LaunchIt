import { useSortable } from '@dnd-kit/sortable';
import { GripVertical, ChevronRight, Play, MoreHorizontal, Globe, Terminal, AppWindow, Key } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Group, AnyItem } from '@shared/types';

interface SortableGroupItemProps {
  group: Group;
  items: AnyItem[];
  itemCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onLaunch: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

const typeIcons = {
  bookmark: Globe,
  ssh: Terminal,
  app: AppWindow,
  password: Key,
};

export function SortableGroupItem({
  group,
  items,
  itemCount,
  isSelected,
  onSelect,
  onToggleExpand,
  onLaunch,
  onContextMenu,
}: SortableGroupItemProps) {
  const { isSelectionMode, launchItem } = useStore();
  
  // Sort items by sortOrder
  const sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.id,
    disabled: isSelectionMode, // Disable drag when in selection mode
  });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/sortable">
      {/* Drag Handle - Only show when not in selection mode */}
      {!isSelectionMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center 
                     opacity-0 group-hover/sortable:opacity-100 cursor-grab active:cursor-grabbing
                     text-dark-500 hover:text-dark-300 transition-opacity z-20
                     -ml-4"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      )}
      <div
        onClick={onSelect}
        onContextMenu={onContextMenu}
        className={`group/item sidebar-item cursor-pointer ${isSelected ? 'active' : ''}`}
      >
        {/* Expand/Collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="p-0.5 -ml-1 rounded hover:bg-dark-700"
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform duration-200 ${
              group.isExpanded ? 'rotate-90' : ''
            }`}
          />
        </button>

        {/* Icon */}
        <span className="text-lg" role="img">
          {group.icon || '📁'}
        </span>

        {/* Name */}
        <span className="flex-1 truncate">{group.name}</span>

        {/* Count */}
        <span className="text-xs text-dark-500 tabular-nums">{itemCount}</span>

        {/* Actions (visible on hover) */}
        <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLaunch();
            }}
            className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-accent-success"
            title="Open All"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContextMenu(e);
            }}
            className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-dark-200"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      
      {/* Nested Items - Show when expanded */}
      {group.isExpanded && sortedItems.length > 0 && (
        <div className="ml-6 mt-0.5 space-y-0.5">
          {sortedItems.map((item) => {
            const TypeIcon = typeIcons[item.type];
            // Fallback to a default icon if type is not found
            if (!TypeIcon) {
              console.warn(`Unknown item type: ${item.type}`);
              return null;
            }
            return (
              <button
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  launchItem(item);
                }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm
                         text-dark-400 hover:text-dark-200 hover:bg-dark-800
                         transition-colors text-left group/item-sidebar"
                title={item.name}
              >
                <TypeIcon className="w-3.5 h-3.5 flex-shrink-0 text-dark-500" />
                <span className="flex-1 truncate">{item.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

