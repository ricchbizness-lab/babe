import "./globals.css";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Manrope } from "next/font/google";
import { Providers } from "./providers";

// Inter = corps de texte et labels (police par défaut du body)
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
// Manrope = titres et chiffres, weight 700-800 uniquement
const manrope = Manrope({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-heading", display: "swap" });
// IBM Plex Mono = badges, timestamps, codes
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
    <html lang="fr" className={`${inter.variable} ${manrope.variable} ${plexMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
