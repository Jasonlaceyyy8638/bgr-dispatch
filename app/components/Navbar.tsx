import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="flex items-center justify-between p-4 bg-neutral-900 border-b border-neutral-800">
      {/* Logo Section */}
      <div className="flex items-center gap-4">
        {/* MAKE SURE THIS FILENAME MATCHES YOUR PUBLIC FOLDER EXACTLY */}
        <img 
          src="/logo.png" 
          alt="BGR Logo" 
          className="h-12 w-auto object-contain"
        />
        <h1 className="text-xl font-bold text-white tracking-widest hidden sm:block">
          BGR DISPATCH
        </h1>
      </div>

      {/* Navigation Links */}
      <div className="flex gap-8 text-neutral-400 font-medium text-sm uppercase tracking-wide">
        <Link href="/" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <Link href="/dispatch" className="hover:text-white transition-colors">
          Dispatch Board
        </Link>
        <Link href="/revenue" className="hover:text-white transition-colors">
          Revenue
        </Link>
        <Link href="/admin" className="hover:text-white transition-colors">
          Admin
        </Link>
      </div>
    </nav>
  );
}