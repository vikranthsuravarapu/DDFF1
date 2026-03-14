import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import multer from 'multer';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import { createServer as createViteServer } from 'vite';
import { pool as db, initDb } from './src/db';
import { sendWhatsAppNotification } from './src/services/notificationService';

const cleanEnvVar = (val: string | undefined) => {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
};

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
const PORT = 3000;

const JWT_SECRET = cleanEnvVar(process.env.JWT_SECRET);
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.warn('[DB] DATABASE_URL is not set. Database connection will likely fail.');
} else {
  const maskedDbUrl = process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@');
  console.log(`[DB] DATABASE_URL is set: ${maskedDbUrl}`);
}

const appUrl = cleanEnvVar(process.env.APP_URL);
if (!appUrl) {
  console.warn('[Server] APP_URL is not set. OAuth and other features may not work correctly.');
} else {
  console.log(`[Server] APP_URL is set: ${appUrl}`);
}

const clientId = cleanEnvVar(process.env.GOOGLE_CLIENT_ID);
const clientSecret = cleanEnvVar(process.env.GOOGLE_CLIENT_SECRET);
if (!clientId || !clientSecret) {
  console.warn('[OAuth] Google Client ID or Secret is missing. Google Sign-In will fail.');
} else {
  console.log('[OAuth] Google OAuth credentials detected.');
}

const adminEmails = ['admin@ddff.com', 'vikky98480@gmail.com', 'vikranth.sura@gmail.com'];

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || '',
});

console.log(`[Auth] JWT Secret initialized (using ${process.env.JWT_SECRET ? 'environment variable' : 'fallback string'})`);

app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [cleanEnvVar(process.env.APP_URL)].filter(Boolean)
    : true,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many attempts. Please try again after 15 minutes.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

// Ensure uploads directory exists
const uploadDir = 'uploads/proofs';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer setup for proof of delivery
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/proofs/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

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
const transporterConfig: any = {
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
};

if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporterConfig.auth = {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  };
}

const transporter = nodemailer.createTransport(transporterConfig);

const sendVerificationEmail = async (userEmail: string, token: string) => {
  if (!process.env.SMTP_USER) {
    console.warn(`[Email] Skipping verification email to ${userEmail} - SMTP_USER not configured. Verification token: ${token}`);
    return;
  }

  const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
  const subject = 'Verify Your Email - Grama Ruchulu';
  const html = `
    <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #D4820A; text-align: center;">Welcome to Grama Ruchulu!</h2>
      <p>Hello,</p>
      <p>Thank you for registering with Grama Ruchulu. To complete your registration and start shopping for authentic village flavors, please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationUrl}" style="background-color: #D4820A; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
      </div>
      <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
      <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="font-size: 12px; color: #999; text-align: center;">If you did not create an account, please ignore this email.</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Grama Ruchulu" <${process.env.SMTP_USER}>`,
      to: userEmail,
      subject,
      html,
    });
    console.log(`[Email] Verification email sent to ${userEmail}`);
  } catch (error) {
    console.error(`[Email] Failed to send verification email to ${userEmail}:`, error);
  }
};

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

const notifyOrderStatusUpdate = async (orderId: number, status: string) => {
  try {
    const orderRes = await db.query(`
      SELECT u.email, u.name, COALESCE(o.phone, u.phone) as phone
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      WHERE o.id = $1
    `, [orderId]);
    const order = orderRes.rows[0];
    
    if (order) {
      // Send Email
      await sendOrderStatusEmail(order.email, orderId, status);
      
      // Send WhatsApp
      if (order.phone) {
        const message = `Hi ${order.name}, your order #${orderId} from Grama Ruchulu is now ${status}. Thank you! 🌾`;
        await sendWhatsAppNotification(order.phone, message);
      }
    }
  } catch (error) {
    console.error(`Failed to send notifications for order #${orderId}:`, error);
  }
};

// --- Google OAuth Helpers ---
const getGoogleRedirectUri = (req: any) => {
  const appUrl = cleanEnvVar(process.env.APP_URL);
  // Priority 1: APP_URL environment variable (most reliable)
  if (appUrl && appUrl !== 'MY_APP_URL' && appUrl !== '') {
    const uri = `${appUrl.replace(/\/$/, '')}/auth/google/callback`;
    console.log(`[OAuth] Using APP_URL for redirect URI: ${uri}`);
    return uri;
  }

  // Priority 2: Request headers (fallback)
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const requestOrigin = `${protocol}://${host}`;
  
  const uri = `${requestOrigin.replace(/\/$/, '')}/auth/google/callback`;
  console.log(`[OAuth] Using request headers for redirect URI: ${uri} (Host: ${host}, Proto: ${protocol})`);
  return uri;
};

// --- Google OAuth Routes ---
app.get('/api/auth/google/test-secret', async (req, res) => {
  const clientId = cleanEnvVar(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnvVar(process.env.GOOGLE_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    return res.status(400).json({ error: 'Credentials not configured' });
  }

  try {
    // Attempt a client_credentials grant. 
    // Even if Google doesn't support it for this app type, 
    // the error message will tell us if the CLIENT SECRET is valid.
    // "invalid_client" usually means bad secret.
    // "unauthorized_client" or "unsupported_grant_type" usually means secret is OK but this grant isn't allowed.
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      }).toString()
    });

    const data = await response.json();
    
    // Google usually returns 401 for bad secret
    if (response.status === 401 || (data.error === 'invalid_client')) {
      return res.json({ 
        status: 'FAIL', 
        message: 'Google rejected the Client ID or Client Secret. Please double check them.',
        google_error: data.error,
        google_error_description: data.error_description
      });
    }

    return res.json({ 
      status: 'SUCCESS_OR_UNSUPPORTED', 
      message: 'The Client Secret seems to be accepted by Google (or at least not rejected as invalid_client).',
      google_error: data.error,
      google_error_description: data.error_description
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to test secret', details: err.message });
  }
});

