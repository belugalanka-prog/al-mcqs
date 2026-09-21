import type { Metadata } from "next";
import "./globals.css";
import AdSenseScript from "@/components/adsense-script";

export const metadata: Metadata = {
  title: "A/L Master — Physics & Chemistry MCQ practice",
  description:
    "Sit past papers, topic papers and model papers for G.C.E. Advanced Level Physics and Chemistry, and see exactly which topics need work.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Poppins:wght@500;600&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('theme')||'light'}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <AdSenseScript />
      </body>
    </html>
  );
}
