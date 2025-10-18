import { useState, useEffect, useMemo } from 'react';
import { supabaseClient } from './config/supabase';
import {
  Search,
  Trash2,
  ShoppingCart,
  Settings,
  TrendingUp,
  X,
  LogOut,
  User,
  Weight,
  Loader
} from './components/icons';
import DailyStockCheckIn from './components/DailyStockCheckIn';
import useStockCheckIn from './hooks/useStockCheckIn';
import useSortConfig from './hooks/useSortConfig';
import StockBadge from './components/StockBadge';
import SalesBadge from './components/SalesBadge';
import SortConfigPanel from './components/SortConfigPanel';
import {
  validateStock,
  calculateStockDeductions,
  generateInsufficientStockMessage,
  getStockStatus,
  getStockStatusColors
} from './utils/inventory';
import {
  fetchSalesData,
  sortProductsBySales,
  invalidateSalesCache
} from './utils/productSorting';

const AyuboCafe = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginRole, setLoginRole] = useState('');
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [bills, setBills] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showSales, setShowSales] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', isWeightBased: false, stockQuantity: 0, lowStockThreshold: 5 });
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [weight, setWeight] = useState('');
  const [customerPaid, setCustomerPaid] = useState('');
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [loadingSalesData, setLoadingSalesData] = useState(false);

  // Stock check-in hook - triggers daily check-in modal for cashiers/owners
  const {
    shouldShowCheckIn,
    completeCheckIn,
    skipCheckIn,
    showCheckInManually
  } = useStockCheckIn(currentUser?.role);

  // Sort configuration hook - manages N value for product sorting
  const {
    sortN,
    updateSortN,
    loading: loadingSortConfig
  } = useSortConfig();

  const users = {
    owner: { password: 'Sokian@1997', role: 'owner' },
    cashier: { password: 'cashier123', role: 'cashier' }
  };

  useEffect(() => {
    loadProducts();
    loadBills();
    loadSalesData();
  }, [sortN]); // Reload when sortN changes

  const loadProducts = async () => {
    try {
      const { data, error } = await supabaseClient
        .from('products')
        .select('product_id, name, price, is_weight_based, stock_quantity, low_stock_threshold, updated_time')
        .order('product_id', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setProducts(data);
      } else {
        await initializeDefaultProducts();
      }
    } catch (error) {
      console.error('Error loading products:', error);
      alert('Error loading products. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const initializeDefaultProducts = async () => {
    const defaultProducts = [
      { product_id: 1, name: 'Egg Pastry', price: 110, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 2, name: 'Fish Pastry', price: 90, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 3, name: 'Egg Roll', price: 100, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 4, name: 'Fish Roll', price: 80, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 5, name: 'Egg Bun', price: 60, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 6, name: 'Fish Bun', price: 70, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 7, name: 'Meatball bun', price: 120, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 8, name: 'Finger Bun', price: 120, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 9, name: 'Omlet Bun', price: 80, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 10, name: 'Patis', price: 55, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 11, name: 'Egg Sandwich', price: 100, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 12, name: 'Gateau Piece', price: 120, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 13, name: 'Cashew Bar', price: 150, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 14, name: 'Chocolate icing cake (1kg)', price: 1750, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 15, name: 'Chocolate icing cake (small)', price: 1200, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 16, name: 'Vanila icing cake (1kg)', price: 1600, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 17, name: 'Vanila icing cake (small)', price: 1100, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 18, name: 'Tea Bun', price: 50, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 19, name: 'Cream Bun', price: 60, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 20, name: 'Kothmale Chocolate', price: 100, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 21, name: 'Plane Tea(Ginger)', price: 50, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 22, name: 'Plane Tea (Normal)', price: 40, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 23, name: 'Tea', price: 100, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 24, name: 'Chai Tea', price: 140, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 25, name: 'Cordial', price: 100, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 26, name: 'Faluda', price: 200, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 27, name: 'Mini Spunchi', price: 150, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 28, name: 'Opera Cake', price: 150, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 29, name: 'Cheese Cake', price: 200, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 30, name: 'Sandwich Bread', price: 180, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 31, name: 'Normal Bread (450g)', price: 120, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 32, name: 'Donut', price: 150, is_weight_based: false, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 33, name: 'Butter Cake', price: 1000, is_weight_based: true, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 34, name: 'Chocolate Cake', price: 1250, is_weight_based: true, stock_quantity: 0, low_stock_threshold: 5 },
      { product_id: 35, name: 'Ribbon Cake', price: 1200, is_weight_based: true, stock_quantity: 0, low_stock_threshold: 5 }
    ];

    const { error } = await supabaseClient
      .from('products')
      .insert(defaultProducts);

    if (error) {
      console.error('Error initializing products:', error);
    } else {
      setProducts(defaultProducts);
    }
  };

  const loadBills = async () => {
    try {
      // Query orders with their items
      const { data, error } = await supabaseClient
        .from('orders')
        .select(`
          order_id,
          order_date,
          value,
          order_items (
            order_item_id,
            product_id,
            quantity,
            subtotal,
            products (
              name
            )
          )
        `)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (error) {
      console.error('Error loading bills:', error);
    }
  };

  const loadSalesData = async () => {
    try {
      setLoadingSalesData(true);
      const data = await fetchSalesData(supabaseClient, sortN);
      setSalesData(data);
    } catch (error) {
      console.error('Error loading sales data:', error);
      setSalesData([]);
    } finally {
      setLoadingSalesData(false);
    }
  };

  const handleLogin = () => {
    if (loginRole === 'guest') {
      setCurrentUser({ role: 'guest' });
      return;
    }

    const user = users[loginRole];
    if (user && user.password === password) {
      setCurrentUser({ role: loginRole });
      setPassword('');
    } else {
      alert('Invalid password!');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginRole('');
    setPassword('');
    setCart([]);
    setShowSettings(false);
    setShowSales(false);
  };

  const addToCart = (product) => {
    // Check if product is out of stock
    const stockStatus = getStockStatus(product);
    if (stockStatus === 'out') {
      alert(`❌ ${product.name} is out of stock!`);
      return;
    }

    if (product.is_weight_based) {
      setSelectedProduct(product);
      setShowWeightModal(true);
      return;
    }

    // Check if adding one more would exceed stock
    const existing = cart.find(item => item.product_id === product.product_id && !item.weight);
    const currentCartQuantity = existing ? existing.quantity : 0;
    
    if (currentCartQuantity + 1 > product.stock_quantity) {
      alert(`❌ Cannot add more. Only ${product.stock_quantity} ${product.name} available in stock.`);
      return;
    }

    if (existing) {
      setCart(cart.map(item =>
        item.product_id === product.product_id && !item.weight ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const addWeightBasedProduct = () => {
    const weightValue = parseFloat(weight);
    if (!weightValue || weightValue <= 0) {
      alert('Please enter a valid weight');
      return;
    }

    // Check if weight exceeds available stock
    if (weightValue > selectedProduct.stock_quantity) {
      alert(`❌ Only ${selectedProduct.stock_quantity} kg available in stock.`);
      return;
    }

    const cartItem = {
      ...selectedProduct,
      quantity: weightValue,
      weight: weightValue,
      displayName: `${selectedProduct.name} (${weightValue}kg)`
    };

    setCart([...cart, cartItem]);
    setShowWeightModal(false);
    setWeight('');
    setSelectedProduct(null);
  };

  const updateQuantity = (index, quantity) => {
    if (quantity <= 0) {
      setCart(cart.filter((_, i) => i !== index));
    } else {
      setCart(cart.map((item, i) =>
        i === index ? { ...item, quantity: parseFloat(quantity) } : item
      ));
    }
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2);
  };

  const calculateBalance = () => {
    const paid = parseFloat(customerPaid) || 0;
    const total = parseFloat(calculateTotal());
    return (paid - total).toFixed(2);
  };

  const generateBill = () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }
    setShowBillPreview(true);
  };

  const confirmBill = async () => {
    try {
      // Step 1: Validate stock availability
      const stockValidation = validateStock(cart, products);
      if (!stockValidation.isValid) {
        const errorMessage = generateInsufficientStockMessage(stockValidation.insufficientItems);
        alert(`❌ ${errorMessage}`);
        return;
      }

      const totalAmount = parseFloat(calculateTotal());
      const paidAmount = parseFloat(customerPaid) || 0;

      // Step 2: Create order record in orders table
      const { data: orderData, error: orderError } = await supabaseClient
        .from('orders')
        .insert({
          order_date: new Date().toISOString(),
          value: totalAmount
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderId = orderData.order_id;

      // Step 3: Create order items in order_items table
      const orderItems = cart.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        quantity: item.quantity,
        subtotal: item.price * item.quantity
      }));

      const { error: itemsError } = await supabaseClient
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Step 4: Deduct stock quantities with decimal precision
      const stockDeductions = calculateStockDeductions(cart);
      
      const stockUpdatePromises = stockDeductions.map(async ({ product_id, deductAmount }) => {
        const product = products.find(p => p.product_id === product_id);
        const newStock = product.stock_quantity - deductAmount;

        // Prevent negative stock (database constraint)
        if (newStock < 0) {
          throw new Error(`Stock deduction would result in negative stock for ${product.name}`);
        }

        return supabaseClient
          .from('products')
          .update({ 
            stock_quantity: newStock,
            updated_time: new Date().toISOString()
          })
          .eq('product_id', product_id);
      });

      const stockResults = await Promise.all(stockUpdatePromises);
      
      // Check for actual errors (error exists and status is not 2xx)
      const stockErrors = stockResults.filter(result => {
        // Success if error is null/undefined OR status is 2xx
        const isSuccess = !result.error || (result.status >= 200 && result.status < 300);
        return !isSuccess;
      });
      
      if (stockErrors.length > 0) {
        console.error('Stock update errors:', stockErrors);
        console.error('Error details:', stockErrors.map(e => e.error));
        throw new Error('Failed to update stock quantities');
      }
      
      console.log('✅ Stock updated successfully for', stockResults.length, 'products');

      // Step 5: Invalidate sales cache and reload data
      invalidateSalesCache();
      await loadProducts();
      await loadBills();
      await loadSalesData();
      setCart([]);
      setCustomerPaid('');
      setShowBillPreview(false);
      alert('✅ Bill saved successfully! Stock updated.');
    } catch (error) {
      console.error('Error saving bill:', error);
      alert(`❌ Error saving bill: ${error.message || 'Please try again.'}`);
    }
  };

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      alert('Please fill all fields');
      return;
    }

    try {
      const product = {
        product_id: Date.now(),
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        is_weight_based: newProduct.isWeightBased,
        stock_quantity: parseFloat(newProduct.stockQuantity) || 0,
        low_stock_threshold: parseFloat(newProduct.lowStockThreshold) || 5
      };

      const { error } = await supabaseClient
        .from('products')
        .insert([product]);

      if (error) throw error;

      await loadProducts();
      setNewProduct({ name: '', price: '', isWeightBased: false, stockQuantity: 0, lowStockThreshold: 5 });
      alert('Product added successfully!');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error adding product. Please try again.');
    }
  };

  const deleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabaseClient
        .from('products')
        .delete()
        .eq('product_id', productId);

      if (error) throw error;

      await loadProducts();
      alert('Product deleted successfully!');
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error deleting product. Please try again.');
    }
  };

  const deleteBill = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order?')) return;

    try {
      // Delete from orders table (order_items will cascade delete)
      const { error } = await supabaseClient
        .from('orders')
        .delete()
        .eq('order_id', orderId);

      if (error) throw error;

      await loadBills();
      alert('Order deleted successfully!');
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error deleting order. Please try again.');
    }
  };

  const startEdit = (product) => {
    setEditingProduct({ ...product });
  };

  const saveEdit = async () => {
    try {
      const updateData = {
        name: editingProduct.name,
        price: editingProduct.price,
        is_weight_based: editingProduct.is_weight_based
      };

      // Only owner can edit stock quantity and threshold
      if (currentUser.role === 'owner') {
        updateData.stock_quantity = parseFloat(editingProduct.stock_quantity) || 0;
        updateData.low_stock_threshold = parseFloat(editingProduct.low_stock_threshold) || 5;
      }

      const { error } = await supabaseClient
        .from('products')
        .update(updateData)
        .eq('product_id', editingProduct.product_id);

      if (error) throw error;

      await loadProducts();
      setEditingProduct(null);
      alert('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Error updating product. Please try again.');
    }
  };

  const getDailySales = () => {
    // Get today's date at midnight in local timezone for consistent comparison
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    const todayOrders = bills.filter(order => {
      const orderDate = new Date(order.order_date);
      return orderDate >= todayStart && orderDate <= todayEnd;
    });
    
    const total = todayOrders.reduce((sum, order) => sum + parseFloat(order.value), 0);
    return { count: todayOrders.length, total: total.toFixed(2) };
  };

  const getTotalSales = () => {
    const total = bills.reduce((sum, order) => sum + parseFloat(order.value), 0);
    return { count: bills.length, total: total.toFixed(2) };
  };

  const getItemWiseSales = () => {
    const itemSales = {};
    bills.forEach(order => {
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach(item => {
          const productName = item.products?.name || 'Unknown';
          if (!itemSales[productName]) {
            itemSales[productName] = { quantity: 0, revenue: 0 };
          }
          itemSales[productName].quantity += parseFloat(item.quantity);
          itemSales[productName].revenue += parseFloat(item.subtotal);
        });
      }
    });
    return Object.entries(itemSales).map(([name, data]) => ({
      name,
      ...data
    })).sort((a, b) => b.revenue - a.revenue);
  };

  const getUniqueBills = () => {
    return bills.map(order => ({
      id: order.order_id,
      date: new Date(order.order_date).toLocaleString(),
      total: parseFloat(order.value),
      items: order.order_items || []
    }));
  };

  // Sorted products using sales data (with 5-minute cache)
  const sortedProducts = useMemo(() => {
    return sortProductsBySales(products, salesData);
  }, [products, salesData]);

  // Filter sorted products by search query
  const filteredProducts = sortedProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50 flex items-center justify-center">
        <div className="text-center">
          <Loader />
          <p className="mt-4 text-blue-700 font-semibold">Loading Ayubo Cafe...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-6 sm:p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-blue-700 mb-2">Ayubo Cafe</h1>
            <p className="text-gray-600">Select your role to continue</p>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => setLoginRole('guest')}
              className={`w-full p-4 rounded-lg border-2 transition ${
                loginRole === 'guest'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <User size={24} />
                <div className="text-left">
                  <div className="font-bold">Guest</div>
                  <div className="text-sm text-gray-600">Billing only</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setLoginRole('cashier')}
              className={`w-full p-4 rounded-lg border-2 transition ${
                loginRole === 'cashier'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <User size={24} />
                <div className="text-left">
                  <div className="font-bold">Cashier</div>
                  <div className="text-sm text-gray-600">Manage products & billing</div>
                </div>
              </div>
            </button>

            <button
              onClick={() => setLoginRole('owner')}
              className={`w-full p-4 rounded-lg border-2 transition ${
                loginRole === 'owner'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <User size={24} />
                <div className="text-left">
                  <div className="font-bold">Owner</div>
                  <div className="text-sm text-gray-600">Full access</div>
                </div>
              </div>
            </button>

            {(loginRole === 'cashier' || loginRole === 'owner') && (
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            )}

            <button
              onClick={handleLogin}
              disabled={!loginRole}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-700 hover:to-blue-800 transition"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showWeightModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-700">Enter Weight</h2>
            <button onClick={() => { setShowWeightModal(false); setWeight(''); }} className="text-gray-600 hover:text-gray-800">
              <X size={24} />
            </button>
          </div>
          
          <div className="mb-4">
            <p className="text-gray-700 mb-2">Product: <span className="font-semibold">{selectedProduct?.name}</span></p>
            <p className="text-gray-700 mb-4">Price: <span className="font-semibold">Rs. {selectedProduct?.price}/kg</span></p>
            
            <label className="block text-sm font-semibold mb-2">Weight (kg):</label>
            <input
              type="number"
              step="0.01"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="Enter weight in kg"
              className="w-full px-4 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && addWeightBasedProduct()}
            />
            
            {weight && (
              <div className="mt-3 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                <p className="text-sm text-gray-600">Total Price:</p>
                <p className="text-xl font-bold text-green-700">
                  Rs. {(parseFloat(weight) * selectedProduct?.price).toFixed(2)}
                </p>
              </div>
            )}
          </div>
          
          <button
            onClick={addWeightBasedProduct}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-bold hover:from-blue-700 hover:to-blue-800 transition"
          >
            Add to Cart
          </button>
        </div>
      </div>
    );
  }

  if (showBillPreview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-blue-700">Bill Preview</h2>
              <button onClick={() => setShowBillPreview(false)} className="text-gray-600 hover:text-gray-800">
                <X size={24} />
              </button>
            </div>

            <div className="border-2 border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="text-center text-2xl font-bold text-blue-700 mb-1">Ayubo Cafe</h3>
              <p className="text-center text-sm text-gray-600 mb-4">{new Date().toLocaleString()}</p>
              
              <div className="border-t border-b border-gray-300 py-2 mb-2">
                <div className="grid grid-cols-12 gap-2 font-semibold text-sm">
                  <div className="col-span-5">Item</div>
                  <div className="col-span-2 text-center">Qty</div>
                  <div className="col-span-2 text-right">Price</div>
                  <div className="col-span-3 text-right">Total</div>
                </div>
              </div>

              {cart.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 py-1 text-sm">
                  <div className="col-span-5">{item.displayName || item.name}</div>
                  <div className="col-span-2 text-center">{item.quantity}{item.is_weight_based ? 'kg' : ''}</div>
                  <div className="col-span-2 text-right">{item.price.toFixed(2)}</div>
                  <div className="col-span-3 text-right font-semibold">{(item.price * item.quantity).toFixed(2)}</div>
                </div>
              ))}

              <div className="border-t-2 border-gray-300 mt-2 pt-2">
                <div className="flex justify-between text-lg font-bold mb-2">
                  <span>Total:</span>
                  <span className="text-blue-700">Rs. {calculateTotal()}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Customer Paid:</label>
                <input
                  type="number"
                  step="0.01"
                  value={customerPaid}
                  onChange={(e) => setCustomerPaid(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-lg"
                />
              </div>

              {customerPaid && (
                <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Balance:</span>
                    <span className={parseFloat(calculateBalance()) >= 0 ? 'text-green-700' : 'text-red-700'}>
                      Rs. {calculateBalance()}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={confirmBill}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-bold hover:from-green-700 hover:to-green-800 transition"
              >
                Confirm & Save Bill
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-yellow-50 to-green-50 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">Ayubo Cafe</h1>
              <p className="text-sm text-gray-600">Logged in as: <span className="font-semibold capitalize">{currentUser.role}</span></p>
            </div>
            <div className="flex flex-wrap gap-2">
              {currentUser.role === 'owner' && (
                <button
                  onClick={() => setShowSales(!showSales)}
                  className="flex items-center gap-2 bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                >
                  <TrendingUp size={18} />
                  <span className="hidden sm:inline">Sales</span>
                </button>
              )}
              {(currentUser.role === 'cashier' || currentUser.role === 'owner') && (
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="flex items-center gap-2 bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  <Settings size={18} />
                  <span className="hidden sm:inline">Products</span>
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-700 transition text-sm"
              >
                <LogOut size={18} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {showSettings && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-blue-800">Manage Products</h2>
                <button onClick={() => setShowSettings(false)} className="text-blue-800 hover:text-blue-900">
                  <X size={24} />
                </button>
              </div>
              
              {/* Sort Configuration Panel - Owner Only */}
              {currentUser.role === 'owner' && (
                <SortConfigPanel
                  currentN={sortN}
                  onSave={async (newN) => {
                    const success = await updateSortN(newN);
                    if (success) {
                      invalidateSalesCache();
                      await loadSalesData();
                    }
                    return success;
                  }}
                  loading={loadingSortConfig || loadingSalesData}
                />
              )}
              
              <div className="space-y-2 mb-4">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Product Name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                    className="flex-1 px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Price"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full sm:w-32 px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    step={newProduct.isWeightBased ? "0.1" : "1"}
                    placeholder="Stock"
                    value={newProduct.stockQuantity}
                    onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })}
                    className="w-full sm:w-24 px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Low Stock"
                    value={newProduct.lowStockThreshold}
                    onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: e.target.value })}
                    className="w-full sm:w-24 px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                  />
                  <button
                    onClick={addProduct}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                  >
                    Add
                  </button>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={newProduct.isWeightBased}
                    onChange={(e) => setNewProduct({ ...newProduct, isWeightBased: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>Weight-based pricing (price per kg)</span>
                </label>
                <button
                  onClick={showCheckInManually}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm font-medium flex items-center justify-center gap-2"
                >
                  📦 Update All Stock Quantities
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {products.map(product => (
                  <div key={product.product_id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-2 bg-white rounded border border-blue-200 text-sm">
                    {editingProduct?.product_id === product.product_id ? (
                      <>
                        <input
                          type="text"
                          value={editingProduct.name}
                          onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                          className="flex-1 w-full px-2 py-1 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="number"
                          step="0.01"
                          value={editingProduct.price}
                          onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                          className="w-full sm:w-24 px-2 py-1 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
                        />
                        {currentUser.role === 'owner' && (
                          <>
                            <input
                              type="number"
                              min="0"
                              step={editingProduct.is_weight_based ? "0.1" : "1"}
                              value={editingProduct.stock_quantity}
                              onChange={(e) => setEditingProduct({ ...editingProduct, stock_quantity: parseFloat(e.target.value) })}
                              className="w-full sm:w-20 px-2 py-1 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
                              placeholder="Stock"
                            />
                            <input
                              type="number"
                              min="0"
                              value={editingProduct.low_stock_threshold}
                              onChange={(e) => setEditingProduct({ ...editingProduct, low_stock_threshold: parseFloat(e.target.value) })}
                              className="w-full sm:w-20 px-2 py-1 border-2 border-blue-300 rounded focus:outline-none focus:border-blue-500"
                              placeholder="Threshold"
                            />
                          </>
                        )}
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={editingProduct.is_weight_based}
                            onChange={(e) => setEditingProduct({ ...editingProduct, is_weight_based: e.target.checked })}
                            className="w-3 h-3"
                          />
                          <span>Weight</span>
                        </label>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button onClick={saveEdit} className="flex-1 sm:flex-none bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">
                            Save
                          </button>
                          <button onClick={() => setEditingProduct(null)} className="flex-1 sm:flex-none bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600">
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 flex flex-col gap-1">
                          <span className="flex items-center gap-1">
                            {product.name}
                            {product.is_weight_based && <Weight size={14} className="text-orange-600" />}
                          </span>
                          <div className="flex items-center gap-2">
                            <StockBadge product={product} showFullText={false} />
                            {currentUser.role === 'owner' && (
                              <SalesBadge 
                                product={product}
                                salesQuantity={salesData.find(s => s.product_id === product.product_id)?.total_sold || 0}
                                isMobile={true}
                              />
                            )}
                          </div>
                        </span>
                        <span className="w-24 font-semibold text-blue-700">
                          Rs. {product.price.toFixed(2)}{product.is_weight_based && '/kg'}
                        </span>
                        {currentUser.role === 'owner' && product.updated_time && (
                          <span className="text-xs text-gray-500 w-20">
                            {new Date(product.updated_time).toLocaleDateString()}
                          </span>
                        )}
                        <div className="flex gap-2">
                          <button onClick={() => startEdit(product)} className="text-blue-600 px-2 hover:text-blue-800">
                            Edit
                          </button>
                          <button onClick={() => deleteProduct(product.product_id)} className="text-red-600 hover:text-red-800">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showSales && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-green-800">Sales Reports</h2>
                <button onClick={() => setShowSales(false)} className="text-green-800 hover:text-green-900">
                  <X size={24} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                  <h3 className="text-sm text-gray-600 mb-1">Today's Sales</h3>
                  <p className="text-xl sm:text-2xl font-bold text-green-700">Rs. {getDailySales().total}</p>
                  <p className="text-sm text-gray-500">{getDailySales().count} bills</p>
                </div>
                <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                  <h3 className="text-sm text-gray-600 mb-1">Total Sales</h3>
                  <p className="text-xl sm:text-2xl font-bold text-blue-700">Rs. {getTotalSales().total}</p>
                  <p className="text-sm text-gray-500">{getTotalSales().count} bills</p>
                </div>
              </div>

              <div className="mb-4">
                <h3 className="font-bold text-green-800 mb-2">Item-wise Sales</h3>
                <div className="bg-white rounded-lg border-2 border-green-200 max-h-48 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-green-100 sticky top-0">
                      <tr>
                        <th className="text-left p-2">Item</th>
                        <th className="text-center p-2">Qty</th>
                        <th className="text-right p-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getItemWiseSales().map((item, idx) => (
                        <tr key={idx} className="border-t border-green-100">
                          <td className="p-2">{item.name}</td>
                          <td className="text-center p-2">{item.quantity.toFixed(2)}</td>
                          <td className="text-right p-2 font-semibold">Rs. {item.revenue.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-green-800 mb-2">Recent Bills</h3>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {getUniqueBills().map(bill => (
                    <div key={bill.id} className="bg-white p-3 rounded border border-green-200">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs text-gray-600">{bill.date}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-green-700">Rs. {bill.total.toFixed(2)}</span>
                          <button
                            onClick={() => deleteBill(bill.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {bill.items.map((item, idx) => 
                          `${item.products?.name || 'Unknown'} x${item.quantity}${idx < bill.items.length - 1 ? ', ' : ''}`
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-4 text-blue-700">Products</h2>
              <div className="mb-4 relative">
                <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 max-h-96 overflow-y-auto" style={{ transition: 'all 300ms ease-in-out' }}>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(product => {
                    const stockStatus = getStockStatus(product);
                    const isOutOfStock = stockStatus === 'out';
                    const isLowStock = stockStatus === 'low';
                    
                    return (
                      <button
                        key={product.product_id}
                        onClick={() => addToCart(product)}
                        disabled={isOutOfStock}
                        title={isOutOfStock ? `${product.name} is currently out of stock` : ''}
                        className={`group p-3 sm:p-4 rounded-lg text-left transition shadow-md hover:shadow-lg relative border-2 ${
                          isOutOfStock
                            ? 'bg-gray-100 cursor-not-allowed opacity-60 border-gray-300'
                            : isLowStock
                            ? 'bg-gradient-to-br from-yellow-300 to-yellow-400 hover:from-yellow-400 hover:to-yellow-500 border-yellow-500'
                            : 'bg-gradient-to-br from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 border-yellow-600'
                        } text-gray-900`}
                      >
                        {product.is_weight_based && (
                          <div className="absolute top-1 right-1 group-hover:opacity-0 transition-opacity">
                            <Weight size={16} className="text-orange-700" />
                          </div>
                        )}
                        
                        {/* Normal state - show everything */}
                        <div className="group-hover:hidden">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold text-sm sm:text-base line-clamp-1 flex-1">{product.name}</div>
                            <div className="text-xs sm:text-sm font-bold whitespace-nowrap">
                              {product.price.toFixed(2)}{product.is_weight_based && '/kg'}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <div className="flex items-center">
                              {currentUser.role === 'owner' && (
                                <SalesBadge 
                                  product={product} 
                                  salesQuantity={salesData.find(s => s.product_id === product.product_id)?.total_sold || 0}
                                />
                              )}
                            </div>
                            <div className="flex items-center">
                              {currentUser.role !== 'guest' && (
                                <StockBadge product={product} showFullText={false} />
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Hover state - only show centered full product name */}
                        <div className="hidden group-hover:flex items-center justify-center h-full absolute inset-0 p-3 sm:p-4">
                          <div className="font-semibold text-sm sm:text-base text-center">
                            {product.name}
                          </div>
                        </div>
                        {isOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-20 rounded-lg">
                            <span className="text-red-700 font-bold text-xs bg-white px-2 py-1 rounded">
                              OUT OF STOCK
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-2 sm:col-span-3 lg:col-span-2 xl:col-span-3 text-center text-gray-500 py-8">
                    No products found
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-bold mb-4 text-blue-700 flex items-center gap-2">
                <ShoppingCart size={24} />
                Cart
              </h2>
              <div className="bg-blue-50 rounded-lg p-3 sm:p-4 border-2 border-blue-200">
                {cart.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                      {cart.map((item, index) => (
                        <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-white p-2 sm:p-3 rounded border border-blue-200">
                          <div className="flex-1 w-full">
                            <div className="font-semibold text-blue-900 text-sm">{item.displayName || item.name}</div>
                            <div className="text-xs text-gray-600">Rs. {item.price.toFixed(2)} {item.is_weight_based ? 'per kg' : 'each'}</div>
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            {!item.is_weight_based && (
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateQuantity(index, e.target.value)}
                                className="w-16 px-2 py-1 border-2 border-blue-300 rounded text-center focus:outline-none focus:border-blue-500 text-sm"
                              />
                            )}
                            {item.is_weight_based && (
                              <span className="text-sm font-semibold">{item.quantity}kg</span>
                            )}
                            <div className="flex-1 sm:w-20 text-right font-semibold text-blue-700 text-sm">
                              Rs. {(item.price * item.quantity).toFixed(2)}
                            </div>
                            <button
                              onClick={() => removeFromCart(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t-2 border-blue-300 pt-4">
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-lg sm:text-xl font-bold text-blue-900">Total:</span>
                        <span className="text-xl sm:text-2xl font-bold text-green-700">Rs. {calculateTotal()}</span>
                      </div>
                      <button
                        onClick={generateBill}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-lg font-bold transition shadow-md hover:shadow-lg"
                      >
                        Generate Bill
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Daily Stock Check-In Modal */}
        {shouldShowCheckIn && currentUser && currentUser.role !== 'guest' && (
          <DailyStockCheckIn
            products={products}
            onSave={async () => {
              await loadProducts();
              completeCheckIn();
            }}
            onSkip={skipCheckIn}
            onClose={skipCheckIn}
            supabaseClient={supabaseClient}
          />
        )}
      </div>
    </div>
  );
};

export default AyuboCafe;

