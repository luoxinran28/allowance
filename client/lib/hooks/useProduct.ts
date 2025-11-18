import { useState, useEffect } from 'react';
import { apiClient } from '../api-client';

export interface Product {
  id: number;
  upid: string;
  product_slug: string;
  name: string;
  description?: string;
}

export interface UserLicense {
  id: number;
  user_id: number;
  product_version_id: number;
  tier: string;
  expires_at: string;
  revoked_at?: string;
}

interface UseProductResult {
  product: Product | null;
  userLicenses: UserLicense[];
  userTier: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to fetch product and user's license information dynamically
 * This replaces static environment variables with database-driven data
 */
export function useProduct(): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [userLicenses, setUserLicenses] = useState<UserLicense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch the main product (Allowance System)
        // In a multi-product system, you could fetch all products and let user select
        const productsRes = await apiClient.listProducts();
        const products = productsRes.data;

        if (products && products.length > 0) {
          // Get the first product (or find by specific UPID)
          const mainProduct = products.find((p: Product) => p.upid === 'UALLOWANCE0001') || products[0];
          setProduct(mainProduct);
        }

        // Fetch user's licenses
        try {
          const licensesRes = await apiClient.getUserLicenses();
          const licenses = licensesRes.data || [];
          setUserLicenses(licenses);
        } catch (licenseErr) {
          // User may not be logged in yet - this is OK
          console.log('No licenses available (user may not be logged in)');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch product data';
        setError(errorMessage);
        console.error('Error fetching product:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductData();
  }, []);

  // Determine user's tier from licenses
  const userTier = userLicenses.length > 0 ? userLicenses[0].tier : null;

  return {
    product,
    userLicenses,
    userTier,
    isLoading,
    error,
  };
}

/**
 * Hook to get product access information
 * Checks if user has valid license for a product
 */
export function useProductAccess() {
  const { product, userLicenses, userTier, isLoading, error } = useProduct();

  const hasAccess = userLicenses.some((license) => {
    const isNotRevoked = !license.revoked_at;
    const isNotExpired = new Date(license.expires_at) > new Date();
    return isNotRevoked && isNotExpired;
  });

  return {
    product,
    hasAccess,
    userTier,
    isLoading,
    error,
    userLicenses,
  };
}
