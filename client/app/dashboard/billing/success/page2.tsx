'use client';

import Link from 'next/link';

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-8">
          Your subscription has been activated and you now have access to all premium features.
        </p>

        {/* Confirmation Details */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left space-y-3">
          <div>
            <div className="text-sm text-gray-500">Transaction ID</div>
            <div className="font-semibold text-gray-900">TXN-2024-001234</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Amount Charged</div>
            <div className="font-semibold text-gray-900">$9.99</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Next Billing Date</div>
            <div className="font-semibold text-gray-900">
              {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mb-8">
          <h2 className="font-semibold mb-3 text-gray-900">What's Next?</h2>
          <ul className="text-left text-sm text-gray-600 space-y-2">
            <li className="flex items-start">
              <span className="text-green-600 mr-2 font-bold">✓</span>
              <span>Your license has been generated and is ready to download</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2 font-bold">✓</span>
              <span>Access your billing history and manage subscriptions</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2 font-bold">✓</span>
              <span>Download your API documentation and integration guides</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard"
            className="w-full bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition text-center"
          >
            Back to Dashboard
          </Link>
          <Link
            href="/dashboard/billing"
            className="w-full bg-gray-200 text-gray-900 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 transition text-center"
          >
            View Subscription
          </Link>
        </div>

        {/* Support Link */}
        <p className="text-xs text-gray-500 mt-6">
          Need help?{' '}
          <a href="mailto:support@allowance.example.com" className="text-blue-600 hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
