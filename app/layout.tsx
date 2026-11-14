import type { Metadata } from "next";
import "./globals.css";
import { CheckoutErrorBoundary } from "@/components/CheckoutErrorBoundary";
import { SITE_CONFIG } from "@/config/site";
export const metadata: Metadata = {
  title: `${SITE_CONFIG.companyName} | Austin Roofing`,
  description:
    "Book a roof inspection, arrange a flat-rate repair, or reserve your replacement. Clear pricing and secure Whop checkout for Austin-area homeowners.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <CheckoutErrorBoundary>{children}</CheckoutErrorBoundary>
      </body>
    </html>
  );
}
