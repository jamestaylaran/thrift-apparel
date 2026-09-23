import { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');
const AUTH_TOKEN_KEY = 'thrift_apparel_token';
const USER_KEY = 'thrift_apparel_user';

const categoryList = [
  'T-Shirts',
  'Shirts',
  'Hoodies',
  'Jackets',
  'Pants',
  'Jeans',
  'Shorts',
  'Dresses',
  'Skirts',
  'Accessories',
  'Sweaters',
  'Polo Shirts',
  'Vintage',
  'Streetwear',
];

const productImageUrl = (imageUrl) => imageUrl?.startsWith('/uploads/') ? `${API_ORIGIN}${imageUrl}` : imageUrl;

async function apiFetch(path, options = {}, token = null) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  }, [user]);

  const handleAuth = (authToken, authUser) => {
    setToken(authToken);
    setUser(authUser);
  };

  const logout = () => {
    setToken('');
    setUser(null);
  };

  return (
    <BrowserRouter>
      <AppLayout token={token} user={user} logout={logout} onAuth={handleAuth} />
    </BrowserRouter>
  );
}

function AppLayout({ token, user, logout, onAuth }) {
  const [cartCount, setCartCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const isAdmin = user?.role === 'admin';
  const isAdminArea = isAdmin || location.pathname.startsWith('/admin');

  const scrollToAdminSection = (event, sectionId) => {
    event.preventDefault();
    if (location.pathname !== '/admin') {
      window.history.pushState({}, '', `/admin#${sectionId}`);
      window.dispatchEvent(new PopStateEvent('popstate'));
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (!token || isAdmin) {
      setCartCount(0);
      return;
    }

    apiFetch('/cart', {}, token)
      .then((items) => setCartCount(items.length))
      .catch(() => setCartCount(0));
  }, [token, isAdmin]);

  return (
    <>
      <div className="announcement-bar" aria-label="Store announcement"><div className="announcement-track"><span>SHOP SECOND-HAND SEPTEMBER SALE - 30-50% OFF EVERYTHING!</span><span>SHOP SECOND-HAND SEPTEMBER SALE - 30-50% OFF EVERYTHING!</span><span>SHOP SECOND-HAND SEPTEMBER SALE - 30-50% OFF EVERYTHING!</span><span>SHOP SECOND-HAND SEPTEMBER SALE - 30-50% OFF EVERYTHING!</span></div></div>
      <header className="site-header">
        <div className="container nav-wrap">
          <button className="mobile-menu" type="button" aria-label="Open menu">☰</button>
          <Link to="/" className="brand"><span className="brand-name">THRIFT APPAREL</span></Link>
          <nav className="main-nav">
            {isAdminArea ? (
              <><a href="/admin#dashboard" onClick={(event) => scrollToAdminSection(event, 'dashboard')}>Dashboard</a><a href="/admin#inventory" onClick={(event) => scrollToAdminSection(event, 'inventory')}>Inventory</a><a href="/admin#orders" onClick={(event) => scrollToAdminSection(event, 'orders')}>Orders</a></>
            ) : (
              <><NavLink to="/shop">New In</NavLink><NavLink to="/orders">My Order</NavLink><NavLink to="/categories">Shop All</NavLink><NavLink to="/about">Our Story</NavLink><NavLink to="/returns">Returns</NavLink></>
            )}
          </nav>

          <div className="nav-actions">
            {!isAdminArea && <><Link to="/shop" className="icon-link nav-icon" aria-label="Search">⌕</Link><Link to="/wishlist" className="icon-link nav-icon" aria-label="Wishlist">♡</Link><Link to="/cart" className="icon-link nav-icon cart-icon" aria-label="Cart">▢<b>{cartCount || 0}</b></Link></>}
            {user ? (
              <div className="user-menu">
                <button className="user-menu-trigger" type="button" onClick={() => setUserMenuOpen((open) => !open)} aria-expanded={userMenuOpen}>Hi, {user.name}</button>
                <div className={`dropdown${userMenuOpen ? ' open' : ''}`}>
                  {!isAdmin && <><Link to="/orders">My Orders</Link><Link to="/wishlist">Wishlist</Link></>}
                  {isAdmin && <Link to="/admin">Admin Dashboard</Link>}
                  <button type="button" onClick={logout}>Logout</button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="nav-button">Account</Link>
            )}
          </div>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<HomePage token={token} />} />
          <Route path="/shop" element={<ShopPage token={token} />} />
          <Route path="/product/:id" element={<ProductPage token={token} user={user} />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/returns" element={<ReturnsPage />} />
          <Route path="/login" element={<AuthPage mode="login" onAuth={onAuth} />} />
          <Route path="/register" element={<AuthPage mode="register" onAuth={onAuth} />} />
          <Route path="/cart" element={<CartPage token={token} />} />
          <Route path="/wishlist" element={<WishlistPage token={token} />} />
          <Route path="/orders" element={<OrdersPage token={token} />} />
          <Route path="/checkout" element={<CheckoutPage token={token} user={user} />} />
          <Route path="/admin/login" element={<AdminLoginPage onAuth={onAuth} />} />
          <Route path="/admin" element={<AdminDashboard token={token} />} />
        </Routes>
      </main>

      {!isAdminArea && <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <h3>THRIFT APPAREL</h3>
            <p>Pre-loved fashion for people who love unique style.</p>
          </div>
          <div>
            <h4>Shops & Events</h4>
            <ul>
              <li>New Arrivals</li><li>Vintage Market</li><li>Shop Locations</li><li>Wholesale</li>
            </ul>
          </div>
          <div>
            <h4>The Edit</h4>
            <ul>
              <li>Journal</li><li>Style Stories</li><li>Vintage Guides</li><li>Our Community</li>
            </ul>
          </div>
          <div>
            <h4>Support</h4>
            <ul>
              <li>Sizing</li><li>FAQ</li><li>Contact Us</li><li>Shipping</li><li>Returns</li>
            </ul>
          </div>
          <div>
            <h4>Company Info</h4>
            <ul>
              <li>About Us</li><li>Terms of Service</li><li>Privacy Policy</li><li>Shipping Policy</li>
            </ul>
          </div>
        </div>
        <div className="container footer-bottom">© 2026 Thrift Apparel. All Rights Reserved.</div>
      </footer>}
    </>
  );
}

function HomePage({ token }) {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    apiFetch('/products/featured')
      .then((data) => setFeatured(data))
      .catch(() => setFeatured([]));
  }, []);

  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">Curated secondhand style</p>
            <h1>Retro fits.<br /><em>New attitude.</em></h1>
            <p className="lead">Throwback streetwear, rare layers, and one-off pieces for your everyday rotation.</p>
            <div className="cta-row">
              <Link className="primary-btn" to="/shop">SHOP THE DROP <span>↗</span></Link>
            </div>
            <div className="hero-notes"><span>01 / 06</span><span>Responsible fashion, made personal.</span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-collage">
              <img src="https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=900&q=85" alt="Retro streetwear outfit" />
              <img src="https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=85" alt="Streetwear model wearing a retro outfit" />
              <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85" alt="Vintage fashion model" />
            </div>
          </div>
        </div>
      </section>

      <section className="container section-block">
        <div className="section-heading">
          <h2>Fresh from the rail</h2>
          <Link className="section-link" to="/shop">View all <span>→</span></Link>
        </div>
        <div className="style-tabs">
          {['Vintage 90s', 'Vintage Skater', 'Vintage Designer', 'Vintage Real Tree'].map((label, index) => (
            <Link className={index === 0 ? 'style-tab active' : 'style-tab'} key={label} to={`/shop?category=${encodeURIComponent(index === 0 ? 'Vintage' : 'Streetwear')}`}>{label}</Link>
          ))}
        </div>
        <div className="product-grid product-rail">
          {featured.length ? featured.slice(0, 4).map((product, index) => (
            <ProductCard key={product.id} product={product} token={token} featured={index === 0} />
          )) : <p>No products available.</p>}
        </div>
      </section>

      <section className="campaign-banner">
        <img src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1800&q=85" alt="People wearing secondhand fashion" />
        <div className="campaign-copy">
          <p className="eyebrow">The September edit</p>
          <h2>Shop<br /><em>secondhand.</em></h2>
          <Link className="primary-btn" to="/shop">SHOP THE SALE <span>↗</span></Link>
        </div>
      </section>

      <section className="container section-block">
        <div className="section-heading">
          <h2>More good stuff</h2>
        </div>
        <div className="product-grid">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} token={token} />
          ))}
        </div>
      </section>

      <section className="faq-section">
        <p className="eyebrow">Need to know</p>
        <h2>Frequently asked questions</h2>
        <div className="faq-tabs"><span className="active">Vintage</span><span>Orders</span><span>Shipping</span><span>Returns</span></div>
        <div className="faq-list">
          {['What is vintage clothing?', 'Can I sell you my vintage stuff?', 'Where do you source vintage clothing from?'].map((question) => (
            <details key={question}>
              <summary>{question}<span>+</span></summary>
              <p>Every piece is carefully selected and checked before it reaches the shop. See our contact page for more details.</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

function CategoriesPage() {
  return (
    <div className="container page-shell">
      <h2>Categories</h2>
      <div className="category-grid large-grid">
        {categoryList.map((name) => (
          <Link key={name} to={`/shop?category=${encodeURIComponent(name)}`} className="category-card">
            <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80" alt={name} />
            <span>{name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function AboutPage() {
  return (
    <div className="container page-shell">
      <h2>About Us</h2>
      <p>Thrift Apparel curates uniquely styled, carefully selected secondhand pieces for modern wardrobes.</p>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="container page-shell">
      <h2>Contact</h2>
      <p>Email: hello@thriftapparel.com</p>
      <p>Phone: +63 917 123 4567</p>
    </div>
  );
}

function ReturnsPage() {
  return (
    <div className="container page-shell simple-info-page">
      <p className="eyebrow">Customer care</p>
      <h2>Returns</h2>
      <p>Need to return an item? Contact us within 7 days of delivery with your order number and a photo of the item.</p>
      <p>Email: returns@thriftapparel.com</p>
    </div>
  );
}

function ShopPage({ token }) {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ q: '', category: '', size: '', color: '', brand: '', condition: '', sort: 'newest' });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category') || '';
    const q = params.get('q') || '';
    setFilters((current) => ({ ...current, category, q }));
  }, []);

  useEffect(() => {
    const query = new URLSearchParams();
    if (filters.q) query.set('q', filters.q);
    if (filters.category) query.set('category', filters.category);
    if (filters.size) query.set('size', filters.size);
    if (filters.color) query.set('color', filters.color);
    if (filters.brand) query.set('brand', filters.brand);
    if (filters.condition) query.set('condition', filters.condition);
    if (filters.sort) query.set('sort', filters.sort);

    const url = `/${query.toString() ? `?${query.toString()}` : ''}`;
    window.history.replaceState({}, '', `${window.location.pathname}${url}`);

    apiFetch(`/products?${query.toString()}`)
      .then((data) => setItems(data))
      .catch(() => setItems([]));
  }, [filters]);

  return (
    <div className="container page-shell">
      <h2>Shop</h2>
      <form className="search-bar" onSubmit={(event) => event.preventDefault()}>
        <input aria-label="Search products" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search vintage, brands, styles..." />
        <button className="primary-btn" type="submit">SEARCH</button>
      </form>
      <div className="filter-panel">
        <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All Categories</option>
          {categoryList.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={filters.size} onChange={(e) => setFilters({ ...filters, size: e.target.value })}>
          <option value="">All Sizes</option>
          <option value="XS">XS</option>
          <option value="S">S</option>
          <option value="M">M</option>
          <option value="L">L</option>
          <option value="XL">XL</option>
        </select>
        <select value={filters.condition} onChange={(e) => setFilters({ ...filters, condition: e.target.value })}>
          <option value="">All Conditions</option>
          <option value="Like New">Like New</option>
          <option value="Excellent">Excellent</option>
          <option value="Very Good">Very Good</option>
          <option value="Good">Good</option>
          <option value="Fair">Fair</option>
        </select>
        <select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      <div className="product-grid shop-grid">
        {items.length ? items.map((product) => <ProductCard key={product.id} product={product} token={token} />) : <p>No products available.</p>}
      </div>
    </div>
  );
}

function ProductCard({ product, token, featured = false }) {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');

  const addToCart = async () => {
    if (!token) {
      setMessage('Please login or create an account before purchasing.');
      return;
    }

    try {
      await apiFetch('/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      }, token);
      setMessage('Added to cart.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  const addToWishlist = async () => {
    if (!token) {
      setMessage('Please login to save items to your wishlist.');
      return;
    }

    try {
      await apiFetch('/wishlist/add', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id }),
      }, token);
      setMessage('Saved to wishlist.');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <article className="product-card">
      <div className="product-image-wrap" onClick={() => navigate(`/product/${product.id}`)}>
      {featured && <span className="best-pick-badge">BEST PICK</span>}
        <img src={productImageUrl(product.image_url) || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80'} alt={product.name} />
      </div>
      <div className="product-body">
        <h3>{product.name}</h3>
        <div className="meta-row">
          <span>₱{Number(product.price).toLocaleString()}</span>
          <span>{product.condition_name}</span>
        </div>
        <p>Size: {product.size}</p>
        <p>{product.stock_quantity > 0 ? `${product.stock_quantity} left` : 'Out of stock'}</p>
        <div className="card-actions">
          <button type="button" className="ghost-btn" onClick={addToWishlist}>♡</button>
          <button type="button" className="primary-btn small" onClick={addToCart}>ADD TO CART</button>
        </div>
        {message && <small>{message}</small>}
      </div>
    </article>
  );
}

function ProductPage({ token, user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, reviewText: '' });
  const [reviewMessage, setReviewMessage] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    apiFetch(`/products/${id}`)
      .then((data) => setProduct(data))
      .catch(() => setProduct(null));
    apiFetch(`/reviews/product/${id}`)
      .then((data) => setReviews(data))
      .catch(() => setReviews([]));
  }, [id]);

  if (!product) {
    return <div className="container page-shell"><h2>Loading product...</h2></div>;
  }

  const addToCart = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      await apiFetch('/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity }),
      }, token);
      navigate('/checkout');
    } catch (error) {
      window.alert(error.message);
    }
  };

  const buyNow = async () => {
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      await apiFetch('/cart/buy-now', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, quantity }),
      }, token);
      navigate('/checkout');
    } catch (error) {
      window.alert(error.message);
    }
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!token) {
      setReviewMessage('Please login to leave a review.');
      return;
    }
    try {
      await apiFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({ productId: product.id, ...reviewForm }),
      }, token);
      setReviewMessage('Thank you. Your review was submitted.');
      setReviewForm({ rating: 5, reviewText: '' });
      apiFetch(`/reviews/product/${id}`).then(setReviews);
    } catch (error) {
      setReviewMessage(error.message);
    }
  };

  return (
    <div className="container page-shell product-detail">
      <div className="detail-gallery">
        <img src={productImageUrl(product.image_url) || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80'} alt={product.name} />
      </div>
      <div className="detail-info">
        <span className="eyebrow">{product.brand}</span>
        <h2>{product.name}</h2>
        <p className="price">₱{Number(product.price).toLocaleString()}</p>
        <div className="spec-list">
          <span>Condition: {product.condition_name}</span>
          <span>Brand: {product.brand}</span>
          <span>Size: {product.size}</span>
          <span>Color: {product.color}</span>
          <span>Material: {product.material}</span>
        </div>
        <p>{product.description}</p>
        <div className="quantity-row">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>-</button>
          <span>{quantity}</span>
          <button type="button" onClick={() => setQuantity((q) => q + 1)}>+</button>
        </div>
        <div className="cta-row stack">
          <button className="primary-btn" onClick={addToCart}>ADD TO CART</button>
          <button className="secondary-btn" onClick={buyNow}>BUY NOW</button>
          <button className="ghost-btn large">♡ ADD TO WISHLIST</button>
        </div>
        <div className="measurements-box">
          <h4>Measurements</h4>
          <p>Chest: 56 cm</p>
          <p>Length: 70 cm</p>
          <p>Shoulder: 50 cm</p>
          <p>Sleeve: 22 cm</p>
          <small>Please check the measurements before purchasing as thrifted items may have different sizing.</small>
        </div>
      </div>
      <section className="reviews-section">
        <div className="reviews-heading"><div><p className="eyebrow">Community notes</p><h2>Reviews</h2></div><strong>{reviews.length ? `${reviews.length} review${reviews.length === 1 ? '' : 's'}` : 'No reviews yet'}</strong></div>
        {reviews.length > 0 && <div className="review-list">{reviews.map((review) => <article className="review-card" key={review.id}><div className="review-card-top"><strong>{review.customer_name}</strong><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></div><p>{review.review_text || 'Loved this piece.'}</p><small>{new Date(review.created_at).toLocaleDateString()}</small></article>)}</div>}
        <form className="review-form" onSubmit={submitReview}><h3>Share your experience</h3><div className="star-picker" aria-label="Rating">{[1, 2, 3, 4, 5].map((star) => <button type="button" className={star <= reviewForm.rating ? 'selected' : ''} key={star} onClick={() => setReviewForm((current) => ({ ...current, rating: star }))}>★</button>)}</div><textarea value={reviewForm.reviewText} onChange={(event) => setReviewForm((current) => ({ ...current, reviewText: event.target.value }))} placeholder={user ? 'Tell other shoppers what you think...' : 'Login to review this product'} /><button className="primary-btn" type="submit">SUBMIT REVIEW</button>{reviewMessage && <small className="form-message">{reviewMessage}</small>}</form>
      </section>
    </div>
  );
}

