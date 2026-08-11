export const metadata = { title: "Link expired — uVote" };

export default function NomineeLoginExpiredPage() {
  return (
    <main className="flex-1 flex items-center justify-center px-6 py-20">
      <div className="card p-8 max-w-sm text-center">
        <div className="text-3xl mb-4">⏳</div>
        <h1 className="text-xl font-extrabold mb-2">This link has expired</h1>
        <p className="text-sm text-ink-dim leading-relaxed">
          Your login link has expired. Ask the organizer running your event to resend your
          results link from their dashboard.
        </p>
      </div>
    </main>
  );
}
