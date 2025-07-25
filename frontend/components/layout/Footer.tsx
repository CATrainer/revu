// frontend/components/layout/Footer.tsx
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold text-indigo-600 mb-4">Revu</h3>
            <p className="text-sm text-gray-600">
              AI-powered review management for modern businesses.
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Product</h4>
            <ul className="space-y-2">
              <li><Link href="/features" className="text-sm text-gray-600 hover:text-indigo-600">Features</Link></li>
              <li><Link href="/pricing" className="text-sm text-gray-600 hover:text-indigo-600">Pricing</Link></li>
              <li><Link href="/demo" className="text-sm text-gray-600 hover:text-indigo-600">Book Demo</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Company</h4>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-sm text-gray-600 hover:text-indigo-600">About</Link></li>
              <li><Link href="/blog" className="text-sm text-gray-600 hover:text-indigo-600">Blog</Link></li>
              <li><Link href="/contact" className="text-sm text-gray-600 hover:text-indigo-600">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Legal</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy" className="text-sm text-gray-600 hover:text-indigo-600">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-gray-600 hover:text-indigo-600">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500">
            © 2025 Revu. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}