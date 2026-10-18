export const metadata = {
  title: "You're offline | Umar Suhail",
};

export default function OfflinePage() {
  return (
    <main className="mission-flight flex min-h-screen flex-col items-center justify-center gap-4 bg-(--flight-surface-solid) px-6 text-center">
      <p className="detail-muted text-xs font-semibold uppercase tracking-[0.32em]">
        No connection
      </p>
      <h1 className="detail-accent text-2xl font-semibold sm:text-3xl">You&apos;re offline</h1>
      <p className="detail-copy max-w-[42ch] text-sm leading-relaxed">
        This page hasn&apos;t been cached for offline viewing yet. Reconnect and
        try again.
      </p>
    </main>
  );
}
