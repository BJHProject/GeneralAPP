import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-lg text-muted-foreground">Last updated: October 12, 2025</p>
          </div>

          <div className="bg-muted/50 border rounded-lg p-6">
            <p className="text-sm leading-relaxed">
              By using the Service, a binding agreement forms with these Terms. If these Terms are not acceptable, stop using the Service immediately.
            </p>
          </div>

          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Introduction and Agreement</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms of Service ("Terms") govern access to and use of the website, applications, and related features (the "Service"). By accessing, browsing, creating an account, making a purchase, uploading content, or otherwise using any part of the Service, the individual user ("User," "you," or "your") agrees to be bound by these Terms. If you do not agree, you must discontinue all use of the Service.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Eligibility and Age Restrictions</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is intended only for individuals who have reached the age of majority in their place of residence, and in all cases not younger than eighteen (18) years of age, or twenty‑one (21) in jurisdictions requiring a higher threshold. By using the Service, you represent and warrant that you meet these requirements and that your use complies with applicable law.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Account Registration and Security</h2>
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">Certain features may require an account. You must:</p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Provide accurate, current, and complete information</li>
                  <li>Keep your account information updated</li>
                  <li>Safeguard your credentials and all activity under your account</li>
                  <li>Report any suspected unauthorized use promptly</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  The Service is not liable for losses arising from unauthorized access caused by credential compromise.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Payments, Virtual Credits, and Tokens</h2>
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  The Service may offer virtual credits ("Tokens"). Tokens are a limited, revocable, non‑transferable license to use specific features within the Service and have no monetary value outside the Service.
                </p>
                <div className="bg-muted/30 border-l-4 border-primary p-4 rounded">
                  <p className="text-sm font-medium">Important: Tokens cannot be redeemed for cash, exchanged, transferred, or refunded except where required by law. All Token sales are final.</p>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  By purchasing Tokens, you confirm lawful authorization for the payment method used and the accuracy of payment information. Payments are processed by third‑party providers; full payment card data is not stored by the Service.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">User Content and License</h2>
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  Users may submit, upload, generate, or otherwise provide text, images, prompts, or other materials ("User Content"). You represent and warrant ownership of, or authorization for, your User Content and that it does not violate law or third‑party rights.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  By providing User Content, you grant the Service a worldwide, royalty‑free, non‑exclusive, transferable, sublicensable license to host, process, store, display, reproduce, modify, adapt, and otherwise use such User Content solely to operate and improve the Service.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Prohibited Content</h2>
              <p className="text-muted-foreground leading-relaxed">Users may not submit, generate, request, or share content that:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Involves minors or persons under eighteen (18), including any sexualized depiction</li>
                <li>Depicts non‑consensual sexual acts, bestiality, incest, or other illegal or exploitative activity</li>
                <li>Infringes intellectual property, privacy, or publicity rights</li>
                <li>Is defamatory, fraudulent, or otherwise unlawful</li>
                <li>Is prohibited by applicable law or these Terms</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Prohibited Conduct</h2>
              <p className="text-muted-foreground leading-relaxed">Users agree not to:</p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Use the Service for unlawful purposes or to violate others' rights</li>
                <li>Harass, threaten, dox, or incite violence or hate</li>
                <li>Upload viruses, malware, or harmful code</li>
                <li>Probe, scan, or test vulnerabilities or attempt to circumvent security or access controls</li>
                <li>Interfere with the Service's operation, integrity, performance, or availability</li>
                <li>Use automated means to access or use the Service beyond what is expressly permitted</li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">AI‑Generated Content</h2>
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  Some features may generate outputs using artificial intelligence ("AI Content"). AI Content can vary in quality and accuracy and may not meet expectations.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  Users are responsible for how they use, share, or publish AI Content, including compliance with applicable law and platform rules where AI Content is posted. Filters are employed to reduce illegal or prohibited outputs, but no system is perfect; responsibility for prompts and outputs remains with the User.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Moderation; Suspension and Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service may remove content, limit functionality, restrict access, or terminate accounts, with or without notice, if there is a reasonable belief of violations of these Terms, applicable law, or risks to security or integrity. Users may close accounts at any time; closure does not entitle Users to refunds unless required by law.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service (software, design, text, graphics, logos, and other materials provided by the Service, excluding User Content) is protected by intellectual property laws. Users receive a limited, non‑exclusive, non‑transferable license to access and use the Service for its intended purpose, subject to these Terms.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Disclaimer of Warranties</h2>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-sm leading-relaxed">
                  The Service and all content are provided "as is" and "as available." To the fullest extent permitted by law, all warranties are disclaimed, whether express or implied, including merchantability, fitness for a particular purpose, non‑infringement, and accuracy. No guarantee is made that the Service will be uninterrupted, secure, or error‑free.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Limitation of Liability</h2>
              <div className="space-y-3">
                <p className="text-muted-foreground leading-relaxed">
                  To the maximum extent permitted by law, no liability is accepted for indirect, incidental, consequential, special, exemplary, or punitive damages, including loss of profits, data, goodwill, or other intangible losses arising from or relating to use of, or inability to use, the Service.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  In all cases, total aggregate liability for any claim shall not exceed the greater of: (i) the total amounts paid by the User to the Service in the twelve (12) months preceding the claim; or (ii) one hundred euros (€100).
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Governing Law and Dispute Resolution</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms are governed by the laws of the European Union and, where EU law defers to Member State law, the applicable Member State law determined by relevant conflict‑of‑law rules. Disputes shall be resolved before the competent courts or through alternative dispute resolution mechanisms available under EU consumer protection frameworks. Mandatory consumer rights under EU law remain unaffected.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Changes to These Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service may be modified and these Terms updated at any time. Material changes will be posted or otherwise communicated. Continued use after changes take effect constitutes acceptance of the updated Terms. If you do not agree, stop using the Service.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
