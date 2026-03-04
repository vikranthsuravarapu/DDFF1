import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { pool as db, initDb } from './src/db.ts';

const app = express();
const PORT = 3000;

// Ensure JWT_SECRET is consistent and loaded from env if available
const JWT_SECRET = (process.env.JWT_SECRET && process.env.JWT_SECRET !== 'undefined') 
  ? process.env.JWT_SECRET 
  : 'grama_ruchulu_secret_key_2025';

const adminEmails = ['admin@ddff.com', 'vikky98480@gmail.com', 'vikranth.sura@gmail.com'];

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

console.log(`[Auth] JWT Secret initialized (using ${process.env.JWT_SECRET ? 'environment variable' : 'fallback string'})`);

app.use(cors());
app.use(express.json());

// --- Auth Middleware ---
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or malformed token' });
  }

  const token = authHeader.split(' ')[1];
  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e: any) {
    console.error('JWT Verification Error:', e.message);
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
};

const isAdmin = (req: any, res: any, next: any) => {
  const userEmail = req.user?.email?.toLowerCase();
  const userRole = req.user?.role;
  console.log(`[AdminCheck] User: ${userEmail}, Role: ${userRole}`);
  
  if (userRole === 'admin' || (userEmail && adminEmails.includes(userEmail))) {
    return next();
  }
  
  console.warn(`[AdminCheck] Access denied for ${userEmail}`);
  return res.status(403).json({ 
    error: 'Forbidden: Admin access required',
    debug: { email: userEmail, role: userRole }
  });
};

