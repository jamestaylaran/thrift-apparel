import express from 'express';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { sendOrderConfirmation } from '../services/email.js';

const router = express.Router();
router.use(authenticate);

router.get('/my-orders', async (req, res) => {
  try {
    const [orders] = await db.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    for (const order of orders) {
      const [items] = await db.execute(`
        SELECT oi.product_id, oi.quantity, oi.price, p.name, p.image_url,
          r.id AS review_id, r.rating AS review_rating, r.review_text
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        LEFT JOIN product_reviews r ON r.order_id = oi.order_id AND r.product_id = oi.product_id AND r.user_id = ?
        WHERE oi.order_id = ?
      `, [req.user.id, order.id]);
      order.items = items;
    }
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders.', error: error.message });
  }
});

router.post('/checkout', async (req, res) => {
  const { items, shippingAddress, phone } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ message: 'Your cart is empty.' });
  }

  if (!shippingAddress || !shippingAddress.trim()) {
    return res.status(400).json({ message: 'Shipping address is required.' });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [cartRows] = await connection.execute('SELECT id FROM carts WHERE user_id = ?', [req.user.id]);
    if (!cartRows.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'No cart found.' });
    }

    const cartId = cartRows[0].id;
    const [cartItems] = await connection.execute('SELECT ci.id, ci.product_id, ci.quantity, p.stock_quantity, p.price, p.name FROM cart_items ci JOIN products p ON p.id = ci.product_id WHERE ci.cart_id = ?', [cartId]);

    if (!cartItems.length) {
      await connection.rollback();
      return res.status(400).json({ message: 'Cart is empty.' });
    }

    for (const item of cartItems) {
      if (item.stock_quantity < item.quantity) {
        await connection.rollback();
        return res.status(400).json({ message: `Insufficient stock for ${item.name}.` });
      }
    }

    const totalAmount = cartItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
    const orderNumber = `THR-${Date.now()}`;

    const [orderResult] = await connection.execute(
      'INSERT INTO orders (user_id, order_number, total_amount, shipping_address, phone, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, orderNumber, totalAmount, shippingAddress, phone || req.user.phone || '', 'pending']
    );

    const orderId = orderResult.insertId;

    for (const item of cartItems) {
      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );

      await connection.execute(
        'UPDATE products SET stock_quantity = stock_quantity - ?, status = CASE WHEN stock_quantity - ? <= 0 THEN "sold_out" ELSE "active" END WHERE id = ?',
        [item.quantity, item.quantity, item.product_id]
      );
    }

    await connection.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
    await connection.commit();

    const [createdOrder] = await db.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    try {
      await sendOrderConfirmation({ recipient: req.user.email, customerName: req.user.name, order: createdOrder[0] });
    } catch (emailError) {
      console.error('Order email failed:', emailError.message);
    }
    res.status(201).json({ message: 'Order placed successfully.', order: createdOrder[0] });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: 'Checkout failed.', error: error.message });
  } finally {
    connection.release();
  }
});

export default router;
