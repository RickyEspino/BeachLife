import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import ReelsClientShell from './ReelsClientShell';

export const revalidate = 30; // refresh server-rendered shell periodically

export default async function Page() {
	const supabase = createSupabaseServerClient();
	// Initial batch (same shape as API)
			const { data } = await supabase
				.from('reels')
				.select('id, user_id, image_path, caption, like_count, created_at, profiles!inner(username, avatar_url)')
		.eq('status', 'active')
		.order('created_at', { ascending: false })
		.order('id', { ascending: false })
		.limit(10);

	const rows = data || [];
			interface Row { id: number; user_id: string; image_path: string; caption: string | null; like_count: number; created_at: string; profiles: { username: string | null; avatar_url: string | null } | null; }
			const typedRows: Row[] = (rows as unknown as Row[]);
			const initial = typedRows.map(r => ({
			id: r.id,
			userId: r.user_id,
			username: r.profiles?.username || 'anon',
			avatarUrl: r.profiles?.avatar_url || null,
			caption: r.caption,
			imageUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/reels/${r.image_path}`,
			imagePath: r.image_path,
			likeCount: r.like_count,
			createdAt: r.created_at,
		}));

	// Determine next cursor if needed
	let initialNextCursor: string | undefined;
	if (rows.length === 10) {
		const last = initial[initial.length - 1];
		initialNextCursor = `${last.createdAt}_${last.id}`;
	}

		return <ReelsClientShell initial={initial} initialNextCursor={initialNextCursor} />;
}

