"use client";
import React from 'react';
import toast, { Toaster, Toast } from 'react-hot-toast';
import { BellOff, Bell } from 'lucide-react';

interface NotificationCenterProps { sentimentThreshold?: number; }

interface MentionLike { id?: string; text?: string; sentiment?: number; platform?: string; }

export function useMentionNotifications() {
  const [dnd,setDnd] = React.useState(false);
  const showMention = React.useCallback((m: MentionLike)=> {
    if (dnd) return;
    const sent = m.sentiment ?? 0;
    const positive = sent > 0.25; const negative = sent < -0.25;
    toast.custom((t: Toast)=>(
      <div className={`w-72 p-3 rounded-lg shadow bg-card/90 backdrop-blur border border-border/60 text-xs flex flex-col gap-2 animate-in fade-in slide-in-from-right ${t.visible? '':'animate-out fade-out'}`}>
        <div className="flex items-center justify-between">
          <span className="uppercase text-[9px] tracking-wider text-white/50">{m.platform || 'mention'}</span>
          <span className={positive? 'text-emerald-400' : negative? 'text-red-400' : 'text-yellow-400'}>{(sent*100).toFixed(0)}%</span>
        </div>
        <div className="text-white/80 line-clamp-4 text-[11px]">{m.text || 'New mention'}</div>
        <div className="flex gap-2 justify-end">
          <button onClick={()=> toast.dismiss(t.id)} className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20">Close</button>
        </div>
      </div>
    ), { duration: 6000 });
  },[dnd]);
  return { showMention, dnd, setDnd };
}

export const NotificationCenter: React.FC<NotificationCenterProps> = () => {
  const { dnd, setDnd } = useMentionNotifications();
  return (
    <div className="flex items-center gap-2">
      <Toaster position="top-right" />
      <button onClick={()=> setDnd(v=> !v)} className="p-2 rounded bg-white/5 border border-white/10 hover:bg-white/10" title={dnd? 'Disable Do Not Disturb':'Enable Do Not Disturb'}>
        {dnd ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
      </button>
    </div>
  );
};
