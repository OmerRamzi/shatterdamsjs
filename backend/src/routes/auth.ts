import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { config } from '../config';

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  JWT_SECRET: string;
  RESEND_API_KEY?: string;
};

const authRoutes = new Hono<{ Bindings: Bindings }>();

authRoutes.post('/login', async (c) => {
  const body = await c.req.json();
  const { email, password } = body;

  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  // Initialize Supabase client
  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  // Fetch user
  const { data: userList, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1);

  if (userError || !userList || userList.length === 0) {
    return c.json({ error: 'Invalid credentials.' }, 401);
  }
  
  const user = userList[0];

  // Check password
  const passwordsMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordsMatch) {
    return c.json({ error: 'Invalid credentials.' }, 401);
  }

  // Fetch role
  const { data: roleList } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .limit(1);

  const role = roleList && roleList.length > 0 ? roleList[0].role : 'client';

  // Create JWT Payload
  const payload = {
    sub: user.id.toString(),
    email: user.email,
    name: user.display_name,
    role: role,
    tenantId: user.tenant_id,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 1 week expiration
  };

  const token = await sign(payload, c.env.JWT_SECRET);

  // Set HTTP-only cookie
  setCookie(c, 'auth_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });

  return c.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      name: user.display_name,
      role: role,
      tenantId: user.tenant_id
    }
  });
});

authRoutes.post('/logout', (c) => {
  deleteCookie(c, 'auth_token');
  return c.json({ message: 'Logout successful' });
});

authRoutes.get('/me', async (c) => {
  const token = getCookie(c, 'auth_token');
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const decodedPayload = await verify(token, c.env.JWT_SECRET, "HS256");
    return c.json({ user: decodedPayload });
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

authRoutes.post('/forgot-password', async (c) => {
  const { email } = await c.req.json();
  if (!email) {
    return c.json({ error: 'Email is required' }, 400);
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  // Fetch user
  const { data: userList, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1);

  if (userError || !userList || userList.length === 0) {
    // Return 200 even if not found to prevent email enumeration
    return c.json({ message: 'If an account with that email exists, we sent a password reset link.' });
  }

  const user = userList[0];

  // Fetch role to determine subdomain
  const { data: roleList } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .limit(1);

  const role = roleList && roleList.length > 0 ? roleList[0].role : 'client';
  
  let subdomain = 'team';
  if (role === 'administrator' || role === 'admin' || role === 'superadmin') {
    subdomain = 'admin';
  } else if (role === 'client') {
    subdomain = 'client';
  }

  const token = crypto.randomUUID();
  // 1 hour expiration
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { error: updateError } = await supabase
    .from('users')
    .update({
      reset_token: token,
      reset_token_expires: expires
    })
    .eq('id', user.id);

  if (updateError) {
    return c.json({ error: 'Failed to generate reset token' }, 500);
  }

  // Determine host. For local dev, use localhost:5173. For prod, use real domain.
  // We can use the request url to guess, or a config.
  let resetLink = `http://${subdomain}.localhost:5173/reset-password?token=${token}`;
  
  // Try to use a more generic approach based on request headers if available, or just hardcode the production domain structure for now.
  const origin = c.req.header('origin') || 'http://localhost:5173';
  if (origin.includes('meetshatter.com')) {
    resetLink = `https://${subdomain}.meetshatter.com/reset-password?token=${token}`;
  } else {
    // local development
    resetLink = `http://localhost:5173/reset-password?token=${token}`; 
    // note: local dev usually uses the same port, so we might just give localhost:5173 for all
  }

  // Send email via Resend
  const resendApiKey = c.env.RESEND_API_KEY || config.RESEND_API_KEY;
  if (resendApiKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Shatter DAMS <noreply@mailer.meetshatter.com>',
          to: user.email,
          subject: 'Reset your password',
          html: `<p>You requested a password reset.</p><p>Click the link below to reset your password:</p><p><a href="${resetLink}">Reset Password</a></p><p>This link will expire in 1 hour.</p>`
        })
      });
    } catch (err) {
      console.error('Failed to send email', err);
      // We don't fail the request if email fails, but in a real app we might want to
    }
  }

  return c.json({ message: 'If an account with that email exists, we sent a password reset link.' });
});

authRoutes.post('/reset-password', async (c) => {
  const { token, new_password } = await c.req.json();
  if (!token || !new_password) {
    return c.json({ error: 'Token and new password are required' }, 400);
  }

  const supabase = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_ANON_KEY);

  // Find user by token
  const { data: userList, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('reset_token', token)
    .limit(1);

  if (userError || !userList || userList.length === 0) {
    return c.json({ error: 'Invalid or expired token' }, 400);
  }

  const user = userList[0];

  // Check expiration
  if (!user.reset_token_expires || new Date(user.reset_token_expires) < new Date()) {
    return c.json({ error: 'Invalid or expired token' }, 400);
  }

  // Hash new password
  const password_hash = await bcrypt.hash(new_password, 10);

  // Update user
  const { error: updateError } = await supabase
    .from('users')
    .update({
      password_hash,
      reset_token: null,
      reset_token_expires: null
    })
    .eq('id', user.id);

  if (updateError) {
    return c.json({ error: 'Failed to reset password' }, 500);
  }

  return c.json({ message: 'Password has been successfully reset' });
});

export default authRoutes;
