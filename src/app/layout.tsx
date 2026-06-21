
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { AuthProvider } from "@/firebase/auth-context";

export const metadata: Metadata = {
  title: 'Aura | Minimalist LGBTQ+ Connection',
  description: 'Pure, private, and verified social discovery for the LGBTQ+ community.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground selection:bg-primary/20">
        <FirebaseClientProvider>
          <AuthProvider>
            <ThemeProvider>
              <LanguageProvider>
                <main className="min-h-screen-safe flex flex-col w-full max-w-md mx-auto relative bg-background sm:border-x sm:border-white/5 shadow-2xl">
                  {children}
                </main>
                <Toaster />
              </LanguageProvider>
            </ThemeProvider>
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
