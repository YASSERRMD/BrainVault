import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BrainVault | Enterprise AI Intelligence",
  description: "Advanced Agentic Knowledge Core",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex h-screen overflow-hidden bg-background`}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Background ambient glow */}
          <div className="absolute top-0 left-0 w-full h-[500px] bg-blue-500/5 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />

          <Header />
          <main className="flex-1 overflow-auto p-6 relative z-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
