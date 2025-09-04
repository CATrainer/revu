import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/request-demo');
  return null;
}