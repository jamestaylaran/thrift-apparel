import express from 'express';
import { supabase } from '../../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/product/:productId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('id, rating, review_text, created_at, users(name)')
      .eq('product_id', req.params.productId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data || []).map((row) => ({
      id: row.id,
      rating: row.rating,
      review_text: row.review_text,
      created_at: row.created_at,
      customer_name: row.users?.name || 'Customer',
    }));

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch reviews.', error: error.message });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { productId, orderId, rating, reviewText } = req.body;
  const numericRating = Number(rating);

  if (!productId || !Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ message: 'Choose a rating from 1 to 5.' });
  }

  try {
    // Only allow reviews for products the customer actually received.
    let purchaseQuery = supabase
      .from('order_items')
      .select('order_id, orders!inner(id, user_id, status)')
      .eq('product_id', productId)
      .eq('orders.user_id', req.user.id)
      .eq('orders.status', 'delivered')
      .order('order_id', { ascending: false })
      .limit(1);

    if (orderId) {
      purchaseQuery = purchaseQuery.eq('orders.id', orderId);
    }

    const { data: purchased, error: purchaseError } = await purchaseQuery;

    if (purchaseError) {
      throw purchaseError;
    }

    if (!purchased || !purchased.length) {
      return res.status(403).json({ message: 'You can review products you purchased.' });
    }

    const { error } = await supabase.from('product_reviews').insert({
      product_id: productId,
      user_id: req.user.id,
      order_id: purchased[0].order_id,
      rating: numericRating,
      review_text: reviewText?.trim() || null,
    });

    if (error) {
      throw error;
    }

    res.status(201).json({ message: 'Review submitted.' });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'You already reviewed this product from that order.' });
    }
    res.status(500).json({ message: 'Failed to submit review.', error: error.message });
  }
});

export default router;
