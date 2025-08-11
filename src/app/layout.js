import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "800"], variable: "--font-nunito" });

export const metadata = {
  title: "Tetris - Next.js",
  description: "Tetris portado de HTML+jQuery a Next.js (React + Canvas)",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${nunito.variable} antialiased`}>{children}</body>
    </html>
  );
}
