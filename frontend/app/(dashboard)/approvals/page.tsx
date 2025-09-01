"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPendingApprovals, approveResponse, rejectResponse, editResponse, PendingApprovalItem } from '@/lib/api/approvals';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { pushToast } from '@/components/ui/toast';

export default function ApprovalsPage() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: fetchPendingApprovals,
    refetchInterval: 30_000,
  });

  const [editing, setEditing] = useState<null | { id: string; text: string }>(null);

  const approveMut = useMutation({
    mutationFn: (id: string) => approveResponse(id),
    onSuccess: async () => {
      pushToast('Approved: response was posted.', 'success');
      await qc.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: (e) => pushToast(`Approve failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => rejectResponse(id),
    onSuccess: async () => {
      pushToast('Rejected response.', 'info');
      await qc.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: (e) => pushToast(`Reject failed: ${String((e as Error)?.message || e)}`, 'error'),
  });

  const editMut = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => editResponse(id, text),
    onSuccess: async () => {
      pushToast('Updated response text.', 'success');
      setEditing(null);
      await qc.invalidateQueries({ queryKey: ['pending-approvals'] });
    },
    onError: (e) => pushToast(`Update failed: ${String((e as Error)?.message || e)}`,'error'),
  });

  const items = data || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Pending Approvals</h1>

      {isLoading && <div>Loading…</div>}
      {isError && <div className="text-red-500">Failed to load approvals.</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.response_id}>
            <CardHeader>
              <CardTitle className="text-base">Comment {item.comment_id}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Original Comment</div>
                  <div className="p-2 rounded bg-muted text-sm whitespace-pre-wrap">{item.comment_text}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Generated Response</div>
                  <div className="p-2 rounded bg-muted text-sm whitespace-pre-wrap">{item.response_text}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={() => approveMut.mutate(item.response_id)} disabled={approveMut.isPending}>
                  Approve & Post
                </Button>
                <Button size="sm" variant="destructive" onClick={() => rejectMut.mutate(item.response_id)} disabled={rejectMut.isPending}>
                  Reject
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setEditing({ id: item.response_id, text: item.response_text })}>
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Response</DialogTitle>
          </DialogHeader>
          <div>
            <Textarea
              value={editing?.text || ''}
              onChange={(e) => setEditing((prev) => (prev ? { ...prev, text: e.target.value } : prev))}
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && editMut.mutate({ id: editing.id, text: editing.text })} disabled={editMut.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
