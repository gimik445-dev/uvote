// One-off helper: create a platform_admin account, or promote an existing
// user (by email) to platform_admin, against whatever DATABASE_URL is in
// the environment when this runs. Not wired into package.json on purpose —
// this is meant to be run explicitly, once, against a specific database,
// not accidentally picked up by a normal seed/build step.
//
// Usage:
//   DATABASE_URL="postgres://..." ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="..." \
//     npx tsx scripts/promote-admin.ts
//
// If a user with ADMIN_EMAIL already exists, it's promoted to platform_admin
// (password left untouched unless ADMIN_PASSWORD is also set, in which case
// the password is reset too). If no such user exists, a brand-new
// platform_admin account is created with the given email/password.
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/auth";
import { eq } from "drizzle-orm";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email) {
    console.error("Set ADMIN_EMAIL (and ADMIN_PASSWORD if creating a new account).");
    process.exit(1);
  }

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

  if (existing) {
    const updates: Partial<typeof users.$inferInsert> = { role: "platform_admin" };
    if (password) updates.passwordHash = await hashPassword(password);
    await db.update(users).set(updates).where(eq(users.id, existing.id));
    console.log(`Promoted existing user ${email} (id ${existing.id}) to platform_admin.`);
    if (password) console.log("Password was also reset to the value you provided.");
  } else {
    if (!password) {
      console.error(`No user with email ${email} exists yet — set ADMIN_PASSWORD to create one.`);
      process.exit(1);
    }
    const [created] = await db
      .insert(users)
      .values({
        fullName: "Platform Admin",
        email,
        passwordHash: await hashPassword(password),
        role: "platform_admin",
        emailVerifiedAt: new Date(),
      })
      .returning();
    console.log(`Created new platform_admin account ${email} (id ${created.id}).`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
