'use client';

import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

export default function Header() {
  const { isConnected } = useAccount();

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="text-2xl">🇮🇩</div>
              <div>
                <h1 className="text-2xl font-bold text-white">
                  De<span className="text-blue-400">Loan</span>
                </h1>
                <div className="text-xs text-blue-200 -mt-1">
                  Pinjaman Kripto Indonesia
                </div>
              </div>
            </Link>
          </div>

          {/* Connect Wallet Button */}
          <div className="flex items-center space-x-4">
            {/* Admin Link - hanya tampil jika wallet connected */}
            {isConnected && (
              <Link
                href="/admin"
                className="hidden md:flex items-center space-x-1 text-white/80 hover:text-white transition-colors"
              >
                <span>🏦</span>
                <span>Admin</span>
              </Link>
            )}
            
            <ConnectButton
              accountStatus={{
                smallScreen: 'avatar',
                largeScreen: 'full',
              }}
              chainStatus={{
                smallScreen: 'icon',
                largeScreen: 'full',
              }}
              label="Hubungkan Wallet"
            />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      {isConnected && (
        <div className="bg-green-500/20 border-t border-green-500/30">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-300">Wallet Terhubung</span>
                </div>
                <div className="text-green-200">
                  Siap untuk transaksi
                </div>
              </div>
              
              <div className="hidden sm:flex items-center space-x-4 text-green-200">
                <div>💰 Pinjam dalam IDR</div>
                <div>•</div>
                <div>⚡ Jaminan ETH</div>
                <div>•</div>
                <div>🏦 Bayar via Bank</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}