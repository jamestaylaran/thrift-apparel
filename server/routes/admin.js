import express from 'express';
import db from '../config/db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
router.use(authenticate, requireAdmin);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDirectory = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDirectory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(null, file.mimetype.startsWith('image/')),
});

router.get('/dashboard', async (req, res) => {
  try {
    const [products] = await db.execute('SELECT COUNT(*) as totalProducts, SUM(stock_quantity) as totalStock FROM products WHERE status != "archived"');
    const [lowStock] = await db.execute('SELECT COUNT(*) as count FROM products WHERE stock_quantity > 0 AND stock_quantity <= 5 AND status != "archived"');
    const [outOfStock] = await db.execute('SELECT COUNT(*) as count FROM products WHERE stock_quantity = 0 AND status != "archived"');
    const [customers] = await db.execute('SELECT COUNT(*) as count FROM users WHERE role = "customer"');
    const [pending] = await db.execute('SELECT COUNT(*) as count FROM orders WHERE status = "pending"');
    const [completed] = await db.execute('SELECT COUNT(*) as count FROM orders WHERE status = "delivered"');
    const [sales] = await db.execute('SELECT COALESCE(SUM(total_amount),0) as totalSales FROM orders WHERE status IN ("confirmed","processing","shipped","delivered")');

    res.json({
      totalProducts: products[0].totalProducts,
      totalStock: products[0].totalStock || 0,
      lowStock: lowStock[0].count,
      outOfStock: outOfStock[0].count,
      totalCustomers: customers[0].count,
      pendingOrders: pending[0].count,
      completedOrders: completed[0].count,
      totalSales: sales[0].totalSales || 0,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load dashboard.', error: error.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT o.*, u.name AS customer_name
      FROM orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch orders.', error: error.message });
  }
});

router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid order status.' });
    }
    await db.execute('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Order status updated.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update status.', error: error.message });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE role = "customer" ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch customers.', error: error.message });
  }
});

router.get('/inventory', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT p.*, c.name as category_name,
      CASE
        WHEN p.stock_quantity > 5 THEN 'In Stock'
        WHEN p.stock_quantity > 0 THEN 'Low Stock'
        ELSE 'Out of Stock'
      END AS inventory_status
      FROM products p
      JOIN categories c ON c.id = p.category_id
      ORDER BY p.stock_quantity ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch inventory.', error: error.message });
  }
});

router.get('/products', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM products ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products.', error: error.message });
  }
});

router.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { sku, name, description, price, category_id, brand, size, color, material, condition_name, stock_quantity, measurements, image_url } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : image_url || '';
    const [result] = await db.execute(
      'INSERT INTO products (sku, name, description, price, category_id, brand, size, color, material, condition_name, stock_quantity, measurements, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [sku, name, description, price, category_id, brand || 'Thrifted', size, color, material, condition_name, stock_quantity || 0, JSON.stringify(measurements || {}), imagePath]
    );
    res.status(201).json({ id: result.insertId, message: 'Product added.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add product.', error: error.message });
  }
});

router.patch('/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { sku, name, description, price, category_id, brand, size, color, material, condition_name, stock_quantity, measurements, image_url } = req.body;
    const [existingRows] = await db.execute('SELECT image_url FROM products WHERE id = ?', [req.params.id]);
    const imagePath = req.file ? `/uploads/${req.file.filename}` : image_url || existingRows[0]?.image_url || '';
    await db.execute(
      'UPDATE products SET sku = ?, name = ?, description = ?, price = ?, category_id = ?, brand = ?, size = ?, color = ?, material = ?, condition_name = ?, stock_quantity = ?, measurements = ?, image_url = ?, updated_at = NOW() WHERE id = ?',
      [sku ?? null, name ?? null, description ?? null, price ?? null, category_id ?? null, brand ?? null, size ?? null, color ?? null, material ?? null, condition_name ?? null, stock_quantity ?? 0, JSON.stringify(measurements || {}), imagePath, req.params.id]
    );
    res.json({ message: 'Product updated.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update product.', error: error.message });
  }
});

router.patch('/products/:id/restock', async (req, res) => {
  try {
    const quantity = Number(req.body.stock_quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      return res.status(400).json({ message: 'Stock quantity must be a whole number of 0 or more.' });
    }

    await db.execute(
      'UPDATE products SET stock_quantity = ?, status = CASE WHEN ? > 0 THEN "active" ELSE "sold_out" END, updated_at = NOW() WHERE id = ?',
      [quantity, quantity, req.params.id]
    );
    res.json({ message: 'Product restocked.', stock_quantity: quantity });
  } catch (error) {
    res.status(500).json({ message: 'Failed to restock product.', error: error.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product.', error: error.message });
  }
});

export default router;
