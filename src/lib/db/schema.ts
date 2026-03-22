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
  real,
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
  qualificationForms: many(qualificationForms),
  videoProjects: many(videoProjects),
  auditProfiles: many(auditProfiles),
  auditJobs: many(auditJobs),
  landingPages: many(landingPages),
  adAccounts: many(adAccounts),
  metaAdAccounts: many(metaAdAccounts),
  workflowTriggers: many(workflowTriggers),
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
  qualificationSubmissions: many(qualificationSubmissions),
  auditResults: many(auditResults),
  score: one(leadScores),
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

// ─── Qualification Forms ────────────────────────────────────────────────────

export const qualificationForms = pgTable("qualification_forms", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  calEventTypeId: text("cal_event_type_id"),
  calEventTypeSlug: text("cal_event_type_slug"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const qualificationFormsRelations = relations(
  qualificationForms,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [qualificationForms.clientId],
      references: [clients.id],
    }),
    steps: many(qualificationFormSteps),
    submissions: many(qualificationSubmissions),
  })
);

export const qualificationFormSteps = pgTable("qualification_form_steps", {
  id: uuid("id").defaultRandom().primaryKey(),
  formId: uuid("form_id").references(() => qualificationForms.id).notNull(),
  stepOrder: integer("step_order").notNull(),
  questionText: text("question_text").notNull(),
  questionType: text("question_type").notNull(), // text, select, radio, number, email, phone
  options: jsonb("options"), // for select/radio: [{value, label}]
  isRequired: boolean("is_required").default(true).notNull(),
  qualificationRules: jsonb("qualification_rules"), // {disqualify_if: {value, operator}}
});

export const qualificationFormStepsRelations = relations(
  qualificationFormSteps,
  ({ one }) => ({
    form: one(qualificationForms, {
      fields: [qualificationFormSteps.formId],
      references: [qualificationForms.id],
    }),
  })
);

export const qualificationSubmissions = pgTable("qualification_submissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  formId: uuid("form_id").references(() => qualificationForms.id).notNull(),
  leadId: uuid("lead_id").references(() => leads.id),
  answers: jsonb("answers").notNull(),
  isQualified: boolean("is_qualified"),
  disqualificationReason: text("disqualification_reason"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  outreachMessageId: uuid("outreach_message_id"),
  calBookingId: text("cal_booking_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const qualificationSubmissionsRelations = relations(
  qualificationSubmissions,
  ({ one }) => ({
    form: one(qualificationForms, {
      fields: [qualificationSubmissions.formId],
      references: [qualificationForms.id],
    }),
    lead: one(leads, {
      fields: [qualificationSubmissions.leadId],
      references: [leads.id],
    }),
  })
);

// ─── Landing Pages ──────────────────────────────────────────────────────────

export const landingPages = pgTable("landing_pages", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  status: text("status").default("draft").notNull(), // draft, deployed, archived
  domain: text("domain"),
  cloudflareScriptName: text("cloudflare_script_name"),
  htmlContent: text("html_content"),
  aiChatHistory: jsonb("ai_chat_history"), // [{role, content}]
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const landingPagesRelations = relations(
  landingPages,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [landingPages.clientId],
      references: [clients.id],
    }),
    variants: many(landingPageVariants),
    experiments: many(abExperiments),
  })
);

// ─── Landing Page Variants ──────────────────────────────────────────────────

