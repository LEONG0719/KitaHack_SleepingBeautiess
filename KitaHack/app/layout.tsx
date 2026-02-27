import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/AuthContext';
import { CulturalProvider } from '@/lib/CulturalContext';
import NutriNudgeListener from '@/components/NutriNudgeListener';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NutriBalance AI — Smart Nutrition for Malaysia',
  description: 'AI-powered personalized meal planning for Malaysian students and young professionals. Budget-friendly, halal-certified, culturally-aware meal plans.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <CulturalProvider>
            {children}
            <NutriNudgeListener />
          </CulturalProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

