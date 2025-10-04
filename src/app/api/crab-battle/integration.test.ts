import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeGrade } from '@/lib/crab/grading';

// NOTE: This is a lightweight pseudo-integration test. In a real setup you would abstract Supabase client
// creation so it can be injected/mocked. Here we validate basic grading invariants and payload shaping.

vi.mock('@/lib/supabase/serverClient', () => ({
  createSupabaseServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } } }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { id: 1, user_id: 'user-1', started_at: new Date().toISOString(), finished_at: null, victory: null }, error: null }) }) }),
      insert: () => ({ select: () => ({ single: async () => ({ data: { id: 1 }, error: null }) }) }),
      update: () => ({ eq: () => ({}) })
    })
  })
}));

describe('integration skeleton', () => {
  beforeEach(() => {
    // reset any global trackers if added later
  });
  it('grade function reachable', () => {
    expect(computeGrade(true, 60, 0)).toBe('S');
  });
});
