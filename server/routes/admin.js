import express from 'express';
import { supabase } from '../../lib/supabase.js';
import { hasBestPickColumn, parseBestPick } from '../../lib/best-pick.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import multer from 'multer';

const router = express.Router();
router.use(authenticate, requireAdmin);

const PRODUCT_BUCKET = 'product-images';

// Files are kept in memory and streamed straight to Supabase Storage,
// because serverless functions on Vercel have no persistent disk.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) =>
    callback(null, file.mimetype.startsWith('image/')),
});

const uploadImageToStorage = async (file) => {
  const extension = (file.originalname.match(/\.[a-z0-9]+$/i)?.[0] || '.jpg').toLowerCase();
  const objectPath = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`;

  const { error } = await supabase.storage
    .from(PRODUCT_BUCKET)
    .upload(objectPath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) {
    throw new Error(`Image upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
};

const removeImageFromStorage = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes(`/${PRODUCT_BUCKET}/`)) {
    return;
  }

  const objectPath = imageUrl.split(`/${PRODUCT_BUCKET}/`)[1];
  if (!objectPath) {
    return;
  }

  try {
    await supabase.storage.from(PRODUCT_BUCKET).remove([objectPath]);
  } catch (error) {
    console.warn('Could not remove old product image:', error.message);
  }
};

router.get('/dashboard', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('admin_dashboard_stats');

    if (error) {
      throw error;
    }

    res.json({
      totalProducts: Number(data.totalProducts || 0),
      totalStock: Number(data.totalStock || 0),
      lowStock: Number(data.lowStock || 0),
      outOfStock: Number(data.outOfStock || 0),
      totalCustomers: Number(data.totalCustomers || 0),
      pendingOrders: Number(data.pendingOrders || 0),
      completedOrders: Number(data.completedOrders || 0),
      totalSales: Number(data.totalSales || 0),
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load dashboard.', error: error.message });
  }
});

router.get('/orders', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, users(name)')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data || []).map((order) => ({
      ...order,
      customer_name: order.users?.name || null,
      users: undefined,
    }));

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

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', req.params.id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Order status updated.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update status.', error: error.message });
  }
});

router.get('/customers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, phone, address, created_at')
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch customers.', error: error.message });
  }
});

router.get('/inventory', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, categories(name)')
      .order('stock_quantity', { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data || []).map((product) => ({
      ...product,
      category_name: product.categories?.name || null,
      categories: undefined,
      inventory_status:
        product.stock_quantity > 5
          ? 'In Stock'
          : product.stock_quantity > 0
            ? 'Low Stock'
            : 'Out of Stock',
    }));

    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch inventory.', error: error.message });
  }
});

router.get('/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch products.', error: error.message });
  }
});

const parseMeasurements = (measurements) => {
  if (!measurements) return {};
  if (typeof measurements === 'object') return measurements;
  try {
    return JSON.parse(measurements);
  } catch {
    return {};
  }
};

router.post('/products', upload.single('image'), async (req, res) => {
  try {
    const { sku, name, description, price, category_id, brand, size, color, material, condition_name, stock_quantity, measurements, image_url, is_best_pick } = req.body;

    if (!sku || !name || price === undefined || price === '' || !category_id) {
      return res.status(400).json({ message: 'SKU, name, price and category are required.' });
    }

    const markAsBestPick = parseBestPick(is_best_pick) && (await hasBestPickColumn());

    const imagePath = req.file
      ? await uploadImageToStorage(req.file)
      : image_url || '';

    const { data, error } = await supabase
      .from('products')
      .insert({
        sku,
        name,
        description: description || null,
        price: Number(price),
        category_id: Number(category_id),
        brand: brand || 'Thrifted',
        size: size || null,
        color: color || null,
        material: material || null,
        condition_name: condition_name || null,
        stock_quantity: Number(stock_quantity) || 0,
        measurements: parseMeasurements(measurements),
        image_url: imagePath,
        ...(markAsBestPick ? { is_best_pick: true } : {}),
      })
      .select('id')
      .single();

    if (error) {
      // Don't leave an orphaned upload behind if the insert fails.
      if (req.file && imagePath) {
        await removeImageFromStorage(imagePath);
      }
      if (error.code === '23505') {
        return res.status(409).json({ message: 'A product with this SKU already exists.' });
      }
      throw error;
    }

    if (markAsBestPick) {
      // Only one product can wear the badge at a time.
      await supabase
        .from('products')
        .update({ is_best_pick: false })
        .neq('id', data.id)
        .eq('is_best_pick', true);
    }

    res.status(201).json({ id: data.id, message: 'Product added.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to add product.', error: error.message });
  }
});