function AuthPage({ mode, onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', address: '' });
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    try {
      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const data = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onAuth(data.token, data.user);
      navigate('/shop');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <h2>{mode === 'register' ? 'Create account' : 'Welcome back'}</h2>
        {error && <p className="error-text">{error}</p>}
        {mode === 'register' && (
          <input value={form.name} placeholder="Full Name" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        )}
        <input type="email" value={form.email} placeholder="Email" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" value={form.password} placeholder="Password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {mode === 'register' && (
          <>
            <input value={form.phone} placeholder="Phone Number" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <textarea value={form.address} placeholder="Address" onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </>
        )}
        <button className="primary-btn" type="submit">{mode === 'register' ? 'CREATE ACCOUNT' : 'LOGIN'}</button>
        {mode === 'login' ? (
          <div className="auth-links">
            <Link to="/register">Create an Account</Link>
            <a href="#">Forgot Password?</a>
          </div>
        ) : (
          <Link to="/login">Already have an account? Login</Link>
        )}
      </form>
    </div>
  );
}

function CartPage({ token }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!token) {
      setItems([]);
      return;
    }

    apiFetch('/cart', {}, token)
      .then((data) => setItems(data))
      .catch(() => setItems([]));
  }, [token]);

  const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);

  if (!token) {
    return <div className="container page-shell"><h2>Cart</h2><p>Please login or create an account before purchasing.</p></div>;
  }

  if (!items.length) {
    return <div className="container page-shell empty-state"><h2>Your cart is waiting for something special.</h2><Link className="primary-btn" to="/shop">START SHOPPING</Link></div>;
  }

  return (
    <div className="container page-shell">
      <h2>Cart</h2>
      <div className="cart-list">
        {items.map((item) => (
          <div key={item.id} className="cart-item">
            <img src={productImageUrl(item.image_url) || 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80'} alt={item.name} />
            <div>
              <h3>{item.name}</h3>
              <p>₱{Number(item.price).toLocaleString()}</p>
            </div>
            <span>Qty: {item.quantity}</span>
            <span>Subtotal: ₱{Number(item.price * item.quantity).toLocaleString()}</span>
            <button className="ghost-btn" type="button">Remove</button>
          </div>
        ))}
      </div>
      <div className="cart-summary">
        <h3>Total: ₱{total.toLocaleString()}</h3>
        <div className="cta-row">
          <Link to="/shop" className="secondary-btn">CONTINUE SHOPPING</Link>
          <Link to="/checkout" className="primary-btn">PROCEED TO CHECKOUT</Link>
        </div>
      </div>
    </div>
  );
}

