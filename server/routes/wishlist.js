import express from 'express';
import { supabase } from '../../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('wishlist')
      .select('id, product_id, products(id, name, price, image_url, condition_name, size, stock_quantity, status, category_id, brand, color, material, description)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Return product-shaped rows so the storefront cards can render them directly.
    const items = (data || [])
      .filter((row) => row.products)
      .map((row) => ({
        ...row.products,
        id: row.product_id,
        wishlist_item_id: row.id,
      }));

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch wishlist.', error: error.message });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product is required.' });
    }

    const { error } = await supabase
      .from('wishlist')
      .upsert(
        { user_id: req.user.id, product_id: productId },
        { onConflict: 'user_id,product_id', ignoreDuplicates: true },
      );

    if (error) {
      throw error;
    }

    res.status(201).json({ message: 'Added to wishlist.' });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ message: 'Product not found.' });
    }
    res.status(500).json({ message: 'Failed to add wishlist item.', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('wishlist')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Removed from wishlist.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove wishlist item.', error: error.message });
  }
});

export default router;