router.patch('/products/:id', upload.single('image'), async (req, res) => {
  try {
    const { sku, name, description, price, category_id, brand, size, color, material, condition_name, stock_quantity, measurements, image_url, is_best_pick } = req.body;

    const { data: existingRows, error: lookupError } = await supabase
      .from('products')
      .select('image_url, sku, name, brand, price, category_id, stock_quantity, measurements')
      .eq('id', req.params.id)
      .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }
    if (!existingRows) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    const previousImage = existingRows.image_url || '';
    const imagePath = req.file
      ? await uploadImageToStorage(req.file)
      : image_url || previousImage;

    // The flag is only written when the one-time column migration is in
    // place; otherwise the rest of the save proceeds untouched.
    const applyBestPick = is_best_pick !== undefined && (await hasBestPickColumn());
    const markAsBestPick = applyBestPick && parseBestPick(is_best_pick);

    const { error } = await supabase
      .from('products')
      .update({
        // Required columns fall back to the stored row so a partial payload
        // can never violate a not-null constraint.
        sku: sku || existingRows.sku,
        name: name || existingRows.name,
        description: description ?? null,
        price: price != null && price !== '' ? Number(price) : existingRows.price,
        category_id: category_id != null && category_id !== '' ? Number(category_id) : existingRows.category_id,
        brand: brand || existingRows.brand || 'Thrifted',
        size: size ?? null,
        color: color ?? null,
        material: material ?? null,
        condition_name: condition_name ?? null,
        stock_quantity:
          stock_quantity != null && stock_quantity !== ''
            ? Number(stock_quantity)
            : existingRows.stock_quantity,
        measurements:
          measurements !== undefined ? parseMeasurements(measurements) : existingRows.measurements,
        image_url: imagePath,
        ...(applyBestPick ? { is_best_pick: markAsBestPick } : {}),
      })
      .eq('id', req.params.id);

    if (error) {
      throw error;
    }

    if (markAsBestPick) {
      // Only one product can wear the badge at a time.
      await supabase
        .from('products')
        .update({ is_best_pick: false })
        .neq('id', req.params.id)
        .eq('is_best_pick', true);
    }

    if (req.file && previousImage && previousImage !== imagePath) {
      await removeImageFromStorage(previousImage);
    }

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

    const { error } = await supabase
      .from('products')
      .update({
        stock_quantity: quantity,
        status: quantity > 0 ? 'active' : 'sold_out',
      })
      .eq('id', req.params.id);

    if (error) {
      throw error;
    }

    res.json({ message: 'Product restocked.', stock_quantity: quantity });
  } catch (error) {
    res.status(500).json({ message: 'Failed to restock product.', error: error.message });
  }
});

router.delete('/products/:id', async (req, res) => {
  try {
    const { data: existingRows } = await supabase
      .from('products')
      .select('image_url')
      .eq('id', req.params.id)
      .maybeSingle();

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      if (error.code === '23503') {
        return res.status(409).json({
          message: 'This product has order history and cannot be deleted. Archive it instead.',
        });
      }
      throw error;
    }

    if (existingRows?.image_url) {
      await removeImageFromStorage(existingRows.image_url);
    }

    res.json({ message: 'Product deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete product.', error: error.message });
  }
});

export default router;
