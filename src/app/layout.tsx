import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DanceProvider } from "@/session/DanceProvider";

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#08090b" };

export const metadata: Metadata = {
  title: "Hand Signal Dance",
  description: "A camera-powered hand tracking playground. Your moves stay on your device.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><DanceProvider>{children}</DanceProvider></body></html>;
}
