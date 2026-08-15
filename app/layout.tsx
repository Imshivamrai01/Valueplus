import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ValuePlus ERP — Enterprise Resource Planning",
  description: "India's most premium ERP system for managing your business operations",
  keywords: ["ERP", "inventory", "accounting", "GST", "invoicing", "India", "ValuePlus"],
};

import AuthProvider from "@/components/providers/AuthProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import { OfflineSyncProvider } from "@/components/shared/offline-sync-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <QueryProvider>
          <AuthProvider>
            <OfflineSyncProvider>
              {children}
            </OfflineSyncProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
