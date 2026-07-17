import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { getDb } from '../db/client';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { config } from '../config';

type Bindings = {
  DATABASE_URL: string;
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

  const db = getDb(c.env.DATABASE_URL);

  try {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);

    if (!user) {
      return c.json({ error: 'Invalid credentials.' }, 401);
    }
    
    const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordsMatch) {
      return c.json({ error: 'Invalid credentials.' }, 401);
    }

    const [roleRec] = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, user.id)).limit(1);
    const role = roleRec?.role || 'client';

    const payload = {
      sub: user.id.toString(),
      email: user.email,
      name: user.displayName,
      role: role,
      tenantId: user.tenantId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 1 week
    };

    const token = await sign(payload, c.env.JWT_SECRET);

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
        name: user.displayName,
        role: role,
        tenantId: user.tenantId
      }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
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

  const db = getDb(c.env.DATABASE_URL);

  try {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);

    if (!user) {
      return c.json({ message: 'If an account with that email exists, we sent a password reset link.' });
    }

    const [roleRec] = await db.select().from(schema.userRoles).where(eq(schema.userRoles.userId, user.id)).limit(1);
    const role = roleRec?.role || 'client';
    
    let subdomain = 'team';
    if (role === 'administrator') {
      subdomain = 'admin';
    } else if (role === 'client') {
      subdomain = 'client';
    }

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await db.update(schema.users).set({
      resetToken: token,
      resetTokenExpires: expires.toISOString()
    }).where(eq(schema.users.id, user.id));

    let resetLink = `http://${subdomain}.localhost:5173/reset-password?token=${token}`;
    const origin = c.req.header('origin') || 'http://localhost:5173';
    if (origin.includes('meetshatter.com')) {
      resetLink = `https://${subdomain}.meetshatter.com/reset-password?token=${token}`;
    } else {
      resetLink = `http://localhost:5173/reset-password?token=${token}`; 
    }

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
      } catch (err) {}
    }

    return c.json({ message: 'If an account with that email exists, we sent a password reset link.' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

authRoutes.post('/reset-password', async (c) => {
  const { token, new_password } = await c.req.json();
  if (!token || !new_password) {
    return c.json({ error: 'Token and new password are required' }, 400);
  }

  const db = getDb(c.env.DATABASE_URL);

  try {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.resetToken, token)).limit(1);

    if (!user || !user.resetTokenExpires || new Date(user.resetTokenExpires) < new Date()) {
      return c.json({ error: 'Invalid or expired token' }, 400);
    }

    const passwordHash = await bcrypt.hash(new_password, 10);

    await db.update(schema.users).set({
      passwordHash,
      resetToken: null,
      resetTokenExpires: null
    }).where(eq(schema.users.id, user.id));

    return c.json({ message: 'Password has been successfully reset' });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

export default authRoutes;
