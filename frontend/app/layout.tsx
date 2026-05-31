import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { Cormorant_Garamond, IBM_Plex_Sans } from "next/font/google";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "CKB Attestation Protocol",
  description: "On-chain verifiable attestations powered by CKB",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${display.variable} ${sans.variable} min-h-screen`}>
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function() {
            try {
              var key = 'attestckb-theme';
              var saved = localStorage.getItem(key);
              var theme = saved === 'light' || saved === 'dark'
                ? saved
                : window.matchMedia('(prefers-color-scheme: dark)').matches
                  ? 'dark'
                  : 'light';
              document.documentElement.dataset.theme = theme;
              document.documentElement.style.colorScheme = theme;
            } catch (e) {}
          })();
        `}</Script>
        <Providers>
          <div className="border-b border-[var(--border)]">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              <span className="truncate">Editorial ledger for verifiable attestations on CKB</span>
              <span className="hidden sm:inline">Built for high-trust issuance and verification</span>
            </div>
          </div>
          <Navbar />
          <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 md:pt-10">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
