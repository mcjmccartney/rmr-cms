import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { ModalProvider } from "@/context/ModalContext";
import Layout from "@/components/layout/Layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Raising My Rescue",
  description: "Dog training and behavioral consultation management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <AppProvider>
          <ModalProvider>
            <Layout>
              {children}
            </Layout>
          </ModalProvider>
        </AppProvider>
      </body>
    </html>
  );
}