function WishlistPage({ token }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!token) {
      setItems([]);
      return;
    }

    apiFetch('/wishlist', {}, token)
      .then((data) => setItems(data))
      .catch(() => setItems([]));
  }, [token]);

  if (!items.length) {
    return <div className="container page-shell empty-state"><h2>No saved finds yet.</h2><Link className="primary-btn" to="/shop">START SHOPPING</Link></div>;
  }

  return <div className="container page-shell"><h2>Wishlist</h2><div className="product-grid">{items.map((item) => <ProductCard key={item.id} product={item} token={token} />)}</div></div>;
}

function OrdersPage({ token }) {
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    if (!token) return;
    apiFetch('/orders/my-orders', {}, token)
      .then((data) => setOrders(data))
      .catch(() => setOrders([]));
  }, [token]);

  return (
    <div className="container page-shell">
      <h2>My Orders</h2>
      {orders.length ? orders.map((order) => (
        <div key={order.id} className="order-card">
          <div className="order-card-heading"><div><p className="eyebrow">Order placed {new Date(order.created_at).toLocaleDateString()}</p><h3>#{order.order_number}</h3></div><strong>₱{Number(order.total_amount).toLocaleString()}</strong></div>
          <p className="order-status-label">{order.status}</p>
          <div className="order-tracker">
            {['pending', 'confirmed', 'processing', 'shipped', 'delivered'].map((status) => <span key={status} className={['pending', 'confirmed', 'processing', 'shipped', 'delivered'].indexOf(status) <= ['pending', 'confirmed', 'processing', 'shipped', 'delivered'].indexOf(order.status) ? 'complete' : ''}>{status}</span>)}
          </div>
          <p className="order-address">Shipping to: {order.shipping_address}</p>
          {order.status === 'delivered' && order.items?.length > 0 && <div className="order-review-list"><h4>Review your purchase</h4>{order.items.map((item) => <OrderReviewForm key={item.product_id} item={item} orderId={order.id} token={token} />)}</div>}
        </div>
      )) : <p>No orders yet.</p>}
    </div>
  );
}

