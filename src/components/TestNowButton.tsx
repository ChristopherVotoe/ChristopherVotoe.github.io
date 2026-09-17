"use client";
import Link from "next/link";
import { useDance } from "@/session/DanceProvider";

export function TestNowButton() {
  const { session } = useDance();
  return <Link className="test-now" href="/record" onClick={() => session.remove()}>Test Now <span aria-hidden="true">→</span></Link>;
}
