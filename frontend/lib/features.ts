// frontend/lib/features.ts
// Centralized feature flags for conditional UI rendering.
// Use NEXT_PUBLIC_ env vars to control visibility at build time.

const boolFromEnv = (key: string, defaultValue = false): boolean => {
  const v = process.env[key];
  if (v == null) return defaultValue;
  const s = String(v).toLowerCase().trim();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on' || s === 'enabled';
};

export const features = {
  showAutomationButton: boolFromEnv('NEXT_PUBLIC_SHOW_AUTOMATION_BUTTON', false),
  showEmergencyControls: boolFromEnv('NEXT_PUBLIC_SHOW_EMERGENCY_CONTROLS', false),
  showTestModeToggle: boolFromEnv('NEXT_PUBLIC_SHOW_TEST_MODE_TOGGLE', false),
  showAutoPauseToggle: boolFromEnv('NEXT_PUBLIC_SHOW_AUTO_PAUSE_TOGGLE', false),
  showPersonaBadge: boolFromEnv('NEXT_PUBLIC_SHOW_PERSONA_BADGE', false),
};
