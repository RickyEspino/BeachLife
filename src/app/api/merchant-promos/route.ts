import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';

// Shape used by Map and clients
type PromoDto = { id: string; expiresAt: number };

// GET: return active promos { id, expiresAt } for all merchants
export async function GET() {
  const supabase = createSupabaseServerClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('merchant_promos')
    .select('merchant_id, expires_at')
    .gt('expires_at', nowIso);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const promos: PromoDto[] = (data || []).map(r => ({ id: r.merchant_id as string, expiresAt: new Date(r.expires_at as string).getTime() }));
  return NextResponse.json(promos, { headers: { 'Cache-Control': 'no-store' } });
}

// POST: upsert a promo for the current user's merchant
// body: { merchantId: string, durationMs?: number, expiresAt?: number }
export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const merchantId: string | undefined = body.merchantId;
  const durationMs: number | undefined = body.durationMs;
  const expiresAtMs: number | undefined = body.expiresAt;
  if (!merchantId) return NextResponse.json({ error: 'merchantId required' }, { status: 400 });
  // Verify merchant ownership
  const { data: merchant, error: mErr } = await supabase
    .from('merchants')
    .select('id, owner_user_id')
    .eq('id', merchantId)
    .maybeSingle();
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!merchant || merchant.owner_user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = Date.now();
  const expMs = typeof expiresAtMs === 'number' && expiresAtMs > now
    ? expiresAtMs
    : (typeof durationMs === 'number' && durationMs > 0 ? now + durationMs : now + 60 * 60 * 1000); // default 1h
  const expIso = new Date(expMs).toISOString();

  // Upsert record per merchant
  const { error: upErr } = await supabase
    .from('merchant_promos')
    .upsert({ merchant_id: merchantId, expires_at: expIso }, { onConflict: 'merchant_id' });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  return NextResponse.json({ id: merchantId, expiresAt: expMs } as PromoDto);
}

// DELETE: clear promo for current user's merchant
// query: ?merchantId=...
export async function DELETE(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(req.url);
  const merchantId = url.searchParams.get('merchantId');
  if (!merchantId) return NextResponse.json({ error: 'merchantId required' }, { status: 400 });
  const { data: merchant, error: mErr } = await supabase
    .from('merchants')
    .select('id, owner_user_id')
    .eq('id', merchantId)
    .maybeSingle();
  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
  if (!merchant || merchant.owner_user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { error: delErr } = await supabase
    .from('merchant_promos')
    .delete()
    .eq('merchant_id', merchantId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
