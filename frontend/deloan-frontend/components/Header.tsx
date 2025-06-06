'use client';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function Header() {
  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white">
              De<span className="text-blue-400">Loan</span>
            </h1>
            <span className="ml-2 text-sm text-blue-200">
              Decentralized Lending
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="#dashboard" className="text-white/80 hover:text-white transition-colors">
              Dashboard
            </a>
            <a href="#borrow" className="text-white/80 hover:text-white transition-colors">
              Borrow
            </a>
            <a href="#lend" className="text-white/80 hover:text-white transition-colors">
              Lend
            </a>
            <a href="#analytics" className="text-white/80 hover:text-white transition-colors">
              Analytics
            </a>
          </nav>

          {/* Connect Wallet Button */}
          <ConnectButton 
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
            chainStatus={{
              smallScreen: 'icon',
              largeScreen: 'full',
            }}
          />
        </div>
      </div>
    </header>
  );
}