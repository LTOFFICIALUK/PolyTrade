'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function ProfilePage() {
  const router = useRouter()
  const [address, setAddress] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (address.trim()) {
      router.push(`/profile/${address.trim()}`)
    }
  }

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="px-4 sm:px-6 py-6 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Profile</h1>
        <div className="max-w-md">
          <p className="text-gray-400 mb-4">
            Enter a Polygon wallet address to view the profile
          </p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="address" className="block text-sm text-gray-400 mb-2">
                Polygon Wallet Address
              </label>
              <input
                id="address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-gray-900 border border-gray-800 text-white px-4 py-2 rounded focus:outline-none focus:ring-2 focus:ring-purple-primary focus:border-transparent font-mono text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-purple-primary hover:bg-purple-hover text-white rounded transition-colors font-medium"
            >
              View Profile
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

