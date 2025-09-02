export type HourRange = { start: number; end: number };
export type Blackout = { start: string; end: string };
export type AdvancedTiming = {
  timezone?: string;
  days_of_week?: number[]; // 0=Mon..6=Sun
  hours?: HourRange[];
  delay_seconds?: { min?: number; max?: number };
  blackouts?: Blackout[];
};

export type VideoAgeHours = { min?: number; max?: number };
