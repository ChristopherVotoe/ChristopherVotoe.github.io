import Link from "next/link";

export function SiteHeader({ current = "home" }: { current?: "home" | "record" | "results" }) {
  return <header className="site-header">
    <Link className="site-logo" href="/" aria-label="ChrisTestingSite home"><span className="logo-bars" aria-hidden="true"><i /><i /><i /></span>ChrisTestingSite</Link>
    <nav aria-label="Main navigation"><Link href="/" aria-current={current === "home" ? "page" : undefined}>Home</Link></nav>
    <span className="site-session"><span aria-hidden="true">↗</span> Hand movement test</span>
  </header>;
}
