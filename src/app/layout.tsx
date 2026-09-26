import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/context/LanguageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { PrivacyProvider } from "@/context/PrivacyContext";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { AuthProvider } from "@/firebase/auth-context";
import { DemoIndicator } from "@/components/aura/DemoIndicator";

export const metadata: Metadata = {
  title: 'Aura | Premium LGBTQ+ Connection',
  description: 'Immersive, private, and ethereal social discovery for the global LGBTQ+ community.',
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
    <html lang="en" suppressHydrationWarning className="min-h-screen-safe overflow-x-hidden">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased bg-background text-foreground selection:bg-primary/20 min-h-screen-safe flex flex-col overflow-x-hidden">
        <div className="aura-bg-container" aria-hidden="true">
          <div className="aura-noise" />
          <div className="aura-blob-blue w-[600px] h-[600px] absolute top-[-10%] left-[-10%]" />
          <div className="aura-blob-purple w-[400px] h-[400px] absolute bottom-[-10%] right-[-10%]" />
          <div className="aura-blob-cyan w-[300px] h-[300px] absolute top-[40%] left-[10%] opacity-10" />
          
          {/* Blue Light Effect from Bottom - Rising atmospheric glow */}
          <div className="aura-blob-blue w-[100%] h-[300px] absolute bottom-[-5%] left-0 opacity-10 blur-[120px]" />
        </div>
        
        <FirebaseClientProvider>
          <AuthProvider>
            <DemoIndicator />
            <ThemeProvider>
              <LanguageProvider>
                <CurrencyProvider>
                  <PrivacyProvider>
                    <main className="min-h-screen-safe flex-1 flex flex-col w-full relative transition-opacity duration-300">
                      {children}
                    </main>
                    <Toaster />
                  </PrivacyProvider>
                </CurrencyProvider>
              </LanguageProvider>
            </ThemeProvider>
          </AuthProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}