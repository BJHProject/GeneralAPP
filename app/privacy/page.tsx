import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/">
          <Button variant="ghost" className="mb-6 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        <article className="prose prose-neutral dark:prose-invert max-w-none">
          <h1>Privacy Policy</h1>

          <section>
            <h2>Introduction</h2>
            <p>
              This Privacy Policy explains how we collect, use, store, and protect your personal information when you
              use our AI generation service. By using the Service, you consent to the data practices described in this
              policy.
            </p>
          </section>

          <section>
            <h2>Information We Collect</h2>

            <h3>Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul>
              <li>Email address</li>
              <li>Authentication credentials (managed by our authentication provider)</li>
              <li>Profile information you choose to provide</li>
            </ul>

            <h3>Usage Information</h3>
            <p>We automatically collect information about how you use the Service:</p>
            <ul>
              <li>IP address and device information</li>
              <li>Browser type and user agent</li>
              <li>Login timestamps and session data</li>
              <li>Feature usage and generation statistics</li>
            </ul>

            <h3>User Content</h3>
            <p>We store content you create or provide:</p>
            <ul>
              <li>Text prompts for image and video generation</li>
              <li>Generated images and videos</li>
              <li>Edited images and modification instructions</li>
            </ul>

            <h3>Transaction Information</h3>
            <p>When you purchase credits:</p>
            <ul>
              <li>Credit purchase history</li>
              <li>Credit usage and transaction logs</li>
              <li>Payment information (processed by third-party payment providers; we do not store full payment card details)</li>
            </ul>
          </section>

          <section>
            <h2>How We Use Your Information</h2>
            <p>We use your information to:</p>
            <ul>
              <li><strong>Provide the Service:</strong> Process your requests, generate content, and manage your account</li>
              <li><strong>Improve the Service:</strong> Analyze usage patterns and optimize performance</li>
              <li><strong>Ensure Security:</strong> Detect and prevent fraud, abuse, and unauthorized access</li>
              <li><strong>Comply with Law:</strong> Meet legal obligations and respond to lawful requests</li>
              <li><strong>Communicate:</strong> Send important updates about the Service (we do not send marketing emails unless you opt in)</li>
            </ul>
          </section>

          <section>
            <h2>Data Storage and Security</h2>

            <h3>Storage Locations</h3>
            <p>Your data is stored in:</p>
            <ul>
              <li><strong>Database:</strong> User accounts, credits, and metadata (hosted on Supabase)</li>
              <li><strong>Media Storage:</strong> Generated images and videos (hosted on Vercel Blob)</li>
            </ul>

            <h3>Data Retention</h3>
            <ul>
              <li><strong>Temporary Content:</strong> Unsaved generations are deleted after 24 hours</li>
              <li><strong>Saved Content:</strong> Persists until you delete it or close your account</li>
              <li><strong>Account Data:</strong> Retained as long as your account is active</li>
              <li><strong>Transaction Logs:</strong> Kept for audit and compliance purposes (typically 7 years)</li>
            </ul>

            <h3>Security Measures</h3>
            <p>We implement industry-standard security practices:</p>
            <ul>
              <li>Encryption in transit (HTTPS/TLS)</li>
              <li>Encryption at rest for sensitive data</li>
              <li>Row-level security in database</li>
              <li>Rate limiting and abuse prevention</li>
              <li>Regular security audits</li>
            </ul>
          </section>

          <section>
            <h2>Data Sharing and Third Parties</h2>
            <p>We share your information only in limited circumstances:</p>

            <h3>Service Providers</h3>
            <p>We use trusted third-party services:</p>
            <ul>
              <li><strong>Supabase:</strong> Authentication and database hosting</li>
              <li><strong>Vercel:</strong> Media storage and hosting</li>
              <li><strong>AI Providers:</strong> Your prompts are sent to AI services to generate content (HuggingFace, Wavespeed, FAL.ai)</li>
            </ul>

            <h3>Legal Requirements</h3>
            <p>We may disclose information when required by law or to:</p>
            <ul>
              <li>Comply with legal processes or government requests</li>
              <li>Protect our rights, property, or safety</li>
              <li>Investigate potential violations of our Terms</li>
            </ul>

            <h3>No Sale of Data</h3>
            <p>We do not sell, rent, or trade your personal information to third parties for marketing purposes.</p>
          </section>

          <section>
            <h2>Your Rights (GDPR/EU)</h2>
            <p>Under EU data protection law, you have the right to:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
              <li><strong>Erasure:</strong> Request deletion of your data (&ldquo;right to be forgotten&rdquo;)</li>
              <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
              <li><strong>Restriction:</strong> Limit how we process your data</li>
              <li><strong>Objection:</strong> Object to certain types of processing</li>
              <li><strong>Withdraw Consent:</strong> Revoke consent for data processing at any time</li>
            </ul>
            <p>To exercise these rights, contact us at [contact email].</p>
          </section>

          <section>
            <h2>Cookies and Tracking</h2>
            <p>We use cookies and similar technologies to:</p>
            <ul>
              <li>Maintain your session and keep you logged in</li>
              <li>Remember your preferences</li>
              <li>Analyze usage with analytics services (Vercel Analytics)</li>
            </ul>
            <p>You can control cookies through your browser settings, but disabling them may affect Service functionality.</p>
          </section>

          <section>
            <h2>Children&rsquo;s Privacy</h2>
            <p>
              The Service is not intended for individuals under 18 years of age. We do not knowingly collect personal
              information from children. If we discover that a child has provided personal information, we will delete it
              immediately.
            </p>
          </section>

          <section>
            <h2>International Data Transfers</h2>
            <p>
              Your data may be transferred to and processed in countries outside the EU. We ensure appropriate safeguards
              are in place, including:
            </p>
            <ul>
              <li>Standard Contractual Clauses (SCCs) with service providers</li>
              <li>Adequacy decisions by the European Commission</li>
              <li>Other legally compliant transfer mechanisms</li>
            </ul>
          </section>

          <section>
            <h2>Changes to This Privacy Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be communicated via the Service
              or by email. Continued use after changes take effect constitutes acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2>Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or how we handle your data, please contact us at:
              [contact email]
            </p>
            <p>
              For EU-specific data protection concerns, you may also contact your local data protection authority.
            </p>
          </section>

          <section>
            <h2>Data Protection Officer</h2>
            <p>
              If required by law, we will appoint a Data Protection Officer (DPO). Contact details will be provided here
              when applicable.
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
