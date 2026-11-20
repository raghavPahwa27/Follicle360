import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Follicle360",
  description: "Your hair-care companion: products, routines, progress and refills.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
