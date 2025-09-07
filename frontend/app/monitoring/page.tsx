"use client";
import React from 'react';
import { DashboardProvider, useDashboard } from '../../components/monitoring/DashboardContext';
import { WIDGET_TYPES, renderWidget } from '../../components/monitoring/WidgetRegistry';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Bell, Search, RefreshCcw } from 'lucide-react';
import { useMonitoringSocket } from '../../hooks/useMonitoringSocket';
import { LiveIndicator } from '../../components/monitoring/LiveIndicator';
import { NotificationCenter, useMentionNotifications } from '../../components/monitoring/NotificationCenter';

interface SortableItemProps { id: string; children: React.ReactNode; }
const SortableItem: React.FC<SortableItemProps> = ({id, children}) => {
  const {attributes, listeners, setNodeRef, transform, transition, isDragging} = useSortable({id});
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging?0.5:1 };
  return <div ref={setNodeRef} style={style} {...attributes} {...listeners}>{children}</div>;
};

const DashboardInner: React.FC = () => {
  const { widgets, removeWidget, addWidget, moveWidget, lastUpdated, setUpdated, search, setSearch } = useDashboard();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const [refreshing,setRefreshing] = React.useState(false);
  const { showMention } = useMentionNotifications();
  const socket = useMonitoringSocket({ onMention: (m)=> { showMention(m); /* optimistic update handled in hook */ } });

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

  return (
    <div className="flex-1 w-full mx-auto max-w-[1500px] px-6 py-6 space-y-6">
      {/* Header / nav */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-wide">Monitoring Dashboard</h1>
          <div className="flex items-center gap-3">
            <LiveIndicator status={socket.status} />
            <NotificationCenter />
            <div className="relative">
              <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Search mentions..." className="bg-white/5 border border-white/10 rounded pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:border-emerald-400/40 placeholder:text-white/30" />
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-white/40" />
            </div>
            <button className="p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 relative" aria-label="Notifications">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-[10px] flex items-center justify-center">3</span>
            </button>
            <button onClick={doRefresh} disabled={refreshing} className="p-2 rounded bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 flex items-center gap-1 text-sm">
              <RefreshCcw className={"w-4 h-4" + (refreshing?' animate-spin':'')} />
              <span>Refresh</span>
            </button>
            <div className="text-xs text-white/40 min-w-[120px] text-right">{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : '—'}</div>
          </div>
        </div>
        {/* Quick stats placeholder */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Mentions','Threads','Sentiment','Reach'].map((l,i)=>(
            <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-white/40">{l}</span>
              <span className="text-lg font-semibold mt-1">{Math.round(Math.random()*1000)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add widget bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="text-xs text-white/50">Add widget:</div>
        {WIDGET_TYPES.map(w=> (
          <button key={w.type} onClick={()=> addWidget(w.type)} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[11px] hover:bg-white/10">
            <Plus className="w-3 h-3 inline mr-1" />{w.label}
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

export default function MonitoringPage() {
  return (
    <DashboardProvider>
      <DashboardInner />
    </DashboardProvider>
  );
}
