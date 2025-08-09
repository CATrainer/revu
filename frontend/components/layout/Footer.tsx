// frontend/components/layout/Footer.tsx
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-4">Repruv</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              AI-powered review management for modern businesses.
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/features" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Features</Link></li>
              <li><Link href="/pricing" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Pricing</Link></li>
              <li><Link href="/demo" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Book Demo</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">About</Link></li>
              <li><Link href="/blog" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Blog</Link></li>
              <li><Link href="/contact" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400">Terms and Conditions</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            © 2025 Repruv. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}