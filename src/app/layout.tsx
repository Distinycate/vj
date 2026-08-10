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
        <script dangerouslySetInnerHTML={{ __html: `
          window.onerror = function(msg, url, lineNo, columnNo, error) {
            document.body.innerHTML = '<div style="background:#8b0000;color:white;padding:20px;font-size:14px;z-index:99999;position:fixed;top:0;left:0;right:0;bottom:0;overflow:auto;word-wrap:break-word;"><h3>JS Error</h3><p><b>Msg:</b> '+msg+'</p><p><b>File:</b> '+url+'</p><p><b>Line:</b> '+lineNo+':'+columnNo+'</p><pre style="white-space:pre-wrap;">'+(error&&error.stack?error.stack:'')+'</pre></div>';
            return false;
          };
          window.addEventListener('unhandledrejection', function(event) {
            document.body.innerHTML = '<div style="background:#8b0000;color:white;padding:20px;font-size:14px;z-index:99999;position:fixed;top:0;left:0;right:0;bottom:0;overflow:auto;word-wrap:break-word;"><h3>Promise Error</h3><p><b>Msg:</b> '+(event.reason&&event.reason.message?event.reason.message:event.reason)+'</p><pre style="white-space:pre-wrap;">'+(event.reason&&event.reason.stack?event.reason.stack:'')+'</pre></div>';
          });
        `}} />
      </head>
      <body className="min-h-full flex flex-col bg-slate-950">
        <NetworkStatus />
        {children}
        <script dangerouslySetInnerHTML={{ __html: `document.addEventListener('contextmenu', event => event.preventDefault());` }} />
      </body>
    </html>
  );
}
