import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import Nav from "@/components/Nav";
import ViewTransitionsProvider from "@/components/ViewTransitionsProvider";
import MapQueueForm from "@/components/MapQueueForm";

export const metadata: Metadata = {
  title: "osu! Demon List",
  description: "Player rankings and map list for the osu! demon list",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ViewTransitionsProvider>
          <Nav />
          <main className="min-h-screen page-transition-root">{children}</main>
          <MapQueueForm />
        </ViewTransitionsProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
