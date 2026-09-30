import { supabase } from './supabase.js';

// Best Pick flag storage -------------------------------------------------
// The flag lives inside products.measurements (a jsonb bag) so the feature
// works with zero database migrations. The customer-facing product page
// renders a static measurements box, so the extra key is invisible to
// shoppers and never conflicts with sizing data.

export function isBestPick(measurements) {
  return Boolean(measurements && measurements.best_pick === true);
}

export function withBestPick(measurements, value) {
  const next = { ...(measurements || {}) };
  if (value) {
    next.best_pick = true;
  } else {
    delete next.best_pick;
  }
  return next;
}

export function parseBestPick(value) {
  return value === true || value === 'true';
}

// Exactly one product may wear the badge: clear it everywhere else.
export async function clearOtherBestPicks(keepId) {
  const { data, error } = await supabase
    .from('products')
    .select('id, measurements')
    .contains('measurements', { best_pick: true })
    .neq('id', keepId);

  if (error || !data || data.length === 0) {
    return;
  }

  for (const row of data) {
    await supabase
      .from('products')
      .update({ measurements: withBestPick(row.measurements, false) })
      .eq('id', row.id);
  }
}
