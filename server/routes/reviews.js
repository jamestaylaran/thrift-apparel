import express from 'express';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/product/:productId', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT r.id, r.rating, r.review_text, r.created_at, u.name AS customer_name
      FROM product_reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `, [req.params.productId]);
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
    const [purchased] = await db.execute(`
      SELECT oi.order_id
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = ? AND o.user_id = ? AND o.status = 'delivered'
      ${orderId ? 'AND o.id = ?' : ''}
      ORDER BY o.created_at DESC
      LIMIT 1
    `, orderId ? [productId, req.user.id, orderId] : [productId, req.user.id]);

    if (!purchased.length) {
      return res.status(403).json({ message: 'You can review products you purchased.' });
    }

    await db.execute(
      'INSERT INTO product_reviews (product_id, user_id, order_id, rating, review_text) VALUES (?, ?, ?, ?, ?)',
      [productId, req.user.id, purchased[0].order_id, numericRating, reviewText?.trim() || null]
    );
    res.status(201).json({ message: 'Review submitted.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'You already reviewed this product from that order.' });
    }
    res.status(500).json({ message: 'Failed to submit review.', error: error.message });
  }
});

export default router;