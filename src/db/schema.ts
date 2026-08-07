import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  timestamp,
  boolean,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", [
  "platform_admin",
  "organizer",
  "nominee",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "active",
  "ended",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "success",
  "failed",
]);

export const paymentChannelEnum = pgEnum("payment_channel", [
  "card",
  "mtn_momo",
  "telecel_cash",
  "ussd",
]);

export const payoutStatusEnum = pgEnum("payout_status", [
  "pending",
  "paid",
]);

// ---------------------------------------------------------------------------
// Organizations (a school department, church, club or any group that runs events)
// ---------------------------------------------------------------------------
export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  commissionPercent: numeric("commission_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("8.00"),
  payoutMomoNumber: varchar("payout_momo_number", { length: 32 }),
  payoutBankDetails: text("payout_bank_details"),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Users — organizers, nominees who claim a login, and the platform admin.
// Voters are NOT users: they pay and vote without an account.
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull(),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Events (belongs to an organization)
// ---------------------------------------------------------------------------
export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull().unique(),
  description: text("description"),
  coverEmoji: varchar("cover_emoji", { length: 8 }).default("🏆"),
  // The event's profile/cover picture — used as the background banner on
  // the nominee's private results dashboard (see /nominee/dashboard).
  coverImageUrl: text("cover_image_url"),
  ussdCode: varchar("ussd_code", { length: 32 }),
  pricePerVote: numeric("price_per_vote", { precision: 10, scale: 2 })
    .notNull()
    .default("1.00"),
  currency: varchar("currency", { length: 8 }).notNull().default("GHS"),
  status: eventStatusEnum("status").notNull().default("draft"),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Categories (belongs to an event)
// ---------------------------------------------------------------------------
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Nominees (belongs to a category; may optionally be linked to a user login)
// ---------------------------------------------------------------------------
export const nominees = pgTable(
  "nominees",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    displayName: varchar("display_name", { length: 200 }).notNull(),
    subtitle: varchar("subtitle", { length: 200 }),
    photoUrl: text("photo_url"),
    // Nominee's own phone number — never shown to voters, used only to send
    // them their one-tap SMS login link to their own results dashboard.
    phone: varchar("phone", { length: 32 }),
    voteCount: integer("vote_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("nominees_category_idx").on(table.categoryId)]
);

// ---------------------------------------------------------------------------
// Nominee login tokens — single-use magic links texted to a nominee's phone
// so they can view their own results dashboard without a password. A token
// is a random high-entropy string; only its SHA-256 hash is stored, mirroring
// how we never store plaintext secrets elsewhere in this schema.
// ---------------------------------------------------------------------------
export const nomineeLoginTokens = pgTable(
  "nominee_login_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    nomineeId: uuid("nominee_id")
      .notNull()
      .references(() => nominees.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("nominee_login_tokens_nominee_idx").on(table.nomineeId)]
);

// ---------------------------------------------------------------------------
// Voter OTPs — a voter isn't a `users` row (see note above); to let them
// look up their own vote history we prove phone ownership with a short-
// lived one-time code texted to them, rather than a password. Only the
// code's SHA-256 hash is stored, mirroring the nominee login tokens.
// ---------------------------------------------------------------------------
export const voterOtps = pgTable(
  "voter_otps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Normalized "233XXXXXXXXX" form (see normalizePhone in src/lib/sms.ts)
    // so lookups don't depend on how the voter typed their number.
    phone: varchar("phone", { length: 32 }).notNull(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [index("voter_otps_phone_idx").on(table.phone)]
);

// ---------------------------------------------------------------------------
// Payments — one row per checkout attempt (Paystack transaction).
// Votes are only ever created once a payment's status flips to "success"
// via the verified webhook — never on the client's say-so.
// ---------------------------------------------------------------------------
export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    nomineeId: uuid("nominee_id")
      .notNull()
      .references(() => nominees.id, { onDelete: "cascade" }),
    paystackReference: varchar("paystack_reference", { length: 100 })
      .notNull()
      .unique(),
    voterPhone: varchar("voter_phone", { length: 32 }),
    voterEmail: varchar("voter_email", { length: 255 }),
    channel: paymentChannelEnum("channel"),
    voteCount: integer("vote_count").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 8 }).notNull().default("GHS"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("payments_reference_idx").on(table.paystackReference),
    index("payments_event_idx").on(table.eventId),
  ]
);

// ---------------------------------------------------------------------------
// Payouts — a batch payout of collected revenue (minus commission) to an
// organization, approved by the platform admin.
// ---------------------------------------------------------------------------
export const payouts = pgTable("payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  grossAmount: numeric("gross_amount", { precision: 10, scale: 2 }).notNull(),
  commissionAmount: numeric("commission_amount", {
    precision: 10,
    scale: 2,
  }).notNull(),
  netAmount: numeric("net_amount", { precision: 10, scale: 2 }).notNull(),
  status: payoutStatusEnum("status").notNull().default("pending"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------
export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  events: many(events),
  payouts: many(payouts),
}));

export const usersRelations = relations(users, ({ one }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id],
  }),
  categories: many(categories),
  payments: many(payments),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  event: one(events, {
    fields: [categories.eventId],
    references: [events.id],
  }),
  nominees: many(nominees),
}));

export const nomineesRelations = relations(nominees, ({ one, many }) => ({
  category: one(categories, {
    fields: [nominees.categoryId],
    references: [categories.id],
  }),
  user: one(users, {
    fields: [nominees.userId],
    references: [users.id],
  }),
  payments: many(payments),
  loginTokens: many(nomineeLoginTokens),
}));

export const nomineeLoginTokensRelations = relations(nomineeLoginTokens, ({ one }) => ({
  nominee: one(nominees, {
    fields: [nomineeLoginTokens.nomineeId],
    references: [nominees.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  event: one(events, {
    fields: [payments.eventId],
    references: [events.id],
  }),
  nominee: one(nominees, {
    fields: [payments.nomineeId],
    references: [nominees.id],
  }),
}));

export const payoutsRelations = relations(payouts, ({ one }) => ({
  organization: one(organizations, {
    fields: [payouts.organizationId],
    references: [organizations.id],
  }),
}));
