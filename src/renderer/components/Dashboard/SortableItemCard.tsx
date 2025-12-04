import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import { ItemCard } from './ItemCard';
import { useStore } from '../../store/useStore';
import type { AnyItem } from '@shared/types';

interface SortableItemCardProps {
  item: AnyItem;
  compact?: boolean;
}

export function SortableItemCard({ item, compact = false }: SortableItemCardProps) {
  const { isSelectionMode } = useStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: item.id,
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
          className="absolute left-0 top-0 bottom-0 w-6 flex items-center justify-center 
                     opacity-0 group-hover/sortable:opacity-100 cursor-grab active:cursor-grabbing
                     text-dark-500 hover:text-dark-300 transition-opacity z-20
                     -ml-6"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <ItemCard item={item} compact={compact} />
    </div>
  );
}

