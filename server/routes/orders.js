import express from 'express';
import { supabase } from '../../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { sendOrderConfirmation } from '../services/email.js';

const router = express.Router();
router.use(authenticate);

router.get('/my-orders', async (req, res) => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!orders || !orders.length) {
      return res.json([]);
    }

    const orderIds = orders.map((order) => order.id);

    const [{ data: orderItems, error: itemsError }, { data: myReviews, error: reviewsError }] =
      await Promise.all([
        supabase
          .from('order_items')
          .select('order_id, product_id, quantity, price, products(name, image_url)')
          .in('order_id', orderIds),
        supabase
          .from('product_reviews')
          .select('id, order_id, product_id, rating, review_text')
          .eq('user_id', req.user.id)
          .in('order_id', orderIds),
      ]);

    if (itemsError) throw itemsError;
    if (reviewsError) throw reviewsError;

    const reviewKey = (review) => `${review.order_id}:${review.product_id}`;

    const reviewsByItem = new Map((myReviews || []).map((review) => [reviewKey(review), review]));

    const itemsByOrder = new Map();
    for (const item of orderItems || []) {
      const review = reviewsByItem.get(reviewKey(item));
      const shaped = {
        product_id: item.product_id,
        quantity: item.quantity,
        price: item.price,
        name: item.products?.name || null,
        image_url: item.products?.image_url || null,
        review_id: review?.id || null,
        review_rating: review?.rating || null,
        review_text: review?.review_text || null,
      };

      if (!itemsByOrder.has(item.order_id)) {
        itemsByOrder.set(item.order_id, []);
      }
      itemsByOrder.get(item.order_id).push(shaped);
    }

    const shapedOrders = orders.map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id) || [],
    }));

    res.json(shapedOrders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders.', error: error.message });
  }
});

router.post('/checkout', async (req, res) => {
  const { shippingAddress, phone } = req.body;

  if (!shippingAddress || !String(shippingAddress).trim()) {
    return res.status(400).json({ message: 'Shipping address is required.' });
  }

  try {
    // place_order() is a database function that validates stock, creates the
    // order, decreases inventory and clears the cart atomically.
    const { data: order, error } = await supabase.rpc('place_order', {
      p_user_id: req.user.id,
      p_shipping_address: shippingAddress,
      p_phone: phone || req.user.phone || '',
    });

    if (error) {
      return res.status(400).json({ message: cleanCheckoutError(error.message) });
    }

    // Load the purchased lines so the receipt email can be itemised.
    let items = [];
    try {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('quantity, price, products(name, sku)')
        .eq('order_id', order.id);

      items = (orderItems || []).map((row) => ({
        name: row.products?.name || 'Item',
        sku: row.products?.sku || '',
        quantity: row.quantity,
        price: row.price,
      }));
    } catch (itemsError) {
      console.error('Could not load order items for receipt:', itemsError.message);
    }

    try {
      await sendOrderConfirmation({
        recipient: req.user.email,
        customerName: req.user.name,
        order,
        items,
      });
    } catch (emailError) {
      console.error('Order email failed:', emailError.message);
    }

    res.status(201).json({ message: 'Order placed successfully.', order });
  } catch (error) {
    res.status(500).json({ message: 'Checkout failed.', error: error.message });
  }
});

const cleanCheckoutError = (message = 'Checkout failed.') => {
  if (/cart is empty/i.test(message)) return 'Cart is empty.';
  if (/no cart found/i.test(message)) return 'Your cart is empty.';
  if (/shipping address/i.test(message)) return 'Shipping address is required.';
  if (/insufficient stock/i.test(message)) return message.replace(/^.*?(Insufficient stock)/i, '$1');
  return message;
};

export default router;
