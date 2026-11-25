import React from "react";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";
import { SITE_NAME, AUTHOR } from "@/lib/utils";

export const metadata = {
  title: "Terms of Service",
  description: `Terms of Service for ${SITE_NAME} and its AI Assistant / MCP integrations.`,
};

export default function TermsOfServicePage() {
  const containerClass = "max-w-[760px] mx-auto flex flex-col gap-6 text-[#26211F] dark:text-[#F4F5F7] leading-relaxed";

  return (
    <div className="min-h-screen bg-[#F3EFEA] dark:bg-[#0C0D0E] text-[#26211F] dark:text-[#F4F5F7] p-6 sm:p-10 transition-colors duration-200">
      <div className={containerClass}>
        <div className="flex items-center justify-between border-b border-[#DDD5CB] dark:border-[#25272E] pb-5">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-[#9E5D48]" />
            <div>
              <div className="border border-[#DDD5CB] dark:border-[#25272E] px-2 py-0.5 font-mono text-[9px] tracking-widest text-[#9E5D48] uppercase inline-block mb-1 bg-[#FAF8F5] dark:bg-[#18191D]">
                spec // terms-of-service-v1
              </div>
              <h1 className="font-bold text-2xl tracking-tight text-[#9E5D48] dark:text-[#E07A5F]">
                Terms of Service
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
            <h2 className="font-bold text-base text-[#9E5D48] dark:text-[#E07A5F]">1. Acceptance of Terms</h2>
            <p>
              By accessing or using {SITE_NAME}, including its web dashboard, OpenAPI actions, and Model Context Protocol (MCP) connector for ChatGPT, you agree to these Terms of Service.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-bold text-base text-[#9E5D48] dark:text-[#E07A5F]">2. Description of Service</h2>
            <p>
              {SITE_NAME} is an open-source personal tracking dashboard for expenses, subscriptions, investment portfolios, and media watchlists. You are solely responsible for the accuracy of the financial and media records you log.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-bold text-base text-[#9E5D48] dark:text-[#E07A5F]">3. No Financial Advice</h2>
            <p>
              All portfolio valuations, burn-rate calculations, and AI-generated analytics are provided for informational and personal tracking purposes only and do not constitute financial, tax, or investment advice.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-bold text-base text-[#9E5D48] dark:text-[#E07A5F]">4. Account &amp; OAuth Access</h2>
            <p>
              You authenticate using Google Sign-In via Firebase Authentication. When connecting third-party AI assistants via OAuth, you authorize those assistants to read and modify your dashboard records on your behalf until you revoke access or delete your account in Settings.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-bold text-base text-[#9E5D48] dark:text-[#E07A5F]">5. Limitation of Liability</h2>
            <p>
              {SITE_NAME} is provided &ldquo;as is&rdquo; under the MIT License without warranties of any kind. To the maximum extent permitted by law, {AUTHOR.name} shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="font-bold text-base text-[#9E5D48] dark:text-[#E07A5F]">6. Support &amp; Contact</h2>
            <p>
              For support, bug reports, or questions regarding these terms, contact{" "}
              <a href={`mailto:${AUTHOR.email}`} className="text-[#9E5D48] underline">
                {AUTHOR.email}
              </a>{" "}
              or open an issue on{" "}
              <a href="https://github.com/fal3n-4ngel/Continuum-Home/issues" target="_blank" rel="noopener noreferrer" className="text-[#9E5D48] underline">
                GitHub
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
