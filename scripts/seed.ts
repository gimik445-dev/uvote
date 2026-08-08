// Run via `npm run db:seed`, which passes --env-file=.env.local to tsx.
// (Loading env vars inline here doesn't work: ES module imports below are
// hoisted above any plain statements in this file, so src/db would already
// have read process.env.DATABASE_URL before a manual loader ran.)
//
// This seed intentionally creates ONLY login accounts — no demo events,
// categories or nominees. The platform should start genuinely empty;
// real events get created through the organizer dashboard.
import { db } from "../src/db";
import { organizations, users } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";

async function main() {
  console.log("Seeding uVote (accounts only, no demo events)…");

  await db.insert(users).values({
    fullName: "Platform Admin",
    email: "admin@uvote.app",
    passwordHash: await hashPassword("admin12345"),
    role: "platform_admin",
    // Seeded accounts skip the email verification flow — there's no inbox
    // behind these addresses to click a link from.
    emailVerifiedAt: new Date(),
  });

  const [csDept] = await db
    .insert(organizations)
    .values({
      name: "Computer Science Department",
      slug: "computer-science",
      commissionPercent: "8.00",
      isVerified: true,
    })
    .returning();

  await db.insert(users).values({
    fullName: "CS Department Organizer",
    email: "organizer@uvote.app",
    passwordHash: await hashPassword("organizer123"),
    role: "organizer",
    organizationId: csDept.id,
    emailVerifiedAt: new Date(),
  });

  console.log("Seed complete — no events created.");
  console.log("  Admin login:     admin@uvote.app / admin12345");
  console.log("  Organizer login: organizer@uvote.app / organizer123");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
