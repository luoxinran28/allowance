import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          {children}
        </div>
      </body>
    </html>
  );
}
