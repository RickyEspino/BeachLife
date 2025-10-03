"use client";
import NextDynamic from 'next/dynamic';
export const dynamic = 'force-static';
const CrabBattle = NextDynamic(() => import('@/components/crab/CrabBattle').then(m => m.CrabBattle), { ssr: false });
export default function Page(){ return <CrabBattle />; }
