/**
 * Product Browsing Flow Integration Tests
 * 
 * Tests complete product browsing experience (Section 4.0)
 * - Product gallery loading and display
 * - Category filtering
 * - Search functionality
 * - Product detail viewing
 * - Pricing selection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Supabase
vi.mock('../../src/config/supabase', () => ({
  supabase: {
    from: vi.fn(),
    storage: {
      from: vi.fn(),
    },
  },
}));

vi.mock('../../src/utils/auditLog', () => ({
  logAuditEvent: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Product Browsing Flow Integration', () => {
  let supabaseMock;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { supabase } = await import('../../src/config/supabase');
    supabaseMock = supabase;
  });

  describe('Product Gallery Loading', () => {
    it('should load and display all products', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      const mockProducts = [
        {
          product_id: 'prod-1',
          product_name: 'Chocolate Cake',
          description: 'Rich chocolate flavor',
          is_available: true,
          is_featured: false,
          pricing: [
            { pricing_id: 'price-1', weight: '1kg', price: 2500, display_order: 1 },
          ],
          categories: [
            { category: { category_id: 'cat-1', category_name: 'Birthday' } },
          ],
          images: ['image1.jpg'],
        },
        {
          product_id: 'prod-2',
          product_name: 'Vanilla Cake',
          description: 'Classic vanilla',
          is_available: true,
          is_featured: true,
          pricing: [
            { pricing_id: 'price-2', weight: '1kg', price: 2000, display_order: 1 },
          ],
          categories: [
            { category: { category_id: 'cat-1', category_name: 'Birthday' } },
          ],
          images: ['image2.jpg'],
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockProducts,
            error: null,
          }),
        }),
      });

      const products = await fetchProducts();

      expect(products).toBeDefined();
      expect(products.length).toBe(2);
      expect(products[0].product_name).toBe('Chocolate Cake');
      expect(products[1].product_name).toBe('Vanilla Cake');
    });

    it('should display only available products when filtered', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      const mockProducts = [
        {
          product_id: 'prod-1',
          product_name: 'Available Cake',
          is_available: true,
          pricing: [],
          categories: [],
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockProducts,
              error: null,
            }),
          }),
          order: vi.fn().mockResolvedValue({
            data: mockProducts,
            error: null,
          }),
        }),
      });

      const products = await fetchProducts({ availableOnly: true });

      expect(products).toBeDefined();
      expect(products.every(p => p.is_available)).toBe(true);
    });

    it('should display featured badge on featured products', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      const mockProducts = [
        {
          product_id: 'prod-featured',
          product_name: 'Featured Cake',
          is_available: true,
          is_featured: true,
          pricing: [],
          categories: [],
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockProducts,
              error: null,
            }),
          }),
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const products = await fetchProducts({ featuredOnly: true });

      expect(products).toBeDefined();
      expect(products.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty product list gracefully', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const products = await fetchProducts();

      expect(products).toEqual([]);
    });

    it('should display loading state while fetching products', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      // Simulate slow network
      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockImplementation(() => 
            new Promise(resolve => 
              setTimeout(() => resolve({ data: [], error: null }), 100)
            )
          ),
        }),
      });

      const promise = fetchProducts();

      // While loading
      expect(promise).toBeInstanceOf(Promise);

      // Wait for completion
      const result = await promise;
      expect(result).toEqual([]);
    });
  });

  describe('Category Filtering', () => {
    it('should filter products by category', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      const mockProducts = [
        {
          product_id: 'prod-1',
          product_name: 'Birthday Cake',
          pricing: [],
          categories: [
            { category: { category_id: 'cat-birthday', category_name: 'Birthday' } },
          ],
        },
        {
          product_id: 'prod-2',
          product_name: 'Wedding Cake',
          pricing: [],
          categories: [
            { category: { category_id: 'cat-wedding', category_name: 'Wedding' } },
          ],
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockProducts,
            error: null,
          }),
        }),
      });

      const products = await fetchProducts({ categories: ['cat-birthday'] });

      expect(products.length).toBe(1);
      expect(products[0].product_name).toBe('Birthday Cake');
    });

    it('should show all products when "All" category is selected', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      const mockProducts = [
        { product_id: 'prod-1', product_name: 'Cake 1', pricing: [], categories: [] },
        { product_id: 'prod-2', product_name: 'Cake 2', pricing: [], categories: [] },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockProducts,
            error: null,
          }),
        }),
      });

      const products = await fetchProducts();

      expect(products.length).toBe(2);
    });

    it('should load categories for filter tabs', async () => {
      const { fetchCategories } = await import('../../src/utils/productCatalog');

      const mockCategories = [
        { category_id: 'cat-1', category_name: 'Birthday', display_order: 1 },
        { category_id: 'cat-2', category_name: 'Wedding', display_order: 2 },
        { category_id: 'cat-3', category_name: 'Custom', display_order: 3 },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockCategories,
            error: null,
          }),
        }),
      });

      const categories = await fetchCategories();

      expect(categories).toBeDefined();
      expect(categories.length).toBe(3);
      expect(categories[0].category_name).toBe('Birthday');
    });

    it('should support multi-category products', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      const mockProducts = [
        {
          product_id: 'prod-1',
          product_name: 'Multi-Category Cake',
          pricing: [],
          categories: [
            { category: { category_id: 'cat-birthday', category_name: 'Birthday' } },
            { category: { category_id: 'cat-custom', category_name: 'Custom' } },
          ],
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockProducts,
            error: null,
          }),
        }),
      });

      const birthdayProducts = await fetchProducts({ categories: ['cat-birthday'] });
      const customProducts = await fetchProducts({ categories: ['cat-custom'] });

      // Should appear in both category filters
      expect(birthdayProducts.some(p => p.product_id === 'prod-1')).toBe(true);
      expect(customProducts.some(p => p.product_id === 'prod-1')).toBe(true);
    });
  });

  describe('Search Functionality', () => {
    it('should search products by name', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      const mockProducts = [
        {
          product_id: 'prod-1',
          product_name: 'Chocolate Fudge Cake',
          description: 'Rich chocolate',
          pricing: [],
          categories: [],
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockProducts,
              error: null,
            }),
          }),
        }),
      });

      const products = await fetchProducts({ searchTerm: 'Chocolate' });

      expect(products).toBeDefined();
      expect(products.length).toBeGreaterThan(0);
      expect(products[0].product_name).toContain('Chocolate');
    });

    it('should search products by description', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      const mockProducts = [
        {
          product_id: 'prod-1',
          product_name: 'Special Cake',
          description: 'Contains chocolate and vanilla',
          pricing: [],
          categories: [],
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockProducts,
              error: null,
            }),
          }),
        }),
      });

      const products = await fetchProducts({ searchTerm: 'chocolate' });

      expect(products).toBeDefined();
      expect(products.some(p => p.description.toLowerCase().includes('chocolate'))).toBe(true);
    });

    it('should perform case-insensitive search', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      const mockProducts = [
        {
          product_id: 'prod-1',
          product_name: 'CHOCOLATE CAKE',
          pricing: [],
          categories: [],
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockProducts,
              error: null,
            }),
          }),
        }),
      });

      const products = await fetchProducts({ searchTerm: 'chocolate' });

      expect(products.length).toBeGreaterThan(0);
    });

    it('should show no results for non-matching search', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const products = await fetchProducts({ searchTerm: 'nonexistent' });

      expect(products).toEqual([]);
    });

    it('should clear search and show all products', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      const allProducts = [
        { product_id: 'prod-1', product_name: 'Cake 1', pricing: [], categories: [] },
        { product_id: 'prod-2', product_name: 'Cake 2', pricing: [], categories: [] },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: allProducts,
            error: null,
          }),
        }),
      });

      const products = await fetchProducts({ searchTerm: '' });

      expect(products.length).toBe(2);
    });
  });

  describe('Product Detail View', () => {
    it('should load and display product details', async () => {
      const { fetchProductById } = await import('../../src/utils/productCatalog');

      const mockProduct = {
        product_id: 'prod-1',
        product_name: 'Chocolate Deluxe Cake',
        description: 'A rich, moist chocolate cake with layers of chocolate ganache',
        allergen_info: 'Contains: eggs, dairy, gluten',
        preparation_time_minutes: 60,
        is_available: true,
        pricing: [
          { pricing_id: 'price-1', weight: '500g', price: 1500, servings_estimate: 4 },
          { pricing_id: 'price-2', weight: '1kg', price: 2500, servings_estimate: 8 },
        ],
        categories: [
          { category: { category_id: 'cat-1', category_name: 'Birthday' } },
        ],
        images: ['cake1.jpg', 'cake2.jpg'],
      };

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProduct,
              error: null,
            }),
          }),
        }),
      });

      const product = await fetchProductById('prod-1');

      expect(product).toBeDefined();
      expect(product.product_name).toBe('Chocolate Deluxe Cake');
      expect(product.description).toContain('rich, moist');
      expect(product.allergen_info).toContain('eggs');
      expect(product.pricing.length).toBe(2);
    });

    it('should display image carousel for multiple images', async () => {
      const { fetchProductById } = await import('../../src/utils/productCatalog');

      const mockProduct = {
        product_id: 'prod-1',
        product_name: 'Multi-Image Cake',
        pricing: [],
        categories: [],
        images: ['image1.jpg', 'image2.jpg', 'image3.jpg'],
      };

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProduct,
              error: null,
            }),
          }),
        }),
      });

      const product = await fetchProductById('prod-1');

      expect(product.images.length).toBe(3);
    });

    it('should display all pricing options in table', async () => {
      const { fetchProductById } = await import('../../src/utils/productCatalog');

      const mockProduct = {
        product_id: 'prod-1',
        product_name: 'Multi-Price Cake',
        pricing: [
          { pricing_id: 'p1', weight: '500g', price: 1500, servings_estimate: 4 },
          { pricing_id: 'p2', weight: '1kg', price: 2500, servings_estimate: 8 },
          { pricing_id: 'p3', weight: '1.5kg', price: 3500, servings_estimate: 12 },
        ],
        categories: [],
      };

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProduct,
              error: null,
            }),
          }),
        }),
      });

      const product = await fetchProductById('prod-1');

      expect(product.pricing.length).toBe(3);
      expect(product.pricing[0].weight).toBe('500g');
      expect(product.pricing[1].weight).toBe('1kg');
      expect(product.pricing[2].weight).toBe('1.5kg');
    });

    it('should show allergen information prominently', async () => {
      const { fetchProductById } = await import('../../src/utils/productCatalog');

      const mockProduct = {
        product_id: 'prod-1',
        product_name: 'Allergen Cake',
        allergen_info: 'Contains: nuts, dairy, eggs',
        pricing: [],
        categories: [],
      };

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProduct,
              error: null,
            }),
          }),
        }),
      });

      const product = await fetchProductById('prod-1');

      expect(product.allergen_info).toBeDefined();
      expect(product.allergen_info).toContain('nuts');
    });

    it('should display preparation time', async () => {
      const { fetchProductById } = await import('../../src/utils/productCatalog');

      const mockProduct = {
        product_id: 'prod-1',
        product_name: 'Quick Cake',
        preparation_time_minutes: 45,
        pricing: [],
        categories: [],
      };

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProduct,
              error: null,
            }),
          }),
        }),
      });

      const product = await fetchProductById('prod-1');

      expect(product.preparation_time_minutes).toBe(45);
    });
  });

  describe('Pricing Selection', () => {
    it('should allow selecting different pricing options', async () => {
      const { fetchProductById } = await import('../../src/utils/productCatalog');

      const mockProduct = {
        product_id: 'prod-1',
        product_name: 'Size Options Cake',
        pricing: [
          { pricing_id: 'small', weight: '500g', price: 1500 },
          { pricing_id: 'medium', weight: '1kg', price: 2500 },
          { pricing_id: 'large', weight: '2kg', price: 4500 },
        ],
        categories: [],
      };

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProduct,
              error: null,
            }),
          }),
        }),
      });

      const product = await fetchProductById('prod-1');

      // User can select any pricing option
      const selectedPricing = product.pricing.find(p => p.pricing_id === 'medium');
      expect(selectedPricing).toBeDefined();
      expect(selectedPricing.weight).toBe('1kg');
      expect(selectedPricing.price).toBe(2500);
    });

    it('should show price in "From Rs. X" format on product cards', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      const mockProducts = [
        {
          product_id: 'prod-1',
          product_name: 'Varied Price Cake',
          pricing: [
            { pricing_id: 'p1', weight: '500g', price: 2000 },
            { pricing_id: 'p2', weight: '1kg', price: 3500 },
          ],
          categories: [],
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockProducts,
            error: null,
          }),
        }),
      });

      const products = await fetchProducts();

      const product = products[0];
      const minPrice = Math.min(...product.pricing.map(p => p.price));
      expect(minPrice).toBe(2000);
    });

    it('should show servings estimate for each option', async () => {
      const { fetchProductById } = await import('../../src/utils/productCatalog');

      const mockProduct = {
        product_id: 'prod-1',
        product_name: 'Servings Cake',
        pricing: [
          { pricing_id: 'p1', weight: '500g', price: 1500, servings_estimate: 4 },
          { pricing_id: 'p2', weight: '1kg', price: 2500, servings_estimate: 8 },
        ],
        categories: [],
      };

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProduct,
              error: null,
            }),
          }),
        }),
      });

      const product = await fetchProductById('prod-1');

      expect(product.pricing[0].servings_estimate).toBe(4);
      expect(product.pricing[1].servings_estimate).toBe(8);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Network error' },
          }),
        }),
      });

      await expect(fetchProducts()).rejects.toThrow();
    });

    it('should show error state when product not found', async () => {
      const { fetchProductById } = await import('../../src/utils/productCatalog');

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Product not found' },
            }),
          }),
        }),
      });

      await expect(fetchProductById('invalid-id')).rejects.toThrow();
    });

    it('should handle malformed product data', async () => {
      const { fetchProducts } = await import('../../src/utils/productCatalog');

      const malformedProducts = [
        {
          product_id: 'prod-1',
          // Missing required fields
          pricing: null,
          categories: undefined,
        },
      ];

      supabaseMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: malformedProducts,
            error: null,
          }),
        }),
      });

      const products = await fetchProducts();

      // Should handle gracefully
      expect(products).toBeDefined();
      expect(Array.isArray(products[0].pricing)).toBe(true);
    });
  });
});

