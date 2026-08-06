import Link from "next/link";

// The final uVote mark, matching the approved mockup: a flat indigo pill
// containing a light "u" circle and an italic "Vote" wordmark. No gradients
// or shadows on purpose -- kept flat/simple per feedback.
export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  const fontSize = size === "sm" ? "16px" : "19px";

  return (
    <Link href="/" className="inline-flex items-center w-fit" style={{ fontSize }}>
      <span
        className="inline-flex items-center rounded-full bg-brand"
        style={{ height: "2.15em", padding: "0 0.9em 0 0.15em", gap: "0.4em" }}
      >
        <span
          className="flex items-center justify-center rounded-full shrink-0"
          style={{
            width: "1.75em",
            height: "1.75em",
            background: "#f2f2fa",
            color: "var(--brand)",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: "0.85em",
          }}
        >
          u
        </span>
        <span
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: "1.05em",
            color: "#fff",
          }}
        >
          Vote
        </span>
      </span>
    </Link>
  );
}
