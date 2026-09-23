import "dotenv/config";
import cors from "cors";
import express, { type Request, type Response } from "express";
import Stripe from "stripe";
import { z } from "zod";
import { connectDatabase, prisma } from "./lib/prisma.js";
import { createToken, hashPassword, requireActiveSubscriber, requireAdmin, requireUser, verifyPassword } from "./lib/auth.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const api = "/api/v1";
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000" }));

const credentials = z.object({ email: z.string().email(), password: z.string().min(8) });
const signupInput = credentials.extend({ charityId: z.string().min(1).optional(), contributionPercentage: z.coerce.number().min(10).max(100).optional() }).refine((value) => !value.contributionPercentage || value.charityId, { message: "charityId is required when setting a contribution" });
const scoreInput = z.object({ scoreValue: z.coerce.number().int().min(1).max(45), scoreDate: z.coerce.date() });
const selectionInput = z.object({ charityId: z.string().min(1), contributionPercentage: z.coerce.number().min(10).max(100) });
const charityInput = z.object({ title: z.string().min(2), description: z.string().min(10), imageUrl: z.string().url().optional(), spotlightFlag: z.boolean().optional() });
const eventInput = z.object({ title: z.string().min(2), description: z.string().min(5), eventDate: z.coerce.date(), location: z.string().optional() });
const profileInput = z.object({ email: z.string().email().optional(), currentPassword: z.string().optional(), newPassword: z.string().min(8).optional() }).refine((value) => !value.newPassword || value.currentPassword, { message: "currentPassword is required to change password" });
const asyncRoute = (handler: (request: Request, response: Response) => Promise<unknown>) => (request: Request, response: Response) => handler(request, response).catch((error) => { console.error("API error", error instanceof Error ? error.message : error); return response.status(500).json({ message: "Unexpected server error" }); });
const publicUser = (user: any) => ({ id: user.id, email: user.email, role: user.role, subscription: user.subscription });
const day = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const routeId = (request: Request) => Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const useMockPayments = process.env.USE_MOCK_PAYMENTS === "true" || !stripe;
const pageQuery = (request: Request) => ({ page: Math.max(1, Number(request.query.page) || 1), limit: Math.min(100, Math.max(1, Number(request.query.limit) || 20)) });
const poolAmount = () => Number(process.env.SUBSCRIPTION_POOL_AMOUNT ?? 10);
const shares = { five: Number(process.env.PRIZE_SHARE_FIVE ?? 0.4), four: Number(process.env.PRIZE_SHARE_FOUR ?? 0.35), three: Number(process.env.PRIZE_SHARE_THREE ?? 0.25) };

app.post(`${api}/subscriptions/webhook`, express.raw({ type: "application/json" }), asyncRoute(async (request, response) => {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) return response.status(503).json({ message: "Stripe is not configured." });
  const signature = request.headers["stripe-signature"];
  if (typeof signature !== "string") return response.status(400).json({ message: "Missing Stripe signature." });
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(request.body as Buffer, signature, process.env.STRIPE_WEBHOOK_SECRET); } catch { return response.status(400).json({ message: "Invalid Stripe webhook signature." }); }
  const object = event.data.object as any;
  if (event.type === "checkout.session.completed") {
    const userId = object.metadata?.userId;
    if (userId && object.subscription) await prisma.subscription.upsert({ where: { userId }, create: { userId, stripeCustomerId: String(object.customer), stripeSubscriptionId: String(object.subscription), planType: object.metadata?.planType === "YEARLY" ? "YEARLY" : "MONTHLY", status: "ACTIVE" }, update: { stripeCustomerId: String(object.customer), stripeSubscriptionId: String(object.subscription), status: "ACTIVE" } });
  }
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = object as any;
    await prisma.subscription.updateMany({ where: { stripeSubscriptionId: subscription.id }, data: { status: event.type === "customer.subscription.deleted" ? "CANCELED" : subscription.status === "active" ? "ACTIVE" : "PAST_DUE", renewalDate: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null } });
  }
  return response.json({ received: true });
}));
app.use(express.json({ limit: "5mb" }));

app.get("/health", (_request, response) => response.json({ status: "ok", service: "digital-heroes-api" }));

