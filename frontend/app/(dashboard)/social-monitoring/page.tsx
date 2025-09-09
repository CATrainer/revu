"use client";
import React from 'react';
import { DashboardProvider, useDashboard } from '@/components/monitoring/DashboardContext';
import { WIDGET_TYPES, renderWidget } from '@/components/monitoring/WidgetRegistry';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Bell, Search, RefreshCcw } from 'lucide-react';
import { useMonitoringSocket } from '@/hooks/useMonitoringSocket';
import { LiveIndicator } from '@/components/monitoring/LiveIndicator';
import { NotificationCenter, useMentionNotifications } from '@/components/monitoring/NotificationCenter';

interface SortableItemProps { id: string; children: React.ReactNode; }
const SortableItem: React.FC<SortableItemProps> = React.memo(({id, children}) => {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id});
  const style: React.CSSProperties = React.useMemo(()=> ({ transform: CSS.Transform.toString(transform), transition, opacity: isDragging?0.5:1 }), [transform, transition, isDragging]);
  return <div ref={setNodeRef} style={style} {...attributes} {...listeners}>{children}</div>;
});
SortableItem.displayName = 'SortableItem';

const DashboardInner: React.FC = () => {
  const { widgets, removeWidget, addWidget, moveWidget, lastUpdated, setUpdated, search, setSearch } = useDashboard();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const [refreshing,setRefreshing] = React.useState(false);
  const { showMention } = useMentionNotifications();
  const socket = useMonitoringSocket({ onMention: (m)=> { showMention(m); } });

  const onDragEnd = (event: any) => { // eslint-disable-line
    const {active, over} = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgets.findIndex(w=> w.id===active.id);
    const newIndex = widgets.findIndex(w=> w.id===over.id);
    if(oldIndex===-1 || newIndex===-1) return;
    const ordered = arrayMove(widgets, oldIndex, newIndex);
    ordered.forEach((w: {id:string}, i: number)=> moveWidget(w.id, i));
  };

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/v1/monitoring/refresh', { method: 'POST' });
      setTimeout(()=> setUpdated(), 500);
    } finally { setRefreshing(false); }
  };

  // Stable quick stats (remove random every render -> heavy layout/paint). Placeholder zeros until real API attaches.
  const quickStats = React.useMemo(()=> [
    { label: 'Mentions', value: '—' },
    { label: 'Threads', value: '—' },
    { label: 'Sentiment', value: '—' },
    { label: 'Reach', value: '—' }
  ], []);

  return (
    <div className="flex-1 w-full mx-auto max-w-[1500px] px-2 md:px-4 py-4 md:py-6 space-y-6">
      {/* Header / nav */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-lg md:text-xl font-semibold tracking-wide text-primary-dark">Social Monitoring</h1>
            <LiveIndicator status={socket.status} />
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <NotificationCenter />
            <div className="relative">
              <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Search mentions..." className="bg-[var(--card)]/70 dark:bg-white/5 border border-[var(--border)] rounded pl-8 pr-3 py-1.5 text-xs md:text-sm focus:outline-none focus:border-[var(--ring)] placeholder:text-[var(--muted-foreground)]" />
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            </div>
            <button className="p-2 rounded bg-[var(--muted)] dark:bg-white/5 border border-[var(--border)] hover:bg-[var(--secondary)]/60 dark:hover:bg-white/10 relative" aria-label="Notifications">
              <Bell className="w-4 h-4 text-[var(--foreground)]" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--brand-primary)] text-[10px] text-white flex items-center justify-center">3</span>
            </button>
            <button onClick={doRefresh} disabled={refreshing} className="p-2 rounded bg-[var(--brand-primary)]/15 border border-[var(--brand-primary)]/30 hover:bg-[var(--brand-primary)]/25 flex items-center gap-1 text-xs md:text-sm text-[var(--foreground)]">
              <RefreshCcw className={"w-4 h-4 text-[var(--brand-primary)]" + (refreshing?' animate-spin':'')} />
              <span>Refresh</span>
            </button>
            <div className="text-[10px] md:text-xs text-[var(--muted-foreground)] min-w-[100px] text-right">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : '—'}</div>
          </div>
        </div>
        {/* Quick stats placeholder */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {quickStats.map((s,i)=>(
            <div key={i} className="p-3 rounded-lg md:rounded-xl card-background-light flex flex-col">
              <span className="text-[9px] md:text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">{s.label}</span>
              <span className="text-base md:text-lg font-semibold mt-1 text-[var(--foreground)]">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add widget bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="text-[10px] md:text-xs text-[var(--muted-foreground)]">Add widget:</div>
        {WIDGET_TYPES.map(w=> (
          <button key={w.type} onClick={()=> addWidget(w.type)} className="px-2 py-1 rounded bg-[var(--muted)] dark:bg-white/5 border border-[var(--border)] text-[10px] md:text-[11px] hover:bg-[var(--secondary)]/70 dark:hover:bg-white/10 text-[var(--foreground)]">
            <Plus className="w-3 h-3 inline mr-1 text-[var(--brand-primary)]" />{w.label}
          </button>
        ))}
      </div>

      {/* Widgets grid */}
  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={widgets.map(w=> w.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 auto-rows-[220px]">
            {widgets.map(w=> (
              <SortableItem key={w.id} id={w.id}>
                {renderWidget({id: w.id, type: w.type, onRemove: removeWidget})}
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default function SocialMonitoringPage() {
  return (
    <DashboardProvider>
      <DashboardInner />
    </DashboardProvider>
  );
}
