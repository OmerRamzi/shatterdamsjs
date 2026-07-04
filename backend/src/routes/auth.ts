import { Hono } from 'hono';
import { setCookie, deleteCookie, getCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  JWT_SECRET: string;
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

export default authRoutes;
