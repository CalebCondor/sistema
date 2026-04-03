import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import NavHeader from "@/components/nav-header";

const poppins = Poppins({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Sistema de Cuentas",
  description: "Gestión de clientes y cuentas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <NavHeader />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
