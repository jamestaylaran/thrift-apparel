import express from 'express';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const [items] = await db.execute(`
      SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image_url, p.stock_quantity,
      CASE WHEN p.stock_quantity > 5 THEN 'In Stock' WHEN p.stock_quantity > 0 THEN 'Low Stock' ELSE 'Out of Stock' END AS stock_status
      FROM cart_items ci
      JOIN carts c ON c.id = ci.cart_id
      JOIN products p ON p.id = ci.product_id
      WHERE c.user_id = ?
    `, [req.user.id]);
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch cart.', error: error.message });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const [userCart] = await db.execute('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    const cartId = userCart[0]?.id || (await db.execute('INSERT INTO carts (user_id) VALUES (?)', [req.user.id]))[0].insertId;

    const [existing] = await db.execute('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?', [cartId, productId]);
    if (existing.length) {
      await db.execute('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantity, existing[0].id]);
    } else {
      await db.execute('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [cartId, productId, quantity]);
    }

    res.status(201).json({ message: 'Product added to cart.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add item.', error: error.message });
  }
});

router.post('/buy-now', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const [userCart] = await db.execute('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    const cartId = userCart[0]?.id || (await db.execute('INSERT INTO carts (user_id) VALUES (?)', [req.user.id]))[0].insertId;
    await db.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    await db.execute('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [cartId, productId, quantity]);
    res.status(201).json({ message: 'Buy now cart prepared.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to prepare buy now checkout.', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM cart_items WHERE id = ?', [req.params.id]);
    res.json({ message: 'Item removed from cart.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove item.', error: error.message });
  }
});

export default router;
