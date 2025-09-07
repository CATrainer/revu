"use client";
import React from 'react';

export interface WidgetConfig { id: string; type: string; }
interface DashboardState {
  widgets: WidgetConfig[];
  addWidget: (type: string)=> void;
  removeWidget: (id: string)=> void;
  moveWidget: (id: string, toIndex: number)=> void;
  lastUpdated: Date | null;
  setUpdated: ()=> void;
  search: string;
  setSearch: (s: string)=> void;
}

const DashboardContext = React.createContext<DashboardState | null>(null);

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'pulse', type: 'pulse' },
  { id: 'sentiment', type: 'sentiment' },
  { id: 'narratives', type: 'narratives' },
  { id: 'mentions', type: 'mentions' },
  { id: 'platforms', type: 'platform_breakdown' },
  { id: 'trending', type: 'trending' },
];

export const DashboardProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [widgets,setWidgets] = React.useState<WidgetConfig[]>(()=>{
    if (typeof window !== 'undefined') {
      try { const saved = localStorage.getItem('monitoring.widgets'); if(saved) return JSON.parse(saved); } catch {}
    }
    return DEFAULT_WIDGETS;
  });
  const [lastUpdated,setLastUpdated] = React.useState<Date|null>(null);
  const [search,setSearch] = React.useState('');

  const persist = (next: WidgetConfig[]) => {
    setWidgets(next);
    if (typeof window !== 'undefined') localStorage.setItem('monitoring.widgets', JSON.stringify(next));
  };

  const addWidget = (type: string) => {
    const id = type + '_' + Math.random().toString(36).slice(2,7);
    persist([...widgets, { id, type }]);
  };
  const removeWidget = (id: string) => persist(widgets.filter(w=> w.id!==id));
  const moveWidget = (id: string, toIndex: number) => {
    const idx = widgets.findIndex(w=> w.id===id); if(idx===-1) return;
    const clone = [...widgets]; const [sp] = clone.splice(idx,1); clone.splice(toIndex,0,sp); persist(clone);
  };
  const setUpdated = ()=> setLastUpdated(new Date());

  return (
    <DashboardContext.Provider value={{widgets, addWidget, removeWidget, moveWidget, lastUpdated, setUpdated, search, setSearch}}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const ctx = React.useContext(DashboardContext); if(!ctx) throw new Error('DashboardContext'); return ctx;
};
