import express from 'express';
import { supabase } from '../../lib/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

const stockStatus = (quantity) =>
  quantity > 5 ? 'In Stock' : quantity > 0 ? 'Low Stock' : 'Out of Stock';

const getUserCartId = async (userId) => {
  const { data: existing } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  const { data: created } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (created) {
    return created.id;
  }

  // Another request created it first — read it again.
  const { data: again } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  return again?.id || null;
};

router.get('/', async (req, res) => {
  try {
    const cartId = await getUserCartId(req.user.id);
    if (!cartId) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('cart_items')
      .select('id, product_id, quantity, products(id, name, price, image_url, stock_quantity)')
      .eq('cart_id', cartId)
      .order('id', { ascending: true });

    if (error) {
      throw error;
    }

    const items = (data || []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      name: item.products?.name || null,
      price: item.products?.price || 0,
      image_url: item.products?.image_url || null,
      stock_quantity: item.products?.stock_quantity ?? 0,
      stock_status: stockStatus(item.products?.stock_quantity ?? 0),
    }));

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch cart.', error: error.message });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product is required.' });
    }

    const cartId = await getUserCartId(req.user.id);
    if (!cartId) {
      return res.status(500).json({ message: 'Could not find or create your cart.' });
    }

    const { data: existing } = await supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + Number(quantity || 1) })
        .eq('id', existing.id);

      if (error) {
        throw error;
      }
    } else {
      const { error } = await supabase
        .from('cart_items')
        .insert({ cart_id: cartId, product_id: productId, quantity: Number(quantity) || 1 });

      if (error) {
        throw error;
      }
    }

    res.status(201).json({ message: 'Product added to cart.' });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ message: 'Product not found.' });
    }
    res.status(500).json({ message: 'Failed to add item.', error: error.message });
  }
});

router.post('/buy-now', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product is required.' });
    }

    const cartId = await getUserCartId(req.user.id);
    if (!cartId) {
      return res.status(500).json({ message: 'Could not find or create your cart.' });
    }

    await supabase.from('cart_items').delete().eq('cart_id', cartId);

    const { error } = await supabase
      .from('cart_items')
      .insert({ cart_id: cartId, product_id: productId, quantity: Number(quantity) || 1 });

    if (error) {
      throw error;
    }

    res.status(201).json({ message: 'Buy now cart prepared.' });
  } catch (error) {
    if (error.code === '23503') {
      return res.status(400).json({ message: 'Product not found.' });
    }
    res.status(500).json({ message: 'Failed to prepare buy now checkout.', error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const cartId = await getUserCartId(req.user.id);
    if (!cartId) {
      return res.status(404).json({ message: 'Item not found.' });
    }

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', req.params.id)
      .eq('cart_id', cartId);

    if (error) {
      throw error;
    }

    res.json({ message: 'Item removed from cart.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to remove item.', error: error.message });
  }
});

export default router;
