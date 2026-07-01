import type { Metadata } from "next";
import "./globals.css";
import NetworkStatus from "@/components/NetworkStatus";

export const metadata: Metadata = {
  title: "Vocab Journey 🚀",
  description: "Adaptive Vocabulary Learning and Assessment Platform",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Vocab Journey",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      translate="no"
      className="h-full antialiased notranslate"
    >
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-950">
        <NetworkStatus />
        {children}
      </body>
    </html>
  );
}
