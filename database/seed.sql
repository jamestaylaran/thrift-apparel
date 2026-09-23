INSERT INTO categories (name, description, image_url) VALUES
('T-Shirts', 'Vintage and everyday graphic tees', 'https://images.unsplash.com/...'),
('Shirts', 'Classic button-ups and thrifted staples', 'https://images.unsplash.com/...'),
('Hoodies', 'Cozy layering pieces', 'https://images.unsplash.com/...'),
('Jackets', 'Lightweight and statement outerwear', 'https://images.unsplash.com/...'),
('Pants', 'Relaxed and timeless bottoms', 'https://images.unsplash.com/...'),
('Jeans', 'Denim staples with vintage fit', 'https://images.unsplash.com/...'),
('Shorts', 'Warm-weather essentials', 'https://images.unsplash.com/...'),
('Dresses', 'Secondhand dresses for every vibe', 'https://images.unsplash.com/...'),
('Skirts', 'Throwback silhouettes and modern cuts', 'https://images.unsplash.com/...'),
('Accessories', 'Bags, belts, caps, and more', 'https://images.unsplash.com/...'),
('Vintage', 'Curated retro gems', 'https://images.unsplash.com/...'),
('Streetwear', 'Urban-inspired fashion finds', 'https://images.unsplash.com/...');

INSERT INTO products (
  sku, name, description, price, category_id, brand, size, color, material, condition_name,
  stock_quantity, status, measurements, image_url
) VALUES
('THR-001', 'Vintage Oversized Graphic Tee', 'Pre-loved oversized graphic shirt in excellent condition.', 350, 1, 'Local Brand', 'L', 'Black', 'Cotton', 'Excellent', 1, 'active', JSON_OBJECT('chest', 56, 'length', 70, 'shoulder', 50, 'sleeve', 22), 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80'),
('THR-002', 'Oversized Denim Jacket', 'Structured vintage-inspired denim piece with a relaxed fit.', 650, 4, 'Levi''s', 'M', 'Blue', 'Denim', 'Very Good', 2, 'active', JSON_OBJECT('chest', 58, 'length', 74, 'shoulder', 52, 'sleeve', 24), 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80'),
('THR-003', 'Vintage Cargo Pants', 'Relaxed cargo fit with clean lines and durable fabric.', 450, 5, 'Urban Revival', '32', 'Khaki', 'Cotton', 'Good', 0, 'sold_out', JSON_OBJECT('waist', 32, 'length', 42, 'rise', 10), 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80'),
('THR-004', 'Y2K Baby Tee', 'Fun, fitted baby tee with a nostalgic print and soft cotton feel.', 280, 1, 'Y2K Co.', 'S', 'Cream', 'Cotton', 'Like New', 4, 'active', JSON_OBJECT('chest', 40, 'length', 26, 'shoulder', 34), 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80'),
('THR-005', 'Classic Polo Shirt', 'Clean and polished vintage polo in a fitted silhouette.', 420, 2, 'Polo', 'M', 'Beige', 'Cotton', 'Excellent', 6, 'active', JSON_OBJECT('chest', 48, 'length', 28, 'shoulder', 40), 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80'),
('THR-006', 'Vintage Varsity Jacket', 'Retro varsity bomber with warm texture and easy layering vibes.', 780, 4, 'College', 'L', 'Brown', 'Wool Blend', 'Very Good', 3, 'active', JSON_OBJECT('chest', 60, 'length', 71, 'shoulder', 54), 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80'),
('THR-007', 'Baggy Jeans', 'Straight leg denim with a laid-back thrift aesthetic.', 520, 6, 'Mosaic', '30', 'Indigo', 'Denim', 'Good', 7, 'active', JSON_OBJECT('waist', 30, 'length', 42, 'rise', 11), 'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80'),
('THR-008', 'Retro Windbreaker', 'A lightweight throwback windbreaker for everyday wear.', 590, 4, 'Northwind', 'L', 'Olive', 'Nylon', 'Excellent', 5, 'active', JSON_OBJECT('chest', 55, 'length', 66, 'shoulder', 49), 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80'),
('THR-009', 'Oversized Hoodie', 'Relaxed and cozy hoodie in soft premium fleece.', 480, 3, 'Haven', 'XL', 'Charcoal', 'Cotton Blend', 'Excellent', 2, 'active', JSON_OBJECT('chest', 62, 'length', 72, 'shoulder', 56), 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80'),
('THR-010', 'Vintage Button-Up Shirt', 'Classic button-up with room to layer and vintage structure.', 390, 2, 'Heritage', 'M', 'Cream', 'Cotton', 'Good', 4, 'active', JSON_OBJECT('chest', 46, 'length', 30, 'shoulder', 39), 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80'),
('THR-011', 'Pleated Skirt', 'Soft pleats and a flattering vintage fit.', 440, 9, 'Sunset', 'S', 'Gray', 'Polyester', 'Very Good', 3, 'active', JSON_OBJECT('waist', 27, 'length', 31), 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80'),
('THR-012', 'Vintage Dress', 'A polished silhouette with subtle retro detailing.', 760, 8, 'Studio', 'M', 'Rust', 'Cotton', 'Excellent', 1, 'active', JSON_OBJECT('bust', 38, 'length', 36, 'waist', 30), 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80'),
('THR-013', 'Cargo Shorts', 'Lightweight short with utilitarian details and easy movement.', 320, 7, 'Pioneer', 'L', 'Tan', 'Cotton', 'Fair', 5, 'active', JSON_OBJECT('waist', 32, 'length', 20), 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80'),
('THR-014', 'Leather Jacket', 'Unmistakably cool and durable vintage leather outerwear.', 980, 4, 'Biker', 'M', 'Black', 'Leather', 'Good', 2, 'active', JSON_OBJECT('chest', 57, 'length', 78, 'shoulder', 50), 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80'),
('THR-015', 'Vintage Cap', 'Clean old-school cap with a worn-in look.', 180, 10, 'Arc', 'One Size', 'Black', 'Cotton', 'Fair', 8, 'active', JSON_OBJECT('circumference', 58), 'https://images.unsplash.com/photo-1521369909026-2afed882baee?auto=format&fit=crop&w=900&q=80');

INSERT INTO users (name, email, password_hash, role, phone, address, created_at) VALUES
('Admin User', 'admin@thriftapparel.com', '$2a$10$feKA7th3ZfKGgO0F/kzCeeaBDcOW9dt.rJup4CqPe/ijTaBTtg9Ee', 'admin', '09171234567', '123 Main Office Street', NOW());
