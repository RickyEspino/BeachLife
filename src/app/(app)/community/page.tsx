import { createSupabaseServerClient } from '@/lib/supabase/serverClient';

export default async function Page() {
	const supabase = createSupabaseServerClient();

	// Fastest victories (distinct users best time)
	const { data: victoryRows } = await supabase
		.from('crab_battles')
		.select('user_id, duration_seconds, created_at, profiles(username, avatar_url)')
		.eq('victory', true)
		.order('duration_seconds', { ascending: true })
		.limit(50);

	// Aggregate per user best time & best DPS (client side reduce for simplicity)
	const bestByUser: Record<string, { username: string; avatar_url: string | null; bestTime: number; when: string; }>= {};
	(victoryRows||[]).forEach(r => {
		if (!r.user_id || typeof r.duration_seconds !== 'number') return;
		const u = r.user_id;
		const username = (r as any).profiles?.username || 'Player';
		const avatar_url = (r as any).profiles?.avatar_url || null;
		if (!bestByUser[u] || r.duration_seconds < bestByUser[u].bestTime) {
			bestByUser[u] = { username, avatar_url, bestTime: r.duration_seconds, when: r.created_at };
		}
	});
	const fastest = Object.entries(bestByUser)
		.map(([user_id, v]) => ({ user_id, ...v }))
		.sort((a,b)=> a.bestTime - b.bestTime)
		.slice(0, 10);

	// Best DPS (top single-fight DPS)
	const { data: dpsRows } = await supabase
		.from('crab_battles')
		.select('user_id, dps, victory, profiles(username, avatar_url)')
		.order('dps', { ascending: false })
		.limit(30);
	const bestDps: Record<string, { username: string; avatar_url: string | null; dps: number; }>= {};
	(dpsRows||[]).forEach(r => {
		if (!r.user_id || typeof r.dps !== 'number') return;
		const u = r.user_id;
		const username = (r as any).profiles?.username || 'Player';
		const avatar_url = (r as any).profiles?.avatar_url || null;
		if (!bestDps[u] || r.dps > bestDps[u].dps) {
			bestDps[u] = { username, avatar_url, dps: r.dps };
		}
	});
	const topDps = Object.entries(bestDps)
		.map(([user_id, v]) => ({ user_id, ...v }))
		.sort((a,b)=> b.dps - a.dps)
		.slice(0, 10);

	return (
		<section className="mx-auto max-w-3xl p-6 space-y-10">
			<header>
				<h1 className="text-2xl font-bold">Community</h1>
				<p className="mt-2 text-gray-600">King Crab boss battle leaderboards.</p>
			</header>

			<Leaderboard title="Fastest Victories" subtitle="Top players by shortest clear time" cols={['Player','Time','Date']} rows={fastest.map((r,i)=> [
				<PlayerCell key={r.user_id} name={r.username} avatar={r.avatar_url} rank={i+1} />, `${r.bestTime.toFixed(2)}s`, new Date(r.when).toLocaleDateString()
			])} empty="No victories yet." />

			<Leaderboard title="Best DPS" subtitle="Highest single-fight DPS" cols={['Player','DPS']} rows={topDps.map((r,i)=> [
				<PlayerCell key={r.user_id} name={r.username} avatar={r.avatar_url} rank={i+1} />, r.dps.toFixed(1)
			])} empty="No battles logged." />
		</section>
	);
}

function Leaderboard({ title, subtitle, cols, rows, empty }:{ title:string; subtitle:string; cols:string[]; rows:any[][]; empty:string; }) {
	return (
		<div className="rounded-2xl border bg-white/80 shadow overflow-hidden">
			<div className="px-5 pt-5 pb-3 border-b bg-white/60">
				<h2 className="font-semibold">{title}</h2>
				<p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
			</div>
			{rows.length ? (
				<table className="w-full text-sm">
					<thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
						<tr>{cols.map(c => <th key={c} className="px-4 py-2 text-left">{c}</th>)}</tr>
					</thead>
					<tbody>
						{rows.map((r,i) => (
							<tr key={i} className="border-t">
								{r.map((cell,j)=>(<td key={j} className="px-4 py-2 align-middle">{cell}</td>))}
							</tr>
						))}
					</tbody>
				</table>
			) : (
				<div className="p-6 text-sm text-gray-500">{empty}</div>
			)}
		</div>
	);
}

function PlayerCell({ name, avatar, rank }:{ name:string; avatar:string|null; rank:number }) {
	return (
		<div className="flex items-center gap-2">
			<span className="text-xs font-mono w-5 text-gray-500">#{rank}</span>
			{avatar ? <img src={avatar} alt="avatar" className="h-7 w-7 rounded-full object-cover border" /> : <div className="h-7 w-7 rounded-full bg-gray-200 border" />}
			<span className="font-medium max-w-[120px] truncate">{name}</span>
		</div>
	);
}
