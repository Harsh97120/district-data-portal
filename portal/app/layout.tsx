import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: {
    default: "India District Data Portal",
    template: "%s | India District Portal",
  },
  description:
    "Explore NFHS-5 demographic indicators across all districts of India. Interactive district maps with literacy, sex ratio, and household data.",
  keywords: ["India", "NFHS-5", "district data", "demographics", "literacy", "Gujarat"],
  openGraph: {
    title: "India District Data Portal",
    description: "Interactive NFHS-5 demographic data portal for Indian districts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[#0F1117] text-[#F0F0F0] antialiased">
        <Navbar />
        <main className="flex-1 flex flex-col pt-16">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
