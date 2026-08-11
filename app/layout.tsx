import "./globals.css";
import type { Metadata } from "next";
import { Manrope, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "./providers";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nova",
  description: "Plateforme tout-en-un pour le bâtiment et l'artisanat",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${manrope.variable} ${plexMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
