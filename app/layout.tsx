import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EuroFantaLeghe 2026/27",
  description: "Listone EuroLeghe arricchito con statistiche FotMob — buste chiuse, 26 giocatori",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
