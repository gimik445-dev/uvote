import "server-only";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  events,
  organizations,
  categories,
  nominees,
  payments,
  payouts,
} from "@/db/schema";

export async function getActiveEvents() {
  return db.query.events.findMany({
    where: eq(events.status, "active"),
    with: { organization: true },
    orderBy: desc(events.createdAt),
  });
}

// Public-facing — voters must never see a nominee's vote count, not even
// implicitly via ordering. So: explicitly drop the voteCount column instead
// of relying on the client to just not render it, and order nominees by
// when they were added rather than by vote count (sorting by votes would
// leak ranking through position alone, which is exactly what we don't want).
export async function getEventBySlug(slug: string) {
  return db.query.events.findFirst({
    where: eq(events.slug, slug),
    with: {
      organization: true,
      categories: {
        orderBy: (c, { asc }) => asc(c.sortOrder),
        with: {
          nominees: {
            orderBy: (n, { asc }) => asc(n.createdAt),
            columns: {
              id: true,
              categoryId: true,
              displayName: true,
              subtitle: true,
              photoUrl: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });
}

// Nominee's own results dashboard — the one place in the app a vote count
// is shown to anyone other than the organizer/admin. Returns the nominee's
// own profile plus every nominee in the same category (their opponents) so
// the page can chart the full category's vote share.
export async function getNomineeDashboard(nomineeId: string) {
  const nominee = await db.query.nominees.findFirst({
    where: eq(nominees.id, nomineeId),
    with: {
      category: {
        with: {
          event: { with: { organization: true } },
          nominees: {
            orderBy: (n, { asc }) => asc(n.createdAt),
            columns: {
              id: true,
              displayName: true,
              photoUrl: true,
              voteCount: true,
            },
          },
        },
      },
    },
  });
  if (!nominee) return null;

  return {
    id: nominee.id,
    displayName: nominee.displayName,
    subtitle: nominee.subtitle,
    photoUrl: nominee.photoUrl,
    voteCount: nominee.voteCount,
    categoryName: nominee.category.name,
    eventTitle: nominee.category.event.title,
    eventSlug: nominee.category.event.slug,
    eventCoverImageUrl: nominee.category.event.coverImageUrl,
    pricePerVote: nominee.category.event.pricePerVote,
    organizationName: nominee.category.event.organization.name,
    opponents: nominee.category.nominees.filter((n) => n.id !== nominee.id),
    all: nominee.category.nominees,
  };
}

// A voter's own vote history — every successful payment made with this
// (normalized) phone number, across every event. Only ever called with a
// phone the caller has proved ownership of via OTP (see
// src/lib/voter-session.ts) — never exposed as a lookup-by-phone endpoint.
export async function getVoterVoteHistory(phone: string) {
  const rows = await db.query.payments.findMany({
    where: and(eq(payments.voterPhone, phone), eq(payments.status, "success")),
    orderBy: desc(payments.verifiedAt),
    with: {
      nominee: {
        columns: { id: true, displayName: true, photoUrl: true },
        with: {
          category: {
            columns: { id: true, name: true },
            with: { event: { columns: { id: true, title: true, slug: true, currency: true } } },
          },
        },
      },
    },
  });

  const totalVotes = rows.reduce((sum, r) => sum + r.voteCount, 0);
  const totalSpent = rows.reduce((sum, r) => sum + Number(r.amount), 0);

  return { phone, totalVotes, totalSpent, votes: rows };
}

export async function getOrganizerEventDetail(organizationId: string, eventId: string) {
  const event = await db.query.events.findFirst({
    where: eq(events.id, eventId),
    with: {
      categories: {
        orderBy: (c, { asc }) => asc(c.sortOrder),
        with: { nominees: { orderBy: (n, { desc }) => desc(n.voteCount) } },
      },
    },
  });
  if (!event || event.organizationId !== organizationId) return null;
  return event;
}

export async function getOrganizerOverview(organizationId: string) {
  const orgEvents = await db.query.events.findMany({
    where: eq(events.organizationId, organizationId),
    orderBy: desc(events.createdAt),
    with: {
      categories: { with: { nominees: true } },
    },
  });

  const totals = orgEvents.reduce(
    (acc, e) => {
      const votes = e.categories.reduce(
        (s, c) => s + c.nominees.reduce((s2, n) => s2 + n.voteCount, 0),
        0
      );
      return { votes: acc.votes + votes };
    },
    { votes: 0 }
  );

  const revenueRows = await db
    .select({
      total: sql<string>`coalesce(sum(${payments.amount}), 0)`,
    })
    .from(payments)
    .innerJoin(events, eq(payments.eventId, events.id))
    .where(
      and(eq(events.organizationId, organizationId), eq(payments.status, "success"))
    );

  const revenue = Number(revenueRows[0]?.total ?? 0);

  const dailyRevenue = await db
    .select({
      day: sql<string>`to_char(${payments.createdAt}, 'Dy')`,
      total: sql<string>`coalesce(sum(${payments.amount}), 0)`,
    })
    .from(payments)
    .innerJoin(events, eq(payments.eventId, events.id))
    .where(
      and(
        eq(events.organizationId, organizationId),
        eq(payments.status, "success"),
        gte(payments.createdAt, sql`now() - interval '7 days'`)
      )
    )
    .groupBy(sql`to_char(${payments.createdAt}, 'Dy'), date_trunc('day', ${payments.createdAt})`)
    .orderBy(sql`date_trunc('day', ${payments.createdAt})`);

  const recentActivity = await db
    .select({
      voteCount: payments.voteCount,
      channel: payments.channel,
      createdAt: payments.createdAt,
      nomineeName: nominees.displayName,
    })
    .from(payments)
    .innerJoin(events, eq(payments.eventId, events.id))
    .innerJoin(nominees, eq(payments.nomineeId, nominees.id))
    .where(
      and(eq(events.organizationId, organizationId), eq(payments.status, "success"))
    )
    .orderBy(desc(payments.createdAt))
    .limit(8);

  return { events: orgEvents, totalVotes: totals.votes, revenue, dailyRevenue, recentActivity };
}

export async function getOrganizerPayments(organizationId: string) {
  return db
    .select({
      id: payments.id,
      voteCount: payments.voteCount,
      amount: payments.amount,
      channel: payments.channel,
      createdAt: payments.createdAt,
      eventTitle: events.title,
      nomineeName: nominees.displayName,
    })
    .from(payments)
    .innerJoin(events, eq(payments.eventId, events.id))
    .innerJoin(nominees, eq(payments.nomineeId, nominees.id))
    .where(and(eq(events.organizationId, organizationId), eq(payments.status, "success")))
    .orderBy(desc(payments.createdAt))
    .limit(100);
}

export async function getOrganizerPayoutSummary(organizationId: string) {
  const org = await db.query.organizations.findFirst({ where: eq(organizations.id, organizationId) });

  const revenueRows = await db
    .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .innerJoin(events, eq(payments.eventId, events.id))
    .where(and(eq(events.organizationId, organizationId), eq(payments.status, "success")));

  const totalRevenue = Number(revenueRows[0]?.total ?? 0);
  const commissionPercent = Number(org?.commissionPercent ?? 8);
  const commission = totalRevenue * (commissionPercent / 100);
  const netEarned = totalRevenue - commission;

  const orgPayouts = await db.query.payouts.findMany({
    where: eq(payouts.organizationId, organizationId),
    orderBy: desc(payouts.createdAt),
  });

  const totalPaidOut = orgPayouts
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.netAmount), 0);

  return {
    organization: org,
    totalRevenue,
    commissionPercent,
    commission,
    netEarned,
    totalPaidOut,
    balanceDue: Math.max(0, netEarned - totalPaidOut),
    payouts: orgPayouts,
  };
}

export async function getPlatformOverview() {
  const orgs = await db.query.organizations.findMany({
    orderBy: desc(organizations.createdAt),
  });

  const perOrgStats = await Promise.all(
    orgs.map(async (org) => {
      const rows = await db
        .select({
          revenue: sql<string>`coalesce(sum(${payments.amount}), 0)`,
          votes: sql<string>`coalesce(sum(${payments.voteCount}), 0)`,
          eventCount: sql<string>`count(distinct ${events.id})`,
        })
        .from(events)
        .leftJoin(
          payments,
          and(eq(payments.eventId, events.id), eq(payments.status, "success"))
        )
        .where(eq(events.organizationId, org.id));

      const revenue = Number(rows[0]?.revenue ?? 0);
      const commission = revenue * (Number(org.commissionPercent) / 100);

      return {
        organization: org,
        revenue,
        votes: Number(rows[0]?.votes ?? 0),
        eventCount: Number(rows[0]?.eventCount ?? 0),
        commission,
      };
    })
  );

  const platformRevenue = perOrgStats.reduce((s, o) => s + o.revenue, 0);
  const platformCommission = perOrgStats.reduce((s, o) => s + o.commission, 0);
  const totalVotes = perOrgStats.reduce((s, o) => s + o.votes, 0);

  const pendingPayouts = await db.query.payouts.findMany({
    where: eq(payouts.status, "pending"),
    with: { organization: true },
  });

  return {
    perOrgStats,
    platformRevenue,
    platformCommission,
    totalVotes,
    activeOrgs: orgs.length,
    pendingPayouts,
  };
}

// ---------------------------------------------------------------------------
// Admin payouts — every organization's outstanding balance (all-time revenue
// minus everything already recorded as a payout, pending or paid), plus the
// full payout history across the platform.
// ---------------------------------------------------------------------------
export async function getAdminPayoutsOverview() {
  const orgs = await db.query.organizations.findMany({
    orderBy: desc(organizations.createdAt),
  });

  const orgBalances = await Promise.all(
    orgs.map(async (org) => {
      const revenueRows = await db
        .select({ total: sql<string>`coalesce(sum(${payments.amount}), 0)` })
        .from(payments)
        .innerJoin(events, eq(payments.eventId, events.id))
        .where(and(eq(events.organizationId, org.id), eq(payments.status, "success")));

      const totalRevenue = Number(revenueRows[0]?.total ?? 0);

      const existingPayouts = await db.query.payouts.findMany({
        where: eq(payouts.organizationId, org.id),
        orderBy: desc(payouts.createdAt),
      });

      const accountedGross = existingPayouts.reduce((s, p) => s + Number(p.grossAmount), 0);
      const balanceGross = Math.max(0, totalRevenue - accountedGross);
      const commissionPercent = Number(org.commissionPercent);
      const balanceCommission = balanceGross * (commissionPercent / 100);
      const balanceNet = balanceGross - balanceCommission;

      return {
        organization: org,
        totalRevenue,
        balanceGross,
        balanceCommission,
        balanceNet,
        lastPayoutEnd: existingPayouts[0]?.periodEnd ?? null,
      };
    })
  );

  const allPayouts = await db.query.payouts.findMany({
    orderBy: desc(payouts.createdAt),
    with: { organization: true },
  });

  return { orgBalances, allPayouts };
}
