import express from 'express';
import db from '../config/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { category, size, brand, color, condition, q, sort, minPrice, maxPrice } = req.query;
    let query = `
      SELECT p.*, c.name as category_name,
      CASE
        WHEN p.stock_quantity > 5 THEN 'In Stock'
        WHEN p.stock_quantity > 0 THEN 'Low Stock'
        ELSE 'Out of Stock'
      END AS stock_status
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.status != 'archived' AND p.stock_quantity > 0
    `;
    const params = [];

    if (category) {
      query += ' AND c.name = ?';
      params.push(category);
    }
    if (size) {
      query += ' AND p.size = ?';
      params.push(size);
    }
    if (brand) {
      query += ' AND p.brand = ?';
      params.push(brand);
    }
    if (color) {
      query += ' AND p.color = ?';
      params.push(color);
    }
    if (condition) {
      query += ' AND p.condition_name = ?';
      params.push(condition);
    }
    if (minPrice) {
      query += ' AND p.price >= ?';
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      query += ' AND p.price <= ?';
      params.push(Number(maxPrice));
    }
    if (q) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.brand LIKE ?)';
      const search = `%${q}%`;
      params.push(search, search, search);
    }

    if (sort === 'price_asc') {
      query += ' ORDER BY p.price ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY p.price DESC';
    } else {
      query += ' ORDER BY p.created_at DESC';
    }

    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products.', error: error.message });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM products WHERE status != "archived" AND stock_quantity > 0 ORDER BY (id = 16) DESC, created_at DESC LIMIT 8');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch featured products.', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.execute(`
      SELECT p.*, c.name as category_name,
      CASE
        WHEN p.stock_quantity > 5 THEN 'In Stock'
        WHEN p.stock_quantity > 0 THEN 'Low Stock'
        ELSE 'Out of Stock'
      END AS stock_status
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.id = ?
    `, [id]);

    if (!rows.length) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch product.', error: error.message });
  }
});

export default router;
