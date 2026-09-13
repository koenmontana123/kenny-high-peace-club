import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kenny High Peace Club",
  description: "Talk it out. Walk it out. Live it out. - Governance, payments, and communication platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
