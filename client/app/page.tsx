'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [upid, setUpid] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);

  useEffect(() => {
    // Read UPID from meta tag
    const upidMeta = document.querySelector('meta[name="allowance-upid"]');
    const tierMeta = document.querySelector('meta[name="allowance-tier"]');
    
    if (upidMeta) {
      setUpid(upidMeta.getAttribute('content'));
    }
    if (tierMeta) {
      setTier(tierMeta.getAttribute('content'));
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Allowance</h1>
        <p className="text-xl text-gray-600 mb-8">
          Authorization and User Management System
        </p>
        
        {/* Display product UPID info */}
        {upid && (
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg inline-block">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">Product UPID:</span> {upid}
            </p>
            {tier && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Tier:</span> {tier}
              </p>
            )}
          </div>
        )}

        <div className="space-x-4">
          <a
            href="/auth/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Login
          </a>
          <a
            href="/auth/login"
            className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
          >
            Register
          </a>
        </div>
      </div>
    </main>
  );
}
