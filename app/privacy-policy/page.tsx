export const metadata = {
  title: 'Privacy Policy | Pi NFT Museum',
  description: 'Privacy Policy for Pi NFT Museum.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="container" style={{ maxWidth: 900, paddingTop: 32, paddingBottom: 48 }}>
      <div className="card" style={{ padding: 24 }}>
        <h1 style={{ marginBottom: 12 }}>Privacy Policy</h1>
        <p style={{ opacity: 0.8, marginBottom: 24 }}>Last updated: March 18, 2026</p>

        <section style={{ marginBottom: 24 }}>
          <h2>1. Overview</h2>
          <p>
            Pi NFT Museum (“we”, “our”, or “the platform”) respects your privacy. This Privacy Policy
            explains what information we collect, how we use it, and how we protect it when you use our website
            and services.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>2. Information We Collect</h2>
          <p>We may collect the following types of information:</p>
          <ul>
            <li>Basic account information such as your Pi username, Pi user ID, and role on the platform.</li>
            <li>Profile and artwork information you choose to submit, including titles, descriptions, images, and metadata.</li>
            <li>Technical information such as browser type, device details, IP-related request data, and usage logs.</li>
            <li>Activity data such as comments, reactions, submissions, moderation actions, and platform interactions.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>3. How We Use Information</h2>
          <p>We use collected information to:</p>
          <ul>
            <li>Provide access to the platform and authenticate users.</li>
            <li>Display, review, moderate, and manage submitted artworks.</li>
            <li>Improve security, prevent abuse, and troubleshoot technical issues.</li>
            <li>Operate platform features such as reactions, comments, mint eligibility, and administration tools.</li>
          </ul>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>4. Cookies and Session Data</h2>
          <p>
            We use cookies and similar session technologies to keep you signed in, maintain secure sessions,
            and support authentication flows, including Pi-related login functionality.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>5. Data Sharing</h2>
          <p>
            We do not sell your personal data. We may share limited information only when necessary to operate
            the platform, comply with legal obligations, protect the platform, or work with trusted service providers
            such as hosting, database, or infrastructure providers.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>6. Data Storage and Security</h2>
          <p>
            We take reasonable steps to protect your information. However, no method of transmission or storage is
            completely secure, and we cannot guarantee absolute security.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>7. User Content</h2>
          <p>
            Any artwork, text, comments, or other content you submit may be visible to administrators, reviewers,
            and in some cases other users, depending on the workflow and publication status of the content.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>8. Children’s Privacy</h2>
          <p>
            The platform is not intended for children under the age required by applicable law. If you believe a child
            has provided personal information, please contact us so we can review the matter.
          </p>
        </section>

        <section style={{ marginBottom: 24 }}>
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Continued use of the platform after changes are posted
            means you accept the updated policy.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>
            If you have questions about this Privacy Policy, please contact the platform administrator through the
            official support channel listed on the website.
          </p>
        </section>
      </div>
    </main>
  );
}
