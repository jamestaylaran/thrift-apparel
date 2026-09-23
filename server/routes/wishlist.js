import express from 'express';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT w.id, w.product_id, p.name, p.price, p.image_url, p.condition_name, p.size
      FROM wishlist w
      JOIN products p ON p.id = w.product_id
      WHERE w.user_id = ?
    `, [req.user.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch wishlist.', error: error.message });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { productId } = req.body;
    await db.execute('INSERT IGNORE INTO wishlist (user_id, product_id) VALUES (?, ?)', [req.user.id, productId]);
    res.status(201).json({ message: 'Added to wishlist.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add wishlist item.', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM wishlist WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ message: 'Removed from wishlist.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove wishlist item.', error: error.message });
  }
});

export default router;
