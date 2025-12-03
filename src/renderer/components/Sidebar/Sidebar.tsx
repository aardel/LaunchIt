import {
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  Play,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useStore } from '../../store/useStore';
import { SortableGroupItem } from './SortableGroupItem';
import type { Group } from '@shared/types';

export function Sidebar() {
  const {
    groups,
    items,
    selectedGroupId,
    setSelectedGroup,
    toggleGroupExpanded,
    openGroupModal,
    deleteGroup,
    launchGroup,
    reorderGroups,
    isSelectionMode,
  } = useStore();

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    group: Group;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sort groups by sortOrder
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => a.sortOrder - b.sortOrder),
    [groups]
  );

  const groupIds = useMemo(() => sortedGroups.map((group) => group.id), [sortedGroups]);

  const handleContextMenu = (e: React.MouseEvent, group: Group) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, group });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedGroups.findIndex((group) => group.id === active.id);
      const newIndex = sortedGroups.findIndex((group) => group.id === over.id);

      const newOrder = arrayMove(sortedGroups, oldIndex, newIndex);

      // Create reorder payload
      const reorderPayload = newOrder.map((group, index) => ({
        id: group.id,
        sortOrder: index,
      }));

      reorderGroups(reorderPayload);
    }
  };

  const getItemCount = (groupId: string) => {
    return items.filter((item) => item.groupId === groupId).length;
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-dark-900/50 border-r border-dark-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dark-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-dark-300 uppercase tracking-wider">
            Groups
          </h2>
          <button
            onClick={() => openGroupModal()}
            className="p-1.5 rounded-lg text-dark-400 hover:text-dark-200 hover:bg-dark-800 
                     transition-all duration-200"
            title="Add Group"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Groups List */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* All Items */}
        <button
          onClick={() => setSelectedGroup(null)}
          className={`w-full sidebar-item mb-1 ${
            selectedGroupId === null ? 'active' : ''
          }`}
        >
          <FolderOpen className="w-5 h-5" />
          <span className="flex-1 text-left">All Items</span>
          <span className="text-xs text-dark-500 tabular-nums">{items.length}</span>
        </button>

        {/* Divider */}
        <div className="h-px bg-dark-800 my-2" />

        {/* Group Items with Drag and Drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          // Disable DndContext if in selection mode
          autoScroll={!isSelectionMode}
        >
          <SortableContext items={groupIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {sortedGroups.map((group) => {
                const itemCount = getItemCount(group.id);
                const isSelected = selectedGroupId === group.id;
                const groupItems = items.filter((item) => item.groupId === group.id);

                return (
                  <SortableGroupItem
                    key={group.id}
                    group={group}
                    items={groupItems}
                    itemCount={itemCount}
                    isSelected={isSelected}
                    onSelect={() => setSelectedGroup(group.id)}
                    onToggleExpand={() => toggleGroupExpanded(group.id)}
                    onLaunch={() => launchGroup(group.id)}
                    onContextMenu={(e) => handleContextMenu(e, group)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>

        {groups.length === 0 && (
          <div className="text-center py-8 text-dark-500 text-sm">
            <p>No groups yet</p>
            <button
              onClick={() => openGroupModal()}
              className="mt-2 text-accent-primary hover:underline"
            >
              Create your first group
            </button>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-dark-800">
        <button
          onClick={() => openGroupModal()}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg
                   bg-dark-800 text-dark-300 hover:text-dark-100 hover:bg-dark-700
                   transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">New Group</span>
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          <div
            className="fixed z-50 w-48 py-1 bg-dark-800 border border-dark-700 rounded-lg shadow-xl animate-scale-in"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={() => {
                launchGroup(contextMenu.group.id);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-dark-300 
                       hover:bg-dark-700 hover:text-dark-100 transition-colors"
            >
              <Play className="w-4 h-4 text-accent-success" />
              Open All Items
            </button>
            <button
              onClick={() => {
                openGroupModal(contextMenu.group);
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-dark-300 
                       hover:bg-dark-700 hover:text-dark-100 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit Group
            </button>
            <div className="h-px bg-dark-700 my-1" />
            <button
              onClick={() => {
                if (confirm(`Delete "${contextMenu.group.name}" and all its items?`)) {
                  deleteGroup(contextMenu.group.id);
                }
                setContextMenu(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-accent-danger 
                       hover:bg-accent-danger/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Group
            </button>
          </div>
        </>
      )}
    </aside>
  );
}

