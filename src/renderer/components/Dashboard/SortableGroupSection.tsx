import { useMemo } from 'react';
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
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { ExternalLink } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { SortableItemCard } from './SortableItemCard';
import type { Group, AnyItem } from '@shared/types';

interface SortableGroupSectionProps {
  group: Group;
  items: AnyItem[];
  onLaunchAll: () => void;
}

export function SortableGroupSection({ group, items, onLaunchAll }: SortableGroupSectionProps) {
  const { reorderItems, isSelectionMode } = useStore();

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

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.sortOrder - b.sortOrder),
    [items]
  );

  const itemIds = useMemo(() => sortedItems.map((item) => item.id), [sortedItems]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sortedItems.findIndex((item) => item.id === active.id);
      const newIndex = sortedItems.findIndex((item) => item.id === over.id);

      const newOrder = arrayMove(sortedItems, oldIndex, newIndex);
      
      // Create reorder payload
      const reorderPayload = newOrder.map((item, index) => ({
        id: item.id,
        sortOrder: index,
      }));

      reorderItems(reorderPayload);
    }
  };

  return (
    <section className="animate-fade-in">
      {/* Group Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{group.icon || '📁'}</span>
          <h2 className="text-lg font-semibold text-dark-200">{group.name}</h2>
          <span className="badge-primary">{items.length}</span>
        </div>

        <button
          onClick={onLaunchAll}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                   text-dark-400 hover:text-accent-success hover:bg-dark-800
                   transition-all duration-200"
        >
          <ExternalLink className="w-4 h-4" />
          Open All
        </button>
      </div>

      {/* Items Grid with DnD */}
      {isSelectionMode ? (
        // No drag and drop in selection mode
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pl-6">
          {sortedItems.map((item) => (
            <SortableItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={itemIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pl-6">
              {sortedItems.map((item) => (
                <SortableItemCard key={item.id} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}

