'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useRef, useState } from 'react'
import { useWallet } from '@/contexts/WalletContext'
import ConnectWalletModal from './ConnectWalletModal'

const Header = () => {
  const router = useRouter()
  const pathname = usePathname()
  const { isConnected, walletAddress, disconnectWallet } = useWallet()
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)

  const handleLogoClick = () => {
    router.push('/')
  }

  const handleLogoKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleLogoClick()
    }
  }

  const navigationItems = [
    { label: 'Terminal', href: '/' },
    { label: 'Strategies', href: '/strategies' },
    { label: 'Analytics', href: '/analytics' },
    { label: 'History', href: '/history' },
  ]

  const handleNavClick = (href: string) => {
    router.push(href)
  }

  const handleNavKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    href: string
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleNavClick(href)
    }
  }

  const handleDepositClick = () => {
    // TODO: Implement deposit functionality
    console.log('Deposit clicked')
  }

  const handleProfileClick = () => {
    if (isConnected && walletAddress) {
      router.push(`/profile/${walletAddress}`)
      return
    }
    setShowConnectModal(true)
  }

  const handleProfileKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleProfileClick()
    }
  }

  const handleProfileMouseEnter = () => {
    if (!isConnected) {
      return
    }
    setIsProfileMenuVisible(true)
  }

  const handleProfileMouseLeave = (
    event: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const nextTarget = event.relatedTarget as Node
    if (profileMenuRef.current && profileMenuRef.current.contains(nextTarget)) {
      return
    }
    setIsProfileMenuVisible(false)
  }

  const handleProfileFocus = () => {
    if (!isConnected) {
      return
    }
    setIsProfileMenuVisible(true)
  }

  const handleProfileBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return
    }
    setIsProfileMenuVisible(false)
  }

  const handleDropdownMouseEnter = () => {
    setIsProfileMenuVisible(true)
  }

  const handleDropdownMouseLeave = () => {
    setIsProfileMenuVisible(false)
  }

  const handleLogoutClick = () => {
    disconnectWallet()
    setIsProfileMenuVisible(false)
    router.push('/')
  }

  return (
    <header className="w-full border-b border-gray-800 bg-black/95 backdrop-blur-sm">
      <div className="px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div
              onClick={handleLogoClick}
              onKeyDown={handleLogoKeyDown}
              tabIndex={0}
              role="button"
              aria-label="Navigate to home"
              className="cursor-pointer focus:outline-none rounded"
            >
              <h1 className="text-white font-bold text-2xl tracking-tight">
                <span className="text-purple-primary">Poly</span>
                <span className="text-white">Trade</span>
              </h1>
            </div>
            <nav className="flex items-center space-x-6">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href || (item.href === '/' && pathname === '/terminal')
                return (
                  <div
                    key={item.href}
                    onClick={() => handleNavClick(item.href)}
                    onKeyDown={(e) => handleNavKeyDown(e, item.href)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Navigate to ${item.label}`}
                    className={`cursor-pointer transition-colors duration-200 focus:outline-none rounded px-2 py-1 ${
                      isActive
                        ? 'text-purple-primary font-semibold'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm font-medium tracking-wide">
                      {item.label}
                    </span>
                  </div>
                )
              })}
            </nav>
          </div>
          <div className="flex items-center space-x-6">
            {/* Portfolio Balance */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">Portfolio</span>
              <span className="text-sm font-semibold text-green-400">$0.00</span>
            </div>
            {/* Cash Balance */}
            <div className="flex flex-col">
              <span className="text-xs text-gray-400">Cash</span>
              <span className="text-sm font-semibold text-green-400">$0.00</span>
            </div>
            {/* Deposit Button */}
            <button
              onClick={handleDepositClick}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors duration-200 focus:outline-none"
            >
              Deposit
            </button>
            {/* Profile Picture */}
            <div
              onMouseEnter={handleProfileMouseEnter}
              onMouseLeave={handleProfileMouseLeave}
              onFocus={handleProfileFocus}
              onBlur={handleProfileBlur}
              className="relative"
            >
              <div
                onClick={handleProfileClick}
                onKeyDown={handleProfileKeyDown}
                tabIndex={0}
                role="button"
                aria-haspopup="true"
                aria-expanded={isProfileMenuVisible}
                aria-label="Navigate to my profile"
                className="flex items-center cursor-pointer focus:outline-none rounded-full hover:ring-2 hover:ring-purple-primary hover:ring-offset-2 hover:ring-offset-black transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 via-purple-500 to-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs font-semibold">U</span>
                </div>
              </div>
              {isConnected && isProfileMenuVisible && (
                <div
                  ref={profileMenuRef}
                  onMouseEnter={handleDropdownMouseEnter}
                  onMouseLeave={handleDropdownMouseLeave}
                  role="menu"
                  aria-label="Profile actions"
                  className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-gray-800 bg-black/95 text-white shadow-lg backdrop-blur"
                >
                  <button
                    onClick={handleLogoutClick}
                    className="w-full px-4 py-2 text-left text-sm text-gray-200 hover:bg-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-primary rounded-xl"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Connect Wallet Modal */}
      <ConnectWalletModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />
    </header>
  )
}

export default Header

