"use client";
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { pushToast } from '@/components/ui/toast';
import { api } from '@/lib/api';
import ResponseEditor from '@/components/automation/ResponseEditor';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ApprovalsAnalyticsWidget from '@/components/automation/ApprovalsAnalyticsWidget';

// Types
type ApprovalItem = {
  id: string;
  channel_id?: string | null;
  response_id?: string | null;
  payload: Record<string, unknown>;
  priority: number;
  status: string;
  created_at: string;
  updated_at?: string;
  auto_approve_after?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  reason?: string | null;
  urgency?: boolean;
};

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Math.max(0, Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s`;
  if (diff < 3600) return `${Math.floor(diff/60)}m`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h`;
  return `${Math.floor(diff/86400)}d`;
}

export default function ApprovalsPage() {
  const qc = useQueryClient();
  // Filters
  const [minPriority, setMinPriority] = useState<number | ''>('');
  const [rule, setRule] = useState<string>('');
  const [video, setVideo] = useState<string>('');

  // Editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorItem, setEditorItem] = useState<{
    id: string;
    originalComment: string;
    currentResponse: string;
  } | null>(null);

  // Keyboard navigation & help
  const [currentIndex, setCurrentIndex] = useState(0);
  const [helpOpen, setHelpOpen] = useState(false);
  const [cols, setCols] = useState(1);

  // Fetch approvals (pending)
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['approvals', minPriority, rule, video],
    queryFn: async () => {
  const params: Record<string, unknown> = { status: 'pending', limit: 50, offset: 0 };
      if (minPriority !== '' ) params.min_priority = Number(minPriority);
      // rule/video filters are best-effort client-side based on payload content
      const { data } = await api.get<{ items: ApprovalItem[]; total: number }>(
        '/automation/approvals', { params }
      );
      return data;
    },
    refetchInterval: 30_000,
  });

  const items = useMemo(() => data?.items || [], [data]);
  const filtered = useMemo(() => {
    return items.filter(i => {
      const p = i.payload || {};
      if (rule && !(`${p.rule_name || ''}`.toLowerCase().includes(rule.toLowerCase()) || `${p.rule_id || ''}`.includes(rule))) return false;
      if (video && !(`${p.video_title || ''}`.toLowerCase().includes(video.toLowerCase()) || `${p.video_id || ''}`.includes(video))) return false;
      return true;
    });
  }, [items, rule, video]);

  // keep currentIndex within bounds when list changes
  if (currentIndex >= filtered.length && filtered.length > 0) {
    // safe correction without causing render loop in React strict
    setTimeout(() => setCurrentIndex(filtered.length - 1), 0);
  }

  // Selection
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const allSelected = filtered.length > 0 && filtered.every(x => selected[x.id]);
  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    if (checked) filtered.forEach(x => (next[x.id] = true));
    setSelected(next);
  };
  const selectedIds = Object.keys(selected).filter(id => selected[id]);

  // Mutations
  const bulkApprove = useMutation({
    mutationFn: async (ids: string[]) => (await api.post('/automation/approvals/bulk-approve', { ids })).data,
    onSuccess: async () => {
      pushToast('Approved selected', 'success');
      setSelected({});
      await qc.invalidateQueries({ queryKey: ['approvals'] });
    },
    onError: (e) => pushToast(`Approve failed: ${String((e as Error)?.message || e)}`, 'error'),
  });
  const bulkReject = useMutation({
    mutationFn: async (ids: string[]) => (await api.post('/automation/approvals/bulk-reject', { ids })).data,
    onSuccess: async () => {
      pushToast('Rejected selected', 'success');
      setSelected({});
      await qc.invalidateQueries({ queryKey: ['approvals'] });
    },
    onError: (e) => pushToast(`Reject failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const editItem = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => (await api.put(`/automation/approvals/${id}`, { payload: { response_text: text } })).data,
    onSuccess: () => pushToast('Edited', 'success'),
    onError: (e) => pushToast(`Edit failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  // Handlers for modal actions
  const handleOpenEditor = (it: ApprovalItem) => {
    const p = it.payload || {};
    const getStr = (obj: Record<string, unknown>, key: string) => typeof obj[key] === 'string' ? String(obj[key]) : '';
    const originalComment = getStr(p, 'comment_text') || getStr(p, 'comment');
    const currentResponse = getStr(p, 'response_text') || getStr(p, 'suggested_response');
    setEditorItem({ id: it.id, originalComment, currentResponse });
    setEditorOpen(true);
  };

  const saveDraft = async (text: string) => {
    if (!editorItem) return;
    await editItem.mutateAsync({ id: editorItem.id, text });
    await qc.invalidateQueries({ queryKey: ['approvals'] });
  };

  // Compute columns based on viewport breakpoints matching our grid classes
  const computeCols = () => {
    if (typeof window === 'undefined') return 1;
    const w = window.innerWidth;
    if (w >= 1280) return 3; // xl:grid-cols-3
    if (w >= 768) return 2;  // md:grid-cols-2
    return 1;
  };
  // set columns and key handlers
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => setCols(computeCols()), [typeof window !== 'undefined' ? window.innerWidth : 0]);

  // Attach resize listener for columns
  if (typeof window !== 'undefined') {
    // debounce-like update without extra deps
    window.addEventListener('resize', () => setCols(computeCols()), { passive: true });
  }

  // Keyboard shortcuts
  useMemo(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: KeyboardEvent) => {
      // ignore when typing in inputs or editor/help dialogs are open
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping = tag === 'input' || tag === 'textarea' || (target?.isContentEditable ?? false);
      if (isTyping || editorOpen || helpOpen) return;

      const key = e.key;
      const hasShift = e.shiftKey;
      const hasCtrl = e.ctrlKey || e.metaKey || e.altKey;
      if (hasCtrl) return; // ignore with control/meta/alt modifiers

      // '?' help
      if (key === '?') {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      // Navigation
      if (key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex(idx => Math.min(filtered.length - 1, idx + 1));
        return;
      }
      if (key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex(idx => Math.max(0, idx - 1));
        return;
      }
      if (key === 'ArrowDown') {
        e.preventDefault();
        setCurrentIndex(idx => Math.min(filtered.length - 1, idx + cols));
        return;
      }
      if (key === 'ArrowUp') {
        e.preventDefault();
        setCurrentIndex(idx => Math.max(0, idx - cols));
        return;
      }

      const current = filtered[currentIndex];
      if (!current) return;

      // Space to toggle current selection
      if (key === ' ') {
        e.preventDefault();
        setSelected(s => ({ ...s, [current.id]: !s[current.id] }));
        return;
      }

      // Approve selected (A)
      if (key.toLowerCase() === 'a' && !hasShift) {
        e.preventDefault();
        if (selectedIds.length > 0) bulkApprove.mutate(selectedIds);
        return;
      }

      // Approve all visible (Shift+A)
      if (key.toLowerCase() === 'a' && hasShift) {
        e.preventDefault();
        const allVisible = filtered.map(x => x.id);
        if (allVisible.length) bulkApprove.mutate(allVisible);
        return;
      }

      // Reject selected (R)
      if (key.toLowerCase() === 'r') {
        e.preventDefault();
        if (selectedIds.length > 0) bulkReject.mutate(selectedIds);
        return;
      }

      // Edit selected (E) — if exactly one selected use it; else use current
      if (key.toLowerCase() === 'e') {
        e.preventDefault();
        let toEdit: ApprovalItem | undefined;
        if (selectedIds.length === 1) {
          toEdit = filtered.find(x => x.id === selectedIds[0]);
        } else {
          toEdit = current;
        }
        if (toEdit) handleOpenEditor(toEdit);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, currentIndex, cols, selectedIds, editorOpen, helpOpen, bulkApprove, bulkReject]);

  const saveAndApprove = async (text: string) => {
    if (!editorItem) return;
    await editItem.mutateAsync({ id: editorItem.id, text });
    await bulkApprove.mutateAsync([editorItem.id]);
    await qc.invalidateQueries({ queryKey: ['approvals'] });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Approval Queue</h1>
        <div className="text-sm text-muted-foreground">{data?.total ?? 0} pending</div>
      </div>

  {/* Analytics */}
  <ApprovalsAnalyticsWidget hours={24} />

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Min priority</div>
            <Input type="number" min={0} placeholder="e.g., 50" value={minPriority === '' ? '' : String(minPriority)} onChange={(e) => setMinPriority(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Rule</div>
            <Input placeholder="name or id" value={rule} onChange={(e) => setRule(e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Video</div>
            <Input placeholder="title or id" value={video} onChange={(e) => setVideo(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => refetch()}>Refresh</Button>
        </CardContent>
      </Card>

      {/* Bulk toolbar */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded border flex items-center gap-2 bg-amber-50 border-amber-200">
          <div className="text-sm">{selectedIds.length} selected</div>
          <Button size="sm" onClick={() => bulkApprove.mutate(selectedIds)} disabled={bulkApprove.isPending}>Approve</Button>
          <Button size="sm" variant="outline" onClick={() => bulkReject.mutate(selectedIds)} disabled={bulkReject.isPending}>Reject</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected({})}>Clear</Button>
        </div>
      )}

      {/* Approvals grid */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : !filtered.length ? (
        <div className="text-sm text-muted-foreground">No pending approvals.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {/* Select all */}
          <div className="col-span-full -mb-2 flex items-center gap-2">
            <input type="checkbox" checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} />
            <span className="text-sm">Select all</span>
          </div>
          {filtered.map((it, idx) => (
            <ApprovalCard key={it.id} it={it} selected={!!selected[it.id]} isCurrent={idx === currentIndex} onSelect={(v) => setSelected(s => ({ ...s, [it.id]: v }))}
              onApprove={() => bulkApprove.mutate([it.id])}
              onReject={() => bulkReject.mutate([it.id])}
              onEdit={() => handleOpenEditor(it)}
            />
          ))}
        </div>
      )}

      {/* Response Editor Modal */}
      {editorItem && (
        <ResponseEditor
          open={editorOpen}
          onOpenChange={(open) => { setEditorOpen(open); if (!open) setEditorItem(null); }}
          originalComment={editorItem.originalComment}
          currentResponse={editorItem.currentResponse}
          maxChars={10000}
          isSaving={editItem.isPending || bulkApprove.isPending}
          onSaveDraft={async (text) => {
            await saveDraft(text);
            pushToast('Draft saved', 'success');
            setEditorOpen(false);
            setEditorItem(null);
          }}
          onSaveApprove={async (text) => {
            await saveAndApprove(text);
            pushToast('Saved and approved', 'success');
            setEditorOpen(false);
            setEditorItem(null);
          }}
        />
      )}

      {/* Shortcut help dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <ul className="text-sm space-y-1">
            <li><b>A</b> — Approve selected</li>
            <li><b>R</b> — Reject selected</li>
            <li><b>E</b> — Edit selected (or current)</li>
            <li><b>Space</b> — Select/Deselect current</li>
            <li><b>Shift + A</b> — Approve all visible</li>
            <li><b>Arrow keys</b> — Navigate between cards</li>
            <li><b>?</b> — Show this help</li>
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ApprovalCard({ it, selected, isCurrent, onSelect, onApprove, onReject, onEdit }: {
  it: ApprovalItem; selected: boolean; isCurrent: boolean; onSelect: (v: boolean) => void; onApprove: () => void; onReject: () => void; onEdit: () => void;
}) {
  const p = it.payload || {};
  const getStr = (obj: Record<string, unknown>, key: string) => {
    const v = obj[key];
    return typeof v === 'string' ? v : '';
  };
  const comment = getStr(p, 'comment_text') || getStr(p, 'comment');
  const responseText = getStr(p, 'response_text') || getStr(p, 'suggested_response');
  const title = getStr(p, 'video_title') || getStr(p, 'video');
  const waiting = timeAgo(it.created_at);
  return (
    <Card className={isCurrent ? 'ring-2 ring-primary' : ''}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{title || 'Unknown video'}</CardTitle>
        <div className="text-xs px-2 py-0.5 rounded border bg-white">Priority {it.priority}</div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={selected} onChange={(e) => onSelect(e.target.checked)} />
          <div className="text-xs text-muted-foreground">Waiting {waiting}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Comment</div>
          <div className="p-2 rounded border bg-muted/20 text-sm max-h-24 overflow-auto">{comment}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Generated response</div>
          <div className="p-2 rounded border bg-muted/20 text-sm max-h-32 overflow-auto whitespace-pre-wrap">{responseText}</div>
        </div>
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" onClick={onApprove}>Approve</Button>
            </TooltipTrigger>
            <TooltipContent>Shortcut: A</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="outline" onClick={onReject}>Reject</Button>
            </TooltipTrigger>
            <TooltipContent>Shortcut: R</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button>
            </TooltipTrigger>
            <TooltipContent>Shortcut: E</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
