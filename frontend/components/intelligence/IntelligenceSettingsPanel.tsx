"use client";
import { useMemo, useRef, useState } from 'react';
import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';

export default function IntelligenceSettingsPanel({ compact }: { compact?: boolean }) {
  const { intelligenceSettings, setIntelligenceSettings, resetIntelligenceSettings } = useStore();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const impactLabel = useMemo(() => {
    const s = intelligenceSettings.suggestionsSensitivity;
    if (s === 'conservative') return 'Conservative: Fewer but higher‑confidence suggestions';
    if (s === 'balanced') return 'Balanced: Mix of safety and speed';
    return 'Aggressive: More suggestions, lower threshold';
  }, [intelligenceSettings.suggestionsSensitivity]);

  function exportSettings() {
    const blob = new Blob([JSON.stringify(intelligenceSettings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'intelligence-settings.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function importSettings(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        // Minimal validation and merge
        const allowedKeys = ['masterEnabled','suggestionsEnabled','predictionsEnabled','autoOptimizeEnabled','suggestionsSensitivity','notifications','dataRetentionDays'] as const;
        const patch: Partial<typeof intelligenceSettings> = {};
        allowedKeys.forEach((k) => {
          if (Object.prototype.hasOwnProperty.call(obj, k)) {
            (patch as Partial<typeof intelligenceSettings>)[k] = obj[k];
          }
        });
        setIntelligenceSettings(patch);
      } catch {}
    };
    reader.readAsText(file);
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="text-sm text-secondary-dark">Control AI-powered intelligence features. Defaults are conservative and non-intrusive.</div>

      {/* Master toggle */}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={intelligenceSettings.masterEnabled} onChange={(e)=> setIntelligenceSettings({ masterEnabled: e.target.checked })} />
        Smart Features (master)
      </label>

      {/* Granular controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={intelligenceSettings.suggestionsEnabled} onChange={(e)=> setIntelligenceSettings({ suggestionsEnabled: e.target.checked })} disabled={!intelligenceSettings.masterEnabled} />
          Suggestions
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={intelligenceSettings.predictionsEnabled} onChange={(e)=> setIntelligenceSettings({ predictionsEnabled: e.target.checked })} disabled={!intelligenceSettings.masterEnabled} />
          Predictions
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={intelligenceSettings.autoOptimizeEnabled} onChange={(e)=> setIntelligenceSettings({ autoOptimizeEnabled: e.target.checked })} disabled={!intelligenceSettings.masterEnabled} />
          Auto‑optimization (requires approval)
        </label>
      </div>

      {/* Sensitivity */}
      <div>
        <div className="text-sm font-medium text-primary-dark mb-1">Suggestion sensitivity</div>
  <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm" value={intelligenceSettings.suggestionsSensitivity} onChange={(e)=> setIntelligenceSettings({ suggestionsSensitivity: e.target.value as 'conservative'|'balanced'|'aggressive' })} disabled={!intelligenceSettings.masterEnabled}>
          <option value="conservative">Conservative</option>
          <option value="balanced">Balanced</option>
          <option value="aggressive">Aggressive</option>
        </select>
        <div className="text-xs text-muted-foreground mt-1">{impactLabel}</div>
      </div>

      {/* Notification preferences */}
      <div>
        <div className="text-sm font-medium text-primary-dark mb-1">Notifications</div>
  <select className="card-background border-[var(--border)] rounded-md px-3 py-2 text-sm" value={intelligenceSettings.notifications} onChange={(e)=> setIntelligenceSettings({ notifications: e.target.value as 'email'|'inapp'|'none' })}>
          <option value="inapp">In‑app</option>
          <option value="email">Email</option>
          <option value="none">None</option>
        </select>
        <div className="text-xs text-muted-foreground mt-1">Choose how you want to be notified about new insights.</div>
      </div>

      {/* Data retention */}
      <div>
        <div className="text-sm font-medium text-primary-dark mb-1">Data retention (learning data)</div>
        <div className="flex items-center gap-2">
          <input type="range" min={7} max={365} step={1} value={intelligenceSettings.dataRetentionDays} onChange={(e)=> setIntelligenceSettings({ dataRetentionDays: parseInt(e.target.value,10) })} className="w-64" />
          <span className="text-sm">{intelligenceSettings.dataRetentionDays} days</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">Shorter retention is more private; longer improves learning quality.</div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="border-[var(--border)]" onClick={() => resetIntelligenceSettings()}>Reset to defaults</Button>
        <Button variant="outline" className="border-[var(--border)]" onClick={() => setPreviewOpen(true)}>Preview: Show me what would change</Button>
        <Button variant="outline" className="border-[var(--border)]" onClick={() => exportSettings()}>Export</Button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e)=>{ const f=e.target.files?.[0]; if (f) importSettings(f); if(fileRef.current) fileRef.current.value=''; }} />
        <Button variant="outline" className="border-[var(--border)]" onClick={() => fileRef.current?.click()}>Import</Button>
      </div>

      {/* Preview modal (lightweight) */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="w-[92vw] max-w-[640px] rounded border bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">Preview: What will change</div>
              <button className="text-sm" onClick={() => setPreviewOpen(false)}>Close</button>
            </div>
            <div className="mt-3 text-sm space-y-2">
              {!intelligenceSettings.masterEnabled && (
                <div>• All smart features will be paused. No new suggestions or predictions will be shown.</div>
              )}
              {intelligenceSettings.masterEnabled && (
                <>
                  <div>• Suggestions: {intelligenceSettings.suggestionsEnabled ? 'Enabled' : 'Disabled'} ({intelligenceSettings.suggestionsSensitivity}).</div>
                  <div>• Predictions: {intelligenceSettings.predictionsEnabled ? 'Enabled' : 'Disabled'}.</div>
                  <div>• Auto‑optimization: {intelligenceSettings.autoOptimizeEnabled ? 'Enabled (still requires approval)' : 'Disabled'}.</div>
                  <div>• Notifications: {intelligenceSettings.notifications}.</div>
                  <div>• Data retention: {intelligenceSettings.dataRetentionDays} days.</div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
