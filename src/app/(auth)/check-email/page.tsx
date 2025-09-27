import Link from "next/link";
import { ResendMagicLink } from "@/components/ResendMagicLink";

export default function CheckEmailPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams?.email ?? "";

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm text-center">
        <h1 className="text-2xl font-semibold">Check your email 📬</h1>
        <p className="mt-3 text-gray-600">
          We sent a magic sign-in link
          {email ? (
            <>
              {" "}to <span className="font-medium">{email}</span>.
            </>
          ) : (
            "."
          )}{" "}
          Click the link on that device to finish signing in.
        </p>

        <div className="mt-6 space-y-2 text-sm text-gray-500">
          <p>If you don’t see it, check your spam or promotions folder.</p>
          <p>Opening the link on this browser will sign you in here.</p>
        </div>

        {email ? (
          <ResendMagicLink email={email} />
        ) : (
          <div className="mt-8">
            <Link
              href="/login"
              className="inline-block rounded-lg border px-4 py-2 font-medium"
            >
              Go back to login
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
