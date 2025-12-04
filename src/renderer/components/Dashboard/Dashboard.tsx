import { useMemo, useState, useEffect } from 'react';
import { Plus, Play, LayoutGrid, Grid3x3, List, Sparkles, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { SortableGroupSection } from './SortableGroupSection';
import { BatchOperationsBar } from './BatchOperationsBar';
import type { Group, AnyItem } from '@shared/types';

export function Dashboard() {
  const {
    items,
    groups,
    selectedGroupId,
    searchQuery,
    openAddModal,
    launchGroup,
    settings,
  } = useStore();

  const cardViewMode = settings?.cardViewMode || 'normal';
  
  // Semantic search state
  const [semanticResults, setSemanticResults] = useState<Set<string>>(new Set());
  const [isSemanticSearching, setIsSemanticSearching] = useState(false);
  const [useSemanticSearch, setUseSemanticSearch] = useState(false);

  const toggleViewMode = async () => {
    // Cycle through: normal -> compact -> list -> normal
    const modes: ('normal' | 'compact' | 'list')[] = ['normal', 'compact', 'list'];
    const currentIndex = modes.indexOf(cardViewMode as any);
    const newMode = modes[(currentIndex + 1) % modes.length];
    await window.api.settings.update({ cardViewMode: newMode });
    const res = await window.api.settings.get();
    if (res.success && res.data) {
      useStore.setState({ settings: res.data });
    }
  };

  const getViewModeIcon = () => {
    switch (cardViewMode) {
      case 'compact':
        return <Grid3x3 className="w-4 h-4" />;
      case 'list':
        return <List className="w-4 h-4" />;
      default:
        return <LayoutGrid className="w-4 h-4" />;
    }
  };

  const getViewModeTitle = () => {
    switch (cardViewMode) {
      case 'compact':
        return 'Switch to list view';
      case 'list':
        return 'Switch to normal view';
      default:
        return 'Switch to compact view';
    }
  };

  // Semantic search effect (debounced)
  useEffect(() => {
    if (!searchQuery || !settings?.aiEnabled || searchQuery.length < 3) {
      setSemanticResults(new Set());
      setUseSemanticSearch(false);
      setIsSemanticSearching(false);
      return;
    }

    // Debounce semantic search
    const timeoutId = setTimeout(async () => {
      setIsSemanticSearching(true);
      try {
        const itemsForSearch = items.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          url: item.type === 'bookmark' 
            ? `${(item as any).protocol}://${(item as any).networkAddresses?.local || ''}${(item as any).port ? `:${(item as any).port}` : ''}${(item as any).path || ''}`
            : undefined,
        }));

        const res = await window.api.ai.semanticSearch(searchQuery, itemsForSearch);
        if (res.success && res.data) {
          const resultIds = new Set(res.data.map(r => r.id));
          setSemanticResults(resultIds);
          setUseSemanticSearch(true);
        } else {
          setUseSemanticSearch(false);
        }
      } catch (error) {
        console.error('Semantic search failed:', error);
        setUseSemanticSearch(false);
      } finally {
        setIsSemanticSearching(false);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, items, settings?.aiEnabled]);

  // Filter and group items
  const { displayGroups, filteredItems } = useMemo(() => {
    let filtered = items;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      
      // Use semantic search results if available
      if (useSemanticSearch && semanticResults.size > 0) {
        filtered = items.filter(item => semanticResults.has(item.id));
      } else {
        // Fall back to regular text search
        filtered = items.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            item.description?.toLowerCase().includes(query) ||
            item.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }
    }

    // Filter by selected group
    if (selectedGroupId) {
      filtered = filtered.filter((item) => item.groupId === selectedGroupId);
    }

    // Group items by their group
    const groupedItems: Record<string, typeof items> = {};
    for (const item of filtered) {
      if (!groupedItems[item.groupId]) {
        groupedItems[item.groupId] = [];
      }
      groupedItems[item.groupId].push(item);
    }

    // Get groups that have items
    const displayGroups = groups.filter((group) => groupedItems[group.id]?.length > 0);

    return { displayGroups, filteredItems: groupedItems };
  }, [items, groups, selectedGroupId, searchQuery, semanticResults, useSemanticSearch]);

  const selectedGroup = selectedGroupId
    ? groups.find((g) => g.id === selectedGroupId)
    : null;

  return (
    <main className="flex-1 overflow-y-auto">
      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-dark-100">
              {selectedGroup ? selectedGroup.name : 'All Items'}
            </h1>
            <p className="text-dark-400 mt-1 flex items-center gap-2">
              {searchQuery ? (
                <>
                  <span>Search results for "{searchQuery}"</span>
                  {settings?.aiEnabled && searchQuery.length >= 3 && (
                    <span className="flex items-center gap-1 text-xs text-accent-primary">
                      {isSemanticSearching ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          AI searching...
                        </>
                      ) : useSemanticSearch ? (
                        <>
                          <Sparkles className="w-3 h-3" />
                          AI search
                        </>
                      ) : null}
                    </span>
                  )}
                </>
              ) : selectedGroup ? (
                `${filteredItems[selectedGroup.id]?.length || 0} items`
              ) : (
                `${items.length} items across ${groups.length} groups`
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleViewMode}
              className="btn-secondary"
              title={getViewModeTitle()}
            >
              {getViewModeIcon()}
            </button>
            {selectedGroupId && (
              <button
                onClick={() => launchGroup(selectedGroupId)}
                className="btn-secondary"
              >
                <Play className="w-4 h-4" />
                Open All
              </button>
            )}
            <button onClick={openAddModal} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Item
            </button>
          </div>
        </div>

        {/* Content */}
        {displayGroups.length === 0 ? (
          <EmptyState
            hasGroups={groups.length > 0}
            onAddItem={openAddModal}
          />
        ) : (
          <div className="space-y-10">
            {displayGroups.map((group) => (
              <SortableGroupSection
                key={group.id}
                group={group}
                items={filteredItems[group.id] || []}
                onLaunchAll={() => launchGroup(group.id)}
                cardViewMode={cardViewMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Batch Operations Bar */}
      <BatchOperationsBar />
    </main>
  );
}

function EmptyState({
  hasGroups,
  onAddItem,
}: {
  hasGroups: boolean;
  onAddItem: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-24 h-24 mb-6 rounded-full bg-dark-800/50 flex items-center justify-center">
        <span className="text-4xl">🚀</span>
      </div>
      <h2 className="text-xl font-semibold text-dark-200 mb-2">
        {hasGroups ? 'No items yet' : 'Welcome to Launchpad'}
      </h2>
      <p className="text-dark-400 text-center max-w-md mb-6">
        {hasGroups
          ? 'Add bookmarks, SSH connections, and app shortcuts to get started.'
          : 'Your personal dashboard for bookmarks, servers, and applications. Create a group to get started.'}
      </p>
      <button onClick={onAddItem} className="btn-primary">
        <Plus className="w-4 h-4" />
        Add Your First Item
      </button>
    </div>
  );
}

