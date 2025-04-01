// Import global styles that apply to all pages
import "./globals.css"
// Import the session provider wrapper for authentication state management
import SessionProviderWrapper from "@/components/SessionProviderWrapper"
import { ReactNode } from "react"
// Import Next.js Metadata type for SEO and page metadata
import { Metadata } from "next"
// Import dyslexia-friendly font
import { Comic_Neue } from 'next/font/google'

// Initialize dyslexia-friendly font
const comicNeue = Comic_Neue({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-comic-neue',
})

// Define metadata for the application
// This helps with SEO and provides information for browsers and search engines
export const metadata: Metadata = {
  title: "Learnify - AI-Powered Learning Platform", // The title shown in browser tabs and search results
  description: "Personalized learning platform for students aged 7-18, featuring AI-driven education, interactive lessons, and adaptive learning.", // Brief description for search engines
  viewport: "width=device-width, initial-scale=1, maximum-scale=1", // Ensures proper scaling on mobile devices
  themeColor: "#ffffff", // Color of browser UI elements (like the address bar)
  // Additional metadata for better SEO and social sharing
  keywords: ["education", "AI learning", "personalized education", "interactive lessons", "adaptive learning", "student platform", "Key Stages", "GCSE", "A-Level"],
  authors: [{ name: "Learnify Team" }],
  openGraph: {
    title: "Learnify - AI-Powered Learning Platform",
    description: "Personalized learning platform for students aged 7-18, featuring AI-driven education and interactive lessons.",
    type: "website",
    locale: "en_GB",
    siteName: "Learnify",
  },
  twitter: {
    card: "summary_large_image",
    title: "Learnify - AI-Powered Learning Platform",
    description: "Personalized learning platform for students aged 7-18",
  },
  // Performance and security headers
  robots: "index, follow",
  referrer: "strict-origin-when-cross-origin",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  // PWA specific metadata
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Learnify",
  },
  formatDetection: {
    telephone: false,
  },
}

// Root layout component that wraps all pages in the application
// This is the main template that every page will inherit
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Set language to English and text direction to left-to-right
    <html lang="en" dir="ltr" className={comicNeue.variable}>
      {/* Head section contains metadata and configuration */}
      <head>
        {/* Specify character encoding for proper text rendering */}
        <meta charSet="utf-8" />
        {/* Configure viewport for responsive design */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        {/* Set theme color for browser UI elements */}
        <meta name="theme-color" content="#ffffff" />
        {/* Prevent flash of unstyled content */}
        <style>{`
          :root {
            color-scheme: light dark;
            --font-sans: var(--font-comic-neue), system-ui, -apple-system, sans-serif;
          }
          body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            font-family: var(--font-sans);
          }
          /* High contrast mode support */
          @media (forced-colors: active) {
            :root {
              color-scheme: light dark;
            }
          }
          /* Reduced motion support */
          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
          }
        `}</style>
      </head>
      {/* Body section contains the main application content */}
      {/* role="application" indicates this is a web application */}
      {/* aria-label provides context for screen readers */}
      <body 
        role="application" 
        aria-label="Learnify educational platform"
        className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white antialiased"
      >
        {/* Skip to main content link for keyboard users */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-white focus:text-black dark:focus:bg-gray-900 dark:focus:text-white"
        >
          Skip to main content
        </a>
        {/* Wrap all content with session provider for authentication */}
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  )
}
