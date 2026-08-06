"use client";

import { useRouter } from "next/navigation";

export function NomineeHeader({
  displayName,
  photoUrl,
}: {
  displayName: string;
  photoUrl: string | null;
}) {
  const router = useRouter();

  async function logout() {
    await fetch("/api/nominee/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <header className="border-b border-border">
      <div className="max-w-xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={displayName} className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-xs shrink-0">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="font-bold text-sm truncate">{displayName}</span>
        </div>
        <button onClick={logout} className="btn btn-ghost btn-sm shrink-0">
          Log out
        </button>
      </div>
    </header>
  );
}
