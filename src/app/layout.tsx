import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TRPCReactProvider } from "@/trpc/react";
import { env } from "@/env";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: {
    default: "On Emit — Gmail and Calendar, directed by you",
    template: "%s · On Emit",
  },
  description:
    "A focused Gmail and Google Calendar command center with multi-account support and your choice of AI model.",
  openGraph: {
    title: "On Emit — Make the day answer to you",
    description:
      "Gmail, Google Calendar, and your preferred AI in one focused command center.",
    type: "website",
    images: [{ url: "/og.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "On Emit — Make the day answer to you",
    description:
      "Gmail, Google Calendar, and your preferred AI in one focused command center.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body
        className="selection:bg-chart-3 min-h-screen font-sans antialiased selection:text-white"
        suppressHydrationWarning
      >
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
