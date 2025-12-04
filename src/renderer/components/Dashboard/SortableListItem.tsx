import { useSortable } from '@dnd-kit/sortable';
import { GripVertical } from 'lucide-react';
import { ListItem } from './ListItem';
import { useStore } from '../../store/useStore';
import type { AnyItem, Group } from '@shared/types';

interface SortableListItemProps {
  item: AnyItem;
  group: Group;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onCopyAddress?: () => void;
}

export function SortableListItem({
  item,
  group,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onCopyAddress,
}: SortableListItemProps) {
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
    disabled: isSelectionMode,
  });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group/sortable">
      {/* Drag Handle */}
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
      <ListItem
        item={item}
        group={group}
        isSelected={isSelected}
        onSelect={onSelect}
        onEdit={onEdit}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        onCopyAddress={onCopyAddress}
      />
    </div>
  );
}

