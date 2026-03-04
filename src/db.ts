import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Initialize Database Schema
const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        google_id TEXT UNIQUE,
        phone TEXT,
        role TEXT DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        emoji TEXT,
        slug TEXT UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS farmers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT NOT NULL,
        bio TEXT,
        image_url TEXT,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES categories(id),
        farmer_id INTEGER REFERENCES farmers(id),
        name TEXT NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        unit TEXT,
        stock INTEGER DEFAULT 0,
        image_url TEXT,
        origin TEXT,
        is_featured BOOLEAN DEFAULT false,
        is_best_seller BOOLEAN DEFAULT false,
        rating DECIMAL(3,2) DEFAULT 0,
        review_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        is_deleted BOOLEAN DEFAULT false
      );

      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
      CREATE INDEX IF NOT EXISTS idx_products_farmer ON products(farmer_id);
      CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);
      CREATE INDEX IF NOT EXISTS idx_products_active_deleted ON products(is_active, is_deleted);
      CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
      CREATE INDEX IF NOT EXISTS idx_products_best_seller ON products(is_best_seller) WHERE is_best_seller = true;
      CREATE INDEX IF NOT EXISTS idx_products_rating ON products(rating);

      CREATE TABLE IF NOT EXISTS promo_codes (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        discount_percent INTEGER,
        discount_amount DECIMAL(10,2),
        min_order DECIMAL(10,2),
        expiry_date TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );

      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        total_amount DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        final_amount DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'processing',
        payment_method TEXT,
        payment_status TEXT DEFAULT 'pending',
        house_no TEXT,
        street TEXT,
        landmark TEXT,
        address TEXT,
        city TEXT,
        district TEXT,
        state TEXT,
        pincode TEXT,
        phone TEXT,
        delivery_boy_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id),
        product_id INTEGER REFERENCES products(id),
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS device_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        fcm_token TEXT NOT NULL,
        platform TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, fcm_token)
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        product_id INTEGER REFERENCES products(id),
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS wishlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        product_id INTEGER REFERENCES products(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id)
      );

      CREATE TABLE IF NOT EXISTS saved_addresses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        label TEXT NOT NULL,
        house_no TEXT,
        street TEXT,
        landmark TEXT,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        district TEXT,
        state TEXT NOT NULL,
        pincode TEXT NOT NULL,
        phone TEXT NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed Data
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      // Admin: Admin@123
      await client.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [
        'Admin', 'admin@ddff.com', '$2b$10$Qd5BrAyShWuOPF60HiXrY.lqOJWcdYq/TNjetNwXvFXLFxxjSwgui', 'admin'
      ]);
      // Customer: Test@123
      await client.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [
        'Test Customer', 'customer@test.com', '$2b$10$o59j4shzniQKiIfgWKhpIOm4CqrvXc0jysSGHXoFaLCq.xYWrpKQ2', 'customer'
      ]);
      // Delivery Boy: Delivery@123
      await client.query('INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)', [
        'Delivery Boy', 'delivery@ddff.com', '$2b$10$Qd5BrAyShWuOPF60HiXrY.lqOJWcdYq/TNjetNwXvFXLFxxjSwgui', 'delivery_boy'
      ]);

      const categories = [
        { name: 'Honey', emoji: '🍯', slug: 'honey' },
        { name: 'Spices', emoji: '🌶️', slug: 'spices' },
        { name: 'Pulses', emoji: '🫘', slug: 'pulses' },
        { name: 'Fruits', emoji: '🍎', slug: 'fruits' }
      ];

      for (const c of categories) {
        await client.query('INSERT INTO categories (name, emoji, slug) VALUES ($1, $2, $3)', [c.name, c.emoji, c.slug]);
      }

      const farmers = [
        { name: 'Raju Garu', location: 'Nallamala Hills', bio: 'Traditional honey harvester with 20 years of experience.', image_url: 'https://picsum.photos/seed/farmer1/400/400' },
        { name: 'Sita Devi', location: 'Guntur Farms', bio: 'Specializes in organic chilli and turmeric cultivation.', image_url: 'https://picsum.photos/seed/farmer2/400/400' },
        { name: 'Venkatesh', location: 'Palnadu Valley', bio: 'Passionate about heritage pulses and organic farming.', image_url: 'https://picsum.photos/seed/farmer3/400/400' }
      ];
      for (const f of farmers) {
        await client.query('INSERT INTO farmers (name, location, bio, image_url) VALUES ($1, $2, $3, $4)', [f.name, f.location, f.bio, f.image_url]);
      }

      // Get category and farmer IDs
      const catRes = await client.query('SELECT id, slug FROM categories');
      const cats = Object.fromEntries(catRes.rows.map(r => [r.slug, r.id]));
      
      const farmRes = await client.query('SELECT id, name FROM farmers');
      const farms = Object.fromEntries(farmRes.rows.map(r => [r.name, r.id]));

      const products = [
        { 
          category_id: cats['honey'], 
          farmer_id: farms['Raju Garu'],
          name: 'Pure Forest Honey', 
          description: 'Wild honey collected from deep forests, raw and unprocessed.', 
          price: 450, 
          original_price: 550, 
          unit: '500g', 
          stock: 50, 
          origin: 'Nallamala Forest', 
          is_featured: true, 
          is_best_seller: true,
          image_url: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80' 
        },
        { 
          category_id: cats['spices'], 
          farmer_id: farms['Sita Devi'],
          name: 'Guntur Red Chilli Powder', 
          description: 'Authentic spicy red chilli powder from Guntur farms.', 
          price: 180, 
          original_price: 220, 
          unit: '250g', 
          stock: 100, 
          origin: 'Guntur', 
          is_featured: true, 
          is_best_seller: true,
          image_url: 'https://images.unsplash.com/photo-1599481238505-b8b0537a3f77?auto=format&fit=crop&w=800&q=80'
        },
        { 
          category_id: cats['pulses'], 
          farmer_id: farms['Venkatesh'],
          name: 'Organic Toor Dal', 
          description: 'Pesticide-free pulses grown in village farms using traditional methods.', 
          price: 160, 
          original_price: 190, 
          unit: '1kg', 
          stock: 80, 
          origin: 'Palnadu', 
          is_featured: false, 
          is_best_seller: true,
          image_url: 'https://images.unsplash.com/photo-1585996731181-307f014544c7?auto=format&fit=crop&w=800&q=80'
        },
        { 
          category_id: cats['spices'], 
          farmer_id: farms['Sita Devi'],
          name: 'Stone Ground Turmeric', 
          description: 'High curcumin turmeric powder, traditionally processed.', 
          price: 120, 
          original_price: 150, 
          unit: '200g', 
          stock: 60, 
          origin: 'Duggirala', 
          is_featured: true, 
          is_best_seller: false,
          image_url: 'https://images.unsplash.com/photo-1615485245474-239404d5197a?auto=format&fit=crop&w=800&q=80'
        },
        { 
          category_id: cats['fruits'], 
          farmer_id: farms['Venkatesh'],
          name: 'Farm Fresh Mangoes (Banginapalli)', 
          description: 'Naturally ripened, sweet and juicy Banginapalli mangoes directly from the orchard.', 
          price: 600, 
          original_price: 750, 
          unit: '5kg Box', 
          stock: 30, 
          origin: 'Nuzvid', 
          is_featured: true, 
          is_best_seller: true,
          image_url: 'https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=800&q=80'
        },
        { 
          category_id: cats['fruits'], 
          farmer_id: farms['Venkatesh'],
          name: 'Organic Papaya', 
          description: 'Sweet and nutritious farm-fresh papaya, grown without chemicals.', 
          price: 60, 
          original_price: 80, 
          unit: '1kg', 
          stock: 40, 
          origin: 'Tenali', 
          is_featured: false, 
          is_best_seller: false,
          image_url: 'https://images.unsplash.com/photo-1526318472351-c75fcf070305?auto=format&fit=crop&w=800&q=80'
        }
      ];

      for (const p of products) {
        await client.query(`
          INSERT INTO products (category_id, farmer_id, name, description, price, original_price, unit, stock, origin, is_featured, is_best_seller, image_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [p.category_id, p.farmer_id, p.name, p.description, p.price, p.original_price, p.unit, p.stock, p.origin, p.is_featured, p.is_best_seller, p.image_url]);
      }

      await client.query('INSERT INTO promo_codes (code, discount_percent, min_order) VALUES ($1, $2, $3)', ['VILLAGE20', 20, 300]);
      await client.query('INSERT INTO promo_codes (code, discount_amount, min_order) VALUES ($1, $2, $3)', ['FREESHIP', 0, 0]);
      await client.query('INSERT INTO promo_codes (code, discount_amount, min_order) VALUES ($1, $2, $3)', ['HONEY50', 50, 400]);
    }
    
    await client.query('COMMIT');
    console.log('Database initialized successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Database initialization error:', e);
  } finally {
    client.release();
  }
};

export { pool, initDb };
export default pool;
