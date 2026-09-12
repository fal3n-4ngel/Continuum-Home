import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import { SITE_NAME, AUTHOR } from "@/lib/utils";

export const metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for the ${SITE_NAME} application and AI Assistant integration.`,
};

export default function PrivacyPolicyPage() {
  const containerClass = "max-w-[700px] mx-auto flex flex-col gap-6 text-text-primary leading-relaxed";

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-10 max-md:p-5 transition-colors duration-200">
      <div className={containerClass}>

        <div className="flex items-center justify-between border-b border-border-subtle pb-5">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-text-primary" />
            <h1 className="font-serif text-2xl font-bold">Privacy Policy</h1>
          </div>
          <Link href="/" className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 no-underline transition-colors">
            <ArrowLeft className="h-3 w-3" /> Back
          </Link>
        </div>

        <div className="bg-bg-card rounded-card border border-border-subtle p-8 max-md:p-6 shadow-subtle flex flex-col gap-6 text-sm text-text-secondary transition-colors duration-200">

          <section className="flex flex-col gap-2">
            <h2 className="font-serif text-base font-bold text-text-primary">1. Introduction</h2>
            <p>
              This Privacy Policy explains how **{SITE_NAME}** and its integrated **AI Assistants (e.g. ChatGPT Custom GPT Actions)** collect, process, and protect your data. We respect your privacy and are committed to keeping your personal information secure.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-serif text-base font-bold text-text-primary">2. Data Collection &amp; Ownership</h2>
            <p>
              All your transaction ledger, subscriptions, libraries, notes, and investment data are stored directly inside your personal **Firebase Firestore database**.
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1">
              <li>
                **AES-256-GCM Encryption at Rest:** Sensitive financial fields (expense amounts, titles, categories, notes, and investment portfolio assets) are encrypted with authenticated AES-256-GCM prior to database persistence.
              </li>
              <li>
                **Zero-Knowledge Caching:** Upstash Redis and server process caches store strictly encrypted ciphertext blobs (`v1:iv:tag:ciphertext`). Decryption occurs ephemerally in-memory only during authorized HTTPS request fulfillment.
              </li>
              <li>
                **Zero Admin Master Keys:** Database reads and writes execute via the Firestore REST API authenticated exclusively with the caller&apos;s personal Firebase ID token. No elevated admin service account key exists on the server.
              </li>
              <li>
                **User-Scoped Storage:** Every database read and write is strictly isolated under `/users/&#123;userId&#125;/**` and enforced by path-scoped Firestore security rules.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-serif text-base font-bold text-text-primary">3. AI Assistant Integration (OAuth & APIs)</h2>
            <p>
              When you connect the official Custom GPT or any custom AI Agents:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1">
              <li>
                **Authentication:** We use standard OAuth 2.0. By authorizing the integration, ChatGPT is granted a secure Firebase Refresh Token to act on your behalf.
              </li>
              <li>
                **Read/Write Operations:** The Assistant only accesses the specific data fields you ask it to (e.g., adding a movie to your watchlist, logging an expense, checking notes).
              </li>
              <li>
                **Revocability:** You can disconnect the assistant or revoke its tokens at any time, instantly cutting off all API access.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-serif text-base font-bold text-text-primary">4. Third-Party Integrations</h2>
            <p>
              The dashboard queries external public APIs to enrich your lists and valuations:
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1.5 mt-1">
              <li>
                **Media Lookup:** AniList (anime), Trakt & TVMaze (shows/movies), OMDb (plots), and OpenLibrary (books). No personal identifying details are ever shared with these APIs.
              </li>
              <li>
                **Market Valuation:** Real-time asset close prices are resolved anonymously from Binance and Yahoo Finance.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-serif text-base font-bold text-text-primary">5. Cookies & Analytics</h2>
            <p>
              We optionally collect anonymous diagnostic metrics using **Google Analytics** to understand user counts and platform stability. No personally identifiable information (PII) is captured.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-serif text-base font-bold text-text-primary">6. Security &amp; Cryptographic Measures</h2>
            <p>
              Communication between your browser, external AI Assistants (ChatGPT Actions), and our Next.js backend endpoints is strictly encrypted in transit using TLS/HTTPS.
            </p>
            <p>
              At rest, all financial amounts, titles, and investment assets are protected with versioned AES-256-GCM ciphertexts with dynamic 12-byte initialization vectors and integrity authentication tags. The distributed caching layer retains only ciphertext blobs, preventing plaintext leaks across database backups or caching tiers.
            </p>
          </section>

          <section className="flex flex-col gap-2 border-t border-border-subtle pt-5 mt-2">
            <h2 className="font-serif text-base font-bold text-text-primary">7. Contact Information</h2>
            <p>
              If you have any questions about this Privacy Policy or self-hosting, feel free to contact the administrator or reach out at:
            </p>
            <p className="font-mono text-xs text-text-primary mt-1">
              {AUTHOR.email || "hello@adithyakrishnan.com"}
            </p>
          </section>

        </div>

        <p className="text-center text-[10px] text-text-muted mt-4">
          Last updated: {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })} • {SITE_NAME}
        </p>

      </div>
    </div>
  );
}
