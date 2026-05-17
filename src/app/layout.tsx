import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/context/LanguageContext";

export const metadata: Metadata = {
  title: 'Aura | Minimalist LGBTQ+ Connection',
  description: 'Pure, private, and verified social discovery for the LGBTQ+ community.',
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
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground overflow-x-hidden selection:bg-primary/20">
        <LanguageProvider>
          <main className="min-h-screen flex flex-col max-w-md mx-auto relative bg-background border-x border-white/5">
            {children}
          </main>
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
