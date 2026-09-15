import React from "react";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import { SITE_NAME, AUTHOR } from "@/lib/utils";

export const metadata = {
  title: "Privacy Policy",
  description: `Privacy Policy for the ${SITE_NAME} application and AI Assistant integration.`,
};

export default function PrivacyPolicyPage() {
  const containerClass = "max-w-[760px] mx-auto flex flex-col gap-6 text-[#26211F] dark:text-[#F4F5F7] leading-relaxed";

  return (
    <div className="min-h-screen bg-[#F3EFEA] dark:bg-[#0C0D0E] text-[#26211F] dark:text-[#F4F5F7] p-6 sm:p-10 transition-colors duration-200">
      <div className={containerClass}>

        <div className="flex items-center justify-between border-b border-[#DDD5CB] dark:border-[#25272E] pb-5">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-[#9E5D48]" />
            <div>
              <div className="border border-[#DDD5CB] dark:border-[#25272E] px-2 py-0.5 font-mono text-[9px] tracking-widest text-[#9E5D48] uppercase inline-block mb-1 bg-[#FAF8F5] dark:bg-[#18191D]">
                ⌜ spec // privacy-security-v2 ⌟
              </div>
              <h1 className="font-bold text-2xl tracking-tight text-[#9E5D48] dark:text-[#E07A5F]">
                Privacy &amp; Data Sovereignty
              </h1>
            </div>
          </div>
          <Link href="/" className="font-mono text-xs text-[#6D635C] dark:text-[#9BA1B0] hover:text-[#9E5D48] flex items-center gap-1.5 no-underline transition-colors uppercase">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </Link>
        </div>

        <div className="relative bg-[#FAF8F5] dark:bg-[#18191D] rounded-sm border border-[#DDD5CB] dark:border-[#25272E] p-8 max-md:p-6 shadow-xs flex flex-col gap-6 text-sm text-[#6D635C] dark:text-[#9BA1B0] transition-colors duration-200">
          <span className="absolute top-2 left-2 font-mono text-[9px] text-[#D99419]">⌜</span>
          <span className="absolute top-2 right-2 font-mono text-[9px] text-[#D99419]">⌝</span>
          <span className="absolute bottom-2 left-2 font-mono text-[9px] text-[#D99419]">⌞</span>
          <span className="absolute bottom-2 right-2 font-mono text-[9px] text-[#D99419]">⌟</span>

          <section className="flex flex-col gap-2">
            <h2 className="font-bold text-base text-[#9E5D48] dark:text-[#E07A5F]">1. Introduction</h2>
            <p>
              This Privacy Policy explains how **{SITE_NAME}** and its integrated **AI Assistants (e.g. ChatGPT Custom GPT Actions)** collect, process, and protect your data. We respect your privacy and are committed to keeping your personal information secure.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-bold text-base text-[#9E5D48] dark:text-[#E07A5F]">2. Data Collection &amp; Ownership</h2>
            <p>
              All your transaction ledger, subscriptions, libraries, notes, and investment data are stored directly inside your personal **Firebase Firestore database**.
            </p>
            <ul className="flex flex-col gap-2 font-mono text-xs text-[#26211F] dark:text-[#F4F5F7] mt-2">
              <li className="flex items-start gap-2">
                <span className="text-[#D99419] mt-0.5">&bull;</span>
                <span><strong>AES-256-GCM Encryption at Rest:</strong> Sensitive financial fields (expense amounts, titles, categories, notes, and investment portfolio assets) are encrypted with authenticated AES-256-GCM prior to database persistence.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D99419] mt-0.5">&bull;</span>
                <span><strong>Ciphertext-Only Caching:</strong> Upstash Redis and server process caches store strictly encrypted ciphertext blobs (<code>v1:iv:tag:ciphertext</code>). Decryption occurs ephemerally in-memory only during authorized HTTPS request fulfillment.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D99419] mt-0.5">&bull;</span>
                <span><strong>Zero Admin Master Keys:</strong> Database reads and writes execute via the Firestore REST API authenticated exclusively with the caller&apos;s personal Firebase ID token. No elevated admin service account key exists on the server.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D99419] mt-0.5">&bull;</span>
                <span><strong>User-Scoped Storage:</strong> Every database read and write is strictly isolated under <code>/users/&#123;userId&#125;/**</code> and enforced by path-scoped Firestore security rules.</span>
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-bold text-base text-[#9E5D48] dark:text-[#E07A5F]">3. AI Assistant Integration (OAuth &amp; APIs)</h2>
            <p>
              When you connect the official Custom GPT or any custom AI Agents:
            </p>
            <ul className="flex flex-col gap-2 font-mono text-xs text-[#26211F] dark:text-[#F4F5F7] mt-2">
              <li className="flex items-start gap-2">
                <span className="text-[#D99419] mt-0.5">&bull;</span>
                <span><strong>Authentication:</strong> We use standard OAuth 2.0. By authorizing the integration, ChatGPT is granted a secure Firebase Refresh Token to act on your behalf.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D99419] mt-0.5">&bull;</span>
                <span><strong>Read/Write Operations:</strong> The Assistant only accesses the specific data fields you ask it to (e.g., adding a movie to your watchlist, logging an expense, checking notes).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D99419] mt-0.5">&bull;</span>
                <span><strong>Revocability:</strong> You can disconnect the assistant or revoke its tokens at any time, instantly cutting off all API access.</span>
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-bold text-base text-[#9E5D48] dark:text-[#E07A5F]">4. Third-Party Integrations</h2>
            <p>
              The dashboard queries external public APIs to enrich your lists and valuations:
            </p>
            <ul className="flex flex-col gap-2 font-mono text-xs text-[#26211F] dark:text-[#F4F5F7] mt-2">
              <li className="flex items-start gap-2">
                <span className="text-[#D99419] mt-0.5">&bull;</span>
                <span><strong>Media Lookup:</strong> AniList (anime), Trakt &amp; TVMaze (shows/movies), OMDb (plots), and OpenLibrary (books). No personal identifying details are ever shared with these APIs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[#D99419] mt-0.5">&bull;</span>
                <span><strong>Market Valuation:</strong> Real-time asset close prices are resolved anonymously from Binance and Yahoo Finance.</span>
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-bold text-base text-[#9E5D48] dark:text-[#E07A5F]">5. Cookies &amp; Analytics</h2>
            <p>
              We optionally collect anonymous diagnostic metrics using <strong>Google Analytics</strong> to understand user counts and platform stability. No personally identifiable information (PII) is captured.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-bold text-base text-[#9E5D48] dark:text-[#E07A5F]">6. Security &amp; Cryptographic Measures</h2>
            <p>
              Communication between your browser, external AI Assistants (ChatGPT Actions), and our Next.js backend endpoints is strictly encrypted in transit using TLS/HTTPS.
            </p>
            <p>
              At rest, all financial amounts, titles, and investment assets are protected with versioned AES-256-GCM ciphertexts with dynamic 12-byte initialization vectors and integrity authentication tags. The distributed caching layer retains only ciphertext blobs, preventing plaintext leaks across database backups or caching tiers.
            </p>
          </section>

          <section className="flex flex-col gap-2 border-t border-[#DDD5CB] dark:border-[#25272E] pt-5 mt-2">
            <h2 className="font-bold text-base text-[#9E5D48] dark:text-[#E07A5F]">7. Contact Information</h2>
            <p>
              If you have any questions about this Privacy Policy or self-hosting, feel free to contact the administrator or reach out at:
            </p>
            <p className="font-mono text-xs text-[#9E5D48] mt-1">
              {AUTHOR.email || "hello@adithyakrishnan.com"}
            </p>
          </section>

        </div>

        <p className="text-center font-mono text-[10px] text-[#9C9288] uppercase mt-4">
          Last updated: {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })} &bull; {SITE_NAME}
        </p>

      </div>
    </div>
  );
}
