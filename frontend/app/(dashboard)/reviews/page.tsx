// frontend/app/(dashboard)/reviews/page.tsx
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/comments');
  return null;
}