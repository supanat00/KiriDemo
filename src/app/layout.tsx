// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Provider from "@/components/Provider"; // Import Provider

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ระบบทดลอง Photogrammetry",
  description: "Demo for Kiri Engine API",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Provider> {/* Wrap children with Provider */}
          {children}
        </Provider>
      </body>
    </html>
  );
}