export const landingPageVariants = pgTable("landing_page_variants", {
  id: uuid("id").defaultRandom().primaryKey(),
  landingPageId: uuid("landing_page_id")
    .references(() => landingPages.id)
    .notNull(),
  name: text("name").notNull(), // "Control", "Variante A", etc.
  htmlContent: text("html_content"),
  trafficPercent: real("traffic_percent").default(50).notNull(),
  isControl: boolean("is_control").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const landingPageVariantsRelations = relations(
  landingPageVariants,
  ({ one, many }) => ({
    landingPage: one(landingPages, {
      fields: [landingPageVariants.landingPageId],
      references: [landingPages.id],
    }),
    events: many(abExperimentEvents),
  })
);

// ─── A/B Experiments ────────────────────────────────────────────────────────

export const abExperiments = pgTable("ab_experiments", {
  id: uuid("id").defaultRandom().primaryKey(),
  landingPageId: uuid("landing_page_id")
    .references(() => landingPages.id)
    .notNull(),
  name: text("name").notNull(),
  status: text("status").default("draft").notNull(), // draft, running, paused, completed
  winnerVariantId: uuid("winner_variant_id"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const abExperimentsRelations = relations(
  abExperiments,
  ({ one, many }) => ({
    landingPage: one(landingPages, {
      fields: [abExperiments.landingPageId],
      references: [landingPages.id],
    }),
    events: many(abExperimentEvents),
  })
);

// ─── A/B Experiment Events ──────────────────────────────────────────────────

export const abExperimentEvents = pgTable("ab_experiment_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  experimentId: uuid("experiment_id")
    .references(() => abExperiments.id)
    .notNull(),
  variantId: uuid("variant_id")
    .references(() => landingPageVariants.id)
    .notNull(),
  eventType: text("event_type").notNull(), // page_view, form_submit, cta_click
  visitorId: text("visitor_id"), // anonymous cookie/fingerprint
  gclid: text("gclid"),
  fbclid: text("fbclid"),
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const abExperimentEventsRelations = relations(
  abExperimentEvents,
  ({ one }) => ({
    experiment: one(abExperiments, {
      fields: [abExperimentEvents.experimentId],
      references: [abExperiments.id],
    }),
    variant: one(landingPageVariants, {
      fields: [abExperimentEvents.variantId],
      references: [landingPageVariants.id],
    }),
  })
);

// ─── Video Projects ─────────────────────────────────────────────────────────

export const videoProjects = pgTable("video_projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  title: text("title").notNull(),
  sourceUrl: text("source_url"),
  researchData: jsonb("research_data"),
  scripts: jsonb("scripts"), // [{id, text, language, selected}]
  selectedScript: text("selected_script"),
  language: text("language").default("es").notNull(),
  avatarUrl: text("avatar_url"),
  voiceId: text("voice_id"),
  mode: text("mode").default("low").notNull(), // low, premium
  status: text("status").default("draft").notNull(), // draft, researching, scripted, generating_audio, generating_video, completed, failed
  audioUrl: text("audio_url"),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration"), // seconds
  falRequestId: text("fal_request_id"),
  falModelEndpoint: text("fal_model_endpoint"),
  costUsd: numeric("cost_usd"),
  errorMessage: text("error_message"),
  metaAdId: text("meta_ad_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const videoProjectsRelations = relations(
  videoProjects,
  ({ one }) => ({
    client: one(clients, {
      fields: [videoProjects.clientId],
      references: [clients.id],
    }),
  })
);

// ─── Audit Profiles ─────────────────────────────────────────────────────────

export const auditProfiles = pgTable("audit_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  name: text("name").notNull(),
  checksConfig: jsonb("checks_config").notNull(), // {legal: [...], seo: [...], etc}
  categoryWeights: jsonb("category_weights"), // {legal: 40, seo: 30, ...}
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const auditProfilesRelations = relations(
  auditProfiles,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [auditProfiles.clientId],
      references: [clients.id],
    }),
    jobs: many(auditJobs),
  })
);

// ─── Audit Jobs ─────────────────────────────────────────────────────────────

export const auditJobs = pgTable("audit_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id")
    .references(() => clients.id)
    .notNull(),
  profileId: uuid("profile_id")
    .references(() => auditProfiles.id)
    .notNull(),
  status: text("status").default("pending").notNull(), // pending, running, completed, failed
  totalUrls: integer("total_urls").default(0),
  completedUrls: integer("completed_urls").default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const auditJobsRelations = relations(
  auditJobs,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [auditJobs.clientId],
      references: [clients.id],
    }),
    profile: one(auditProfiles, {
      fields: [auditJobs.profileId],
      references: [auditProfiles.id],
    }),
    results: many(auditResults),
  })
);

// ─── Audit Results ──────────────────────────────────────────────────────────

