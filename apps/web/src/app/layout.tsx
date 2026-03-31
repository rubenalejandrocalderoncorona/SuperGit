import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SuperGit",
  description: "Dual-interface GitHub repository browser and analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased overflow-hidden">{children}</body>
    </html>
  );
}