app.post(`${api}/auth/signup`, asyncRoute(async (request, response) => {
  const parsed = signupInput.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: "A valid email and password of at least 8 characters are required." });
  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email } })) return response.status(409).json({ message: "An account already exists for this email." });
  if (parsed.data.charityId && !await prisma.charity.findUnique({ where: { id: parsed.data.charityId } })) return response.status(400).json({ message: "Selected charity was not found." });
  const user = await prisma.user.create({ data: { email, passwordHash: hashPassword(parsed.data.password), charitySettings: parsed.data.charityId ? { create: { charityId: parsed.data.charityId, contributionPercentage: parsed.data.contributionPercentage ?? 10 } } : undefined }, include: { subscription: true } });
  return response.status(201).json({ token: createToken(user.id), user: publicUser(user) });
}));
app.post(`${api}/auth/login`, asyncRoute(async (request, response) => {
  const parsed = credentials.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: "A valid email and password are required." });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() }, include: { subscription: true } });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) return response.status(401).json({ message: "Invalid email or password." });
  return response.json({ token: createToken(user.id), user: publicUser(user) });
}));
app.get(`${api}/users/me`, requireUser, asyncRoute(async (_request, response) => response.json({ user: publicUser(response.locals.user) })));
app.put(`${api}/users/me`, requireUser, asyncRoute(async (request, response) => {
  const parsed = profileInput.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid profile details." });
  const user = response.locals.user;
  if (parsed.data.email && parsed.data.email.toLowerCase() !== user.email && await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })) return response.status(409).json({ message: "An account already exists for this email." });
  if (parsed.data.newPassword && !verifyPassword(parsed.data.currentPassword ?? "", user.passwordHash)) return response.status(400).json({ message: "Current password is incorrect." });
  const updated = await prisma.user.update({ where: { id: user.id }, data: { email: parsed.data.email?.toLowerCase(), passwordHash: parsed.data.newPassword ? hashPassword(parsed.data.newPassword) : undefined }, include: { subscription: true } });
  return response.json({ user: publicUser(updated) });
}));