const isDeliveryBoy = (req: any, res: any, next: any) => {
  if (req.user?.role === 'delivery_boy' || req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Forbidden: Delivery Boy access required' });
};

// --- Email Service ---
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOrderStatusEmail = async (userEmail: string, orderId: number, status: string) => {
  const subject = `Order #${orderId} Status Update - DDFF`;
  const text = `Hello, your order #${orderId} status has been updated to: ${status.toUpperCase()}. You can track your order on our website.`;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #D4820A;">Order Status Update</h2>
      <p>Hello,</p>
      <p>Your order <strong>#${orderId}</strong> status has been updated to: <span style="color: #D4820A; font-weight: bold;">${status.toUpperCase()}</span>.</p>
      <p>You can track your order details in your profile section.</p>
      <br/>
      <p>Thank you for shopping with DDFF!</p>
    </div>
  `;

  if (!process.env.SMTP_USER) {
    console.log('--- MOCK EMAIL SENT ---');
    console.log(`To: ${userEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Status: ${status}`);
    console.log('-----------------------');
    return;
  }

  try {
    await transporter.sendMail({
      from: '"DDFF Grama Ruchulu" <noreply@ddff.com>',
      to: userEmail,
      subject,
      text,
      html,
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

// --- Google OAuth Routes ---
app.get('/api/auth/google/url', (req, res) => {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const options = {
    redirect_uri: `${process.env.APP_URL}/auth/google/callback`,
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  res.json({ url: `${rootUrl}?${qs.toString()}` });
});

app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code as string;
  const redirectUri = `${process.env.APP_URL}/auth/google/callback`;

  try {
    // 1. Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();
    const access_token = tokenData.access_token;

    // 2. Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const googleUser = await userResponse.json();

    // 3. Find or create user in DB
    let userRes = await db.query('SELECT * FROM users WHERE email = $1', [googleUser.email]);
    let user = userRes.rows[0];

    const role = adminEmails.includes(googleUser.email) ? 'admin' : 'customer';

    if (!user) {
      const result = await db.query('INSERT INTO users (name, email, google_id, role) VALUES ($1, $2, $3, $4) RETURNING id', [
        googleUser.name, googleUser.email, googleUser.sub, role
      ]);
      user = { id: result.rows[0].id, name: googleUser.name, email: googleUser.email, role };
    } else {
      // Update role if it's an admin email but role is not admin
      if (adminEmails.includes(user.email) && user.role !== 'admin') {
        await db.query('UPDATE users SET role = $1 WHERE id = $2', ['admin', user.id]);
        user.role = 'admin';
      }
      if (!user.google_id) {
        await db.query('UPDATE users SET google_id = $1 WHERE id = $2', [googleUser.sub, user.id]);
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);

    // 4. Send success message to parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                token: '${token}', 
                user: ${JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role })} 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Google OAuth Error:', error);
    res.status(500).send('Authentication failed');
  }
});

// --- API Routes ---

// Temporary fix for broken seed passwords
const fixPasswords = async () => {
  try {
    const adminHash = '$2b$10$Qd5BrAyShWuOPF60HiXrY.lqOJWcdYq/TNjetNwXvFXLFxxjSwgui';
    const customerHash = '$2b$10$o59j4shzniQKiIfgWKhpIOm4CqrvXc0jysSGHXoFaLCq.xYWrpKQ2';
    
    // Update admin (handle both old and new emails)
    await db.query('UPDATE users SET email = $1, password = $2, role = $3 WHERE id = 1', ['admin@ddff.com', adminHash, 'admin']);
    // Update test customer
    await db.query('UPDATE users SET password = $1 WHERE email = $2', [customerHash, 'customer@test.com']);
  } catch (e) {
    console.error('Failed to update broken passwords:', e);
  }
};

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const result = await db.query('INSERT INTO users (name, email, password, phone) VALUES ($1, $2, $3, $4) RETURNING id', [name, email, hashedPassword, phone]);
    const userId = result.rows[0].id;
    const token = jwt.sign({ id: userId, email, role: 'customer' }, JWT_SECRET);
    res.json({ token, user: { id: userId, name, email, role: 'customer', phone } });
  } catch (e: any) {
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = userRes.rows[0];
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
});

app.get('/api/user/profile', authenticate, async (req: any, res) => {
  const userRes = await db.query('SELECT id, name, email, phone, role FROM users WHERE id = $1', [req.user.id]);
  res.json(userRes.rows[0]);
});

app.patch('/api/user/profile', authenticate, async (req: any, res) => {
  const { name, phone } = req.body;
  try {
    await db.query('UPDATE users SET name = $1, phone = $2 WHERE id = $3', [name, phone, req.user.id]);
    const userRes = await db.query('SELECT id, name, email, phone, role FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, user: userRes.rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Products & Categories
app.get('/api/admin/products', authenticate, isAdmin, async (req, res) => {
  try {
    const productsRes = await db.query(`
      SELECT p.*, f.name as farmer_name 
      FROM products p 
      LEFT JOIN farmers f ON p.farmer_id = f.id
      WHERE p.is_deleted = false
      ORDER BY p.id DESC
    `);
    res.json(productsRes.rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/categories', async (req, res) => {
  const categoriesRes = await db.query('SELECT * FROM categories');
  res.json(categoriesRes.rows);
});

app.get('/api/farmers', async (req, res) => {
  try {
    const farmersRes = await db.query('SELECT id, name, location FROM farmers ORDER BY name ASC');
    res.json(farmersRes.rows);
  } catch (error) {
    console.error('Error fetching farmers:', error);
    res.status(500).json({ error: 'Failed to fetch farmers' });
  }
});

app.get('/api/products', async (req, res) => {
  const { category, featured, best_seller, min_price, max_price, farmer_id, min_rating } = req.query;
  let query = `
    SELECT p.*, f.name as farmer_name 
    FROM products p 
    LEFT JOIN farmers f ON p.farmer_id = f.id 
    WHERE p.is_active = true AND p.is_deleted = false
  `;
  const params: any[] = [];
  let paramCount = 1;
  
  if (category) {
    query += ` AND p.category_id = (SELECT id FROM categories WHERE slug = $${paramCount++})`;
    params.push(category);
  }
  if (featured) query += ' AND p.is_featured = true';
  if (best_seller) query += ' AND p.is_best_seller = true';
  if (min_price) {
    query += ` AND p.price >= $${paramCount++}`;
    params.push(Number(min_price));
  }
  if (max_price) {
    query += ` AND p.price <= $${paramCount++}`;
    params.push(Number(max_price));
  }
  if (farmer_id) {
    query += ` AND p.farmer_id = $${paramCount++}`;
    params.push(Number(farmer_id));
  }
  if (min_rating) {
    query += ` AND p.rating >= $${paramCount++}`;
    params.push(Number(min_rating));
  }
  
  const productsRes = await db.query(query, params);
  res.json(productsRes.rows);
});

app.get('/api/products/:id', async (req, res) => {
  const productRes = await db.query(`
    SELECT p.*, f.name as farmer_name, f.location as farmer_location, f.image_url as farmer_image
    FROM products p
    LEFT JOIN farmers f ON p.farmer_id = f.id
    WHERE p.id = $1 AND p.is_active = true
  `, [req.params.id]);
  const product = productRes.rows[0];
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// Farmers
app.get('/api/farmers/:id', async (req, res) => {
  const farmerRes = await db.query('SELECT * FROM farmers WHERE id = $1', [req.params.id]);
  const farmer = farmerRes.rows[0];
  if (!farmer) return res.status(404).json({ error: 'Farmer not found' });
  
  const productsRes = await db.query('SELECT * FROM products WHERE farmer_id = $1 AND is_active = true', [req.params.id]);
  res.json({ ...farmer, products: productsRes.rows });
});

// Reviews
app.get('/api/products/:id/reviews', async (req, res) => {
  const reviewsRes = await db.query(`
    SELECT r.*, u.name as user_name
    FROM reviews r
    JOIN users u ON r.user_id = u.id
    WHERE r.product_id = $1
    ORDER BY r.created_at DESC
  `, [req.params.id]);
  res.json(reviewsRes.rows);
});

app.post('/api/products/:id/reviews', authenticate, async (req: any, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.id;
  const userId = req.user.id;

  try {
    await db.query('INSERT INTO reviews (user_id, product_id, rating, comment) VALUES ($1, $2, $3, $4)', [userId, productId, rating, comment]);
    
    // Update product rating average
    const statsRes = await db.query('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE product_id = $1', [productId]);
    const stats = statsRes.rows[0];
    await db.query('UPDATE products SET rating = $1, review_count = $2 WHERE id = $3', [stats.avg, stats.count, productId]);
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to post review' });
  }
});

// Order Tracking
app.get('/api/orders/:id/tracking', authenticate, async (req: any, res) => {
  const orderRes = await db.query('SELECT status, created_at, city FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  const order = orderRes.rows[0];
  if (!order) return res.status(404).json({ error: 'Order not found' });

  // Mock tracking steps based on status
  const steps = [
    { status: 'processing', label: 'Order Placed', date: order.created_at, completed: true },
    { status: 'confirmed', label: 'Confirmed by Farmer', date: null, completed: ['confirmed', 'shipped', 'delivered'].includes(order.status) },
    { status: 'shipped', label: 'In Transit', date: null, completed: ['shipped', 'delivered'].includes(order.status) },
    { status: 'delivered', label: 'Delivered', date: null, completed: order.status === 'delivered' }
  ];

  res.json({ current_status: order.status, steps });
});

// Mobile Specific Home Endpoint
app.get('/api/mobile/home', async (req, res) => {
  const banners = [
    { id: 1, image: 'https://picsum.photos/seed/honey/800/400', title: 'Pure Forest Honey', subtitle: 'Shop Now' },
    { id: 2, image: 'https://picsum.photos/seed/chilli/800/400', title: 'Guntur Chillies', subtitle: 'Festival Offer' }
  ];
  const categoriesRes = await db.query('SELECT * FROM categories');
  const featuredRes = await db.query('SELECT * FROM products WHERE is_featured = true');
  const bestSellersRes = await db.query('SELECT * FROM products WHERE is_best_seller = true');
  
  res.json({ banners, categories: categoriesRes.rows, featured: featuredRes.rows, bestSellers: bestSellersRes.rows });
});

// Wishlist
app.get('/api/wishlist', authenticate, async (req: any, res) => {
  const wishlistRes = await db.query(`
    SELECT p.*, f.name as farmer_name
    FROM wishlist w
    JOIN products p ON w.product_id = p.id
    LEFT JOIN farmers f ON p.farmer_id = f.id
    WHERE w.user_id = $1
  `, [req.user.id]);
  res.json(wishlistRes.rows);
});

app.post('/api/wishlist/:productId', authenticate, async (req: any, res) => {
  try {
    await db.query('INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2)', [req.user.id, req.params.productId]);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Already in wishlist' });
  }
});

app.delete('/api/wishlist/:productId', authenticate, async (req: any, res) => {
  await db.query('DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2', [req.user.id, req.params.productId]);
  res.json({ success: true });
});

// Orders
app.post('/api/orders', authenticate, async (req: any, res) => {
  const { 
    items, total_amount, discount_amount, final_amount, 
    payment_method, house_no, street, landmark, address, city, district, state, pincode, phone 
  } = req.body;
  const userId = req.user.id;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Check stock for all items first
    for (const item of items) {
      const productRes = await client.query('SELECT stock, name FROM products WHERE id = $1', [item.product_id]);
      const product = productRes.rows[0];
      if (!product) throw new Error(`Product not found: ${item.product_id}`);
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
      }
    }

    const result = await client.query(`
      INSERT INTO orders (
        user_id, total_amount, discount_amount, final_amount, 
        payment_method, house_no, street, landmark, address, city, district, state, pincode, phone,
        payment_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [
      userId, total_amount, discount_amount, final_amount, 
      payment_method, house_no, street, landmark, address, city, district, state, pincode, phone,
      payment_method === 'online' ? 'pending' : 'pending'
    ]);

    const orderId = result.rows[0].id;
    
    for (const item of items) {
      await client.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)', [orderId, item.product_id, item.quantity, item.price]);
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    await client.query('COMMIT');

    // If online payment, create Razorpay order
    if (payment_method === 'online') {
      const options = {
        amount: Math.round(final_amount * 100), // amount in the smallest currency unit (paise)
        currency: "INR",
        receipt: `order_rcptid_${orderId}`,
        notes: {
          orderId: orderId.toString(),
          userId: userId.toString()
        }
      };

      try {
        const razorpayOrder = await razorpay.orders.create(options);
        return res.json({ 
          success: true, 
          orderId, 
          razorpayOrderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key: process.env.RAZORPAY_KEY_ID
        });
      } catch (err: any) {
        console.error('Razorpay Order Error:', err);
        // We already committed the order in DB, but payment failed to initiate.
        // In a real app, you might want to handle this better (e.g. mark order as failed or allow retry)
        return res.status(500).json({ error: 'Failed to initiate online payment', details: err.message });
      }
    }

    res.json({ success: true, orderId });
  } catch (e: any) {
    await client.query('ROLLBACK');
    console.error('Order error:', e);
    res.status(400).json({ error: e.message || 'Failed to place order' });
  } finally {
    client.release();
  }
});

