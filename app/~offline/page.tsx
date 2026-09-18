export const metadata = {
  title: "You're offline | Umar Suhail",
};

// Served by the service worker (see app/sw.ts) whenever a page navigation
// fails with no network — never requested directly on a live connection.
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#05263f] px-6 text-center text-sky-50">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-sky-200/60">
        No connection
      </p>
      <h1 className="text-2xl font-semibold sm:text-3xl">You&apos;re offline</h1>
      <p className="max-w-[42ch] text-sm leading-relaxed text-slate-100/70">
        This page hasn&apos;t been cached for offline viewing yet. Reconnect and
        try again.
      </p>
    </main>
  );
}
