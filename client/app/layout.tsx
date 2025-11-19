import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Allowance - Authorization Management",
  description: "User registration and authorization management system",
  other: {
    "allowance-upid": process.env.NEXT_PUBLIC_PRODUCT_UPID || "UALLOWANCE0001",
    "allowance-tier": process.env.NEXT_PUBLIC_PRODUCT_TIER || "free",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </body>
    </html>
  );
}