function OrderReviewForm({ item, orderId, token }) {
  const [rating, setRating] = useState(item.review_rating || 5);
  const [reviewText, setReviewText] = useState(item.review_text || '');
  const [message, setMessage] = useState(item.review_id ? 'Review submitted.' : '');

  const submit = async (event) => {
    event.preventDefault();
    try {
      await apiFetch('/reviews', { method: 'POST', body: JSON.stringify({ productId: item.product_id, orderId, rating, reviewText }) }, token);
      setMessage('Review submitted. Thank you!');
    } catch (error) {
      setMessage(error.message);
    }
  };

  return <form className="order-review-form" onSubmit={submit}><strong>{item.name}</strong>{item.review_id ? <p className="reviewed-note">{message}</p> : <><div className="star-picker">{[1, 2, 3, 4, 5].map((star) => <button type="button" className={star <= rating ? 'selected' : ''} key={star} onClick={() => setRating(star)}>★</button>)}</div><textarea value={reviewText} onChange={(event) => setReviewText(event.target.value)} placeholder="How was this item?" /><button className="primary-btn" type="submit">SUBMIT REVIEW</button>{message && <small className="form-message">{message}</small>}</>}</form>;
}

function CheckoutPage({ token, user }) {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [successOrder, setSuccessOrder] = useState(null);
  const [form, setForm] = useState({ firstName: user?.name?.split(' ')[0] || '', lastName: user?.name?.split(' ').slice(1).join(' ') || '', address: user?.address || '', apartment: '', barangay: '', postalCode: '', city: '', region: 'Metro Manila', phone: user?.phone || '' });

  useEffect(() => {
    if (token) apiFetch('/cart', {}, token).then(setCartItems).catch(() => setCartItems([]));
    apiFetch('/products/featured').then((data) => setSuggestions(data.slice(0, 3))).catch(() => setSuggestions([]));
  }, [token]);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const subtotal = cartItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const shipping = cartItems.length ? 120 : 0;
  const total = subtotal + shipping;

  const removeCheckoutItem = async (itemId) => {
    try {
      await apiFetch(`/cart/${itemId}`, { method: 'DELETE' }, token);
      setCartItems((current) => current.filter((item) => item.id !== itemId));
    } catch (error) {
      window.alert(error.message);
    }
  };

  const placeOrder = async () => {
    if (!token) {
      alert('Please login or create an account before purchasing.');
      return;
    }

    try {
      const response = await apiFetch('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({ items: cartItems, shippingAddress: [form.address, form.apartment, form.barangay, form.city, form.region, form.postalCode].filter(Boolean).join(', '), phone: form.phone }),
      }, token);
      setSuccessOrder(response.order);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <>
    <div className="checkout-page">
      <div className="checkout-grid">
        <div className="checkout-panel">
          <p className="checkout-kicker">Pay securely with</p><div className="express-buttons"><a href="https://shop.app/" target="_blank" rel="noreferrer" aria-label="Pay with Shop Pay"><span className="payment-mark ta-payment-mark">TA</span><span>shop pay</span></a><a href="https://www.maya.ph/" target="_blank" rel="noreferrer" aria-label="Pay with Maya"><img className="payment-logo maya-logo" src="/payment-logos/maya.png" alt="Maya" /><span>Maya</span></a><a href="https://new.gcash.com/" target="_blank" rel="noreferrer" aria-label="Pay with GCash"><img className="payment-logo gcash-logo" src="/payment-logos/gcash.png" alt="GCash" /><span>GCash</span></a></div><div className="checkout-or"><span>OR</span></div>
          <div className="checkout-heading"><h2>Contact</h2><Link to="/login">Sign in</Link></div>
          <input placeholder="Email" value={user?.email || ''} readOnly />
          <label className="checkout-check"><input type="checkbox" defaultChecked /> Email me with news and offers</label>
          <h2>Shipping address</h2>
          <select><option>Philippines</option></select>
          <div className="checkout-two"><input name="firstName" placeholder="First name" value={form.firstName} onChange={updateField} /><input name="lastName" placeholder="Last name" value={form.lastName} onChange={updateField} /></div>
          <input name="address" placeholder="Address" value={form.address} onChange={updateField} required />
          <div className="checkout-two"><input name="apartment" placeholder="Apartment, suite, etc. (optional)" value={form.apartment} onChange={updateField} /><input name="barangay" placeholder="Barangay" value={form.barangay} onChange={updateField} /></div>
          <div className="checkout-two"><input name="postalCode" placeholder="Postal code" value={form.postalCode} onChange={updateField} /><input name="city" placeholder="City" value={form.city} onChange={updateField} /></div>
          <input name="region" placeholder="Region" value={form.region} onChange={updateField} />
          <input name="phone" placeholder="Phone" value={form.phone} onChange={updateField} required />
          <div className="checkout-actions"><Link to="/cart">← Return to cart</Link><button className="primary-btn" type="button" onClick={placeOrder}>CONTINUE TO SHIPPING</button></div>
        </div>
        <div className="checkout-panel">
          {cartItems.map((item) => <div className="checkout-item" key={item.id}><img src={productImageUrl(item.image_url)} alt={item.name} /><span>{item.name}<small>Qty {item.quantity}</small></span><strong>₱{(Number(item.price) * item.quantity).toLocaleString()}</strong><button className="checkout-remove" type="button" onClick={() => removeCheckoutItem(item.id)}>Remove</button></div>)}
          <input className="discount-input" placeholder="Discount code or gift card" />
          <div className="summary-line"><span>Subtotal</span><strong>₱{subtotal.toLocaleString()}</strong></div><div className="summary-line"><span>Shipping</span><strong>₱{shipping.toLocaleString()}</strong></div><div className="summary-total"><span>Total</span><strong>₱{total.toLocaleString()}</strong></div>
        </div>
      </div>
    </div>
    {successOrder && (
      <div className="success-modal-backdrop" role="presentation">
        <section className="success-modal" role="dialog" aria-modal="true" aria-labelledby="order-success-title">
          <button className="modal-close" type="button" onClick={() => setSuccessOrder(null)} aria-label="Close">×</button>
          <div className="success-mark">✓</div>
          <p className="eyebrow">Order confirmed</p>
          <h2 id="order-success-title">Thank you for your order.</h2>
          <p className="success-copy">Your order <strong>#{successOrder.order_number}</strong> is now being prepared. We’ll keep you updated as it moves.</p>
          <div className="success-actions"><button className="primary-btn" type="button" onClick={() => navigate('/orders')}>TRACK MY ORDER</button><button className="ghost-btn" type="button" onClick={() => { setSuccessOrder(null); navigate('/shop'); }}>CONTINUE SHOPPING</button></div>
          {suggestions.length > 0 && <div className="suggestions"><h3>You may also like</h3><div className="suggestion-grid">{suggestions.map((product) => <Link to={`/product/${product.id}`} key={product.id} onClick={() => setSuccessOrder(null)}><img src={productImageUrl(product.image_url)} alt={product.name} /><span>{product.name}</span><strong>₱{Number(product.price).toLocaleString()}</strong></Link>)}</div></div>}
        </section>
      </div>
    )}
    </>
  );
}

