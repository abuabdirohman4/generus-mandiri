import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect ke halaman signin sebagai default
  redirect('/signin');
}
