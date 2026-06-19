import { ok } from './_db.js';

export default async (req, res) => {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  ok(res, {
    hasUrl: !!process.env.VITE_SUPABASE_URL,
    hasKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    url: process.env.VITE_SUPABASE_URL ? process.env.VITE_SUPABASE_URL.substring(0, 20) + '...' : null,
    nodeVersion: process.version,
  });
};
