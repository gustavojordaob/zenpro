import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CarrinhoProvider } from "@/features/loja/CarrinhoProvider";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { PapelUsuarioProvider } from "@/features/auth/PapelUsuarioProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zen Pro — Capinhas personalizadas",
  description: "Personalize sua capinha com a sua foto",
  icons: {
    icon: "/brand/logo-dark.png",
    apple: "/brand/logo-dark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
        <AuthProvider>
          <PapelUsuarioProvider>
            <CarrinhoProvider>{children}</CarrinhoProvider>
          </PapelUsuarioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
