import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const outfit = Outfit({ 
  subsets: ['latin'],
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: 'TravelAI – Your Intelligent Travel Companion',
  description: 'AI-powered travel planning: create itineraries, explore destinations, and manage trips with conversational AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className={`${inter.className} font-sans bg-slate-950 text-slate-200 antialiased selection:bg-indigo-500/30 selection:text-white`}>
        {children}
      </body>
    </html>
  );
}
