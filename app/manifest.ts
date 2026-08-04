import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Continuum",
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#f4f3ec",
    theme_color: "#1c1b18",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512-maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      {
        name: "Expense Ledger",
        short_name: "Ledger",
        description: "Quickly open the expense ledger",
        url: "/?tab=expenses",
        icons: [{ src: "/icon-192", sizes: "192x192", type: "image/png" }]
      },
      {
        name: "Media Watchlist",
        short_name: "Watchlist",
        description: "Check your movie and TV watchlist",
        url: "/?tab=media",
        icons: [{ src: "/icon-192", sizes: "192x192", type: "image/png" }]
      },

    ]
  };
}
