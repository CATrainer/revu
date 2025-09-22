// frontend/app/(dashboard)/comments/workflows/approvals/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { pushToast } from '@/components/ui/toast';
import { Youtube, Instagram, Twitter, Music } from 'lucide-react';
import { listApprovals, updateApproval, sendApproval, rejectApproval, type ApprovalOut } from '@/lib/api/workflows';

type InteractionType = 'dm' | 'comment' | 'mention';
interface ApprovalItem {
  id: string;
  platform: 'youtube' | 'instagram' | 'tiktok' | 'twitter';
  type: InteractionType;
  userMessage: string;
  proposedResponse: string;
  editedResponse?: string;
  author?: string;
  createdAt?: string; // ISO string
  linkUrl?: string;
}

export default function WorkflowApprovalsPage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sentLog, setSentLog] = useState<Array<ApprovalItem & { sentAt: string; response: string }>>([]);
  const [rejectedLog, setRejectedLog] = useState<Array<ApprovalItem & { rejectedAt: string; reason: string }>>([]);

  const updateResponse = (id: string, text: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, editedResponse: text } : it)));
  };

  const save = async (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    try {
      if (it.editedResponse && it.editedResponse !== it.proposedResponse) {
        await updateApproval(id, { edited_response: it.editedResponse, status: 'saved' });
        setItems((prev) => prev.map((x) => (x.id === id ? { ...x, proposedResponse: it.editedResponse!, editedResponse: undefined } : x)));
        pushToast('Response updated', 'success');
      } else {
        pushToast('No changes to save', 'info');
      }
    } catch (e) {
      console.error(e);
      pushToast('Failed to save', 'error');
    }
  };

  const send = async (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    try {
      await sendApproval(id);
      const toSend = it.editedResponse && it.editedResponse.trim().length > 0 ? it.editedResponse : it.proposedResponse;
      setItems((prev) => prev.filter((x) => x.id !== id));
      setSentLog((prev) => [...prev, { ...it, response: toSend, sentAt: new Date().toISOString() }]);
      pushToast('Response sent', 'success');
    } catch (e) {
      console.error(e);
      pushToast('Failed to send', 'error');
    }
  };

  const reject = async (id: string) => {
    const it = items.find((x) => x.id === id);
    if (!it) return;
    const reason = prompt('Why are you rejecting this response?');
    if (!reason) return;
    try {
      await rejectApproval(id, reason);
      setItems((prev) => prev.filter((x) => x.id !== id));
      setRejectedLog((prev) => [...prev, { ...it, rejectedAt: new Date().toISOString(), reason }]);
      pushToast('Response rejected', 'info');
    } catch (e) {
      console.error(e);
      pushToast('Failed to reject', 'error');
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      const rows = await listApprovals('pending');
      const mapped: ApprovalItem[] = rows.map((r: ApprovalOut) => ({
        id: r.id,
        platform: r.platform,
        type: r.interaction_type,
        userMessage: r.user_message,
        proposedResponse: r.proposed_response,
        editedResponse: r.edited_response || undefined,
        author: r.author || undefined,
        createdAt: r.created_at,
        linkUrl: r.link_url || undefined,
      }));
      setItems(mapped);
      setError(null);
    } catch (e: unknown) {
      console.error(e);
      let message = 'Failed to load approvals';
      if (e && typeof e === 'object' && 'message' in e) {
        const maybeMsg = (e as Record<string, unknown>).message;
        if (typeof maybeMsg === 'string') message = maybeMsg;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const platformLabel = (p: ApprovalItem['platform']) => {
    if (p === 'youtube') return 'YouTube';
    if (p === 'instagram') return 'Instagram';
    if (p === 'tiktok') return 'TikTok';
    if (p === 'twitter') return 'X/Twitter';
    return p;
  };

  const typeLabel = (t: InteractionType) => (t === 'dm' ? 'DM' : t === 'comment' ? 'Comment' : '@ Mention');
  const platformIcon = (p: ApprovalItem['platform']) => {
    const cls = 'h-4 w-4';
    if (p === 'youtube') return <Youtube className={cls} />;
    if (p === 'instagram') return <Instagram className={cls} />;
    if (p === 'tiktok') return <Music className={cls} />;
    if (p === 'twitter') return <Twitter className={cls} />;
    return null;
  };

  return (
    <div className="space-y-6 px-4 md:px-0">{/* Mobile padding */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">{/* Stack on mobile */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-dark">Approvals</h1>
          <p className="mt-1 text-sm md:text-base text-secondary-dark">Messages generated by workflows that require manual approval before sending.</p>
        </div>
        <Link href="/comments/workflows" className="text-sm text-brand-primary hover:underline">Back to Workflows</Link>
      </div>

      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Pending approvals</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-secondary-dark">Loading…</div>
          ) : error ? (
            <div className="text-sm text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-secondary-dark">Nothing here right now. Approved or sent responses will disappear from this list.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary-dark">
                    <th className="py-2 pr-3">Platform</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Author</th>
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">Link</th>
                    <th className="py-2 pr-3 w-[35%]">User message</th>
                    <th className="py-2 pr-3 w-[35%]">Proposed response</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {items.map((it) => (
                    <tr key={it.id} className="border-t border-[var(--border)]">
                      <td className="py-3 pr-3 text-primary-dark">
                        <div className="flex items-center gap-2">
                          {platformIcon(it.platform)}
                          <span>{platformLabel(it.platform)}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-primary-dark">{typeLabel(it.type)}</td>
                      <td className="py-3 pr-3 text-primary-dark">{it.author || '—'}</td>
                      <td className="py-3 pr-3 text-primary-dark">{it.createdAt ? new Date(it.createdAt).toLocaleString() : '—'}</td>
                      <td className="py-3 pr-3 text-primary-dark">
                        {it.linkUrl ? (
                          <a href={it.linkUrl} target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">Open</a>
                        ) : '—'}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="text-primary-dark whitespace-pre-wrap">{it.userMessage}</div>
                      </td>
                      <td className="py-3 pr-3 min-w-[300px]">
                        <Textarea
                          className="card-background border-[var(--border)]"
                          value={it.editedResponse ?? it.proposedResponse}
                          onChange={(e) => updateResponse(it.id, e.target.value)}
                        />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-2 min-w-[140px]">
                          <Button size="sm" variant="outline" className="border-[var(--border)] text-secondary-dark" onClick={() => save(it.id)}>Save</Button>
                          <Button size="sm" className="button-primary" onClick={() => send(it.id)}>Send</Button>
                          <Button size="sm" variant="destructive" onClick={() => reject(it.id)}>Reject</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sent log */}
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Sent log</CardTitle>
        </CardHeader>
        <CardContent>
          {sentLog.length === 0 ? (
            <div className="text-sm text-secondary-dark">No items sent yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary-dark">
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">Platform</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Response</th>
                    <th className="py-2 pr-3">Link</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {sentLog.map((it) => (
                    <tr key={`${it.id}_${it.sentAt}`} className="border-t border-[var(--border)]">
                      <td className="py-3 pr-3 text-primary-dark">{new Date(it.sentAt).toLocaleString()}</td>
                      <td className="py-3 pr-3 text-primary-dark">
                        <div className="flex items-center gap-2">{platformIcon(it.platform)}<span>{platformLabel(it.platform)}</span></div>
                      </td>
                      <td className="py-3 pr-3 text-primary-dark">{typeLabel(it.type)}</td>
                      <td className="py-3 pr-3 text-primary-dark whitespace-pre-wrap">{it.response}</td>
                      <td className="py-3 pr-3 text-primary-dark">{it.linkUrl ? <a href={it.linkUrl} target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">Open</a> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejected log */}
      <Card className="card-background border-[var(--border)]">
        <CardHeader>
          <CardTitle className="text-primary-dark">Rejected log</CardTitle>
        </CardHeader>
        <CardContent>
          {rejectedLog.length === 0 ? (
            <div className="text-sm text-secondary-dark">No items rejected.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-secondary-dark">
                    <th className="py-2 pr-3">When</th>
                    <th className="py-2 pr-3">Platform</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Reason</th>
                    <th className="py-2 pr-3">Link</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  {rejectedLog.map((it) => (
                    <tr key={`${it.id}_${it.rejectedAt}`} className="border-t border-[var(--border)]">
                      <td className="py-3 pr-3 text-primary-dark">{new Date(it.rejectedAt).toLocaleString()}</td>
                      <td className="py-3 pr-3 text-primary-dark"><div className="flex items-center gap-2">{platformIcon(it.platform)}<span>{platformLabel(it.platform)}</span></div></td>
                      <td className="py-3 pr-3 text-primary-dark">{typeLabel(it.type)}</td>
                      <td className="py-3 pr-3 text-primary-dark whitespace-pre-wrap">{it.reason}</td>
                      <td className="py-3 pr-3 text-primary-dark">{it.linkUrl ? <a href={it.linkUrl} target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">Open</a> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