export const auditResults = pgTable("audit_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .references(() => auditJobs.id)
    .notNull(),
  leadId: uuid("lead_id").references(() => leads.id),
  url: text("url").notNull(),
  overallScore: integer("overall_score"),
  categoryScores: jsonb("category_scores"), // {legal: 80, seo: 60, ...}
  issues: jsonb("issues"), // [{category, severity, message, details}]
  outreachVariables: jsonb("outreach_variables"), // {{audit_score}}, {{missing_legal_pages}}, etc
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const auditResultsRelations = relations(
  auditResults,
  ({ one }) => ({
    job: one(auditJobs, {
      fields: [auditResults.jobId],
      references: [auditJobs.id],
    }),
    lead: one(leads, {
      fields: [auditResults.leadId],
      references: [leads.id],
    }),
  })
);

// ─── Google Ads ─────────────────────────────────────────────────────────────

export const adAccounts = pgTable("ad_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  googleCustomerId: text("google_customer_id").notNull(),
  name: text("name"),
  currency: text("currency"),
  timezone: text("timezone"),
  oauthRefreshToken: text("oauth_refresh_token"),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adAccountsRelations = relations(adAccounts, ({ one, many }) => ({
  client: one(clients, {
    fields: [adAccounts.clientId],
    references: [clients.id],
  }),
  campaigns: many(adCampaigns),
  optimizationLogs: many(adOptimizationLog),
}));

export const adCampaigns = pgTable("ad_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  adAccountId: uuid("ad_account_id").references(() => adAccounts.id).notNull(),
  googleCampaignId: text("google_campaign_id"),
  name: text("name").notNull(),
  status: text("status").default("enabled").notNull(),
  budgetDailyMicros: numeric("budget_daily_micros"),
  biddingStrategy: text("bidding_strategy"),
  channelType: text("channel_type"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adCampaignsRelations = relations(adCampaigns, ({ one, many }) => ({
  adAccount: one(adAccounts, {
    fields: [adCampaigns.adAccountId],
    references: [adAccounts.id],
  }),
  adGroups: many(adGroups),
}));

export const adGroups = pgTable("ad_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  adCampaignId: uuid("ad_campaign_id").references(() => adCampaigns.id).notNull(),
  googleAdgroupId: text("google_adgroup_id"),
  name: text("name").notNull(),
  status: text("status").default("enabled").notNull(),
  targetKeywordsDescription: text("target_keywords_description"),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});

export const adGroupsRelations = relations(adGroups, ({ one, many }) => ({
  adCampaign: one(adCampaigns, {
    fields: [adGroups.adCampaignId],
    references: [adCampaigns.id],
  }),
  keywords: many(adGroupKeywords),
  ads: many(adGroupAds),
}));

export const adGroupKeywords = pgTable("ad_group_keywords", {
  id: uuid("id").defaultRandom().primaryKey(),
  adGroupId: uuid("ad_group_id").references(() => adGroups.id).notNull(),
  googleCriterionId: text("google_criterion_id"),
  keywordText: text("keyword_text").notNull(),
  matchType: text("match_type").default("broad").notNull(),
  status: text("status").default("enabled").notNull(),
  bidMicros: numeric("bid_micros"),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});

export const adGroupKeywordsRelations = relations(adGroupKeywords, ({ one, many }) => ({
  adGroup: one(adGroups, {
    fields: [adGroupKeywords.adGroupId],
    references: [adGroups.id],
  }),
  metrics: many(adGroupKeywordsMetrics),
}));

export const adGroupKeywordsMetrics = pgTable("ad_group_keywords_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  keywordId: uuid("keyword_id").references(() => adGroupKeywords.id).notNull(),
  date: date("date").notNull(),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  ctr: numeric("ctr"),
  conversions: numeric("conversions"),
  conversionRate: numeric("conversion_rate"),
  costPerConversion: numeric("cost_per_conversion"),
  costMicros: numeric("cost_micros"),
  averageCpc: numeric("average_cpc"),
});

export const adGroupKeywordsMetricsRelations = relations(adGroupKeywordsMetrics, ({ one }) => ({
  keyword: one(adGroupKeywords, {
    fields: [adGroupKeywordsMetrics.keywordId],
    references: [adGroupKeywords.id],
  }),
}));

export const adGroupAds = pgTable("ad_group_ads", {
  id: uuid("id").defaultRandom().primaryKey(),
  adGroupId: uuid("ad_group_id").references(() => adGroups.id).notNull(),
  googleAdId: text("google_ad_id"),
  headlines: jsonb("headlines"),
  descriptions: jsonb("descriptions"),
  finalUrls: jsonb("final_urls"),
  status: text("status").default("enabled").notNull(),
  adType: text("ad_type"),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});

export const adGroupAdsRelations = relations(adGroupAds, ({ one, many }) => ({
  adGroup: one(adGroups, {
    fields: [adGroupAds.adGroupId],
    references: [adGroups.id],
  }),
  metrics: many(adGroupAdsMetrics),
}));

export const adGroupAdsMetrics = pgTable("ad_group_ads_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  adId: uuid("ad_id").references(() => adGroupAds.id).notNull(),
  date: date("date").notNull(),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  ctr: numeric("ctr"),
  conversions: numeric("conversions"),
  conversionRate: numeric("conversion_rate"),
  costMicros: numeric("cost_micros"),
});

export const adGroupAdsMetricsRelations = relations(adGroupAdsMetrics, ({ one }) => ({
  ad: one(adGroupAds, {
    fields: [adGroupAdsMetrics.adId],
    references: [adGroupAds.id],
  }),
}));

export const adOptimizationLog = pgTable("ad_optimization_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  adAccountId: uuid("ad_account_id").references(() => adAccounts.id).notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  action: text("action").notNull(),
  reason: text("reason"),
  wasAuto: boolean("was_auto").default(false),
  approvedByUser: boolean("approved_by_user"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const adOptimizationLogRelations = relations(adOptimizationLog, ({ one }) => ({
  adAccount: one(adAccounts, {
    fields: [adOptimizationLog.adAccountId],
    references: [adAccounts.id],
  }),
}));

// ─── Meta Ads ───────────────────────────────────────────────────────────────

export const metaAdAccounts = pgTable("meta_ad_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  metaAccountId: text("meta_account_id").notNull(),
  name: text("name"),
  currency: text("currency"),
  timezone: text("timezone"),
  metaPixelId: text("meta_pixel_id"),
  oauthAccessToken: text("oauth_access_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const metaAdAccountsRelations = relations(metaAdAccounts, ({ one, many }) => ({
  client: one(clients, {
    fields: [metaAdAccounts.clientId],
    references: [clients.id],
  }),
  campaigns: many(metaCampaigns),
  creatives: many(metaAdCreatives),
}));

export const metaCampaigns = pgTable("meta_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  metaAdAccountId: uuid("meta_ad_account_id").references(() => metaAdAccounts.id).notNull(),
  metaCampaignId: text("meta_campaign_id"),
  name: text("name").notNull(),
  status: text("status").default("ACTIVE").notNull(),
  objective: text("objective"),
  dailyBudgetCents: integer("daily_budget_cents"),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const metaCampaignsRelations = relations(metaCampaigns, ({ one, many }) => ({
  metaAdAccount: one(metaAdAccounts, {
    fields: [metaCampaigns.metaAdAccountId],
    references: [metaAdAccounts.id],
  }),
  adSets: many(metaAdSets),
}));

export const metaAdSets = pgTable("meta_ad_sets", {
  id: uuid("id").defaultRandom().primaryKey(),
  metaCampaignId: uuid("meta_campaign_id").references(() => metaCampaigns.id).notNull(),
  metaAdsetId: text("meta_adset_id"),
  name: text("name").notNull(),
  status: text("status").default("ACTIVE").notNull(),
  dailyBudgetCents: integer("daily_budget_cents"),
  optimizationGoal: text("optimization_goal"),
  targeting: jsonb("targeting"),
  placements: jsonb("placements"),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});

export const metaAdSetsRelations = relations(metaAdSets, ({ one, many }) => ({
  metaCampaign: one(metaCampaigns, {
    fields: [metaAdSets.metaCampaignId],
    references: [metaCampaigns.id],
  }),
  ads: many(metaAds),
}));

export const metaAds = pgTable("meta_ads", {
  id: uuid("id").defaultRandom().primaryKey(),
  metaAdSetId: uuid("meta_ad_set_id").references(() => metaAdSets.id).notNull(),
  metaAdId: text("meta_ad_id"),
  name: text("name").notNull(),
  status: text("status").default("ACTIVE").notNull(),
  creativeId: text("creative_id"),
  syncedAt: timestamp("synced_at", { withTimezone: true }),
});

export const metaAdsRelations = relations(metaAds, ({ one, many }) => ({
  metaAdSet: one(metaAdSets, {
    fields: [metaAds.metaAdSetId],
    references: [metaAdSets.id],
  }),
  metrics: many(metaAdsMetrics),
}));

export const metaAdCreatives = pgTable("meta_ad_creatives", {
  id: uuid("id").defaultRandom().primaryKey(),
  metaAdAccountId: uuid("meta_ad_account_id").references(() => metaAdAccounts.id).notNull(),
  metaCreativeId: text("meta_creative_id"),
  name: text("name"),
  type: text("type"), // image, video, carousel
  imageHash: text("image_hash"),
  videoId: text("video_id"),
  body: text("body"),
  title: text("title"),
  linkUrl: text("link_url"),
  callToAction: text("call_to_action"),
  thumbnailUrl: text("thumbnail_url"),
});

export const metaAdCreativesRelations = relations(metaAdCreatives, ({ one }) => ({
  metaAdAccount: one(metaAdAccounts, {
    fields: [metaAdCreatives.metaAdAccountId],
    references: [metaAdAccounts.id],
  }),
}));

export const metaAdsMetrics = pgTable("meta_ads_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  metaAdId: uuid("meta_ad_id").references(() => metaAds.id).notNull(),
  date: date("date").notNull(),
  impressions: integer("impressions").default(0),
  reach: integer("reach").default(0),
  clicks: integer("clicks").default(0),
  ctr: numeric("ctr"),
  spend: numeric("spend"),
  cpc: numeric("cpc"),
  conversions: numeric("conversions"),
  costPerConversion: numeric("cost_per_conversion"),
  purchaseRoas: numeric("purchase_roas"),
});

export const metaAdsMetricsRelations = relations(metaAdsMetrics, ({ one }) => ({
  metaAd: one(metaAds, {
    fields: [metaAdsMetrics.metaAdId],
    references: [metaAds.id],
  }),
}));

// ─── Lead Scores ────────────────────────────────────────────────────────────

export const leadScores = pgTable("lead_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  leadId: uuid("lead_id")
    .references(() => leads.id)
    .notNull()
    .unique(),
  score: integer("score").default(0).notNull(),
  emailOpens: integer("email_opens").default(0),
  emailClicks: integer("email_clicks").default(0),
  emailReplies: integer("email_replies").default(0),
  formSubmissions: integer("form_submissions").default(0),
  websiteVisits: integer("website_visits").default(0),
  lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const leadScoresRelations = relations(leadScores, ({ one }) => ({
  lead: one(leads, {
    fields: [leadScores.leadId],
    references: [leads.id],
  }),
}));

// ─── Workflow Triggers ─────────────────────────────────────────────────────

export const workflowTriggers = pgTable("workflow_triggers", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").references(() => clients.id).notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  triggerType: text("trigger_type").notNull(), // lead_created, email_replied, form_submitted, status_changed, score_threshold
  triggerConfig: jsonb("trigger_config"), // {fromStatus, toStatus} or {minScore} etc
  actionType: text("action_type").notNull(), // add_to_sequence, change_status, send_notification, tag_lead
  actionConfig: jsonb("action_config"), // {sequenceId} or {newStatus} or {message} etc
  executionCount: integer("execution_count").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const workflowTriggersRelations = relations(
  workflowTriggers,
  ({ one }) => ({
    client: one(clients, {
      fields: [workflowTriggers.clientId],
      references: [clients.id],
    }),
  })
);
