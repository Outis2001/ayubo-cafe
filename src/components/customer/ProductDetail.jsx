/**
 * Product Detail Component
 * 
 * Modal/page displaying full product details with:
 * - Image carousel for multiple images
 * - Full description, allergens, preparation time
 * - All pricing options with weight/price/servings
 * - Add to cart functionality with pricing selection
 * 
 * @component
 */

import { useState } from 'react';
import { Loader } from '../icons';

// Close icon
const CloseIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// Chevron icons for carousel
const ChevronLeftIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// Star icon
const StarIcon = ({ size = 20, filled = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// Shopping cart icon
const ShoppingCartIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
  </svg>
);

/**
 * ProductDetail Component
 * 
 * @param {Object} props
 * @param {Object} props.product - Product object with pricing and details
 * @param {Function} props.onClose - Callback to close the modal
 * @param {Function} props.onAddToCart - Callback when adding product to cart
 * @param {boolean} props.loading - Loading state
 */
const ProductDetail = ({ product, onClose, onAddToCart, loading = false }) => {
  // Image carousel state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Pricing selection state
  const [selectedPricing, setSelectedPricing] = useState(
    product?.pricing && product.pricing.length > 0 ? product.pricing[0] : null
  );
  
  // Quantity state
  const [quantity, setQuantity] = useState(1);
  
  // Adding to cart state
  const [addingToCart, setAddingToCart] = useState(false);

  if (!product) {
    return null;
  }

  const images = product.image_urls || [];
  const hasPricing = product.pricing && product.pricing.length > 0;

  /**
   * Navigate carousel
   */
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  /**
   * Handle add to cart
   */
  const handleAddToCart = async () => {
    if (!selectedPricing) {
      alert('Please select a pricing option');
      return;
    }

    if (quantity < 1) {
      alert('Please select a valid quantity');
      return;
    }

    setAddingToCart(true);
    
    try {
      await onAddToCart({
        product,
        pricing: selectedPricing,
        quantity,
      });
      
      // Success feedback
      alert('✅ Added to cart!');
      
      // Optionally close modal after adding
      // onClose();
      
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add to cart. Please try again.');
    } finally {
      setAddingToCart(false);
    }
  };

  /**
   * Calculate total price
   */
  const totalPrice = selectedPricing 
    ? (parseFloat(selectedPricing.price) * quantity).toFixed(2)
    : '0.00';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            {product.name}
            {product.is_featured && (
              <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-sm px-2 py-1 rounded-full">
                <StarIcon size={14} filled />
                Featured
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <CloseIcon size={24} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader />
          </div>
        ) : (
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Images */}
              <div>
                {/* Main Image with Carousel */}
                <div className="relative aspect-square bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg overflow-hidden">
                  {images.length > 0 ? (
                    <>
                      <img
                        src={images[currentImageIndex]}
                        alt={`${product.name} - Image ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Carousel Controls */}
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={prevImage}
                            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-75 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition"
                          >
                            <ChevronLeftIcon size={24} />
                          </button>
                          <button
                            onClick={nextImage}
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-75 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition"
                          >
                            <ChevronRightIcon size={24} />
                          </button>
                          
                          {/* Image Indicators */}
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                            {images.map((_, index) => (
                              <button
                                key={index}
                                onClick={() => setCurrentImageIndex(index)}
                                className={`w-2 h-2 rounded-full transition ${
                                  index === currentImageIndex
                                    ? 'bg-white scale-125'
                                    : 'bg-white bg-opacity-50'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-8xl">
                      🍰
                    </div>
                  )}
                </div>

                {/* Thumbnail Strip */}
                {images.length > 1 && (
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    {images.slice(0, 4).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition ${
                          index === currentImageIndex
                            ? 'border-purple-600'
                            : 'border-gray-200 hover:border-purple-300'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Details */}
              <div className="space-y-6">
                {/* Description */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{product.description}</p>
                </div>

                {/* Pricing Options */}
                {hasPricing && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3">Select Size & Price</h3>
                    <div className="space-y-2">
                      {product.pricing.map((pricing) => (
                        <button
                          key={pricing.pricing_id}
                          onClick={() => setSelectedPricing(pricing)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition ${
                            selectedPricing?.pricing_id === pricing.pricing_id
                              ? 'border-purple-600 bg-purple-50'
                              : 'border-gray-200 hover:border-purple-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{pricing.weight}</p>
                              {pricing.servings_estimate && (
                                <p className="text-sm text-gray-600">
                                  Serves approximately {pricing.servings_estimate} people
                                </p>
                              )}
                            </div>
                            <p className="text-xl font-bold text-purple-700">
                              Rs. {parseFloat(pricing.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity Selector */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Quantity</h3>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold text-lg transition"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-20 text-center text-lg font-semibold border-2 border-gray-300 rounded-lg py-2"
                    />
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold text-lg transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="space-y-3 border-t border-gray-200 pt-4">
                  {product.preparation_time && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-600 font-medium">⏱️ Preparation Time:</span>
                      <span className="text-gray-900">{product.preparation_time}</span>
                    </div>
                  )}
                  
                  {product.allergens && (
                    <div className="flex items-start gap-2">
                      <span className="text-gray-600 font-medium">⚠️ Allergen Info:</span>
                      <span className="text-gray-900">{product.allergens}</span>
                    </div>
                  )}
                </div>

                {/* Total Price */}
                {selectedPricing && (
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-gray-700">Total Price:</span>
                      <span className="text-2xl font-bold text-purple-700">
                        Rs. {parseFloat(totalPrice).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={addingToCart || !selectedPricing}
                  className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition ${
                    addingToCart || !selectedPricing
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {addingToCart ? (
                    <>
                      <Loader />
                      Adding to Cart...
                    </>
                  ) : (
                    <>
                      <ShoppingCartIcon size={24} />
                      Add to Cart
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;

