'use client';

interface Product {
  id: number;
  upid: string;
  name: string;
  description?: string;
  category?: string;
  tier?: string;
  daily_limit?: number;
  monthly_limit?: number;
  created_at: string;
}

interface ProductDetailsModalProps {
  open: boolean;
  product: Product;
  onClose: () => void;
  onRequest: () => void;
}

/**
 * Product Details Modal
 * 
 * Shows full product information and allows quick request
 */
export default function ProductDetailsModal({
  open,
  product,
  onClose,
  onRequest,
}: ProductDetailsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-start">
          <div className="flex-1">
            <code className="text-sm font-mono font-bold text-blue-600">
              {product.upid}
            </code>
            <h2 className="text-xl font-bold mt-1">{product.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Badges */}
          {(product.tier || product.category) && (
            <div className="flex gap-2 flex-wrap">
              {product.tier && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full font-medium">
                  {product.tier}
                </span>
              )}
              {product.category && (
                <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full font-medium">
                  {product.category}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">About</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Limits */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Usage Limits</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Daily Limit</span>
                <span className="font-medium">
                  {product.daily_limit ? `${product.daily_limit} requests` : 'Unlimited'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Monthly Limit</span>
                <span className="font-medium">
                  {product.monthly_limit ? `${product.monthly_limit} requests` : 'Unlimited'}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="border-t pt-4 text-xs text-gray-600">
            <div>Added: {new Date(product.created_at).toLocaleDateString()}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t px-6 py-3 bg-gray-50 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded font-medium"
          >
            Close
          </button>
          <button
            onClick={onRequest}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
          >
            Request License
          </button>
        </div>
      </div>
    </div>
  );
}
