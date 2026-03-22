import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaces),
}));

// ─── Workspaces ──────────────────────────────────────────────────────────────

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  ownerUserId: uuid("owner_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerUserId],
    references: [users.id],
  }),
  clients: many(clients),
}));

// ─── Clients ─────────────────────────────────────────────────────────────────

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id")
    .references(() => workspaces.id)
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  logoUrl: text("logo_url"),
  website: text("website"),
  industry: text("industry"),
  country: text("country"),
  brandDescription: text("brand_description"),
  brandVoice: text("brand_voice"),

  // Encrypted API keys per client
  brevoApiKeyEncrypted: text("brevo_api_key_encrypted"),
  brevoSenderEmail: text("brevo_sender_email"),
  brevoSenderName: text("brevo_sender_name"),
  whapiChannelTokenEncrypted: text("whapi_channel_token_encrypted"),
  whapiPhoneNumber: text("whapi_phone_number"),
  googleAdsCustomerId: text("google_ads_customer_id"),
  googleAdsRefreshTokenEncrypted: text("google_ads_refresh_token_encrypted"),
  instantlyApiKeyEncrypted: text("instantly_api_key_encrypted"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const clientsRelations = relations(clients, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [clients.workspaceId],
    references: [workspaces.id],
  }),
  leads: many(leads),
  outreachSequences: many(outreachSequences),
  outreachTemplates: many(outreachTemplates),
  scrapingJobs: many(scrapingJobs),
  complianceSettings: one(complianceSettings),
  unsubscribeLog: many(unsubscribeLog),
  consentLog: many(consentLog),
  dailyMetricsCache: many(dailyMetricsCache),
}));

// ─── Leads ───────────────────────────────────────────────────────────────────

export const leads = pgTable("leads", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  source: text("source").notNull(), // google_maps, manual, csv, linkedin
  companyName: text("company_name").notNull(),
  address: text("address"),
  country: text("country"),
  category: text("category"),
  website: text("website"),
  phone: text("phone"),
  email: text("email"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  emailVerificationResult: text("email_verification_result"),
  googleRating: numeric("google_rating"),
  googleRatingCount: integer("google_rating_count"),
  googlePlaceId: text("google_place_id"),
  facebook: text("facebook"),
  instagram: text("instagram"),
  linkedin: text("linkedin"),
  twitter: text("twitter"),
  youtube: text("youtube"),
  tiktok: text("tiktok"),
  aiSummary: text("ai_summary"),
  status: text("status").default("new").notNull(), // new, contacted, replied, qualified, converted, blocked, bounced
  tags: text("tags").array(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const leadsRelations = relations(leads, ({ one, many }) => ({
  client: one(clients, {
    fields: [leads.clientId],
    references: [clients.id],
  }),
  enrichments: many(leadEnrichments),
  outreachMessages: many(outreachMessages),
  outreachReplies: many(outreachReplies),
  unsubscribeLog: many(unsubscribeLog),
  consentLog: many(consentLog),
}));

// ─── Lead Enrichments ────────────────────────────────────────────────────────

export const leadEnrichments = pgTable("lead_enrichments", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .references(() => leads.id)
    .notNull(),
  type: text("type").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const leadEnrichmentsRelations = relations(
  leadEnrichments,
  ({ one }) => ({
    lead: one(leads, {
      fields: [leadEnrichments.leadId],
      references: [leads.id],
    }),
  })
);

// ─── Outreach Sequences ─────────────────────────────────────────────────────

export const outreachSequences = pgTable("outreach_sequences", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  name: text("name").notNull(),
  channel: text("channel").notNull(), // email, whatsapp, mixed
  status: text("status").default("draft").notNull(), // draft, active, paused, completed
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const outreachSequencesRelations = relations(
  outreachSequences,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [outreachSequences.clientId],
      references: [clients.id],
    }),
    steps: many(sequenceSteps),
    outreachMessages: many(outreachMessages),
  })
);

// ─── Outreach Templates ─────────────────────────────────────────────────────

export const outreachTemplates = pgTable("outreach_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  name: text("name").notNull(),
  channel: text("channel").notNull(), // email, whatsapp
  aiPromptSubject: text("ai_prompt_subject"), // email only
  aiPromptBody: text("ai_prompt_body").notNull(),
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const outreachTemplatesRelations = relations(
  outreachTemplates,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [outreachTemplates.clientId],
      references: [clients.id],
    }),
    sequenceSteps: many(sequenceSteps),
    outreachMessages: many(outreachMessages),
  })
);

// ─── Sequence Steps ──────────────────────────────────────────────────────────

export const sequenceSteps = pgTable("sequence_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  sequenceId: uuid("sequence_id")
    .references(() => outreachSequences.id)
    .notNull(),
  stepOrder: integer("step_order").notNull(),
  channel: text("channel").notNull(), // email, whatsapp
  delayDays: integer("delay_days").default(0).notNull(),
  delayHours: integer("delay_hours").default(0).notNull(),
  templateId: uuid("template_id").references(() => outreachTemplates.id),
  condition: text("condition").default("always").notNull(), // always, if_no_reply, if_opened_no_reply
});

export const sequenceStepsRelations = relations(
  sequenceSteps,
  ({ one, many }) => ({
    sequence: one(outreachSequences, {
      fields: [sequenceSteps.sequenceId],
      references: [outreachSequences.id],
    }),
    template: one(outreachTemplates, {
      fields: [sequenceSteps.templateId],
      references: [outreachTemplates.id],
    }),
    outreachMessages: many(outreachMessages),
  })
);

