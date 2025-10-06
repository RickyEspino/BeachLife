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
      <div className="absolute inset-0 bg-black/20 pointer-events-none z-0" />

      {/* main content */}
      <div className="relative z-10">
        <h1 className="pt-5 text-4xl font-semibold leading-tight text-white">
          <span>Life’s Better</span> <br />
          <span className="text-emerald-400">ON THE SHORE.</span>
        </h1>

        <p className="mt-2 text-white/90">
          Discover, Earn, <br /> and Connect with BeachLife.
        </p>
      </div>

      {/* bottom-right link, matching top padding (pt-5 -> bottom-5) */}
      <div className="absolute right-6 bottom-20 z-10">
        <Link
          href="/login"
          className="group inline-flex items-center gap-2 text-lg font-bold italic text-black underline underline-offset-4 hover:underline-offset-2 hover:text-emerald-300 transition"
          aria-label="Join the BeachCrew — continue to login"
        >
          <span>Join the BeachCrew →</span>
        </Link>
      </div>
    </main>
  );
}
