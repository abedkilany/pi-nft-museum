import { Suspense } from 'react';
import LoginPageClient from './LoginPageClient';

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px' }}>Loading...</div>}>
      <LoginPageClient />
    </Suspense>
  );
}