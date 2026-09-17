import "./globals.css";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, Inter, Manrope } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMessages, resolveLocale } from "@/lib/i18n";
import { Providers } from "./providers";
import { ServiceWorkerRegister } from "./sw-register";

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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nova BTP",
  },
  icons: {
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0D3B2E",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Langue d'interface stockée sur le compte utilisateur (sprint 1, point 2)
  // — "fr" par défaut, y compris pour un visiteur non connecté (login,
  // register). Ne dépend d'aucun routing par locale : seules les pages
  // terrain (tâches, rapports vocaux, planning, sidebar) consomment
  // réellement ces traductions via useTranslations, tout le reste de
  // l'application reste en français codé en dur.
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { langue: true } }) : null;
  const locale = resolveLocale(user?.langue);
  const messages = getMessages(locale);

  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${inter.variable} ${manrope.variable} ${plexMono.variable}`}
    >
      <body>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="Europe/Paris" now={new Date()} formats={{}}>
          <Providers>{children}</Providers>
          <ServiceWorkerRegister />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