app.get(`${api}/subscriptions/status`, requireUser, asyncRoute(async (_request, response) => response.json({ subscription: response.locals.user.subscription ?? null, active: response.locals.user.subscription?.status === "ACTIVE" })));
app.post(`${api}/subscriptions/checkout`, requireUser, asyncRoute(async (request, response) => {
  const plan = z.enum(["MONTHLY", "YEARLY"]).safeParse(request.body?.planType);
  if (!plan.success) return response.status(400).json({ message: "planType must be MONTHLY or YEARLY." });
  
  // Mock payment mode - create subscription directly without Stripe
  if (useMockPayments) {
    const renewalDate = new Date();
    renewalDate.setMonth(renewalDate.getMonth() + (plan.data === "YEARLY" ? 12 : 1));
    const subscription = await prisma.subscription.upsert({
      where: { userId: response.locals.user.id },
      create: {
        userId: response.locals.user.id,
        planType: plan.data,
        status: "ACTIVE",
        renewalDate,
        stripeCustomerId: "mock-customer",
        stripeSubscriptionId: `mock-sub-${Date.now()}`
      },
      update: {
        planType: plan.data,
        status: "ACTIVE",
        renewalDate,
        stripeSubscriptionId: `mock-sub-${Date.now()}`
      }
    });
    return response.json({ success: true, mock: true, subscription });
  }
  
  // Real Stripe integration
  if (!stripe) return response.status(503).json({ message: "Stripe is not configured." });
  const price = plan.data === "YEARLY" ? process.env.STRIPE_YEARLY_PRICE_ID : process.env.STRIPE_MONTHLY_PRICE_ID;
  if (!price) return response.status(503).json({ message: "Stripe price IDs are not configured." });
  try {
    const session = await stripe.checkout.sessions.create({ mode: "subscription", line_items: [{ price: price.trim(), quantity: 1 }], customer_email: response.locals.user.email, metadata: { userId: response.locals.user.id, planType: plan.data }, success_url: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard?payment=success`, cancel_url: `${process.env.FRONTEND_URL ?? "http://localhost:3000"}/dashboard?payment=cancelled` });
    return response.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Stripe checkout error", error instanceof Error ? error.message : error);
    return response.status(502).json({ message: "Stripe checkout could not be created. Check the selected Price ID and Stripe mode." });
  }
}));

app.get(`${api}/scores`, requireUser, requireActiveSubscriber, asyncRoute(async (_request, response) => response.json({ scores: await prisma.score.findMany({ where: { userId: response.locals.user.id }, orderBy: { scoreDate: "desc" }, take: 5 }) })));
app.post(`${api}/scores`, requireUser, requireActiveSubscriber, asyncRoute(async (request, response) => {
  const parsed = scoreInput.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: "Score must be an integer from 1 to 45 with a valid date." });
  const scoreDate = day(parsed.data.scoreDate);
  try {
    const score = await prisma.$transaction(async (transaction: any) => {
      const duplicate = await transaction.score.findUnique({ where: { userId_scoreDate: { userId: response.locals.user.id, scoreDate } } });
      if (duplicate) throw new Error("DUPLICATE_SCORE_DATE");
      const count = await transaction.score.count({ where: { userId: response.locals.user.id } });
      if (count >= 5) {
        const oldest = await transaction.score.findFirst({ where: { userId: response.locals.user.id }, orderBy: { scoreDate: "asc" } });
        if (oldest) await transaction.score.delete({ where: { id: oldest.id } });
      }
      return transaction.score.create({ data: { userId: response.locals.user.id, scoreValue: parsed.data.scoreValue, scoreDate } });
    });
    return response.status(201).json({ score });
  } catch (error) {
    if (error instanceof Error && error.message === "DUPLICATE_SCORE_DATE") return response.status(400).json({ message: "Entry already exists for this date. Please edit existing record." });
    throw error;
  }
}));
app.put(`${api}/scores/:id`, requireUser, requireActiveSubscriber, asyncRoute(async (request, response) => {
  const parsed = scoreInput.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: "Score must be an integer from 1 to 45 with a valid date." });
  const owned = await prisma.score.findFirst({ where: { id: routeId(request), userId: response.locals.user.id } });
  if (!owned) return response.status(404).json({ message: "Score not found" });
  try {
    return response.json({ score: await prisma.score.update({ where: { id: owned.id }, data: { scoreValue: parsed.data.scoreValue, scoreDate: day(parsed.data.scoreDate) } }) });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return response.status(400).json({ message: "Entry already exists for this date. Please edit existing record." });
    throw error;
  }
}));
app.delete(`${api}/scores/:id`, requireUser, requireActiveSubscriber, asyncRoute(async (request, response) => {
  const deleted = await prisma.score.deleteMany({ where: { id: routeId(request), userId: response.locals.user.id } });
  return deleted.count ? response.status(204).send() : response.status(404).json({ message: "Score not found" });
}));

app.get(`${api}/charities`, asyncRoute(async (request, response) => {
  const search = typeof request.query.search === "string" ? request.query.search : undefined;
  const { page, limit } = pageQuery(request);
  const where = search ? { OR: [{ title: { contains: search, mode: "insensitive" as const } }, { description: { contains: search, mode: "insensitive" as const } }] } : {};
  const [charities, total] = await Promise.all([
    prisma.charity.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.charity.count({ where }),
  ]);
  return response.json({ charities, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}));
app.get(`${api}/charities/spotlight`, asyncRoute(async (_request, response) => response.json({ charities: await prisma.charity.findMany({ where: { spotlightFlag: true }, take: 3 }) })));
app.get(`${api}/charities/:id/events`, asyncRoute(async (request, response) => response.json({ events: await prisma.charityEvent.findMany({ where: { charityId: routeId(request) }, orderBy: { eventDate: "asc" } }) })));
app.get(`${api}/charities/:id`, asyncRoute(async (request, response) => {
  const charity = await prisma.charity.findUnique({ where: { id: routeId(request) }, include: { events: { orderBy: { eventDate: "asc" } } } });
  return charity ? response.json({ charity }) : response.status(404).json({ message: "Charity not found" });
}));
app.post(`${api}/charities/select`, requireUser, requireActiveSubscriber, asyncRoute(async (request, response) => {
  const parsed = selectionInput.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: "Choose a charity and a contribution of at least 10%." });
  return response.json({ setting: await prisma.userCharitySetting.upsert({ where: { userId: response.locals.user.id }, create: { userId: response.locals.user.id, ...parsed.data }, update: parsed.data }) });
}));
app.get(`${api}/charities/my-setting`, requireUser, requireActiveSubscriber, asyncRoute(async (_request, response) => { const setting = await prisma.userCharitySetting.findUnique({ where: { userId: response.locals.user.id }, include: { charity: true } }); return response.json({ setting }); }));
app.post(`${api}/charities/donate`, requireUser, requireActiveSubscriber, asyncRoute(async (request, response) => {
  const parsed = z.object({ charityId: z.string(), amount: z.coerce.number().positive() }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: "A charity and positive donation amount are required." });
  return response.status(201).json({ donation: await prisma.donation.create({ data: { userId: response.locals.user.id, ...parsed.data } }) });
}));
app.post(`${api}/admin/charities`, requireUser, requireAdmin, asyncRoute(async (request, response) => {
  const parsed = charityInput.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: "title and description are required." });
  return response.status(201).json({ charity: await prisma.charity.create({ data: parsed.data }) });
}));
app.put(`${api}/admin/charities/:id`, requireUser, requireAdmin, asyncRoute(async (request, response) => {
  const parsed = charityInput.partial().safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: "Invalid charity details." });
  return response.json({ charity: await prisma.charity.update({ where: { id: routeId(request) }, data: parsed.data }) });
}));
app.delete(`${api}/admin/charities/:id`, requireUser, requireAdmin, asyncRoute(async (request, response) => {
  await prisma.charity.delete({ where: { id: routeId(request) } });
  return response.status(204).send();
}));
app.post(`${api}/admin/charities/:id/events`, requireUser, requireAdmin, asyncRoute(async (request, response) => {
  const parsed = eventInput.safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: "Valid event details are required." });
  return response.status(201).json({ event: await prisma.charityEvent.create({ data: { charityId: routeId(request), ...parsed.data } }) });
}));
app.get(`${api}/admin/users`, requireUser, requireAdmin, asyncRoute(async (request, response) => { const { page, limit } = pageQuery(request); const [users, total] = await prisma.$transaction([prisma.user.findMany({ include: { subscription: true, scores: { orderBy: { scoreDate: "desc" }, take: 5 }, charitySettings: { include: { charity: true } }, donations: { orderBy: { createdAt: "desc" }, take: 5 } }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }), prisma.user.count()]); return response.json({ users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }); }));
app.put(`${api}/admin/users/:id/subscription`, requireUser, requireAdmin, asyncRoute(async (request, response) => {
  const parsed = z.object({ status: z.enum(["ACTIVE", "INACTIVE", "CANCELED", "PAST_DUE"]), planType: z.enum(["MONTHLY", "YEARLY"]) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: "Valid subscription status and plan are required." });
  return response.json({ subscription: await prisma.subscription.upsert({ where: { userId: routeId(request) }, create: { userId: routeId(request), ...parsed.data }, update: parsed.data }) });
}));

app.get(`${api}/draws/upcoming`, asyncRoute(async (_request, response) => {
  const activeSubscribers = await prisma.subscription.count({ where: { status: "ACTIVE" } });
  const nextDraw = await prisma.draw.findFirst({ where: { status: "PUBLISHED", drawDate: { gt: new Date() } }, orderBy: { drawDate: "asc" } });
  return response.json({ drawDate: nextDraw?.drawDate ?? null, prizePoolEstimate: activeSubscribers * poolAmount(), activeSubscribers });
}));
app.get(`${api}/draws/history`, asyncRoute(async (_request, response) => response.json({ draws: await prisma.draw.findMany({ where: { status: "PUBLISHED" }, orderBy: { drawDate: "desc" }, take: 12 }) })));
app.post(`${api}/admin/draws/simulate`, requireUser, requireAdmin, asyncRoute(async (request, response) => response.json({ logic: request.body?.logic === "WEIGHTED" ? "WEIGHTED" : "RANDOM", winningNumbers: Array.from({ length: 5 }, () => Math.floor(Math.random() * 45) + 1), simulated: true })));
app.post(`${api}/admin/draws/publish`, requireUser, requireAdmin, asyncRoute(async (request, response) => {
  const logic = request.body?.logic === "WEIGHTED" ? "WEIGHTED" : "RANDOM";
  const active = await prisma.user.findMany({ where: { subscription: { status: "ACTIVE" } }, include: { scores: { orderBy: { scoreDate: "desc" }, take: 5 } } });
  if (!active.length) return response.status(400).json({ message: "At least one active subscriber is required." });
  const frequency = new Map<number, number>();
  active.flatMap((user: any) => user.scores).forEach((score: any) => frequency.set(score.scoreValue, (frequency.get(score.scoreValue) ?? 0) + 1));
  const numbers: number[] = [];
  while (numbers.length < 5) {
    const candidates = Array.from({ length: 45 }, (_, index) => index + 1).filter((number) => !numbers.includes(number));
    const weighted = logic === "WEIGHTED" ? candidates.reduce((sum, number) => sum + (frequency.get(number) ?? 1), 0) : candidates.length;
    let pick = Math.random() * weighted;
    for (const candidate of candidates) { pick -= logic === "WEIGHTED" ? (frequency.get(candidate) ?? 1) : 1; if (pick <= 0) { numbers.push(candidate); break; } }
  }
  const pool = active.length * poolAmount();
  const previous = await prisma.draw.findFirst({ where: { status: "PUBLISHED" }, orderBy: { drawDate: "desc" } });
  const rollover = Number(previous?.rolloverAmount ?? 0);
  const matches = active.flatMap((user: any) => { const matchedScores = user.scores.filter((score: any) => numbers.includes(score.scoreValue)).length; return matchedScores ? [{ userId: user.id, matches: matchedScores }] : []; });
  const five = matches.filter((match: any) => match.matches === 5); const four = matches.filter((match: any) => match.matches === 4); const three = matches.filter((match: any) => match.matches === 3);
  const fivePool = pool * shares.five + rollover; const rolloverAmount = five.length ? 0 : fivePool;
  const draw = await prisma.$transaction(async (transaction: any) => {
    const created = await transaction.draw.create({ data: { drawDate: new Date(), status: "PUBLISHED", drawLogic: logic, winningNumbers: numbers, totalPoolAmount: pool, rolloverAmount } });
    for (const [tier, winners, amount] of [["FIVE_MATCH", five, fivePool], ["FOUR_MATCH", four, pool * shares.four], ["THREE_MATCH", three, pool * shares.three]] as const) for (const winner of winners) await transaction.winner.create({ data: { drawId: created.id, userId: winner.userId, matchType: tier, prizeAmount: amount / winners.length } });
    return created;
  });
  return response.status(201).json({ draw, winners: { five: five.length, four: four.length, three: three.length } });
}));
app.post(`${api}/winners/proof`, requireUser, requireActiveSubscriber, asyncRoute(async (request, response) => {
  const parsed = z.object({ winnerId: z.string(), proofImageUrl: z.string().url().max(2_000_000) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: "winnerId and a valid proofImageUrl are required." });
  const winner = await prisma.winner.updateMany({ where: { id: parsed.data.winnerId, userId: response.locals.user.id }, data: { proofImageUrl: parsed.data.proofImageUrl, verificationStatus: "PENDING" } });
  return winner.count ? response.json({ submitted: true }) : response.status(404).json({ message: "Winner record not found." });
}));
app.get(`${api}/winners/my-winnings`, requireUser, requireActiveSubscriber, asyncRoute(async (_request, response) => response.json({ winners: await prisma.winner.findMany({ where: { userId: response.locals.user.id }, include: { draw: true }, orderBy: { draw: { drawDate: "desc" } } }) })));
app.get(`${api}/admin/winners`, requireUser, requireAdmin, asyncRoute(async (request, response) => { const { page, limit } = pageQuery(request); const where = { verificationStatus: "PENDING" as const }; const [winners, total] = await prisma.$transaction([prisma.winner.findMany({ where, include: { user: true, draw: true }, orderBy: { id: "desc" }, skip: (page - 1) * limit, take: limit }), prisma.winner.count({ where })]); return response.json({ winners, pagination: { page, limit, total, pages: Math.ceil(total / limit) } }); }));
app.put(`${api}/admin/winners/:id/verify`, requireUser, requireAdmin, asyncRoute(async (request, response) => {
  const status = z.enum(["APPROVED", "REJECTED"]).safeParse(request.body?.verificationStatus);
  if (!status.success) return response.status(400).json({ message: "verificationStatus must be APPROVED or REJECTED." });
  return response.json({ winner: await prisma.winner.update({ where: { id: routeId(request) }, data: { verificationStatus: status.data } }) });
}));
app.put(`${api}/admin/winners/:id/payout`, requireUser, requireAdmin, asyncRoute(async (request, response) => {
  const parsed = z.object({ payoutStatus: z.enum(["PENDING", "PAID"]) }).safeParse(request.body);
  if (!parsed.success) return response.status(400).json({ message: "payoutStatus must be PENDING or PAID." });
  return response.json({ winner: await prisma.winner.update({ where: { id: routeId(request) }, data: { payoutStatus: parsed.data.payoutStatus } }) });
}));
app.get(`${api}/admin/analytics`, requireUser, requireAdmin, asyncRoute(async (_request, response) => {
  const [totalUsers, pool, charityTotals, published] = await Promise.all([prisma.user.count(), prisma.draw.aggregate({ _sum: { totalPoolAmount: true } }), prisma.donation.groupBy({ by: ["charityId"], _sum: { amount: true } }), prisma.draw.count({ where: { status: "PUBLISHED" } })]);
  return response.json({ totalUsers, totalPrizePool: pool._sum.totalPoolAmount ?? 0, charityTotals, drawStats: { published } });
}));

app.use((_request, response) => response.status(404).json({ message: "Route not found" }));
connectDatabase().then(() => app.listen(port, () => console.log(`Digital Heroes API listening on http://localhost:${port}`))).catch((error) => { console.error("DB connection failed", error); process.exitCode = 1; });