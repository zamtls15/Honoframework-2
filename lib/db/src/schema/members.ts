import { pgTable, text, uuid, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const memberTierEnum = pgEnum("member_tier", ["Explorer", "Pioneer", "Vanguard"]);
export const memberStatusEnum = pgEnum("member_status", ["ACTIVE", "PENDING"]);

export const membersTable = pgTable("members", {
  id:            uuid("id").primaryKey().defaultRandom(),
  name:          text("name").notNull(),
  role:          text("role").notNull().default(""),
  email:         text("email").notNull().unique(),
  tier:          memberTierEnum("tier").notNull().default("Explorer"),
  clearance:     text("clearance").notNull().default("INTERNAL"),
  status:        memberStatusEnum("status").notNull().default("PENDING"),
  joined:        text("joined").notNull().default(""),
  avatarUrl:     text("avatar_url"),
  backgroundUrl: text("background_url"),
  createdAt:     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMemberSchema = createInsertSchema(membersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateMemberSchema = insertMemberSchema.partial().omit({ email: true });

export type Member = typeof membersTable.$inferSelect;
export type InsertMember = Omit<typeof membersTable.$inferInsert, "id" | "createdAt" | "updatedAt">;
export type UpdateMember = Partial<Omit<InsertMember, "email">>;
