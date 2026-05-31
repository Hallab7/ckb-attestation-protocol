"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "./ConnectButton";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { href: "/", label: "Home" },
  { href: "/schemas", label: "Schemas" },
  { href: "/issue", label: "Issue" },
  { href: "/wallet", label: "Wallet" },
  { href: "/verify", label: "Verify" },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)] backdrop-blur">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]">
            <span className="font-display text-lg font-semibold leading-none">A</span>
          </div>
          <div>
            <p className="font-display text-lg font-semibold leading-none tracking-[-0.04em]">AttestCKB</p>
            <p className="caption-label mt-1">Editorial attestation stack</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`nav-link ${
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "nav-link-active"
                  : ""
              }`}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
