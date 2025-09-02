"use client";
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export type ResponseEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalComment: string;
  currentResponse: string;
  maxChars?: number;
  onSaveDraft: (text: string, saveAsTemplate: boolean) => Promise<void> | void;
  onSaveApprove: (text: string, saveAsTemplate: boolean) => Promise<void> | void;
  isSaving?: boolean;
};

type DiffToken = { text: string; type: 'same' | 'add' | 'del' };

export default function ResponseEditor({ open, onOpenChange, originalComment, currentResponse, maxChars = 10000, onSaveDraft, onSaveApprove, isSaving }: ResponseEditorProps) {
  const [text, setText] = useState<string>(currentResponse || '');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templates, setTemplates] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setText(currentResponse || '');
      setSaveAsTemplate(false);
      try {
        const key = 'revu_response_templates';
        const existing = JSON.parse(localStorage.getItem(key) || '[]') as string[];
        setTemplates(existing);
      } catch {
        setTemplates([]);
      }
    }
  }, [open, currentResponse]);

  const charCount = text.length;
  const overLimit = charCount > maxChars;

  const diffTokens = useMemo(() => computeDiffTokens(currentResponse || '', text || ''), [currentResponse, text]);

  const handleSaveDraft = async () => {
    await onSaveDraft(text, saveAsTemplate);
    if (saveAsTemplate) persistTemplate(text);
  };
  const handleSaveApprove = async () => {
    await onSaveApprove(text, saveAsTemplate);
    if (saveAsTemplate) persistTemplate(text);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Response</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Original comment</div>
            <div className="p-2 rounded border bg-muted/20 text-sm max-h-32 overflow-auto whitespace-pre-wrap">{originalComment}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Edit response</div>
              <div className={`text-xs ${overLimit ? 'text-red-600' : 'text-muted-foreground'}`}>{charCount} / {maxChars}</div>
            </div>
            <Textarea className="min-h-[180px]" value={text} onChange={(e) => setText(e.target.value)} />
            {overLimit && <div className="text-xs text-red-600">Over YouTube max comment length. Trim your response.</div>}
            {!!templates?.length && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Templates</div>
                <div className="flex flex-wrap gap-2">
                  {templates.slice(0, 6).map((tpl, i) => (
                    <button key={i} type="button" className="text-xs px-2 py-1 rounded border bg-muted hover:bg-muted/70" onClick={() => setText(tpl)}>
                      Use template {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Changes</div>
            <div className="p-2 rounded border bg-white text-sm max-h-40 overflow-auto">
              <DiffView tokens={diffTokens} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input id="save-template" type="checkbox" checked={saveAsTemplate} onChange={(e) => setSaveAsTemplate(e.target.checked)} />
            <label htmlFor="save-template" className="text-sm">Save edit as template for future use</label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={!!isSaving}>Cancel</Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={!!isSaving || overLimit}>Save Draft</Button>
          <Button onClick={handleSaveApprove} disabled={!!isSaving || overLimit}>Save and Approve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiffView({ tokens }: { tokens: DiffToken[] }) {
  return (
    <div className="leading-relaxed">
      {tokens.map((t, idx) => {
        if (t.type === 'same') return <span key={idx}>{t.text}</span>;
        if (t.type === 'add') return <span key={idx} className="bg-green-100 text-green-900">{t.text}</span>;
        return <span key={idx} className="bg-red-100 line-through text-red-900">{t.text}</span>;
      })}
    </div>
  );
}

// Simple word-level LCS diff to produce add/del/same tokens
function computeDiffTokens(a: string, b: string): DiffToken[] {
  const aWords = tokenizeWords(a);
  const bWords = tokenizeWords(b);
  const n = aWords.length;
  const m = bWords.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = aWords[i] === bWords[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const tokens: DiffToken[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (aWords[i] === bWords[j]) {
      tokens.push({ text: aWords[i], type: 'same' }); i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      tokens.push({ text: aWords[i], type: 'del' }); i++;
    } else {
      tokens.push({ text: bWords[j], type: 'add' }); j++;
    }
  }
  while (i < n) { tokens.push({ text: aWords[i++], type: 'del' }); }
  while (j < m) { tokens.push({ text: bWords[j++], type: 'add' }); }
  return tokens;
}

function tokenizeWords(s: string): string[] {
  // Keep spaces/newlines as separate tokens to preserve formatting
  const out: string[] = [];
  let cur = '';
  for (const ch of s) {
    if (ch === ' ' || ch === '\n' || ch === '\t') {
      if (cur) out.push(cur);
      out.push(ch);
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function persistTemplate(text: string) {
  try {
    const key = 'revu_response_templates';
    const existing = JSON.parse(localStorage.getItem(key) || '[]') as string[];
    if (!existing.includes(text)) {
      existing.unshift(text);
      while (existing.length > 20) existing.pop();
      localStorage.setItem(key, JSON.stringify(existing));
    }
  } catch {
    // ignore
  }
}
