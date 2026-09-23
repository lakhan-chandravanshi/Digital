import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "./prisma.js";

const secret = process.env.AUTH_SECRET ?? "digital-heroes-development-secret";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function createToken(userId: string) {
  const payload = Buffer.from(userId).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}
function readToken(request: Request) {
  const value = request.headers.authorization;
  if (!value?.startsWith("Bearer ")) return null;
  const [payload, signature] = value.slice(7).split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature !== expected) return null;
  return Buffer.from(payload, "base64url").toString();
}
export async function requireUser(_request: Request, response: Response, next: NextFunction) {
  const userId = readToken(_request);
  if (!userId) return response.status(401).json({ message: "Authentication required" });
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { subscription: true } });
  if (!user) return response.status(401).json({ message: "Authentication required" });
  response.locals.user = user;
  return next();
}
export function requireAdmin(_request: Request, response: Response, next: NextFunction) {
  if (response.locals.user?.role !== "ADMIN") return response.status(403).json({ message: "Administrator access required" });
  return next();
}

export function requireActiveSubscriber(_request: Request, response: Response, next: NextFunction) {
  if (response.locals.user?.role === "ADMIN" || response.locals.user?.subscription?.status === "ACTIVE") return next();
  return response.status(402).json({ message: "An active subscription is required for this feature." });
}