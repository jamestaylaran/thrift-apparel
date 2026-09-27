import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Registration and login are handled in the browser with Supabase Auth
// (see client/src/lib/supabase.js). This endpoint returns the profile of the
// currently signed-in user, including their role (customer / admin).
router.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});

export default router;
