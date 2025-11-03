import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';

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
        <nav className="bg-gray-800 text-white p-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-bold hover:text-gray-300">
              🔍 GitHub Analyzer
            </Link>
            <div className="space-x-4">
              <Link
                href="/"
                className="hover:text-gray-300 transition-colors"
              >
                Index
              </Link>
              <Link
                href="/repos"
                className="hover:text-gray-300 transition-colors"
              >
                Repositories
              </Link>
            </div>
          </div>
        </nav>
        <main className="container mx-auto p-6">{children}</main>
      </body>
    </html>
  );
}

