import { supabase } from '../../lib/supabase.js';

// Verifies the Supabase Auth access token sent by the client and loads the
// matching profile (public.users row) so routes know who is calling.
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const { data: { user: authUser }, error } = await supabase.auth.getUser(token);

    if (error || !authUser) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, name, email, role, phone, address, created_at')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profileError) {
      return res.status(401).json({ message: 'User profile not found.' });
    }

    req.user = profile;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  next();
};

export const requireCustomer = (req, res, next) => {
  if (!req.user || req.user.role !== 'customer') {
    return res.status(403).json({ message: 'Customer access required.' });
  }
  next();
};
