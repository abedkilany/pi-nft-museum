
'use client';

import Link from 'next/link';

export function RegisterForm() {
  return (
    <div className="container" style={{ paddingTop: '40px' }}>
      <section className="card upload-form">
        <div className="section-head compact">
          <div>
            <span className="section-kicker">Pi-only access</span>
            <h1>Create account with Pi</h1>
          </div>
          <p>Local registration has been removed. Your account is created automatically the first time you log in from Pi Browser.</p>
        </div>
        <div className="form-actions">
          <Link href="/login" className="button primary">Continue with Pi</Link>
        </div>
      </section>
    </div>
  );
}