// Razorpay Payment Verification
app.post('/api/payments/verify', authenticate, async (req: any, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, order_id } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(body.toString())
    .digest('hex');

  if (expectedSignature === razorpay_signature) {
    await db.query('UPDATE orders SET payment_status = $1, status = $2 WHERE id = $3', ['paid', 'confirmed', order_id]);
    res.json({ success: true, message: 'Payment verified successfully' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid signature' });
  }
});

app.get('/api/orders', authenticate, async (req: any, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM orders WHERE user_id = $1';
  const params: any[] = [req.user.id];
  
  if (status) {
    query += ' AND status = $2';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC';
  const ordersRes = await db.query(query, params);
  res.json(ordersRes.rows);
});

app.get('/api/user/previous-addresses', authenticate, async (req: any, res) => {
  try {
    const addressesRes = await db.query(`
      SELECT house_no, street, landmark, address, city, district, state, pincode, phone
      FROM (
        SELECT house_no, street, landmark, address, city, district, state, pincode, phone, MAX(created_at) as last_used
        FROM orders
        WHERE user_id = $1
        GROUP BY house_no, street, landmark, address, city, district, state, pincode, phone
      ) sub
      ORDER BY last_used DESC
      LIMIT 5
    `, [req.user.id]);
    res.json(addressesRes.rows);
  } catch (error) {
    console.error('Error fetching previous addresses:', error);
    res.status(500).json({ error: 'Failed to fetch previous addresses' });
  }
});

app.get('/api/user/saved-addresses', authenticate, async (req: any, res) => {
  try {
    const addressesRes = await db.query('SELECT * FROM saved_addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC', [req.user.id]);
    res.json(addressesRes.rows);
  } catch (error) {
    console.error('Error fetching saved addresses:', error);
    res.status(500).json({ error: 'Failed to fetch saved addresses' });
  }
});

app.post('/api/user/saved-addresses', authenticate, async (req: any, res) => {
  const { label, house_no, street, landmark, address, city, district, state, pincode, phone, is_default } = req.body;
  try {
    if (is_default) {
      await db.query('UPDATE saved_addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    }
    const result = await db.query(`
      INSERT INTO saved_addresses (user_id, label, house_no, street, landmark, address, city, district, state, pincode, phone, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [req.user.id, label, house_no, street, landmark, address, city, district, state, pincode, phone, is_default || false]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding saved address:', error);
    res.status(500).json({ error: 'Failed to add saved address' });
  }
});

app.put('/api/user/saved-addresses/:id', authenticate, async (req: any, res) => {
  const { label, house_no, street, landmark, address, city, district, state, pincode, phone, is_default } = req.body;
  try {
    if (is_default) {
      await db.query('UPDATE saved_addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    }
    const result = await db.query(`
      UPDATE saved_addresses 
      SET label = $1, house_no = $2, street = $3, landmark = $4, address = $5, city = $6, district = $7, state = $8, pincode = $9, phone = $10, is_default = $11
      WHERE id = $12 AND user_id = $13
      RETURNING *
    `, [label, house_no, street, landmark, address, city, district, state, pincode, phone, is_default, req.params.id, req.user.id]);
    
    if (result.rowCount === 0) return res.status(404).json({ error: 'Address not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating saved address:', error);
    res.status(500).json({ error: 'Failed to update saved address' });
  }
});

app.delete('/api/user/saved-addresses/:id', authenticate, async (req: any, res) => {
  try {
    const result = await db.query('DELETE FROM saved_addresses WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Address not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting saved address:', error);
    res.status(500).json({ error: 'Failed to delete saved address' });
  }
});

app.post('/api/user/saved-addresses/:id/default', authenticate, async (req: any, res) => {
  try {
    await db.query('UPDATE saved_addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    const result = await db.query('UPDATE saved_addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Address not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({ error: 'Failed to set default address' });
  }
});

app.get('/api/orders/:id', authenticate, async (req: any, res) => {
  const orderRes = await db.query('SELECT * FROM orders WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
  const order = orderRes.rows[0];
  if (!order) return res.status(404).json({ error: 'Order not found' });
  
  const itemsRes = await db.query(`
    SELECT oi.*, p.name, p.image_url, p.unit
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = $1
  `, [req.params.id]);
  
  res.json({ ...order, items: itemsRes.rows });
});

// Admin Routes
app.post('/api/admin/products', authenticate, isAdmin, async (req, res) => {
  console.log('POST /api/admin/products', req.body);
  const { category_id, name, description, price, original_price, unit, stock, origin, image_url, is_featured, is_best_seller } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO products (category_id, name, description, price, original_price, unit, stock, origin, image_url, is_featured, is_best_seller)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [
      category_id, name, description, price, original_price, unit, stock, origin, image_url, 
      is_featured ? true : false, 
      is_best_seller ? true : false
    ]);
    const productId = result.rows[0].id;
    console.log('Product added successfully, ID:', productId);
    res.json({ success: true, id: productId });
  } catch (e) {
    console.error('Error adding product:', e);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

app.delete('/api/admin/products/:id', authenticate, isAdmin, async (req, res) => {
  const productId = parseInt(req.params.id);
  console.log(`[DeleteProduct] Attempting to delete product ID: ${productId}`);
  
  if (isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  try {
    // Try hard delete first, if it fails due to FK, fall back to soft delete
    try {
      const result = await db.query('DELETE FROM products WHERE id = $1', [productId]);
      if (result.rowCount && result.rowCount > 0) {
        console.log(`[DeleteProduct] Hard delete successful for ID: ${productId}`);
        return res.json({ success: true, method: 'hard' });
      }
    } catch (fkError: any) {
      // PostgreSQL FK error code is 23503
      if (fkError.code === '23503') {
        console.log(`[DeleteProduct] FK constraint hit, falling back to soft delete for ID: ${productId}`);
      } else {
        throw fkError;
      }
    }

    // Soft delete fallback
    const result = await db.query('UPDATE products SET is_deleted = true WHERE id = $1', [productId]);
    console.log(`[DeleteProduct] Soft delete result for ID ${productId}:`, result.rowCount);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true, method: 'soft' });
  } catch (e: any) {
    console.error(`[DeleteProduct] Error:`, e);
    res.status(500).json({ error: 'Failed to delete product: ' + e.message });
  }
});

// POST fallback for deletion (some environments block DELETE)
app.post('/api/admin/products/:id/delete', authenticate, isAdmin, async (req, res) => {
  const productId = parseInt(req.params.id);
  console.log(`[DeleteProduct-POST] Attempting to delete product ID: ${productId}`);
  
  if (isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  try {
    // Try hard delete first
    try {
      const result = await db.query('DELETE FROM products WHERE id = $1', [productId]);
      if (result.rowCount && result.rowCount > 0) {
        return res.json({ success: true, method: 'hard' });
      }
    } catch (fkError: any) {
      if (fkError.code !== '23503') throw fkError;
    }

    // Soft delete fallback
    const result = await db.query('UPDATE products SET is_deleted = true WHERE id = $1', [productId]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ success: true, method: 'soft' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/admin/products/:id', authenticate, isAdmin, async (req, res) => {
  const productId = parseInt(req.params.id);
  console.log('PUT /api/admin/products/' + productId, req.body);
  const { category_id, name, description, price, original_price, unit, stock, origin, image_url, is_featured, is_best_seller } = req.body;
  try {
    const result = await db.query(`
      UPDATE products 
      SET category_id = $1, name = $2, description = $3, price = $4, original_price = $5, unit = $6, stock = $7, origin = $8, image_url = $9, is_featured = $10, is_best_seller = $11
      WHERE id = $12
    `, [
      category_id, name, description, price, original_price, unit, stock, origin, image_url, 
      is_featured ? true : false, 
      is_best_seller ? true : false, 
      productId
    ]);
    console.log('Update result:', result.rowCount);
    if (result.rowCount === 0) {
      console.warn('No product found with ID:', productId);
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ success: true });
  } catch (e) {
    console.error('Error updating product:', e);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

app.patch('/api/admin/products/bulk-stock', authenticate, isAdmin, async (req, res) => {
  const { ids, stock } = req.body;
  if (!Array.isArray(ids) || typeof stock !== 'number') {
    return res.status(400).json({ error: 'Invalid request body' });
  }
  
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const id of ids) {
      await client.query('UPDATE products SET stock = $1 WHERE id = $2', [stock, id]);
    }
    await client.query('COMMIT');
    res.json({ success: true, updated: ids.length });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Bulk stock update error:', e);
    res.status(500).json({ error: 'Failed to bulk update stock' });
  } finally {
    client.release();
  }
});

app.get('/api/admin/stats', authenticate, isAdmin, async (req, res) => {
  const totalSalesRes = await db.query("SELECT SUM(final_amount) as total FROM orders WHERE status != 'cancelled'");
  const orderCountRes = await db.query('SELECT COUNT(*) as count FROM orders');
  const userCountRes = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'customer'");
  const lowStockRes = await db.query('SELECT COUNT(*) as count FROM products WHERE stock < 10');
  
  res.json({
    totalSales: parseFloat(totalSalesRes.rows[0].total) || 0,
    orderCount: parseInt(orderCountRes.rows[0].count),
    userCount: parseInt(userCountRes.rows[0].count),
    lowStock: parseInt(lowStockRes.rows[0].count)
  });
});

app.get('/api/admin/orders', authenticate, isAdmin, async (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT o.*, u.name as user_name, u.email as user_email 
    FROM orders o 
    JOIN users u ON o.user_id = u.id 
  `;
  const params: any[] = [];

  if (status) {
    query += ' WHERE o.status = $1';
    params.push(status);
  }

  query += ' ORDER BY o.created_at DESC';
  
  const ordersRes = await db.query(query, params);
  res.json(ordersRes.rows);
});

app.get('/api/admin/users', authenticate, isAdmin, async (req, res) => {
  const usersRes = await db.query('SELECT id, name, email, phone, role, created_at FROM users ORDER BY created_at DESC');
  res.json(usersRes.rows);
});

app.get('/api/admin/delivery-boys', authenticate, isAdmin, async (req, res) => {
  const deliveryBoysRes = await db.query("SELECT id, name, email, phone FROM users WHERE role = 'delivery_boy'");
  res.json(deliveryBoysRes.rows);
});

app.patch('/api/admin/orders/:id/assign', authenticate, isAdmin, async (req, res) => {
  const { delivery_boy_id } = req.body;
  const orderId = req.params.id;
  
  try {
    await db.query('UPDATE orders SET delivery_boy_id = $1, status = $2 WHERE id = $3', [delivery_boy_id, 'confirmed', orderId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to assign delivery boy' });
  }
});

// Category Management
app.post('/api/admin/categories', authenticate, isAdmin, async (req, res) => {
  const { name, emoji } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  try {
    const result = await db.query('INSERT INTO categories (name, slug, emoji) VALUES ($1, $2, $3) RETURNING id', [name, slug, emoji || '📦']);
    res.json({ success: true, id: result.rows[0].id });
  } catch (e) {
    res.status(400).json({ error: 'Category already exists or invalid name' });
  }
});

app.delete('/api/admin/categories/:id', authenticate, isAdmin, async (req, res) => {
  const categoryId = parseInt(req.params.id);
  if (isNaN(categoryId)) return res.status(400).json({ error: 'Invalid category ID' });

  try {
    // Check if category exists
    const categoryRes = await db.query('SELECT * FROM categories WHERE id = $1', [categoryId]);
    if (categoryRes.rowCount === 0) return res.status(404).json({ error: 'Category not found' });

    // Orphan products instead of blocking deletion
    await db.query('UPDATE products SET category_id = NULL WHERE category_id = $1', [categoryId]);
    
    await db.query('DELETE FROM categories WHERE id = $1', [categoryId]);
    res.json({ success: true });
  } catch (e: any) {
    console.error('Delete category error:', e);
    res.status(500).json({ error: `Failed to delete category: ${e.message}` });
  }
});

app.post('/api/admin/categories/:id/delete', authenticate, isAdmin, async (req, res) => {
  const categoryId = parseInt(req.params.id);
  if (isNaN(categoryId)) return res.status(400).json({ error: 'Invalid category ID' });

  try {
    // Check if category exists
    const categoryRes = await db.query('SELECT * FROM categories WHERE id = $1', [categoryId]);
    if (categoryRes.rowCount === 0) return res.status(404).json({ error: 'Category not found' });

    // Orphan products instead of blocking deletion
    await db.query('UPDATE products SET category_id = NULL WHERE category_id = $1', [categoryId]);
    
    await db.query('DELETE FROM categories WHERE id = $1', [categoryId]);
    res.json({ success: true });
  } catch (e: any) {
    console.error('Delete category error (POST fallback):', e);
    res.status(500).json({ error: `Failed to delete category: ${e.message}` });
  }
});

app.patch('/api/admin/orders/:id/status', authenticate, isAdmin, async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  
  await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);
  
  // Get user email to send notification
  const orderRes = await db.query(`
    SELECT u.email 
    FROM orders o 
    JOIN users u ON o.user_id = u.id 
    WHERE o.id = $1
  `, [orderId]);
  const order = orderRes.rows[0];
  
  if (order) {
    await sendOrderStatusEmail(order.email, Number(orderId), status);
  }
  
  res.json({ success: true });
});

// Delivery Boy Routes
app.get('/api/delivery/orders', authenticate, isDeliveryBoy, async (req: any, res) => {
  const ordersRes = await db.query(`
    SELECT o.*, u.name as user_name, u.phone as user_phone
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.delivery_boy_id = $1
    ORDER BY o.created_at DESC
  `, [req.user.id]);
  res.json(ordersRes.rows);
});

app.patch('/api/delivery/orders/:id/status', authenticate, isDeliveryBoy, async (req: any, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  const deliveryBoyId = req.user.id;

  // Verify the order is assigned to this delivery boy (unless admin)
  if (req.user.role !== 'admin') {
    const orderRes = await db.query('SELECT delivery_boy_id FROM orders WHERE id = $1', [orderId]);
    const order = orderRes.rows[0];
    if (!order || order.delivery_boy_id !== deliveryBoyId) {
      return res.status(403).json({ error: 'Unauthorized to update this order' });
    }
  }

  await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);
  
  // Get user email to send notification
  const orderRes = await db.query(`
    SELECT u.email 
    FROM orders o 
    JOIN users u ON o.user_id = u.id 
    WHERE o.id = $1
  `, [orderId]);
  const order = orderRes.rows[0];
  
  if (order) {
    await sendOrderStatusEmail(order.email, Number(orderId), status);
  }
  
  res.json({ success: true });
});

// Promo Codes
app.post('/api/promo/validate', async (req, res) => {
  const { code, amount } = req.body;
  const promoRes = await db.query('SELECT * FROM promo_codes WHERE code = $1 AND is_active = true', [code]);
  const promo = promoRes.rows[0];
  if (!promo) return res.status(400).json({ error: 'Invalid promo code' });
  if (amount < promo.min_order) return res.status(400).json({ error: `Minimum order ₹${promo.min_order} required` });
  
  res.json(promo);
});

// Global Error Handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Global Error Handler:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// --- Vite Setup ---
async function startServer() {
  // Initialize database
  await initDb();
  
  // Fix passwords after DB init
  await fixPasswords();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
