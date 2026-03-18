export const metadata = {
  title: 'Terms of Service | Pi NFT Museum',
  description: 'Terms of Service for Pi NFT Museum.',
};

export default function TermsOfServicePage() {
  return (
    <main className="container" style={{ maxWidth: 900, paddingTop: 32, paddingBottom: 48 }}>
      <div className="card" style={{ padding: 24 }}>
        <h1 style={{ marginBottom: 12 }}>Terms of Service</h1>
        <p style={{ opacity: 0.8, marginBottom: 24 }}>Last updated: March 18, 2026</p>

        <section style={{ marginBottom: 24 }}>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Pi NFT Museum, you agree to these Terms of Service. If you do not agree,
            you should not use the platform.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>2. Platform Purpose</h2>
          <p>
            Pi NFT Museum is a platform for submitting, reviewing, displaying, and managing digital artworks and
            related metadata. Some features may be experimental and may change over time.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>3. User Responsibilities</h2>
          <ul>
            <li>You are responsible for the content you submit and the accuracy of the information you provide.</li>
            <li>You must not submit unlawful, abusive, infringing, misleading, or harmful content.</li>
            <li>You must not attempt to disrupt, exploit, or interfere with the platform or other users.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>4. Content Ownership</h2>
          <p>
            You retain ownership of the content you submit, except to the extent required for the platform to host,
            process, review, display, and manage that content as part of its services.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>5. Moderation and Removal</h2>
          <p>
            We reserve the right to review, restrict, reject, remove, or archive any content or account activity that
            violates these terms, platform rules, or applicable law.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>6. Experimental Features</h2>
          <p>
            Some platform features, including review workflows, scoring, premium status, or mint-related tools,
            may be experimental, unavailable in some environments, or subject to change without notice.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>7. No Guarantee</h2>
          <p>
            We do not guarantee uninterrupted availability, error-free operation, approval of submitted works,
            or the future availability of any specific feature.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Pi NFT Museum and its operators are not liable for indirect,
            incidental, consequential, or special damages arising from your use of the platform.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>9. Termination</h2>
          <p>
            We may suspend or terminate access to the platform at any time if necessary for security, maintenance,
            legal compliance, or policy enforcement.
          </p>
        </section>

        <section>
          <h2>10. Changes to These Terms</h2>
          <p>
            We may update these Terms of Service from time to time. Continued use of the platform after updates are
            posted means you accept the revised terms.
          </p>
        </section>
      </div>
    </main>
  );
}
