import type { Metadata } from "next";
import "./globals.css";
import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/utils";
import Script from "next/script";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Continuum Home",
    "Continuum",
    "Continuum dashboard",
    "Continuum personal dashboard",
    "personal finance dashboard",
    "self-hostable dashboard",
    "expense tracker",
    "portfolio tracker",
    "mutual funds NAV tracker",
    "subscriptions tracker",
    "media watchlist",
    "AniList sync",
    "Trakt sync",
    "Letterboxd sync",
    "ChatGPT custom GPT",
    "OpenAPI personal dashboard",
    "AI agent dashboard",
    "open source personal dashboard",
    "Adithya Krishnan",
    "fal3n-4ngel",
  ],
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  category: "productivity",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    creator: `@${AUTHOR.githubHandle}`,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "8ilmRZp7ck7HgkRLfPnMEMPMAKH8lS5jv2sf-URdjIA",
  },
  manifest: "/manifest.webmanifest",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  other: {
    "Continuum-build-signature": "4b8f72a6e910c283df8d3b8f2c30a9eef5b1e9c80d283f982b1897c72f105b58",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Continuum Home",
      alternateName: ["Continuum", "Continuum Personal Dashboard", "Continuum Dashboard"],
      description: SITE_DESCRIPTION,
      publisher: {
        "@type": "Person",
        name: AUTHOR.name,
        url: AUTHOR.url,
      },
    },
    {
      "@type": "SoftwareApplication",
      name: "Continuum Home",
      alternateName: "Continuum",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: "FinanceApplication, UtilitiesApplication",
      operatingSystem: "Web, iOS, Android, macOS, Windows, Linux",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Encrypted Personal Expense Ledger",
        "Investment & Mutual Funds NAV Tracking",
        "Subscription Management & Renewal Alerts",
        "Letterboxd, Trakt & AniList Sync",
        "ChatGPT Custom GPT & Claude OpenAPI Action Support",
        "Self-hostable with Firebase and Next.js",
      ],
      author: {
        "@type": "Person",
        name: AUTHOR.name,
        url: AUTHOR.url,
        sameAs: [AUTHOR.github, AUTHOR.url, AUTHOR.coffeeUrl],
      },
    },
    {
      "@type": "Person",
      "@id": `${AUTHOR.url}/#person`,
      name: AUTHOR.name,
      url: AUTHOR.url,
      email: AUTHOR.email,
      sameAs: [AUTHOR.github, AUTHOR.url],
      jobTitle: "Software Engineer & Creator of Continuum Home",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html lang="en">
      <head>
        <meta name="google-site-verification" content="8ilmRZp7ck7HgkRLfPnMEMPMAKH8lS5jv2sf-URdjIA" />
        <link rel="author" href="/humans.txt" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var isLanding=window.location.pathname==="/";if(isLanding){var landingSaved=sessionStorage.getItem("landing_theme");var t=landingSaved||"continuum";document.documentElement.setAttribute("data-theme",t);if(t==="continuum-dark"){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}return;}var saved=localStorage.getItem("continuum_theme");var t=saved||(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"continuum-dark":"continuum");if(t==="dark-academia"||t==="obsidian-noir"||t==="monolith-dark"||t==="obsidian"||t==="espresso-dark")t="continuum-dark";if(t==="isabelline-botanical"||t==="nordic-linen"||t==="botanical-matcha")t="sage-atelier";if(t==="parchment-academia"||t==="espresso-crema"||t==="tuscan-terracotta"||t==="travertine-stone"||t==="terracotta-dune")t="warm-sand";if(t==="holst"||t==="github-dark"||t==="tokyo-night")t="tokyo-midnight";if(t==="pine-nocturne"||t==="forest-night"||t==="olive-umber")t="alpine-emerald";if(t==="black-kite"||t==="dracula"||t==="amoled-pure")t="monochrome-dark";if(t==="continuum-paper"||t==="paper-classic")t="continuum";var valid=["continuum","continuum-dark","monochrome-light","monochrome-dark","crimson-ronin","cyberpunk-neo","wabi-sabi","kyoto-night","neo-brutalist","industrial-monolith","nordic-frost","tokyo-midnight","sage-atelier","alpine-emerald","warm-sand","cobalt-blueprint"];if(valid.indexOf(t)===-1){t="continuum";}document.documentElement.setAttribute("data-theme",t);var darkThemes=["continuum-dark","monochrome-dark","crimson-ronin","cyberpunk-neo","kyoto-night","industrial-monolith","tokyo-midnight","alpine-emerald","cobalt-blueprint"];if(darkThemes.indexOf(t)!==-1){document.documentElement.classList.add("dark");}else{document.documentElement.classList.remove("dark");}var r=localStorage.getItem("continuum_card_radius")||"subtle";if(r==="sharp"){document.documentElement.style.setProperty("--radius-card","0px");document.documentElement.style.setProperty("--radius-button","0px");}else if(r==="rounded"){document.documentElement.style.setProperty("--radius-card","8px");document.documentElement.style.setProperty("--radius-button","4px");}else if(r==="soft"){document.documentElement.style.setProperty("--radius-card","14px");document.documentElement.style.setProperty("--radius-button","8px");}else{document.documentElement.style.setProperty("--radius-card","4px");document.documentElement.style.setProperty("--radius-button","2px");}var s=localStorage.getItem("continuum_card_shadow")||"subtle";if(s==="flat"){document.documentElement.style.setProperty("--shadow-subtle","none");}else if(s==="elevated"){document.documentElement.style.setProperty("--shadow-subtle","0 8px 24px -4px rgba(0,0,0,0.18), 0 3px 8px -2px rgba(0,0,0,0.1)");}else{document.documentElement.style.removeProperty("--shadow-subtle");}var f=localStorage.getItem("continuum_heading_font")||"serif";if(f==="sans"){document.documentElement.style.setProperty("--font-serif","'Plus Jakarta Sans', sans-serif");}else if(f==="mono"){document.documentElement.style.setProperty("--font-serif","ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace");}else{document.documentElement.style.setProperty("--font-serif","'Playfair Display', serif");}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body>
        {children}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
