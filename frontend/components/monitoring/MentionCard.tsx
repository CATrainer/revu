"use client";
import React from 'react';
import { MessageCircle, Flag, Archive } from 'lucide-react';
import clsx from 'clsx';

interface MentionCardProps {
  platform: string;
  username?: string;
  createdAt: string | Date;
  content: string;
  likes?: number;
  comments?: number;
  shares?: number;
  sentiment?: number; // -1..1
  onReply?: () => void;
  onArchive?: () => void;
  onFlag?: () => void;
}

function timeAgo(ts: string | Date): string {
  const date = typeof ts === 'string' ? new Date(ts) : ts;
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec/60); if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min/60); if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr/24); return `${d}d ago`;
}

export const MentionCard: React.FC<MentionCardProps> = ({ platform, username='user', createdAt, content, likes=0, comments=0, shares=0, sentiment=0, onReply, onArchive, onFlag }) => {
  const [expanded,setExpanded] = React.useState(false);
  const truncated = content.length > 160 && !expanded;
  const sentimentColor = sentiment > 0.25 ? 'bg-emerald-400' : sentiment < -0.25 ? 'bg-red-400' : 'bg-yellow-400';

  return (
    <div className="relative p-3 rounded-lg bg-card/80 backdrop-blur border border-border/60 text-xs flex flex-col gap-2 hover:scale-[1.01] transition-all">
      <div className="flex items-center gap-2">
        <span className="px-1.5 py-0.5 rounded bg-white/10 uppercase text-[9px] tracking-wider">{platform}</span>
        <span className="text-white/70">@{username}</span>
        <span className="text-white/30">· {timeAgo(createdAt)}</span>
        <span className={clsx('w-2 h-2 rounded-full ml-auto', sentimentColor)} />
      </div>
      <div className="leading-snug text-white/80">
        {truncated ? content.slice(0,160) + '…' : content}
        {content.length>160 && (
          <button onClick={()=> setExpanded(e=>!e)} className="ml-2 text-emerald-300 hover:underline">
            {expanded? 'show less' : 'show more'}
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 text-[10px] text-white/40">
        <span>👍 {likes}</span>
        <span>💬 {comments}</span>
        <span>↗ {shares}</span>
        <div className="ml-auto flex items-center gap-2">
          {onReply && <button onClick={onReply} className="hover:text-white/70 flex items-center gap-1"><MessageCircle className="w-3 h-3" /> Reply</button>}
          {onArchive && <button onClick={onArchive} className="hover:text-white/70 flex items-center gap-1"><Archive className="w-3 h-3" /> Archive</button>}
          {onFlag && <button onClick={onFlag} className="hover:text-white/70 flex items-center gap-1"><Flag className="w-3 h-3" /> Flag</button>}
        </div>
      </div>
    </div>
  );
};
