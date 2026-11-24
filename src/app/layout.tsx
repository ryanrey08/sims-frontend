import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ReduxProvider } from "@/lib/redux/provider";
import { Toaster } from "@/components/common/Toaster";
import { appConfig } from "@/config/app.config";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: appConfig.name, template: `%s · ${appConfig.shortName}` },
  description: appConfig.description,
};

export const viewport: Viewport = {
  themeColor: "#d32f2f",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <ReduxProvider>
          {children}
          <Toaster />
        </ReduxProvider>
      </body>
    </html>
  );
}
