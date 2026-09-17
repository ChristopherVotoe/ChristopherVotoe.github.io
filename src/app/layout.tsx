import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hand Signal Dance",
  description: "A camera-powered hand tracking playground. Your moves stay on your device.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
