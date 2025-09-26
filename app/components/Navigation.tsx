'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 backdrop-blur-md shadow-lg border-b border-slate-100' 
          : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo - Just the logo without text */}
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <Image
              src="/images/logo.png"
              alt="Crowd Conscious"
              width={40}
              height={40}
              className={`w-10 h-10 object-contain ${
                isScrolled ? '' : 'brightness-0 invert'
              }`}
              priority
            />
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/communities" 
              className={`font-medium transition-colors ${
                isScrolled 
                  ? 'text-slate-700 hover:text-teal-600' 
                  : 'text-white/90 hover:text-white'
              }`}
            >
              Communities
            </Link>
            <Link 
              href="/about" 
              className={`font-medium transition-colors ${
                isScrolled 
                  ? 'text-slate-700 hover:text-teal-600' 
                  : 'text-white/90 hover:text-white'
              }`}
            >
              About
            </Link>
            <Link 
              href="/impact" 
              className={`font-medium transition-colors ${
                isScrolled 
                  ? 'text-slate-700 hover:text-teal-600' 
                  : 'text-white/90 hover:text-white'
              }`}
            >
              Impact
            </Link>
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center space-x-4">
            <Link 
              href="/login" 
              className={`font-medium transition-colors ${
                isScrolled 
                  ? 'text-slate-700 hover:text-teal-600' 
                  : 'text-white/90 hover:text-white'
              }`}
            >
              Sign In
            </Link>
            <Link 
              href="/signup" 
              className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 ${
                isScrolled
                  ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm hover:shadow-md'
                  : 'bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30'
              }`}
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
