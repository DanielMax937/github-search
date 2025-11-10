import type { Metadata } from 'next';
import './globals.css';
import Navigation from '@/components/navigation';

export const metadata: Metadata = {
  title: 'GitHub Repository Analyzer',
  description: 'Index and chat with GitHub repositories using AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Navigation />
        <main className="container mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}

