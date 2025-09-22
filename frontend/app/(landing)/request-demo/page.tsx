import { redirect } from 'next/navigation';

export default function RequestDemoPage() {
  redirect('/join-waitlist');
  return null;
}