app.get('/api/auth/google/config', (req, res) => {
  const redirectUri = getGoogleRedirectUri(req);
  const clientId = cleanEnvVar(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnvVar(process.env.GOOGLE_CLIENT_SECRET);
  const appUrl = cleanEnvVar(process.env.APP_URL);
  
  res.json({
    redirect_uri: redirectUri,
    client_id: clientId ? `${clientId.substring(0, 10)}...${clientId.substring(clientId.length - 5)}` : 'NOT_SET',
    client_id_length: clientId?.length || 0,
    client_secret_length: clientSecret?.length || 0,
    client_secret_preview: clientSecret ? `${clientSecret.substring(0, 3)}...${clientSecret.substring(clientSecret.length - 3)}` : 'NOT_SET',
    app_url_env: appUrl || 'NOT_SET',
    env_keys: Object.keys(process.env).filter(k => k.includes('GOOGLE') || k === 'APP_URL')
  });
});

app.get('/api/auth/google/url', (req, res) => {
  const rootUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const redirectUri = getGoogleRedirectUri(req);
  const clientId = cleanEnvVar(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnvVar(process.env.GOOGLE_CLIENT_SECRET);

  if (!clientId || !clientSecret) {
    console.error('[OAuth] Missing Google credentials');
    return res.status(400).json({ 
      error: 'Google OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are not configured in environment variables.',
      debug: {
        has_client_id: !!clientId,
        has_client_secret: !!clientSecret
      }
    });
  }

  console.log(`[OAuth] Generating Google Auth URL. Redirect URI: ${redirectUri}`);

  const options = {
    redirect_uri: redirectUri,
    client_id: clientId,
    access_type: 'offline',
    response_type: 'code',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
  };

  const qs = new URLSearchParams(options);
  res.json({ 
    url: `${rootUrl}?${qs.toString()}`,
    debug: {
      redirect_uri: redirectUri,
      client_id_prefix: clientId ? `${clientId.substring(0, 15)}...` : '...'
    }
  });
});

app.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code as string;
  const error = req.query.error as string;
  const redirectUri = getGoogleRedirectUri(req);

  if (error) {
    console.error('[OAuth] Google returned error:', error);
    return res.status(400).send(`Google Authentication Error: ${error}`);
  }

  if (!code) {
    console.error('[OAuth] No code received from Google');
    return res.status(400).send('No authorization code received from Google');
  }

  console.log(`[OAuth] Exchanging code for tokens. Redirect URI: ${redirectUri}`);
  console.log(`[OAuth] Code length: ${code.length}, starts with: ${code.substring(0, 5)}...`);

  try {
    const clientId = cleanEnvVar(process.env.GOOGLE_CLIENT_ID);
    const clientSecret = cleanEnvVar(process.env.GOOGLE_CLIENT_SECRET);

    if (!clientId || !clientSecret) {
      console.error('[OAuth] Missing Google credentials during token exchange');
      return res.status(500).send('Google OAuth credentials are not configured.');
    }

    const tokenParams = new URLSearchParams({
      code: code.trim(),
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri.trim(),
      grant_type: 'authorization_code',
    });

    console.log(`[OAuth] Sending token exchange request to Google...`);
    const debugParams = new URLSearchParams(tokenParams);
    debugParams.set('client_secret', '********');
    console.log(`[OAuth] Params: ${debugParams.toString()}`);

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[OAuth] Token exchange failed:', errorData);
      return res.status(500).send(`Authentication failed during token exchange: ${JSON.stringify(errorData)}`);
    }

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
      user = { id: result.rows[0].id, name: googleUser.name, email: googleUser.email, role, wallet_balance: 0 };
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

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // 4. Send success message to parent window and close popup
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                token: '${token}', 
                user: ${JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, wallet_balance: user.wallet_balance })} 
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

// Temporary fix for broken seed passwords and delivery zones
const fixData = async () => {
  try {
    const adminHash = '$2b$10$Qd5BrAyShWuOPF60HiXrY.lqOJWcdYq/TNjetNwXvFXLFxxjSwgui';
    const customerHash = '$2b$10$o59j4shzniQKiIfgWKhpIOm4CqrvXc0jysSGHXoFaLCq.xYWrpKQ2';
    
    // Update admin (handle both old and new emails)
    await db.query('UPDATE users SET email = $1, password = $2, role = $3 WHERE id = 1', ['admin@ddff.com', adminHash, 'admin']);
    // Update test customer
    await db.query('UPDATE users SET password = $1 WHERE email = $2', [customerHash, 'customer@test.com']);

    // Fix Machavaram minimum order if it exists and is too high
    await db.query("UPDATE delivery_zones SET min_order_amount = 200 WHERE name = 'Machavaram' AND min_order_amount >= 500");
  } catch (e) {
    console.error('Failed to update broken data:', e);
  }
};

// Auth
const generateUniqueReferralCode = async () => {
  let code = '';
  let isUnique = false;
  while (!isUnique) {
    code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const res = await db.query('SELECT id FROM users WHERE referral_code = $1', [code]);
    if (res.rows.length === 0) isUnique = true;
  }
  return code;
};

const checkAndRewardReferral = async (userId: number, client?: any) => {
  const dbClient = client || db;
  try {
    // Check if user was referred
    const userRes = await dbClient.query('SELECT referred_by FROM users WHERE id = $1', [userId]);
    const referredBy = userRes.rows[0]?.referred_by;
    
    if (!referredBy) return;

    // Check if they already have a referral reward
    const rewardRes = await dbClient.query('SELECT id FROM referral_rewards WHERE referred_id = $1', [userId]);
    if (rewardRes.rows.length > 0) return;

    const rewardAmount = 50;
    
    // Referrer
    await dbClient.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [rewardAmount, referredBy]);
    await dbClient.query('INSERT INTO wallet_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)', 
      [referredBy, rewardAmount, 'credit', 'Referral reward for inviting a friend']);
    
    // Referred user
    await dbClient.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [rewardAmount, userId]);
    await dbClient.query('INSERT INTO wallet_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)', 
      [userId, rewardAmount, 'credit', 'Referral reward for joining via invite']);
    
    // Record reward
    await dbClient.query('INSERT INTO referral_rewards (referrer_id, referred_id, reward_amount, status) VALUES ($1, $2, $3, $4)', 
      [referredBy, userId, rewardAmount, 'credited']);
    
    console.log(`[Referral] Credited ₹${rewardAmount} to users ${referredBy} and ${userId}`);
  } catch (error) {
    console.error('[Referral] Reward processing failed:', error);
  }
};

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, phone, referral_code } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    let referredBy = null;
    if (referral_code) {
      const referrerRes = await db.query('SELECT id FROM users WHERE referral_code = $1', [referral_code]);
      if (referrerRes.rows.length > 0) {
        referredBy = referrerRes.rows[0].id;
      }
    }

    const myReferralCode = await generateUniqueReferralCode();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    const result = await db.query(
      'INSERT INTO users (name, email, password, phone, referral_code, referred_by, verification_token, is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', 
      [name, email, hashedPassword, phone, myReferralCode, referredBy, verificationToken, false]
    );
    const userId = result.rows[0].id;

    // Send verification email
    await sendVerificationEmail(email, verificationToken);

    res.json({ 
      message: 'Registration successful! Please check your email to verify your account.',
      requiresVerification: true,
      verificationToken: process.env.SMTP_USER ? undefined : verificationToken
    });
  } catch (e: any) {
    console.error('Registration error:', e);
    res.status(400).json({ error: 'Email already exists' });
  }
});

