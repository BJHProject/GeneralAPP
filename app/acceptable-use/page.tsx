import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AcceptableUsePage() {
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
          <h1>Acceptable Use Policy (Content Policy)</h1>

          <section>
            <h2>Introduction</h2>
            <p>
              This Acceptable Use Policy (the &ldquo;Policy&rdquo;) is part of the Terms of Service governing the
              website, applications, and related features (the &ldquo;Service&rdquo;). By accessing, browsing,
              registering, uploading content, or otherwise using the Service, the user (the &ldquo;User&rdquo;) agrees
              to comply with this Policy.
            </p>
          </section>

          <section>
            <h2>Purpose</h2>
            <p>
              This Policy exists to preserve the safety, legality, and integrity of the Service, to protect Users, and
              to ensure compliance with applicable laws, including child protection, intellectual property, privacy/data
              protection, and online safety requirements.
            </p>
          </section>

          <section>
            <h2>General Principles</h2>
            <ul>
              <li>
                Act in good faith and refrain from conduct that violates law, infringes third‑party rights, or threatens
                the safety or rights of others.
              </li>
              <li>Do not expose other Users or the Service to harm, liability, loss, or undue risk.</li>
              <li>
                Do not interfere with or disrupt the proper functioning, security, or integrity of the Service.
              </li>
            </ul>
          </section>

          <section>
            <h2>Prohibited Content</h2>
            <p>Users must not generate, upload, transmit, request, or otherwise make available content that:</p>
            <ul>
              <li>
                Involves minors or persons under eighteen (18), or that may reasonably be perceived as depicting such
                persons, whether fictional or realistic.
              </li>
              <li>
                Depicts or promotes non‑consensual sexual activity, sexual assault, exploitation, or coercion.
              </li>
              <li>Depicts bestiality, incest, or other illegal or extreme sexual conduct.</li>
              <li>Is excessively violent, degrading, or otherwise unlawful.</li>
              <li>
                Infringes copyrights, trademarks, trade secrets, moral rights, or other intellectual property rights.
              </li>
              <li>
                Misappropriates the likeness or identity of real persons, including public figures or private
                individuals, without lawful authority and documented consent.
              </li>
              <li>
                Promotes terrorism, hate, discrimination, harassment, or abuse based on protected characteristics or
                status.
              </li>
              <li>
                Contains viruses, malware, spyware, or any code intended to disrupt, damage, or compromise systems, data,
                or networks.
              </li>
            </ul>
          </section>

          <section>
            <h2>Prohibited Conduct</h2>
            <p>Users must not:</p>
            <ul>
              <li>Use the Service for unlawful purposes or in furtherance of unlawful activities.</li>
              <li>
                Reverse engineer, decompile, scrape, or otherwise interfere with code, infrastructure, rate limits,
                access controls, or technical protections.
              </li>
              <li>Circumvent or attempt to circumvent security, authentication, or authorization measures.</li>
              <li>Harass, threaten, or abuse other Users or Service moderators/maintainers.</li>
              <li>
                Exploit the Service for commercial gain unless expressly permitted by the Service&rsquo;s terms or a
                written authorization.
              </li>
              <li>
                Use bots, scripts, or automated tools to scrape, mine, harvest, or collect data beyond what is expressly
                allowed.
              </li>
            </ul>
          </section>

          <section>
            <h2>Intellectual Property Protection and Notice‑and‑Takedown (EU/DMCA)</h2>
            <ul>
              <li>
                The Service respects the intellectual property rights of others and expects Users to do the same.
              </li>
              <li>
                The Service will respond expeditiously to valid notices of alleged infringement under applicable law,
                including the EU legal framework and, where relevant, the U.S. DMCA.
              </li>
              <li>
                A notice should include: identification of the copyrighted work; identification and location (URL) of the
                allegedly infringing material; the notifier&rsquo;s name, postal address, telephone number, and email; a
                good‑faith statement that the use is not authorized; a statement made under penalty of perjury that the
                information is accurate and that the notifier is authorized to act; and an electronic or physical
                signature.
              </li>
              <li>Send notices to: [contact email] or [web form URL].</li>
              <li>
                A repeat‑infringer policy may result in account restrictions or termination where appropriate.
              </li>
              <li>
                Where applicable, Users may submit a counter‑notice that meets legal requirements; disputed materials may
                remain disabled as required by law.
              </li>
            </ul>
          </section>

          <section>
            <h2>Enforcement Measures</h2>
            <p>The Service may, at its discretion and where lawful:</p>
            <ul>
              <li>Remove or disable access to offending content immediately.</li>
              <li>Temporarily suspend or permanently terminate accounts.</li>
              <li>Restrict features, throttle usage, or apply additional verification.</li>
              <li>Report suspected unlawful conduct to competent authorities.</li>
              <li>Pursue legal remedies, including injunctive relief and damages.</li>
            </ul>
          </section>

          <section>
            <h2>Indemnification</h2>
            <p>
              The User agrees to indemnify and hold harmless the Service&rsquo;s operators, maintainers, and
              contributors from claims, damages, liabilities, losses, costs, and expenses (including reasonable legal
              fees) arising out of the User&rsquo;s violation of this Policy, User Content, misuse of the Service, or
              violation of third‑party rights.
            </p>
          </section>

          <section>
            <h2>Reporting</h2>
            <p>
              To report suspected violations, security issues, or illegal content, contact: [contact email] or [web form
              URL]. Include sufficient detail (links, timestamps, screenshots) to allow assessment and action.
            </p>
          </section>

          <section>
            <h2>Policy Updates</h2>
            <p>
              This Policy may be amended or updated to reflect legal, regulatory, or operational requirements. Material
              changes will be communicated via the Service or by notice where required. Continued use after the effective
              date of changes constitutes acceptance of the updated Policy.
            </p>
          </section>

          <section>
            <h2>Relationship to Other Terms</h2>
            <p>
              This Policy supplements the Terms of Service and Privacy Policy. If there is a conflict, the Terms of
              Service control to the extent permitted by applicable law. Mandatory consumer and data‑protection rights
              under EU law remain unaffected.
            </p>
          </section>
        </article>
      </div>
    </div>
  )
}