function AdminLoginPage({ onAuth }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const login = async (event) => {
    event.preventDefault();
    try {
      const data = await apiFetch('/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      onAuth(data.token, data.user);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container auth-shell">
      <form className="auth-card" onSubmit={login}>
        <h2>Admin Login</h2>
        {error && <p className="error-text">{error}</p>}
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Admin Email" />
        <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Password" />
        <button className="primary-btn" type="submit">ADMIN LOGIN</button>
      </form>
    </div>
  );
}

function AdminDashboard({ token }) {
  const [dashboard, setDashboard] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStock: 0,
    outOfStock: 0,
    totalCustomers: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSales: 0,
  });
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productMessage, setProductMessage] = useState('');
  const [orderMessage, setOrderMessage] = useState('');
  const [restockValues, setRestockValues] = useState({});
  const [productImage, setProductImage] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    sku: '', name: '', description: '', price: '', category_id: '', brand: '', size: '',
    color: '', material: '', condition_name: 'Excellent', stock_quantity: 1, image_url: '',
  });

  useEffect(() => {
    const sectionId = window.location.hash.replace('#', '');
    if (sectionId) {
      window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    apiFetch('/admin/dashboard', {}, token)
      .then((data) => setDashboard(data))
      .catch(() => setDashboard({ totalProducts: 0, totalStock: 0, lowStock: 0, outOfStock: 0, totalCustomers: 0, pendingOrders: 0, completedOrders: 0, totalSales: 0 }));

    apiFetch('/admin/orders', {}, token).then((data) => setOrders(data)).catch(() => setOrders([]));
    apiFetch('/admin/customers', {}, token).then((data) => setCustomers(data)).catch(() => setCustomers([]));
    apiFetch('/admin/inventory', {}, token).then((data) => setInventory(data)).catch(() => setInventory([]));
    apiFetch('/categories').then((data) => setCategories(data)).catch(() => setCategories([]));
  }, [token]);

  const updateProductField = (event) => {
    const { name, value } = event.target;
    setProductForm((current) => ({ ...current, [name]: value }));
  };

  const addProduct = async (event) => {
    event.preventDefault();
    setProductMessage('');
    try {
      const formData = new FormData();
      Object.entries(productForm).forEach(([key, value]) => formData.append(key, value));
      if (productImage) formData.append('image', productImage);
      await apiFetch(editingProductId ? `/admin/products/${editingProductId}` : '/admin/products', {
        method: editingProductId ? 'PATCH' : 'POST',
        body: formData,
      }, token);
      setProductMessage(editingProductId ? 'Product updated successfully.' : 'Product added successfully.');
      setEditingProductId(null);
      setProductForm({ sku: '', name: '', description: '', price: '', category_id: '', brand: '', size: '', color: '', material: '', condition_name: 'Excellent', stock_quantity: 1, image_url: '' });
      setProductImage(null);
      apiFetch('/admin/inventory', {}, token).then((data) => setInventory(data));
      apiFetch('/admin/dashboard', {}, token).then((data) => setDashboard(data));
    } catch (error) {
      setProductMessage(error.message);
    }
  };

  const editProduct = (product) => {
    setEditingProductId(product.id);
    setProductImage(null);
    setProductForm({
      sku: product.sku || '', name: product.name || '', description: product.description || '', price: product.price || '',
      category_id: product.category_id || '', brand: product.brand || '', size: product.size || '', color: product.color || '',
      material: product.material || '', condition_name: product.condition_name || 'Excellent', stock_quantity: product.stock_quantity ?? 0,
      image_url: product.image_url || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setProductImage(null);
    setProductForm({ sku: '', name: '', description: '', price: '', category_id: '', brand: '', size: '', color: '', material: '', condition_name: 'Excellent', stock_quantity: 1, image_url: '' });
  };

  const updateOrderStatus = async (orderId, status) => {
    setOrderMessage('');
    try {
      await apiFetch(`/admin/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }, token);
      setOrders((current) => current.map((order) => order.id === orderId ? { ...order, status } : order));
      setOrderMessage('Order status updated.');
      apiFetch('/admin/dashboard', {}, token).then((data) => setDashboard(data));
    } catch (error) {
      setOrderMessage(error.message);
    }
  };

  const restockProduct = async (productId) => {
    const quantity = Number(restockValues[productId]);
    if (!Number.isInteger(quantity) || quantity < 1) {
      setProductMessage('Enter a whole-number restock quantity greater than 0.');
      return;
    }
    try {
      await apiFetch(`/admin/products/${productId}/restock`, { method: 'PATCH', body: JSON.stringify({ stock_quantity: quantity }) }, token);
      setProductMessage('Product restocked and available to customers.');
      apiFetch('/admin/inventory', {}, token).then((data) => setInventory(data));
      apiFetch('/admin/dashboard', {}, token).then((data) => setDashboard(data));
    } catch (error) {
      setProductMessage(error.message);
    }
  };

  return (
    <div className="container page-shell admin-shell">
      <h2>Admin Dashboard</h2>
      <div id="dashboard" className="stats-grid">
        <div className="stat-box"><strong>{dashboard.totalProducts}</strong><span>Total Products</span></div>
        <div className="stat-box"><strong>{dashboard.totalStock}</strong><span>Total Stock</span></div>
        <div className="stat-box"><strong>{dashboard.lowStock}</strong><span>Low Stock</span></div>
        <div className="stat-box"><strong>{dashboard.outOfStock}</strong><span>Out of Stock</span></div>
        <div className="stat-box"><strong>{dashboard.totalCustomers}</strong><span>Total Customers</span></div>
        <div className="stat-box"><strong>{dashboard.pendingOrders}</strong><span>Pending Orders</span></div>
        <div className="stat-box"><strong>{dashboard.completedOrders}</strong><span>Completed Orders</span></div>
        <div className="stat-box"><strong>₱{Number(dashboard.totalSales).toLocaleString()}</strong><span>Total Sales</span></div>
      </div>

      <section className="admin-product-panel">
        <div className="section-heading">
          <h3>{editingProductId ? 'Edit product' : 'Add a product'}</h3>
          <span>{editingProductId ? 'Update the details or choose a replacement image.' : 'Choose a product image from your computer.'}</span>
        </div>
        <form className="product-form" onSubmit={addProduct}>
          <input name="name" value={productForm.name} onChange={updateProductField} placeholder="Product name" required />
          <input name="sku" value={productForm.sku} onChange={updateProductField} placeholder="SKU e.g. TA-001" required />
          <input name="price" type="number" min="0" step="0.01" value={productForm.price} onChange={updateProductField} placeholder="Price" required />
          <select name="category_id" value={productForm.category_id} onChange={updateProductField} required>
            <option value="">Select category</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <input name="brand" value={productForm.brand} onChange={updateProductField} placeholder="Brand" />
          <input name="size" value={productForm.size} onChange={updateProductField} placeholder="Size" />
          <input name="color" value={productForm.color} onChange={updateProductField} placeholder="Color" />
          <input name="material" value={productForm.material} onChange={updateProductField} placeholder="Material" />
          <select name="condition_name" value={productForm.condition_name} onChange={updateProductField}>
            <option>Like New</option><option>Excellent</option><option>Very Good</option><option>Good</option><option>Fair</option>
          </select>
          <input name="stock_quantity" type="number" min="0" value={productForm.stock_quantity} onChange={updateProductField} placeholder="Stock" required />
          <label className="image-upload wide-field">
            <span>Product image</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setProductImage(event.target.files?.[0] || null)} />
            <small>{productImage ? productImage.name : 'Choose JPG, PNG, or WebP up to 5MB'}</small>
          </label>
          <textarea className="wide-field" name="description" value={productForm.description} onChange={updateProductField} placeholder="Description" />
          <button className="primary-btn" type="submit">{editingProductId ? 'SAVE CHANGES' : 'ADD PRODUCT'}</button>
          {editingProductId && <button className="ghost-btn" type="button" onClick={cancelEdit}>CANCEL</button>}
          {productMessage && <small className="form-message">{productMessage}</small>}
        </form>
      </section>

      <h3 id="orders">Orders</h3>
      {orderMessage && <p className="form-message">{orderMessage}</p>}
      <div className="table-wrap">
        <table className="orders-table">
          <thead><tr><th>Order ID</th><th>Customer</th><th>Status</th><th>Total</th><th>Action</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td><strong>#{order.order_number}</strong><small>{new Date(order.created_at).toLocaleDateString()}</small></td>
                <td>{order.customer_name || 'Customer'}</td>
                <td><span className={`status-badge status-${order.status}`}>{order.status}</span></td>
                <td>₱{Number(order.total_amount).toLocaleString()}</td>
                <td><select value={order.status} onChange={(event) => updateOrderStatus(order.id, event.target.value)} aria-label={`Update status for order ${order.order_number}`}><option value="pending">Accept / Pending</option><option value="confirmed">Confirm Purchase</option><option value="processing">Processing</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option><option value="cancelled">Cancelled</option></select></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 id="inventory">Inventory</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Product</th><th>SKU</th><th>Stock</th><th>Status</th><th>Restock</th><th>Action</th></tr></thead>
          <tbody>
            {inventory.map((item) => (
              <tr key={item.id}><td>{item.name}</td><td>{item.sku}</td><td>{item.stock_quantity}</td><td>{item.inventory_status || 'In Stock'}</td><td><div className="restock-control"><input type="number" min="1" placeholder="Qty" value={restockValues[item.id] || ''} onChange={(event) => setRestockValues((current) => ({ ...current, [item.id]: event.target.value }))} /><button className="table-action" type="button" onClick={() => restockProduct(item.id)}>RESTOCK</button></div></td><td><button className="table-action" type="button" onClick={() => editProduct(item)}>EDIT</button></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3>Customers</h3>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Phone</th></tr></thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id}><td>{customer.name}</td><td>{customer.email}</td><td>{customer.phone || 'N/A'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
