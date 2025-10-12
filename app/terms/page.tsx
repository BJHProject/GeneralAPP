import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function TermsPage() {
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
          <h1>Terms of Service</h1>

          <section>
            <h2>Summary</h2>
            <p>
              By using the Service, a binding agreement forms with these Terms. If these Terms are not acceptable, stop
              using the Service immediately.
            </p>
          </section>

          <section>
            <h2>Introduction and Agreement</h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) govern access to and use of the website, applications, and
              related features (the &ldquo;Service&rdquo;). By accessing, browsing, creating an account, making a
              purchase, uploading content, or otherwise using any part of the Service, the individual user
              (&ldquo;User,&rdquo; &ldquo;you,&rdquo; or &ldquo;your&rdquo;) agrees to be bound by these Terms. If you
              do not agree, you must discontinue all use of the Service.
            </p>
          </section>

          <section>
            <h2>Eligibility and Age Restrictions</h2>
            <p>
              The Service is intended only for individuals who have reached the age of majority in their place of
              residence, and in all cases not younger than eighteen (18) years of age, or twenty‑one (21) in
              jurisdictions requiring a higher threshold. By using the Service, you represent and warrant that you meet
              these requirements and that your use complies with applicable law.
            </p>
          </section>

          <section>
            <h2>Account Registration and Security</h2>
            <p>Certain features may require an account. Accurate, current, and complete information must be provided and kept updated.</p>
            <p>You are solely responsible for safeguarding credentials and all activity under your account.</p>
            <p>
              Any suspected unauthorized use must be reported promptly to [contact email]. The Service is not liable for
              losses arising from unauthorized access caused by credential compromise.
            </p>
          </section>

          <section>
            <h2>Payments, Virtual Credits, and Tokens</h2>
            <p>
              The Service may offer virtual credits (&ldquo;Tokens&rdquo;). Tokens are a limited, revocable,
              non‑transferable license to use specific features within the Service and have no monetary value outside
              the Service.
            </p>
            <p>
              Tokens cannot be redeemed for cash, exchanged, transferred, or refunded except where required by law. All
              Token sales are final.
            </p>
            <p>
              By purchasing Tokens, you confirm lawful authorization for the payment method used and the accuracy of
              payment information.
            </p>
            <p>
              Payments are processed by third‑party providers; full payment card data is not stored by the Service.
              Users are responsible for any taxes associated with purchases.
            </p>
          </section>

          <section>
            <h2>User Content and License</h2>
            <p>
              Users may submit, upload, generate, or otherwise provide text, images, prompts, or other materials
              (&ldquo;User Content&rdquo;).
            </p>
            <p>
              Users represent and warrant ownership of, or authorization for, their User Content and that it does not
              violate law or third‑party rights.
            </p>
            <p>
              By providing User Content, the User grants the Service a worldwide, royalty‑free, non‑exclusive,
              transferable, sublicensable license to host, process, store, display, reproduce, modify, adapt, and
              otherwise use such User Content solely to operate and improve the Service.
            </p>
            <p>
              The Service may (but is not obligated to) monitor, remove, restrict, or disable access to content to
              enforce these Terms and applicable law.
            </p>
          </section>

          <section>
            <h2>Prohibited Content</h2>
            <p>Users may not submit, generate, request, or share content that:</p>
            <ul>
              <li>Involves minors or persons under eighteen (18), including any sexualized depiction.</li>
              <li>Depicts non‑consensual sexual acts, bestiality, incest, or other illegal or exploitative activity.</li>
              <li>Infringes intellectual property, privacy, or publicity rights.</li>
              <li>Is defamatory, fraudulent, or otherwise unlawful.</li>
              <li>Is prohibited by applicable law or these Terms.</li>
            </ul>
          </section>

          <section>
            <h2>Prohibited Conduct</h2>
            <p>Users agree not to:</p>
            <ul>
              <li>Use the Service for unlawful purposes or to violate others&rsquo; rights.</li>
              <li>Harass, threaten, dox, or incite violence or hate.</li>
              <li>Upload viruses, malware, or harmful code.</li>
              <li>
                Probe, scan, or test vulnerabilities or attempt to circumvent security or access controls.
              </li>
              <li>
                Interfere with the Service&rsquo;s operation, integrity, performance, or availability.
              </li>
              <li>Use automated means to access or use the Service beyond what is expressly permitted.</li>
            </ul>
          </section>

          <section>
            <h2>AI‑Generated Content</h2>
            <p>
              Some features may generate outputs using artificial intelligence (&ldquo;AI Content&rdquo;). AI Content
              can vary in quality and accuracy and may not meet expectations.
            </p>
            <p>
              Users are responsible for how they use, share, or publish AI Content, including compliance with applicable
              law and platform rules where AI Content is posted.
            </p>
            <p>
              Filters are employed to reduce illegal or prohibited outputs, but no system is perfect; responsibility for
              prompts and outputs remains with the User.
            </p>
          </section>

          <section>
            <h2>Moderation; Suspension and Termination</h2>
            <p>
              The Service may remove content, limit functionality, restrict access, or terminate accounts, with or
              without notice, if there is a reasonable belief of violations of these Terms, applicable law, or risks to
              security or integrity.
            </p>
            <p>
              Users may close accounts at any time; closure does not entitle Users to refunds unless required by law.
            </p>
          </section>

          <section>
            <h2>Intellectual Property (Service Materials)</h2>
            <p>
              The Service (software, design, text, graphics, logos, and other materials provided by the Service,
              excluding User Content) is protected by intellectual property laws.
            </p>
            <p>
              Users receive a limited, non‑exclusive, non‑transferable license to access and use the Service for its
              intended purpose, subject to these Terms.
            </p>
          </section>

          <section>
            <h2>Third‑Party Services and Links</h2>
            <p>
              The Service may integrate or link to third‑party services. Those services are governed by their own terms
              and policies. The Service is not responsible for third‑party content, actions, or practices.
            </p>
          </section>

          <section>
            <h2>Privacy</h2>
            <p>
              Use of the Service is subject to the Privacy Policy referenced on the Service, which explains how
              information is collected, used, and shared. By using the Service, Users consent to those practices.
            </p>
          </section>

          <section>
            <h2>Disclaimer of Warranties</h2>
            <p>
              The Service and all content are provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the
              fullest extent permitted by law, all warranties are disclaimed, whether express or implied, including
              merchantability, fitness for a particular purpose, non‑infringement, and accuracy.
            </p>
            <p>No guarantee is made that the Service will be uninterrupted, secure, or error‑free.</p>
          </section>

          <section>
            <h2>Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, no liability is accepted for indirect, incidental, consequential,
              special, exemplary, or punitive damages, including loss of profits, data, goodwill, or other intangible
              losses arising from or relating to use of, or inability to use, the Service.
            </p>
            <p>
              In all cases, total aggregate liability for any claim shall not exceed the greater of: (i) the total
              amounts paid by the User to the Service in the twelve (12) months preceding the claim; or (ii) one hundred
              euros (€100).
            </p>
          </section>

          <section>
            <h2>Indemnification</h2>
            <p>
              Users agree to indemnify and hold harmless the Service, its operators, maintainers, and contributors from
              and against claims, liabilities, damages, losses, and expenses (including reasonable attorneys&rsquo; fees)
              arising out of or related to User Content, use of the Service, or violation of these Terms or applicable
              law.
            </p>
          </section>

          <section>
            <h2>Governing Law and Dispute Resolution (EU)</h2>
            <p>
              These Terms are governed by the laws of the European Union and, where EU law defers to Member State law,
              the applicable Member State law determined by relevant conflict‑of‑law rules.
            </p>
            <p>
              Disputes shall be resolved before the competent courts or through alternative dispute resolution mechanisms
              available under EU consumer protection frameworks. Mandatory consumer rights under EU law remain
              unaffected.
            </p>
          </section>

          <section>
            <h2>Notice‑and‑Takedown (EU Copyright/Platform Rules)</h2>
            <p>
              The Service respects intellectual property rights and operates a notice‑and‑takedown process in line with
              EU legal standards.
            </p>
            <p>
              To submit a notice, provide: identification of the protected work(s), specific location(s) of the material,
              contact information, and a statement of good‑faith belief and accuracy. Notices may be shared with the user
              who posted the material and relevant authorities as required by law.
            </p>
            <p>Repeat infringement may result in account restrictions or termination.</p>
          </section>

          <section>
            <h2>Changes to the Service and to These Terms</h2>
            <p>
              The Service may be modified and these Terms updated at any time. Material changes will be posted or
              otherwise communicated. Continued use after changes take effect constitutes acceptance of the updated
              Terms. If you do not agree, stop using the Service.
            </p>
          </section>

          <section>
            <h2>Assignment</h2>
            <p>
              Users may not assign or transfer rights or obligations under these Terms without prior written consent. The
              Service may assign these Terms in connection with reorganization, transfer, or operation of the Service.
            </p>
          </section>

          <section>
            <h2>Severability; Waiver</h2>
            <p>
              If any provision is held unenforceable, the remaining provisions remain in full force. Failure to enforce a
              provision is not a waiver of the right to enforce it later.
            </p>
          </section>

          <section>
            <h2>Entire Agreement</h2>
            <p>
              These Terms, together with any policies referenced or linked (including the Privacy Policy), constitute the
              entire agreement regarding use of the Service and supersede prior understandings on the same subject.
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
