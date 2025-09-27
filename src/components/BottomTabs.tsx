// components/BottomTabs.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TABS } from '@/lib/nav';


export default function BottomTabs() {
const pathname = usePathname();
return (
<nav className="mx-auto flex h-16 w-full max-w-xl items-center justify-between gap-1 px-2">
{TABS.map((t) => {
const isActive = pathname === t.href || pathname?.startsWith(t.href + '/');
const Icon = t.icon as any;
return (
<Link key={t.href} href={t.href} className={`bl-tab ${isActive ? 'bl-tab--active' : 'text-gray-700 hover:bg-gray-100'}`}
aria-label={t.label}
>
<Icon size={20} className={isActive ? 'opacity-100' : 'opacity-80'} />
<span>{t.label}</span>
</Link>
);
})}
</nav>
);
}