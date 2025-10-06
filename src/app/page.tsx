// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main
      className="
        relative min-h-dvh p-6
        bg-[url('/img/backgrounds/waves.png')] bg-cover bg-center bg-no-repeat
      "
    >
      {/* overlay for contrast */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none" />

      <div className="relative">
        <h1 className="pt-20 text-4xl font-semibold leading-tight text-white">
          <span>Life’s Better</span> <br />
          <span className="text-emerald-400">ON THE SHORE.</span>
        </h1>

        <p className="mt-2 text-white/90">
          Discover, Earn, and Connect <br /> with BeachLife.
        </p>

        <div className="mt-6">
<Link
  href="/login"
  className="block w-fit text-emerald-400 font-medium underline underline-offset-4 hover:underline-offset-2 hover:text-emerald-300 transition"
>
  Join the BeachCrew
</Link>

        </div>
      </div>
    </main>
  );
}