// ─── Outreach Messages ───────────────────────────────────────────────────────

export const outreachMessages = pgTable("outreach_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .references(() => leads.id)
    .notNull(),
  sequenceId: uuid("sequence_id").references(() => outreachSequences.id),
  stepId: uuid("step_id").references(() => sequenceSteps.id),
  templateId: uuid("template_id").references(() => outreachTemplates.id),
  channel: text("channel").notNull(), // email, whatsapp
  subject: text("subject"),
  bodyPreview: text("body_preview"),
  bodyFull: text("body_full"),
  status: text("status").default("pending").notNull(), // pending, generating, generated, sending, sent, delivered, opened, clicked, replied, bounced, failed
  instantlyCampaignId: text("instantly_campaign_id"),
  instantlyLeadId: text("instantly_lead_id"),
  whapiMessageId: text("whapi_message_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const outreachMessagesRelations = relations(
  outreachMessages,
  ({ one, many }) => ({
    lead: one(leads, {
      fields: [outreachMessages.leadId],
      references: [leads.id],
    }),
    sequence: one(outreachSequences, {
      fields: [outreachMessages.sequenceId],
      references: [outreachSequences.id],
    }),
    step: one(sequenceSteps, {
      fields: [outreachMessages.stepId],
      references: [sequenceSteps.id],
    }),
    template: one(outreachTemplates, {
      fields: [outreachMessages.templateId],
      references: [outreachTemplates.id],
    }),
    replies: many(outreachReplies),
  })
);

// ─── Outreach Replies ────────────────────────────────────────────────────────

export const outreachReplies = pgTable("outreach_replies", {
  id: uuid("id").defaultRandom().primaryKey(),
  messageId: uuid("message_id")
    .references(() => outreachMessages.id)
    .notNull(),
  leadId: uuid("lead_id")
    .references(() => leads.id)
    .notNull(),
  channel: text("channel").notNull(),
  body: text("body").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  sentiment: text("sentiment"), // positive, neutral, negative, unsubscribe
  isRead: boolean("is_read").default(false).notNull(),
});

export const outreachRepliesRelations = relations(
  outreachReplies,
  ({ one }) => ({
    message: one(outreachMessages, {
      fields: [outreachReplies.messageId],
      references: [outreachMessages.id],
    }),
    lead: one(leads, {
      fields: [outreachReplies.leadId],
      references: [leads.id],
    }),
  })
);

// ─── Scraping Jobs ───────────────────────────────────────────────────────────

export const scrapingJobs = pgTable("scraping_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  source: text("source").default("google_maps").notNull(),
  query: text("query").notNull(),
  language: text("language"),
  country: text("country"),
  status: text("status").default("pending").notNull(), // pending, running, completed, failed
  resultsCount: integer("results_count").default(0).notNull(),
  creditsUsed: numeric("credits_used").default("0").notNull(),
  outscraperRequestId: text("outscraper_request_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const scrapingJobsRelations = relations(scrapingJobs, ({ one }) => ({
  client: one(clients, {
    fields: [scrapingJobs.clientId],
    references: [clients.id],
  }),
}));

// ─── Compliance Settings ─────────────────────────────────────────────────────

export const complianceSettings = pgTable("compliance_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .unique()
    .notNull(),
  defaultCountryRules: jsonb("default_country_rules"),
  listaRobinsonEnabled: boolean("lista_robinson_enabled")
    .default(false)
    .notNull(),
  unsubscribeUrlTemplate: text("unsubscribe_url_template"),
  senderPhysicalAddress: text("sender_physical_address"),
  privacyPolicyUrl: text("privacy_policy_url"),
  dpoContactEmail: text("dpo_contact_email"),
});

export const complianceSettingsRelations = relations(
  complianceSettings,
  ({ one }) => ({
    client: one(clients, {
      fields: [complianceSettings.clientId],
      references: [clients.id],
    }),
  })
);

// ─── Unsubscribe Log ─────────────────────────────────────────────────────────

export const unsubscribeLog = pgTable("unsubscribe_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .references(() => leads.id)
    .notNull(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  channel: text("channel").notNull(),
  unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  source: text("source").notNull(), // link_click, manual_request, reply_keyword
});

export const unsubscribeLogRelations = relations(
  unsubscribeLog,
  ({ one }) => ({
    lead: one(leads, {
      fields: [unsubscribeLog.leadId],
      references: [leads.id],
    }),
    client: one(clients, {
      fields: [unsubscribeLog.clientId],
      references: [clients.id],
    }),
  })
);

// ─── Consent Log ─────────────────────────────────────────────────────────────

export const consentLog = pgTable("consent_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .references(() => leads.id)
    .notNull(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  consentType: text("consent_type").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  source: text("source").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});

export const consentLogRelations = relations(consentLog, ({ one }) => ({
  lead: one(leads, {
    fields: [consentLog.leadId],
    references: [leads.id],
  }),
  client: one(clients, {
    fields: [consentLog.clientId],
    references: [clients.id],
  }),
}));

// ─── Daily Metrics Cache ─────────────────────────────────────────────────────

export const dailyMetricsCache = pgTable("daily_metrics_cache", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  metricType: text("metric_type").notNull(),
  date: date("date").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const dailyMetricsCacheRelations = relations(
  dailyMetricsCache,
  ({ one }) => ({
    client: one(clients, {
      fields: [dailyMetricsCache.clientId],
      references: [clients.id],
    }),
  })
);
