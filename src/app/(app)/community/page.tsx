import { createSupabaseServerClient } from '@/lib/supabase/serverClient';
import React from 'react';
import Image from 'next/image';

export default async function Page() {
	const supabase = createSupabaseServerClient();

	// Fastest victories (distinct users best time)
		interface VictoryRow { user_id: string | null; duration_seconds: number | null; started_at: string | null; victory: boolean | null; battle_type: string | null; profiles: { username: string | null; avatar_url: string | null } | null }
		const { data: victoryRows } = await supabase
			.from('quick_battle_runs')
			.select('user_id, duration_seconds, started_at, victory, battle_type, profiles(username, avatar_url)')
			.eq('battle_type', 'king_crab')
			.eq('victory', true)
			.not('duration_seconds', 'is', null)
			.order('duration_seconds', { ascending: true })
			.limit(60) as { data: VictoryRow[] | null };

	// Aggregate per user best time & best DPS (client side reduce for simplicity)
	const bestByUser: Record<string, { username: string; avatar_url: string | null; bestTime: number; when: string; }>= {};
  (victoryRows||[]).forEach(r => {
    if (!r.user_id || r.duration_seconds == null) return;
    const u = r.user_id;
    const username = r.profiles?.username || 'Player';
    const avatar_url = r.profiles?.avatar_url || null;
    if (!bestByUser[u] || r.duration_seconds < bestByUser[u].bestTime) {
      bestByUser[u] = { username, avatar_url, bestTime: r.duration_seconds, when: r.started_at || new Date().toISOString() };
    }
  });
	const fastest = Object.entries(bestByUser)
		.map(([user_id, v]) => ({ user_id, ...v }))
		.sort((a,b)=> a.bestTime - b.bestTime)
		.slice(0, 10);

	// Best DPS (top single-fight DPS)
		interface DpsRow { user_id: string | null; dps: number | null; victory: boolean | null; battle_type: string | null; profiles: { username: string | null; avatar_url: string | null } | null }
		const { data: dpsRows } = await supabase
			.from('quick_battle_runs')
			.select('user_id, dps, victory, battle_type, profiles(username, avatar_url)')
			.eq('battle_type', 'king_crab')
			.not('dps', 'is', null)
			.order('dps', { ascending: false })
			.limit(50) as { data: DpsRow[] | null };
		const bestDps: Record<string, { username: string; avatar_url: string | null; dps: number; }>= {};
		(dpsRows||[]).forEach(r => {
			if (!r.user_id || r.dps == null) return;
			const u = r.user_id;
			const username = r.profiles?.username || 'Player';
			const avatar_url = r.profiles?.avatar_url || null;
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

type LeaderboardRow = (string | number | React.ReactNode)[];
function Leaderboard({ title, subtitle, cols, rows, empty }:{ title:string; subtitle:string; cols:string[]; rows:LeaderboardRow[]; empty:string; }) {
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
			{avatar ? (
				<Image
					src={avatar}
					alt="avatar"
					width={28}
					height={28}
					className="h-7 w-7 rounded-full object-cover border"
					placeholder="empty"
				/>
			) : (
				<div className="h-7 w-7 rounded-full bg-gray-200 border" />
			)}
			<span className="font-medium max-w-[120px] truncate">{name}</span>
		</div>
	);
}
