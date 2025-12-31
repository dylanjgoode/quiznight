import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Noche de Trivia - Edición Año Nuevo",
  description: "Juego de trivia multijugador en tiempo real con pulsador - ¡perfecto para fiestas de Año Nuevo!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
