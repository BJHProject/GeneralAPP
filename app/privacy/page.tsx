import Link from "next/link"
import { ArrowLeft, Shield, Lock, Database, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyPage() {
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
            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-lg text-muted-foreground">Last updated: October 12, 2025</p>
          </div>

          <div className="bg-muted/50 border rounded-lg p-6">
            <p className="text-sm leading-relaxed">
              This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our AI generation service. By using the Service, you consent to the data practices described in this policy.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">EU Compliant</h3>
                <p className="text-sm text-muted-foreground">Full GDPR compliance with data protection rights</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Lock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Secure Storage</h3>
                <p className="text-sm text-muted-foreground">Encryption in transit and at rest</p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                Information We Collect
              </h2>
              
              <div className="space-y-6">
                <div className="border-l-4 border-primary pl-4">
                  <h3 className="text-lg font-semibold mb-2">Account Information</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>Email address</li>
                    <li>Authentication credentials (managed by our provider)</li>
                    <li>Profile information you choose to provide</li>
                  </ul>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="text-lg font-semibold mb-2">Usage Information</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>IP address and device information</li>
                    <li>Browser type and user agent</li>
                    <li>Login timestamps and session data</li>
                    <li>Feature usage and generation statistics</li>
                  </ul>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="text-lg font-semibold mb-2">User Content</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>Text prompts for image and video generation</li>
                    <li>Generated images and videos</li>
                    <li>Edited images and modification instructions</li>
                  </ul>
                </div>

                <div className="border-l-4 border-primary pl-4">
                  <h3 className="text-lg font-semibold mb-2">Transaction Information</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>Credit purchase history</li>
                    <li>Credit usage and transaction logs</li>
                    <li>Payment information (processed by third-party providers)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold flex items-center gap-2">
                <Eye className="h-6 w-6 text-primary" />
                How We Use Your Information
              </h2>
              <div className="grid gap-3">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">Provide the Service</h3>
                  <p className="text-sm text-muted-foreground">Process your requests, generate content, and manage your account</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">Improve the Service</h3>
                  <p className="text-sm text-muted-foreground">Analyze usage patterns and optimize performance</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">Ensure Security</h3>
                  <p className="text-sm text-muted-foreground">Detect and prevent fraud, abuse, and unauthorized access</p>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h3 className="font-semibold mb-1">Comply with Law</h3>
                  <p className="text-sm text-muted-foreground">Meet legal obligations and respond to lawful requests</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Data Storage and Security</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Storage Locations</h3>
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded">
                      <Database className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Database (Supabase)</p>
                        <p className="text-sm text-muted-foreground">User accounts, credits, and metadata</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded">
                      <Database className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium">Media Storage (Vercel Blob)</p>
                        <p className="text-sm text-muted-foreground">Generated images and videos</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Data Retention</h3>
                  <ul className="space-y-2">
                    <li className="flex gap-3 p-3 border rounded">
                      <span className="font-medium min-w-[140px]">Temporary Content:</span>
                      <span className="text-muted-foreground">Deleted after 24 hours</span>
                    </li>
                    <li className="flex gap-3 p-3 border rounded">
                      <span className="font-medium min-w-[140px]">Saved Content:</span>
                      <span className="text-muted-foreground">Until you delete it</span>
                    </li>
                    <li className="flex gap-3 p-3 border rounded">
                      <span className="font-medium min-w-[140px]">Transaction Logs:</span>
                      <span className="text-muted-foreground">7 years (audit requirement)</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Security Measures
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                    <li>Encryption in transit (HTTPS/TLS)</li>
                    <li>Encryption at rest for sensitive data</li>
                    <li>Row-level security in database</li>
                    <li>Rate limiting and abuse prevention</li>
                    <li>Regular security audits</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Third-Party Services</h2>
              <p className="text-muted-foreground">We use trusted third-party services:</p>
              <div className="grid gap-3">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-1">Supabase</h3>
                  <p className="text-sm text-muted-foreground">Authentication and database hosting</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-1">Vercel</h3>
                  <p className="text-sm text-muted-foreground">Media storage and hosting</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-1">AI Providers</h3>
                  <p className="text-sm text-muted-foreground">HuggingFace, Wavespeed, FAL.ai for content generation</p>
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <p className="text-sm font-medium">We do not sell, rent, or trade your personal information to third parties for marketing purposes.</p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Your Rights (GDPR/EU)</h2>
              <p className="text-muted-foreground mb-4">Under EU data protection law, you have the right to:</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg">
                  <h3 className="font-semibold text-sm mb-1">Access</h3>
                  <p className="text-xs text-muted-foreground">Request a copy of your data</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h3 className="font-semibold text-sm mb-1">Rectification</h3>
                  <p className="text-xs text-muted-foreground">Correct inaccurate data</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h3 className="font-semibold text-sm mb-1">Erasure</h3>
                  <p className="text-xs text-muted-foreground">Request deletion (right to be forgotten)</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h3 className="font-semibold text-sm mb-1">Portability</h3>
                  <p className="text-xs text-muted-foreground">Receive data in machine-readable format</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h3 className="font-semibold text-sm mb-1">Restriction</h3>
                  <p className="text-xs text-muted-foreground">Limit how we process your data</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h3 className="font-semibold text-sm mb-1">Objection</h3>
                  <p className="text-xs text-muted-foreground">Object to certain processing</p>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Children's Privacy</h2>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-sm leading-relaxed">
                  The Service is not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If we discover that a child has provided personal information, we will delete it immediately.
                </p>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Contact Us</h2>
              <div className="border rounded-lg p-6 bg-muted/30">
                <p className="text-muted-foreground mb-4">
                  If you have questions about this Privacy Policy or how we handle your data, please contact us at: [contact email]
                </p>
                <p className="text-sm text-muted-foreground">
                  For EU-specific data protection concerns, you may also contact your local data protection authority.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
