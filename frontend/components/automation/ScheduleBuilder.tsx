"use client";
import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';

type HourRange = { start: number; end: number };
type Blackout = { start: string; end: string };
export type AdvancedTiming = {
  timezone?: string;
  days_of_week?: number[]; // 0=Mon..6=Sun
  hours?: HourRange[];
  delay_seconds?: { min?: number; max?: number };
  blackouts?: Blackout[];
};

export type VideoAgeHours = { min?: number; max?: number };

type Props = {
  value?: AdvancedTiming;
  videoAgeHours?: VideoAgeHours;
  onChange?: (timing: AdvancedTiming, extras: { video_age_hours?: VideoAgeHours }) => void;
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const COMMON_TZS = [
  'UTC',
  'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
  'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Madrid', 'Europe/Warsaw',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'
];

export default function ScheduleBuilder({ value, videoAgeHours, onChange }: Props) {
  const localTz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);
  const [timing, setTiming] = useState<AdvancedTiming>(() => ({
    timezone: value?.timezone || localTz,
    days_of_week: value?.days_of_week || [0,1,2,3,4,5,6],
    hours: value?.hours && value.hours.length ? value.hours : [{ start: 9, end: 17 }],
    delay_seconds: value?.delay_seconds || { min: 0, max: 0 },
    blackouts: value?.blackouts || [],
  }));
  const [age, setAge] = useState<VideoAgeHours>(() => ({ min: videoAgeHours?.min ?? 0, max: videoAgeHours?.max ?? 24 }));

  useEffect(() => { onChange?.(timing, { video_age_hours: age }); }, [timing, age, onChange]);

  const previewMut = useMutation({
    mutationFn: async (payload: { timing: AdvancedTiming; scope?: { video_age_hours?: VideoAgeHours } }) => {
      const { data } = await api.post('/automation/rules/schedule/preview', payload);
      return data as { active_now: boolean; reason: string; next_trigger_utc: string; next_trigger_local: string; timezone: string };
    },
  });

  useEffect(() => {
    const id = setTimeout(() => previewMut.mutate({ timing, scope: { video_age_hours: age } }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timing, age]);

  const toggleDay = (i: number) => setTiming(t => ({ ...t, days_of_week: (t.days_of_week || []).includes(i) ? (t.days_of_week || []).filter(d => d !== i) : [...(t.days_of_week || []), i].sort((a,b)=>a-b) }));
  const addHourRange = () => setTiming(t => ({ ...t, hours: [...(t.hours || []), { start: 9, end: 17 }] }));
  const removeHourRange = (idx: number) => setTiming(t => ({ ...t, hours: (t.hours || []).filter((_,i)=>i!==idx) }));
  const updHour = (idx: number, key: 'start'|'end', val: number) => setTiming(t => ({ ...t, hours: (t.hours || []).map((r,i)=> i===idx? { ...r, [key]: clampHour(val) } : r) }));
  const clampHour = (x: number) => Math.max(0, Math.min(24, isFinite(x) ? x : 0));

  const addBlackout = () => setTiming(t => ({ ...t, blackouts: [...(t.blackouts || []), { start: '', end: '' }] }));
  const updBlackout = (idx: number, key: 'start'|'end', val: string) => setTiming(t => ({ ...t, blackouts: (t.blackouts || []).map((b,i)=> i===idx? { ...b, [key]: val } : b) }));
  const rmBlackout = (idx: number) => setTiming(t => ({ ...t, blackouts: (t.blackouts || []).filter((_,i)=> i!==idx) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div>
            <Label>Timezone</Label>
            <select className="border rounded px-2 py-1 w-[260px]" value={timing.timezone}
              onChange={(e)=> setTiming(t => ({ ...t, timezone: e.target.value }))}>
              {[timing.timezone, ...COMMON_TZS.filter(z=>z!==timing.timezone)].map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div className="text-xs text-muted-foreground mt-6">Your local time: {localTz}</div>
        </div>

        {/* Day grid */}
        <div>
          <Label>Active days</Label>
          <div className="grid grid-cols-7 gap-2 mt-2">
            {DAY_NAMES.map((d, i) => (
              <button key={d} type="button" onClick={()=>toggleDay(i)}
                className={`px-2 py-2 rounded border text-sm ${ (timing.days_of_week||[]).includes(i) ? 'bg-primary text-white border-primary' : 'bg-white border-gray-200' }`}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Hours */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Hour ranges (local to timezone)</Label>
            <Button size="sm" variant="outline" onClick={addHourRange}>Add range</Button>
          </div>
          <div className="space-y-2">
            {(timing.hours||[]).map((r, idx) => (
              <div key={idx} className="grid grid-cols-6 gap-2 items-center">
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Start</span>
                  <Input type="number" min={0} max={24} step={0.25} value={r.start}
                    onChange={(e)=>updHour(idx,'start', parseFloat(e.target.value))} />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">End</span>
                  <Input type="number" min={0} max={24} step={0.25} value={r.end}
                    onChange={(e)=>updHour(idx,'end', parseFloat(e.target.value))} />
                </div>
                <div className="col-span-2">
                  <Button size="sm" variant="outline" onClick={()=>removeHourRange(idx)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delay */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Delay min (seconds)</Label>
            <Input type="number" min={0} value={timing.delay_seconds?.min ?? 0}
              onChange={(e)=> setTiming(t => ({ ...t, delay_seconds: { min: Math.max(0, parseInt(e.target.value||'0')), max: Math.max(Math.max(0, parseInt(e.target.value||'0')), t.delay_seconds?.max ?? 0) } }))} />
          </div>
          <div>
            <Label>Delay max (seconds)</Label>
            <Input type="number" min={0} value={timing.delay_seconds?.max ?? 0}
              onChange={(e)=> setTiming(t => ({ ...t, delay_seconds: { min: t.delay_seconds?.min ?? 0, max: Math.max( (t.delay_seconds?.min ?? 0), parseInt(e.target.value||'0')) } }))} />
          </div>
        </div>

        {/* Video age window */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>First X hours after upload (max)</Label>
            <Input type="number" min={0} value={age.max ?? 0}
              onChange={(e)=> setAge(a => ({ ...a, max: Math.max(0, parseInt(e.target.value||'0')) }))} />
          </div>
          <div>
            <Label>Min hours after upload (optional)</Label>
            <Input type="number" min={0} value={age.min ?? 0}
              onChange={(e)=> setAge(a => ({ ...a, min: Math.max(0, parseInt(e.target.value||'0')) }))} />
          </div>
        </div>

        {/* Blackouts */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Blackout periods (no triggers)</Label>
            <Button size="sm" variant="outline" onClick={addBlackout}>Add blackout</Button>
          </div>
          <div className="space-y-2">
            {(timing.blackouts||[]).map((b, idx) => (
              <div key={idx} className="grid grid-cols-7 gap-2 items-center">
                <div className="col-span-3">
                  <span className="text-xs text-muted-foreground">Start</span>
                  <Input type="datetime-local" value={toLocalInputValue(b.start)} onChange={(e)=>updBlackout(idx,'start', e.target.value)} />
                </div>
                <div className="col-span-3">
                  <span className="text-xs text-muted-foreground">End</span>
                  <Input type="datetime-local" value={toLocalInputValue(b.end)} onChange={(e)=>updBlackout(idx,'end', e.target.value)} />
                </div>
                <div>
                  <Button size="sm" variant="outline" onClick={()=>rmBlackout(idx)}>Remove</Button>
                </div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">Times above are interpreted in the selected timezone ({timing.timezone}).</div>
        </div>

        {/* Preview */}
        <div className="p-3 border rounded text-sm">
          <div className="font-medium mb-1">Next trigger preview</div>
          {previewMut.isPending ? (
            <div>Calculating…</div>
          ) : previewMut.data ? (
            <div className="space-y-1">
              <div>Active now: <span className={previewMut.data.active_now ? 'text-green-700' : 'text-amber-700'}>{String(previewMut.data.active_now)}</span> <span className="text-xs text-muted-foreground">({previewMut.data.reason})</span></div>
              <div>Next trigger (local): <span className="font-mono">{previewMut.data.next_trigger_local}</span></div>
              <div>Next trigger (UTC): <span className="font-mono">{previewMut.data.next_trigger_utc}</span></div>
            </div>
          ) : (
            <Button size="sm" onClick={()=>previewMut.mutate({ timing, scope: { video_age_hours: age } })}>Preview</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function toLocalInputValue(v: string | undefined): string {
  if (!v) return '';
  try {
    // If already looks like YYYY-MM-DDTHH:mm, pass through
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)) return v.slice(0,16);
    const d = new Date(v);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}
