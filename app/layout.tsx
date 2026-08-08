import type { Metadata } from "next";
import "./globals.css";
import AuthGate from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "Filo | Araç Takip Sistemi",
  description: "Kurumsal araç takip, muayene ve yakıt yönetim paneli",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
