import { supabase } from './supabase.js';

// The `is_best_pick` column comes from a one-time migration
// (see database/supabase_setup.sql). Until it has been applied, these
// helpers let the API run normally and simply ignore the flag instead of
// failing every featured-products or admin save request.

let columnReady = false;

export async function hasBestPickColumn() {
  if (columnReady) {
    return true;
  }

  const { error } = await supabase.from('products').select('is_best_pick').limit(1);

  if (error) {
    return false;
  }

  columnReady = true;
  return true;
}

export function parseBestPick(value) {
  return value === true || value === 'true';
}