app.get('/api/auth/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Verification token is missing' });

  try {
    const userRes = await db.query('SELECT id, email FROM users WHERE verification_token = $1', [token]);
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    const user = userRes.rows[0];
    await db.query('UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1', [user.id]);

    res.json({ message: 'Email verified successfully! You can now login.' });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

app.post('/api/auth/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const userRes = await db.query('SELECT id, is_verified FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];
    if (user.is_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    await db.query('UPDATE users SET verification_token = $1 WHERE id = $2', [verificationToken, user.id]);
    
    await sendVerificationEmail(email, verificationToken);
    res.json({ message: 'Verification email resent successfully!' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const userRes = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = userRes.rows[0];
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (!user.is_verified) {
    return res.status(403).json({ 
      error: 'Email not verified', 
      requiresVerification: true,
      email: user.email,
      verificationToken: process.env.SMTP_USER ? undefined : user.verification_token
    });
  }

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, wallet_balance: user.wallet_balance } });
});

app.get('/api/user/profile', authenticate, async (req: any, res) => {
  const userRes = await db.query('SELECT id, name, email, phone, role, wallet_balance FROM users WHERE id = $1', [req.user.id]);
  res.json(userRes.rows[0]);
});

app.patch('/api/user/profile', authenticate, async (req: any, res) => {
  const { name, phone } = req.body;
  try {
    await db.query('UPDATE users SET name = $1, phone = $2 WHERE id = $3', [name, phone, req.user.id]);
    const userRes = await db.query('SELECT id, name, email, phone, role, wallet_balance FROM users WHERE id = $1', [req.user.id]);
    res.json({ success: true, user: userRes.rows[0] });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.get('/api/admin/farmers', authenticate, isAdmin, async (req, res) => {
  try {
    const farmersRes = await db.query('SELECT * FROM farmers ORDER BY name ASC');
    res.json(farmersRes.rows);
  } catch (error) {
    console.error('Error fetching admin farmers:', error);
    res.status(500).json({ error: 'Failed to fetch farmers' });
  }
});

app.post('/api/admin/farmers', authenticate, isAdmin, async (req, res) => {
  const { name, location, bio, image_url, story, farming_since, speciality, video_url } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  try {
    const result = await db.query(
      'INSERT INTO farmers (name, location, bio, image_url, story, farming_since, speciality, video_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [name, location, bio, image_url, story, farming_since, speciality, video_url]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: 'Failed to add farmer' });
  }
});

app.put('/api/admin/farmers/:id', authenticate, isAdmin, async (req, res) => {
  const { name, location, bio, image_url, story, farming_since, speciality, video_url } = req.body;
  const { id } = req.params;
  
  try {
    await db.query(
      'UPDATE farmers SET name = $1, location = $2, bio = $3, image_url = $4, story = $5, farming_since = $6, speciality = $7, video_url = $8 WHERE id = $9',
      [name, location, bio, image_url, story, farming_since, speciality, video_url, id]
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update farmer' });
  }
});

app.delete('/api/admin/farmers/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Check if farmer has products
    const productsRes = await db.query('SELECT COUNT(*) FROM products WHERE farmer_id = $1', [id]);
    if (parseInt(productsRes.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete farmer with active products. Reassign or delete products first.' });
    }
    
    await db.query('DELETE FROM farmers WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete farmer' });
  }
});

app.post('/api/admin/farmers/:id/delete', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Check if farmer has products
    const productsRes = await db.query('SELECT COUNT(*) FROM products WHERE farmer_id = $1', [id]);
    if (parseInt(productsRes.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete farmer with active products. Reassign or delete products first.' });
    }
    
    await db.query('DELETE FROM farmers WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete farmer' });
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
  try {
    const categoriesRes = await db.query('SELECT * FROM categories ORDER BY id DESC');
    res.json(categoriesRes.rows);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
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
  try {
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
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/flash-sales', async (req, res) => {
  try {
    const query = `
      SELECT p.*, f.name as farmer_name 
      FROM products p 
      LEFT JOIN farmers f ON p.farmer_id = f.id 
      WHERE p.is_active = true 
      AND p.is_deleted = false 
      AND p.sale_price IS NOT NULL 
      AND p.sale_ends_at > NOW()
      ORDER BY p.sale_ends_at ASC
    `;
    const productsRes = await db.query(query);
    res.json(productsRes.rows);
  } catch (error) {
    console.error('Error fetching flash sales:', error);
    res.status(500).json({ error: 'Failed to fetch flash sales' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const productRes = await db.query(`
      SELECT p.*, f.name as farmer_name, f.location as farmer_location, f.image_url as farmer_image
      FROM products p
      LEFT JOIN farmers f ON p.farmer_id = f.id
      WHERE p.id = $1 AND p.is_active = true
    `, [req.params.id]);
    const product = productRes.rows[0];
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    console.error('Error fetching product detail:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Farmers
app.get('/api/farmers/:id', async (req, res) => {
  try {
    const farmerRes = await db.query('SELECT * FROM farmers WHERE id = $1', [req.params.id]);
    const farmer = farmerRes.rows[0];
    if (!farmer) return res.status(404).json({ error: 'Farmer not found' });
    
    const productsRes = await db.query('SELECT * FROM products WHERE farmer_id = $1 AND is_active = true', [req.params.id]);
    const totalProductsRes = await db.query('SELECT COUNT(*) FROM products WHERE farmer_id = $1', [req.params.id]);
    
    res.json({ 
      ...farmer, 
      products: productsRes.rows,
      total_products: parseInt(totalProductsRes.rows[0].count)
    });
  } catch (error) {
    console.error('Error fetching farmer detail:', error);
    res.status(500).json({ error: 'Failed to fetch farmer' });
  }
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

// Stock Alerts
app.post('/api/products/:id/stock-alert', authenticate, async (req: any, res) => {
  const productId = req.params.id;
  const userId = req.user.id;
  try {
    await db.query('INSERT INTO stock_alerts (user_id, product_id) VALUES ($1, $2)', [userId, productId]);
    res.json({ message: 'You will be notified when this product is back in stock' });
  } catch (e: any) {
    if (e.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Already subscribed to alerts for this product' });
    }
    res.status(500).json({ error: 'Failed to subscribe to stock alert' });
  }
});

app.delete('/api/products/:id/stock-alert', authenticate, async (req: any, res) => {
  const productId = req.params.id;
  const userId = req.user.id;
  try {
    await db.query('DELETE FROM stock_alerts WHERE user_id = $1 AND product_id = $2', [userId, productId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to remove stock alert' });
  }
});

app.get('/api/products/:id/stock-alert', authenticate, async (req: any, res) => {
  const productId = req.params.id;
  const userId = req.user.id;
  try {
    const result = await db.query('SELECT id FROM stock_alerts WHERE user_id = $1 AND product_id = $2', [userId, productId]);
    res.json({ hasAlert: result.rows.length > 0 });
  } catch (e) {
    res.status(500).json({ error: 'Failed to check stock alert status' });
  }
});

// Order Tracking
app.get('/api/orders/:id/tracking', authenticate, async (req: any, res) => {
  let query = 'SELECT status, created_at, city FROM orders WHERE id = $1';
  let params = [req.params.id];
  
  if (req.user.role !== 'admin') {
    query += ' AND user_id = $2';
    params.push(req.user.id);
  }

  const orderRes = await db.query(query, params);
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

// Referral
app.get('/api/referrals/my-code', authenticate, async (req: any, res) => {
  try {
    const userRes = await db.query('SELECT referral_code FROM users WHERE id = $1', [req.user.id]);
    const referralCode = userRes.rows[0]?.referral_code;
    
    const countRes = await db.query('SELECT COUNT(*) FROM referral_rewards WHERE referrer_id = $1 AND status = $2', [req.user.id, 'credited']);
    
    res.json({ 
      referral_code: referralCode,
      successful_referrals: parseInt(countRes.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referral info' });
  }
});

// Wallet Transactions
app.get('/api/wallet/transactions', authenticate, async (req: any, res) => {
  try {
    const result = await db.query('SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wallet transactions' });
  }
});

// Orders
app.post('/api/orders', authenticate, async (req: any, res) => {
  const { 
    items, total_amount, discount_amount, delivery_fee, final_amount, 
    payment_method, house_no, street, landmark, address, city, district, state, pincode, phone,
    promo_code, delivery_slot, wallet_amount_used
  } = req.body;
  const userId = req.user.id;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    // Check wallet balance if used
    if (wallet_amount_used > 0) {
      const userRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
      const currentBalance = Number(userRes.rows[0]?.wallet_balance || 0);
      if (currentBalance < wallet_amount_used) {
        throw new Error('Insufficient wallet balance');
      }
      
      // Deduct from wallet
      await client.query('UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2', [wallet_amount_used, userId]);
      
      // Create wallet transaction
      await client.query(`
        INSERT INTO wallet_transactions (user_id, amount, type, description)
        VALUES ($1, $2, $3, $4)
      `, [userId, wallet_amount_used, 'debit', `Payment for order`]);
    }

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
        user_id, total_amount, discount_amount, delivery_fee, final_amount, promo_code,
        payment_method, house_no, street, landmark, address, city, district, state, pincode, phone,
        payment_status, delivery_slot, wallet_amount_used
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id
    `, [
      userId, total_amount, discount_amount, delivery_fee, final_amount, promo_code,
      payment_method, house_no, street, landmark, address, city, district, state, pincode, phone,
      payment_method === 'online' ? 'pending' : 'pending', delivery_slot, wallet_amount_used || 0
    ]);

    const orderId = result.rows[0].id;
    
    // Validate delivery zone on backend
    const zoneRes = await client.query('SELECT * FROM delivery_zones WHERE pincode = $1 AND is_active = true', [pincode]);
    const zone = zoneRes.rows[0];
    if (!zone) {
      throw new Error(`Sorry, we do not deliver to pincode ${pincode} yet.`);
    }
    
    const minOrder = Number(zone.min_order_amount);
    const currentTotal = Number(total_amount);
    
    if (currentTotal < minOrder) {
      throw new Error(`Minimum order for ${zone.name} is ₹${minOrder}. Current total: ₹${currentTotal}`);
    }

    const notifiedProducts = new Set<number>();
    for (const item of items) {
      await client.query('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)', [orderId, item.product_id, item.quantity, item.price]);
      await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);

      // Admin Low Stock Alert
      if (!notifiedProducts.has(item.product_id)) {
        try {
          const stockRes = await client.query('SELECT stock, name FROM products WHERE id = $1', [item.product_id]);
          const { stock, name } = stockRes.rows[0];
          const adminPhone = process.env.ADMIN_PHONE;
          
          if (adminPhone) {
            if (stock === 0) {
              await sendWhatsAppNotification(adminPhone, `🚨 OUT OF STOCK: ${name} has 0 units remaining! Customers cannot order this product. Restock immediately. — Grama Ruchulu`);
              notifiedProducts.add(item.product_id);
            } else if (stock >= 1 && stock <= 5) {
              await sendWhatsAppNotification(adminPhone, `⚠️ Low Stock Alert!\n\nProduct: ${name}\nRemaining: ${stock} units\n\nPlease restock soon to avoid losing orders. — Grama Ruchulu`);
              notifiedProducts.add(item.product_id);
            }
          }
        } catch (err) {
          console.error('Failed to send admin low stock notification:', err);
        }
      }
    }

    if (promo_code) {
      await client.query('UPDATE promo_codes SET used_count = used_count + 1 WHERE code = $1', [promo_code]);
    }

    await client.query('COMMIT');

    // Process referral reward if this is the first order (COD)
    if (payment_method === 'cod') {
      await checkAndRewardReferral(userId, client);
    }

    // Send WhatsApp notification for new order
    try {
      const userRes = await client.query('SELECT name FROM users WHERE id = $1', [userId]);
      const userName = userRes.rows[0]?.name || 'Customer';
      const message = `Hi ${userName}, thank you for your order #${orderId} from Grama Ruchulu! We are processing it now. 🌾`;
      await sendWhatsAppNotification(phone, message);
    } catch (notifyError) {
      console.error('Failed to send initial order notification:', notifyError);
    }

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
    await db.query('UPDATE orders SET payment_status = $1, status = $2, razorpay_payment_id = $3 WHERE id = $4', ['paid', 'confirmed', razorpay_payment_id, order_id]);
    
    // Process referral reward after successful online payment
    const orderRes = await db.query('SELECT user_id FROM orders WHERE id = $1', [order_id]);
    if (orderRes.rows[0]) {
      await checkAndRewardReferral(orderRes.rows[0].user_id);
    }

    // Notify user of payment success and order confirmation
    await notifyOrderStatusUpdate(Number(order_id), 'confirmed');
    
    res.json({ success: true, message: 'Payment verified successfully' });
  } else {
    res.status(400).json({ success: false, message: 'Invalid signature' });
  }
});

app.get('/api/orders/:id/invoice', async (req: any, res) => {
  const orderId = req.params.id;
  let token = req.headers.authorization?.split(' ')[1];
  
  if (!token && req.query.token) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;
    const userRole = decoded.role;

    // Fetch order details
    const orderRes = await db.query(`
      SELECT o.*, u.name as user_name, u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [orderId]);

    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderRes.rows[0];

    // Check if user is authorized (owner or admin)
    if (order.user_id !== userId && userRole !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Fetch order items
    const itemsRes = await db.query(`
      SELECT oi.*, p.name as product_name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [orderId]);

    const items = itemsRes.rows;

    // Generate PDF
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=GR-Invoice-${orderId}.pdf`);
    
    doc.pipe(res);

    // Header
    doc.fillColor('#3B2A1A').fontSize(25).text('GRAMA RUCHULU 🌾', { align: 'center' });
    doc.fontSize(10).text('Fresh from the Village to Your Kitchen', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Invoice Details
    doc.fillColor('#000000').fontSize(20).text(`Invoice #GR-${orderId}`, { align: 'left' });
    doc.fontSize(10).text(`Order Date: ${new Date(order.created_at).toLocaleDateString()}`);
    doc.text(`Payment Method: ${order.payment_method}`);
    doc.moveDown();

    // Delivery Address
    doc.fontSize(12).text('Delivery Address:', { underline: true });
    doc.fontSize(10).text(`${order.user_name}`);
    doc.text(`${order.house_no}, ${order.street}`);
    if (order.landmark) doc.text(`Landmark: ${order.landmark}`);
    doc.text(`${order.city}, ${order.district}`);
    doc.text(`${order.state} - ${order.pincode}`);
    doc.text(`Phone: ${order.phone}`);
    doc.moveDown();

    // Itemized Table
    const tableTop = doc.y;
    const itemX = 50;
    const qtyX = 300;
    const priceX = 380;
    const totalX = 480;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Item', itemX, tableTop);
    doc.text('Qty', qtyX, tableTop);
    doc.text('Unit Price', priceX, tableTop);
    doc.text('Total', totalX, tableTop);
    
    doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
    doc.font('Helvetica');

    let currentY = tableTop + 25;
    items.forEach((item, index) => {
      if (index % 2 === 0) {
        doc.fillColor('#f9f9f9').rect(50, currentY - 5, 500, 20).fill();
      }
      doc.fillColor('#000000');
      doc.text(item.product_name, itemX, currentY);
      doc.text(item.quantity.toString(), qtyX, currentY);
      doc.text(`₹${item.price}`, priceX, currentY);
      doc.text(`₹${(item.quantity * item.price).toFixed(2)}`, totalX, currentY);
      currentY += 20;
    });

    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
    currentY += 10;

    // Totals
    const totalsX = 380;
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`₹${order.total_amount}`, totalX, currentY);
    currentY += 15;

    doc.text('Delivery Fee:', totalsX, currentY);
    doc.text(`₹${order.delivery_fee}`, totalX, currentY);
    currentY += 15;

    if (Number(order.discount_amount) > 0) {
      doc.fillColor('#228B22').text('Promo Discount:', totalsX, currentY);
      doc.text(`-₹${order.discount_amount}`, totalX, currentY);
      doc.fillColor('#000000');
      currentY += 15;
    }

    if (Number(order.wallet_amount_used) > 0) {
      doc.text('Wallet Used:', totalsX, currentY);
      doc.text(`-₹${order.wallet_amount_used}`, totalX, currentY);
      currentY += 15;
    }

    doc.font('Helvetica-Bold').fontSize(14).text('Final Total:', totalsX, currentY);
    doc.text(`₹${order.final_amount}`, totalX, currentY);
    doc.moveDown();

    // Footer
    doc.font('Helvetica').fontSize(10).text('Thank you for supporting local farmers of Andhra Pradesh 🙏', 50, 700, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Invoice generation error:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
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
    // Validate delivery zone
    const zoneRes = await db.query('SELECT * FROM delivery_zones WHERE pincode = $1 AND is_active = true', [pincode]);
    if (zoneRes.rows.length === 0) {
      return res.status(400).json({ error: 'Sorry, we do not deliver to this pincode yet.' });
    }

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
    // Validate delivery zone
    const zoneRes = await db.query('SELECT * FROM delivery_zones WHERE pincode = $1 AND is_active = true', [pincode]);
    if (zoneRes.rows.length === 0) {
      return res.status(400).json({ error: 'Sorry, we do not deliver to this pincode yet.' });
    }

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
  let query = 'SELECT razorpay_payment_id, refund_status, refund_method, refund_amount, refunded_at, refund_id, * FROM orders WHERE id = $1';
  let params = [req.params.id];
  
  if (req.user.role !== 'admin') {
    query += ' AND user_id = $2';
    params.push(req.user.id);
  }

  const orderRes = await db.query(query, params);
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

app.patch('/api/orders/:id/cancel', authenticate, async (req: any, res) => {
  const orderId = req.params.id;
  const userId = req.user.id;
  const { cancellation_reason, refund_method } = req.body;

  const client = await db.connect();
  try {
    // 1. Fetch the order and verify it belongs to the current user
    const orderRes = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );
    const order = orderRes.rows[0];

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized to cancel this order' });
    }

    // 2. If status is out_for_delivery, delivered, or cancelled — return 400
    if (['out_for_delivery', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: 'This order cannot be cancelled at this stage' });
    }

    // 3. If order was placed more than 30 minutes ago — return 400
    const createdAt = new Date(order.created_at);
    const now = new Date();
    const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);

    if (diffMinutes > 30 && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'Cancellation window of 30 minutes has passed' });
    }

    // 4. If payment_method === 'online' and no refund_method provided — return 400
    if (order.payment_method === 'online' && !refund_method) {
      return res.status(400).json({ error: 'Please select a refund method' });
    }

    await client.query('BEGIN');

    // Update order status to cancelled and save cancellation_reason
    await client.query(
      'UPDATE orders SET status = $1, cancellation_reason = $2 WHERE id = $3',
      ['cancelled', cancellation_reason || 'Customer requested cancellation', orderId]
    );

    // Restore stock for every item
    const itemsRes = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [orderId]);
    for (const item of itemsRes.rows) {
      await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    let whatsappMessage = '';
    let refund_status = null;
    let final_refund_method = null;

    // Always refund wallet_amount_used if any
    if (order.wallet_amount_used > 0) {
      await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [order.wallet_amount_used, order.user_id]);
      await client.query('INSERT INTO wallet_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)', [
        order.user_id, order.wallet_amount_used, 'credit', `Refund for wallet usage in cancelled Order #${orderId}`
      ]);
    }

    if (order.payment_method === 'cod') {
      whatsappMessage = `❌ Your order #${orderId} from Grama Ruchulu has been cancelled successfully. ${order.wallet_amount_used > 0 ? `₹${order.wallet_amount_used} has been refunded to your wallet.` : 'No payment was collected.'} We hope to serve you again soon! 🌾`;
    } else if (order.payment_method === 'online') {
      if (refund_method === 'wallet') {
        // Wallet refund for the final_amount
        await client.query('UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2', [order.final_amount, order.user_id]);
        await client.query('INSERT INTO wallet_transactions (user_id, amount, type, description) VALUES ($1, $2, $3, $4)', [
          order.user_id, order.final_amount, 'credit', `Refund for cancelled Order #${orderId}`
        ]);
        await client.query(`
          UPDATE orders 
          SET refund_method = 'wallet', refund_status = 'processed', refund_amount = $1, refunded_at = NOW() 
          WHERE id = $2
        `, [Number(order.final_amount) + Number(order.wallet_amount_used), orderId]);
        await client.query(`
          INSERT INTO refunds (order_id, user_id, amount, method, status) 
          VALUES ($1, $2, $3, $4, $5)
        `, [orderId, order.user_id, Number(order.final_amount) + Number(order.wallet_amount_used), 'wallet', 'processed']);
        
        refund_status = 'processed';
        final_refund_method = 'wallet';
        whatsappMessage = `✅ Order #${orderId} cancelled. ₹${Number(order.final_amount) + Number(order.wallet_amount_used)} has been instantly credited to your Grama Ruchulu wallet! 👛 Use it on your next order. Thank you for your patience! 🌾`;
      } else if (refund_method === 'bank') {
        // Bank refund via Razorpay
        if (!order.razorpay_payment_id) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Payment ID not found. Please contact support for manual refund.', support_message: true });
        }

        try {
          const refund = await razorpay.payments.refund(order.razorpay_payment_id, {
            amount: Math.round(order.final_amount * 100),
            notes: { reason: cancellation_reason, order_id: orderId.toString() }
          });

          await client.query(`
            UPDATE orders 
            SET refund_method = 'bank', refund_status = 'pending', refund_id = $1, refund_amount = $2, refunded_at = NOW() 
            WHERE id = $3
          `, [refund.id, order.final_amount, orderId]);
          
          await client.query(`
            INSERT INTO refunds (order_id, user_id, amount, method, razorpay_refund_id, status) 
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [orderId, order.user_id, order.final_amount, 'bank', refund.id, 'pending']);

          refund_status = 'pending';
          final_refund_method = 'bank';
          whatsappMessage = `✅ Order #${orderId} cancelled. Your refund of ₹${order.final_amount} has been initiated to your original payment method. It will reflect in 5–7 business days.\n\nRefund ID: ${refund.id}\n\nKeep this for your records. 🙏`;
        } catch (razorpayError: any) {
          console.error('Razorpay refund error:', razorpayError);
          await client.query('ROLLBACK');
          return res.status(500).json({ 
            error: 'We could not process your bank refund automatically. Please contact support with your Order ID and we will refund you manually within 24 hours.',
            support_message: true
          });
        }
      }
    }

    await client.query('COMMIT');

    // Send WhatsApp notification outside transaction
    if (order.phone && whatsappMessage) {
      try {
        await sendWhatsAppNotification(order.phone, whatsappMessage);
      } catch (wsError) {
        console.error('WhatsApp notification error:', wsError);
      }
    }

    res.json({ 
      success: true, 
      refund_method: final_refund_method, 
      refund_status, 
      message: 'Order cancelled successfully' 
    });

  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Order cancellation error:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

// Admin Routes
app.post('/api/admin/products', authenticate, isAdmin, async (req, res) => {
  console.log('POST /api/admin/products', req.body);
  const { category_id, name, description, price, original_price, unit, stock, origin, image_url, is_featured, is_best_seller, sale_price, sale_ends_at } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO products (category_id, name, description, price, original_price, unit, stock, origin, image_url, is_featured, is_best_seller, sale_price, sale_ends_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `, [
      category_id, name, description, price, original_price, unit, stock, origin, image_url, 
      is_featured ? true : false, 
      is_best_seller ? true : false,
      sale_price,
      sale_ends_at
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
  const { category_id, name, description, price, original_price, unit, stock, origin, image_url, is_featured, is_best_seller, sale_price, sale_ends_at } = req.body;
  
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // Get old stock
    const oldProductRes = await client.query('SELECT stock, name FROM products WHERE id = $1', [productId]);
    const oldProduct = oldProductRes.rows[0];
    
    const result = await client.query(`
      UPDATE products 
      SET category_id = $1, name = $2, description = $3, price = $4, original_price = $5, unit = $6, stock = $7, origin = $8, image_url = $9, is_featured = $10, is_best_seller = $11, sale_price = $12, sale_ends_at = $13
      WHERE id = $14
    `, [
      category_id, name, description, price, original_price, unit, stock, origin, image_url, 
      is_featured ? true : false, 
      is_best_seller ? true : false, 
      sale_price,
      sale_ends_at,
      productId
    ]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if stock went from 0 to > 0
    if (oldProduct && oldProduct.stock === 0 && stock > 0) {
      const alertsRes = await client.query(`
        SELECT u.phone, u.id as user_id 
        FROM stock_alerts sa
        JOIN users u ON sa.user_id = u.id
        WHERE sa.product_id = $1
      `, [productId]);
      
      for (const alert of alertsRes.rows) {
        if (alert.phone) {
          const message = `🌾 Good news! ${name} is back in stock on Grama Ruchulu. Order now before it sells out!`;
          await sendWhatsAppNotification(alert.phone, message);
        }
      }
      
      // Delete alerts
      await client.query('DELETE FROM stock_alerts WHERE product_id = $1', [productId]);
    }

    await client.query('COMMIT');
    res.json({ success: true });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Error updating product:', e);
    res.status(500).json({ error: 'Failed to update product' });
  } finally {
    client.release();
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
      // Get old stock
      const oldProductRes = await client.query('SELECT stock, name FROM products WHERE id = $1', [id]);
      const oldProduct = oldProductRes.rows[0];
      
      await client.query('UPDATE products SET stock = $1 WHERE id = $2', [stock, id]);
      
      // Check if stock went from 0 to > 0
      if (oldProduct && oldProduct.stock === 0 && stock > 0) {
        const alertsRes = await client.query(`
          SELECT u.phone, u.id as user_id 
          FROM stock_alerts sa
          JOIN users u ON sa.user_id = u.id
          WHERE sa.product_id = $1
        `, [id]);
        
        for (const alert of alertsRes.rows) {
          if (alert.phone) {
            const message = `🌾 Good news! ${oldProduct.name} is back in stock on Grama Ruchulu. Order now before it sells out!`;
            await sendWhatsAppNotification(alert.phone, message);
          }
        }
        
        // Delete alerts
        await client.query('DELETE FROM stock_alerts WHERE product_id = $1', [id]);
      }
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
  const farmerCountRes = await db.query('SELECT COUNT(*) as count FROM farmers');
  const lowStockRes = await db.query('SELECT COUNT(*) as count FROM products WHERE stock < 10');
  const deliveryBoyCountRes = await db.query("SELECT COUNT(*) as count FROM users WHERE role = 'delivery_boy'");
  
  res.json({
    totalSales: parseFloat(totalSalesRes.rows[0].total) || 0,
    orderCount: parseInt(orderCountRes.rows[0].count),
    userCount: parseInt(userCountRes.rows[0].count),
    farmerCount: parseInt(farmerCountRes.rows[0].count),
    lowStock: parseInt(lowStockRes.rows[0].count),
    deliveryBoyCount: parseInt(deliveryBoyCountRes.rows[0].count)
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
  const deliveryBoysRes = await db.query("SELECT id, name, email, phone FROM users WHERE role = 'delivery_boy' ORDER BY id DESC");
  res.json(deliveryBoysRes.rows);
});

app.post('/api/admin/delivery-boys', authenticate, isAdmin, async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, Email and Password are required' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  try {
    const result = await db.query(
      "INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, $4, 'delivery_boy') RETURNING id",
      [name, email, hashedPassword, phone]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (e: any) {
    console.error('Error adding delivery boy:', e);
    res.status(400).json({ error: 'Email already exists or invalid data' });
  }
});

app.patch('/api/admin/delivery-boys/:id', authenticate, isAdmin, async (req, res) => {
  const { name, email, phone } = req.body;
  const { id } = req.params;
  
  try {
    await db.query(
      'UPDATE users SET name = $1, email = $2, phone = $3 WHERE id = $4 AND role = $5',
      [name, email, phone, id, 'delivery_boy']
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to update delivery staff' });
  }
});

app.delete('/api/admin/delivery-boys/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Check if delivery boy has active orders
    const ordersRes = await db.query("SELECT COUNT(*) FROM orders WHERE delivery_boy_id = $1 AND status NOT IN ('delivered', 'cancelled')", [id]);
    if (parseInt(ordersRes.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete staff with active deliveries. Reassign orders first.' });
    }
    
    await db.query("DELETE FROM users WHERE id = $1 AND role = 'delivery_boy'", [id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete delivery staff' });
  }
});

app.patch('/api/admin/orders/:id/assign', authenticate, isAdmin, async (req, res) => {
  const { delivery_boy_id } = req.body;
  const orderId = req.params.id;
  
  try {
    await db.query('UPDATE orders SET delivery_boy_id = $1, status = $2 WHERE id = $3', [delivery_boy_id, 'confirmed', orderId]);
    
    // Notify user of order confirmation/assignment
    await notifyOrderStatusUpdate(Number(orderId), 'confirmed');
    
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to assign delivery boy' });
  }
});

// Category Management
app.post('/api/admin/categories', authenticate, isAdmin, async (req, res) => {
  const { name, emoji } = req.body;
  console.log(`[Admin] Attempting to add category: "${name}" with emoji: ${emoji}`);
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  console.log(`[Admin] Generated slug: "${slug}"`);
  
  try {
    const result = await db.query('INSERT INTO categories (name, slug, emoji) VALUES ($1, $2, $3) RETURNING id', [name.trim(), slug, emoji || '📦']);
    console.log(`[Admin] Category added successfully with ID: ${result.rows[0].id}`);
    res.json({ success: true, id: result.rows[0].id });
  } catch (e: any) {
    console.error('[Admin] Error adding category:', e.message);
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

app.patch('/api/admin/categories/:id', authenticate, isAdmin, async (req, res) => {
  const { name, emoji } = req.body;
  const categoryId = parseInt(req.params.id);
  if (isNaN(categoryId)) return res.status(400).json({ error: 'Invalid category ID' });

  try {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (name) {
      updates.push(`name = $${paramIdx++}`);
      params.push(name);
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      updates.push(`slug = $${paramIdx++}`);
      params.push(slug);
    }
    if (emoji) {
      updates.push(`emoji = $${paramIdx++}`);
      params.push(emoji);
    }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(categoryId);
    const query = `UPDATE categories SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`;
    const result = await db.query(query, params);

    if (result.rowCount === 0) return res.status(404).json({ error: 'Category not found' });
    res.json({ success: true, category: result.rows[0] });
  } catch (e) {
    console.error('Update category error:', e);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.patch('/api/admin/orders/:id/status', authenticate, isAdmin, async (req, res) => {
  const { status } = req.body;
  const orderId = req.params.id;
  
  await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, orderId]);
  
  // Notify user of status update
  await notifyOrderStatusUpdate(Number(orderId), status);
  
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
  
  // Notify user of status update
  await notifyOrderStatusUpdate(Number(orderId), status);
  
  res.json({ success: true });
});

app.post('/api/delivery/orders/:id/proof', authenticate, isDeliveryBoy, upload.single('proof'), async (req: any, res) => {
  const orderId = req.params.id;
  const deliveryBoyId = req.user.id;

  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  try {
    // Verify the order is assigned to this delivery boy (unless admin)
    if (req.user.role !== 'admin') {
      const orderRes = await db.query('SELECT delivery_boy_id FROM orders WHERE id = $1', [orderId]);
      const order = orderRes.rows[0];
      if (!order || order.delivery_boy_id !== deliveryBoyId) {
        return res.status(403).json({ error: 'Unauthorized to update this order' });
      }
    }

    const proofPath = `/uploads/proofs/${req.file.filename}`;
    await db.query('UPDATE orders SET status = $1, proof_of_delivery_image = $2 WHERE id = $3', ['delivered', proofPath, orderId]);
    
    // Notify user of delivery
    await notifyOrderStatusUpdate(Number(orderId), 'delivered');
    
    res.json({ success: true, proof_image: proofPath });
  } catch (e) {
    console.error('Error uploading proof:', e);
    res.status(500).json({ error: 'Failed to upload proof of delivery' });
  }
});

// Promo Codes
app.post('/api/promo/validate', async (req, res) => {
  const { code, amount, items } = req.body;
  const promoRes = await db.query('SELECT * FROM promo_codes WHERE code = $1 AND is_active = true', [code]);
  const promo = promoRes.rows[0];
  if (!promo) return res.status(400).json({ error: 'Invalid promo code' });
  
  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return res.status(400).json({ error: "❌ This promo code has reached its usage limit." });
  }

  if (amount < promo.min_order) return res.status(400).json({ error: `Minimum order ₹${promo.min_order} required` });
  
  // Product-specific promo code check
  if (promo.product_id) {
    const hasProduct = items && Array.isArray(items) && items.some((item: any) => item.product_id === promo.product_id);
    if (!hasProduct) {
      const productRes = await db.query('SELECT name FROM products WHERE id = $1', [promo.product_id]);
      const productName = productRes.rows[0]?.name || 'the required product';
      return res.status(400).json({ error: `❌ This code only applies to ${productName}. Add it to your cart to use this offer.` });
    }
  }

  let discount_amount = 0;
  if (promo.discount_percent) {
    discount_amount = (amount * promo.discount_percent) / 100;
  } else if (promo.discount_amount) {
    discount_amount = Number(promo.discount_amount);
  }
  
  res.json({ ...promo, discount_amount });
});

// Delivery Zones
app.get('/api/delivery-zones', async (req, res) => {
  try {
    const zonesRes = await db.query('SELECT * FROM delivery_zones WHERE is_active = true ORDER BY name ASC');
    res.json(zonesRes.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch delivery zones' });
  }
});

app.get('/api/admin/delivery-zones', authenticate, isAdmin, async (req, res) => {
  try {
    const zonesRes = await db.query('SELECT * FROM delivery_zones ORDER BY name ASC');
    res.json(zonesRes.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch delivery zones' });
  }
});

app.post('/api/admin/delivery-zones', authenticate, isAdmin, async (req, res) => {
  const { name, pincode, min_order_amount, delivery_fee } = req.body;
  if (!name || !pincode) return res.status(400).json({ error: 'Name and Pincode are required' });
  
  try {
    const result = await db.query(
      'INSERT INTO delivery_zones (name, pincode, min_order_amount, delivery_fee) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, pincode, min_order_amount || 0, delivery_fee || 0]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add delivery zone' });
  }
});

app.patch('/api/admin/delivery-zones/:id', authenticate, isAdmin, async (req, res) => {
  const { name, pincode, min_order_amount, delivery_fee, is_active } = req.body;
  const { id } = req.params;
  
  try {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (name !== undefined) { updates.push(`name = $${paramIdx++}`); params.push(name); }
    if (pincode !== undefined) { updates.push(`pincode = $${paramIdx++}`); params.push(pincode); }
    if (min_order_amount !== undefined) { updates.push(`min_order_amount = $${paramIdx++}`); params.push(min_order_amount); }
    if (delivery_fee !== undefined) { updates.push(`delivery_fee = $${paramIdx++}`); params.push(delivery_fee); }
    if (is_active !== undefined) { updates.push(`is_active = $${paramIdx++}`); params.push(is_active); }

    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    params.push(id);
    const query = `UPDATE delivery_zones SET ${updates.join(', ')} WHERE id = $${paramIdx} RETURNING *`;
    const result = await db.query(query, params);

    if (result.rowCount === 0) return res.status(404).json({ error: 'Delivery zone not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update delivery zone' });
  }
});

app.delete('/api/admin/delivery-zones/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await db.query('DELETE FROM delivery_zones WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Delivery zone not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete delivery zone' });
  }
});

// Public: Active Promo Codes
app.get('/api/promo-codes/active', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT pc.*, p.name as product_name, p.image_url 
      FROM promo_codes pc 
      LEFT JOIN products p ON pc.product_id = p.id 
      WHERE pc.is_active = true 
      AND (pc.expiry_date IS NULL OR pc.expiry_date > NOW()) 
      AND (pc.max_uses IS NULL OR pc.used_count < pc.max_uses)
      ORDER BY pc.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching active promo codes:', error);
    res.status(500).json({ error: 'Failed to fetch active promo codes' });
  }
});

// Admin: Manage Promo Codes
app.get('/api/admin/promo-codes', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT pc.*, p.name as product_name 
      FROM promo_codes pc 
      LEFT JOIN products p ON pc.product_id = p.id 
      ORDER BY pc.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch promo codes' });
  }
});

app.post('/api/admin/promo-codes', authenticate, isAdmin, async (req, res) => {
  const { code, discount_percent, discount_amount, min_order, expiry_date, max_uses, is_active, product_id } = req.body;
  try {
    const result = await db.query(
      'INSERT INTO promo_codes (code, discount_percent, discount_amount, min_order, expiry_date, max_uses, is_active, product_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [code, discount_percent, discount_amount, min_order, expiry_date, max_uses, is_active, product_id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating promo code:', error);
    res.status(500).json({ error: 'Failed to create promo code' });
  }
});

app.put('/api/admin/promo-codes/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { code, discount_percent, discount_amount, min_order, expiry_date, max_uses, is_active, product_id } = req.body;
  try {
    const result = await db.query(
      'UPDATE promo_codes SET code = $1, discount_percent = $2, discount_amount = $3, min_order = $4, expiry_date = $5, max_uses = $6, is_active = $7, product_id = $8 WHERE id = $9 RETURNING *',
      [code, discount_percent, discount_amount, min_order, expiry_date, max_uses, is_active, product_id || null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Promo code not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating promo code:', error);
    res.status(500).json({ error: 'Failed to update promo code' });
  }
});

app.delete('/api/admin/promo-codes/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM promo_codes WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Promo code not found' });
    res.json({ message: 'Promo code deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete promo code' });
  }
});

app.patch('/api/admin/promo-codes/:id', authenticate, isAdmin, async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    const result = await db.query(
      'UPDATE promo_codes SET is_active = $1 WHERE id = $2 RETURNING *',
      [is_active, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Promo code not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle promo code status' });
  }
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
  console.log('[Server] Starting initialization...');
  
  process.on('uncaughtException', (err) => {
    console.error('[Server] Uncaught Exception:', err);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Server] Unhandled Rejection at:', promise, 'reason:', reason);
  });

  try {
    // Initialize database (don't block server startup if it takes too long)
    console.log('[DB] Starting database initialization...');
    initDb().then(() => {
      console.log('[DB] Database initialization finished');
      return fixData();
    }).then(() => {
      console.log('[Auth] Data verified');
    }).catch(dbError => {
      console.error('[DB] Critical error during initialization:', dbError);
    });
  } catch (startupError) {
    console.error('[Server] Error during startup sequence:', startupError);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Vite] Starting development server...');
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[Vite] Middleware integrated');
    } catch (viteError) {
      console.error('[Vite] Failed to start Vite server:', viteError);
    }
  } else {
    console.log('[Server] Serving production build...');
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

startServer();
