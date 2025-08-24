export function openPrefilledEmail(to: string, subject: string, body: string) {
  const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  // Use location.href so it works reliably across browsers
  if (typeof window !== 'undefined') window.location.href = mailto;
}
