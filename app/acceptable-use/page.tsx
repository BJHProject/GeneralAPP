import Link from "next/link"
import { ArrowLeft, AlertTriangle, Shield, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function AcceptableUsePage() {
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
            <h1 className="text-4xl font-bold tracking-tight">Acceptable Use Policy</h1>
            <p className="text-lg text-muted-foreground">Content Policy - Last updated: October 12, 2025</p>
          </div>

          <div className="bg-muted/50 border rounded-lg p-6">
            <p className="text-sm leading-relaxed">
              This Acceptable Use Policy is part of the Terms of Service governing the website, applications, and related features. By using the Service, you agree to comply with this Policy.
            </p>
          </div>

          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                Purpose
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                This Policy exists to preserve the safety, legality, and integrity of the Service, to protect Users, and to ensure compliance with applicable laws, including child protection, intellectual property, privacy/data protection, and online safety requirements.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">General Principles</h2>
              <div className="grid gap-3">
                <div className="flex gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-sm">Act in good faith and refrain from conduct that violates law, infringes third‑party rights, or threatens the safety or rights of others</p>
                </div>
                <div className="flex gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-sm">Do not expose other Users or the Service to harm, liability, loss, or undue risk</p>
                </div>
                <div className="flex gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <p className="text-sm">Do not interfere with or disrupt the proper functioning, security, or integrity of the Service</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                Prohibited Content
              </h2>
              <p className="text-muted-foreground">Users must not generate, upload, transmit, request, or otherwise make available content that:</p>
              <div className="space-y-2">
                <div className="p-3 border-l-4 border-destructive bg-destructive/5 rounded">
                  <p className="text-sm font-medium">Involves minors or persons under eighteen (18), or that may reasonably be perceived as depicting such persons, whether fictional or realistic</p>
                </div>
                <div className="p-3 border-l-4 border-destructive bg-destructive/5 rounded">
                  <p className="text-sm font-medium">Depicts or promotes non‑consensual sexual activity, sexual assault, exploitation, or coercion</p>
                </div>
                <div className="p-3 border-l-4 border-destructive bg-destructive/5 rounded">
                  <p className="text-sm font-medium">Depicts bestiality, incest, or other illegal or extreme sexual conduct</p>
                </div>
                <div className="p-3 border-l-4 border-destructive bg-destructive/5 rounded">
                  <p className="text-sm font-medium">Is excessively violent, degrading, or otherwise unlawful</p>
                </div>
                <div className="p-3 border-l-4 border-destructive bg-destructive/5 rounded">
                  <p className="text-sm font-medium">Infringes copyrights, trademarks, trade secrets, moral rights, or other intellectual property rights</p>
                </div>
                <div className="p-3 border-l-4 border-destructive bg-destructive/5 rounded">
                  <p className="text-sm font-medium">Misappropriates the likeness or identity of real persons without lawful authority and documented consent</p>
                </div>
                <div className="p-3 border-l-4 border-destructive bg-destructive/5 rounded">
                  <p className="text-sm font-medium">Promotes terrorism, hate, discrimination, harassment, or abuse based on protected characteristics</p>
                </div>
                <div className="p-3 border-l-4 border-destructive bg-destructive/5 rounded">
                  <p className="text-sm font-medium">Contains viruses, malware, spyware, or any code intended to disrupt, damage, or compromise systems</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Prohibited Conduct</h2>
              <p className="text-muted-foreground">Users must not:</p>
              <ul className="space-y-2">
                <li className="flex gap-3 p-3 border rounded-lg">
                  <span className="text-destructive mt-1">✗</span>
                  <span className="text-sm">Use the Service for unlawful purposes or in furtherance of unlawful activities</span>
                </li>
                <li className="flex gap-3 p-3 border rounded-lg">
                  <span className="text-destructive mt-1">✗</span>
                  <span className="text-sm">Reverse engineer, decompile, scrape, or otherwise interfere with code, infrastructure, or technical protections</span>
                </li>
                <li className="flex gap-3 p-3 border rounded-lg">
                  <span className="text-destructive mt-1">✗</span>
                  <span className="text-sm">Circumvent or attempt to circumvent security, authentication, or authorization measures</span>
                </li>
                <li className="flex gap-3 p-3 border rounded-lg">
                  <span className="text-destructive mt-1">✗</span>
                  <span className="text-sm">Harass, threaten, or abuse other Users or Service moderators/maintainers</span>
                </li>
                <li className="flex gap-3 p-3 border rounded-lg">
                  <span className="text-destructive mt-1">✗</span>
                  <span className="text-sm">Exploit the Service for commercial gain unless expressly permitted</span>
                </li>
                <li className="flex gap-3 p-3 border rounded-lg">
                  <span className="text-destructive mt-1">✗</span>
                  <span className="text-sm">Use bots, scripts, or automated tools to scrape or collect data beyond what is expressly allowed</span>
                </li>
              </ul>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Intellectual Property Protection</h2>
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 space-y-4">
                <p className="text-sm leading-relaxed">
                  The Service respects the intellectual property rights of others and expects Users to do the same. We will respond expeditiously to valid notices of alleged infringement under applicable law, including the EU legal framework and, where relevant, the U.S. DMCA.
                </p>
                <div className="border-t border-blue-500/20 pt-4">
                  <h3 className="font-semibold mb-2">Notice Requirements:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Identification of the copyrighted work</li>
                    <li>Identification and location (URL) of the allegedly infringing material</li>
                    <li>Contact information (name, address, phone, email)</li>
                    <li>Good‑faith statement that use is not authorized</li>
                    <li>Statement of accuracy made under penalty of perjury</li>
                    <li>Electronic or physical signature</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Flag className="h-6 w-6 text-primary" />
                Reporting Violations
              </h2>
              <div className="border rounded-lg p-6 bg-muted/30">
                <p className="text-sm leading-relaxed mb-4">
                  To report suspected violations, security issues, or illegal content, contact: [contact email] or [web form URL].
                </p>
                <p className="text-sm text-muted-foreground">
                  Include sufficient detail (links, timestamps, screenshots) to allow assessment and action.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Policy Updates</h2>
              <p className="text-muted-foreground leading-relaxed">
                This Policy may be amended or updated to reflect legal, regulatory, or operational requirements. Material changes will be communicated via the Service or by notice where required. Continued use after the effective date of changes constitutes acceptance of the updated Policy.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
