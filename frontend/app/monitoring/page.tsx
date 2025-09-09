import { redirect } from 'next/navigation';

export default function LegacyMonitoringRedirect() {
  redirect('/social-monitoring');
  return null;
}
