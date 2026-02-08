import type { Metadata, Viewport } from 'next';
import AppShell from './AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: 'BGR Dispatch',
  description: 'Buckeye Garage Door Repair – Dispatch & job management',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'BGR Dispatch',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen antialiased overflow-x-hidden max-w-[100vw]">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
