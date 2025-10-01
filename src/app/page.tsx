// src/app/page.tsx
export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">BeachLife</h1>
      <p className="mt-2 text-gray-600">
        Welcome to the BeachLife! Sign in to access your account.
      </p>

      <div className="mt-6">
        <a
          href="/login"
          className="inline-block rounded-lg bg-black text-white px-4 py-2 font-medium"
        >
          Go to Login
        </a>
      </div>
    </main>
  );
}
