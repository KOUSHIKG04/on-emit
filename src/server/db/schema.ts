import {
  boolean,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const corsairIntegrations = pgTable("corsair_integrations", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: text("name").notNull(),
  config: jsonb("config").notNull().default({}),
  dek: text("dek"),
});

export const corsairAccounts = pgTable(
  "corsair_accounts",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    tenantId: text("tenant_id").notNull(),
    integrationId: text("integration_id")
      .notNull()
      .references(() => corsairIntegrations.id),
    config: jsonb("config").notNull().default({}),
    dek: text("dek"),
  },
  (table) => [
    index("corsair_accounts_tenant_id_idx").on(table.tenantId),
    index("corsair_accounts_integration_id_idx").on(table.integrationId),
  ],
);

export const corsairEntities = pgTable(
  "corsair_entities",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    accountId: text("account_id")
      .notNull()
      .references(() => corsairAccounts.id),
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    version: text("version").notNull(),
    data: jsonb("data").notNull().default({}),
  },
  (table) => [index("corsair_entities_account_id_idx").on(table.accountId)],
);

export const corsairEvents = pgTable(
  "corsair_events",
  {
    id: text("id").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    accountId: text("account_id")
      .notNull()
      .references(() => corsairAccounts.id),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull().default({}),
    status: text("status"),
  },
  (table) => [index("corsair_events_account_id_idx").on(table.accountId)],
);

export const corsairEmailPriorities = pgTable(
  "corsair_email_priorities",
  {
    tenantId: text("tenant_id").notNull(),
    threadId: text("thread_id").notNull(),
    messageId: text("message_id").notNull(),
    priority: text("priority").notNull(),
    reason: text("reason").notNull(),
    source: text("source").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.tenantId, table.threadId] }),
    index("corsair_email_priorities_tenant_idx").on(table.tenantId),
    index("corsair_email_priorities_priority_idx").on(
      table.tenantId,
      table.priority,
    ),
  ],
);

export const corsairAiSettings = pgTable("corsair_ai_settings", {
  userId: text("user_id").primaryKey(),
  provider: text("provider").notNull().default("gemini"),
  source: text("source").notNull().default("default"),
  model: text("model").notNull().default("gemini-3.5-flash"),
  encryptedApiKey: text("encrypted_api_key"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const corsairAiProviderKeys = pgTable(
  "corsair_ai_provider_keys",
  {
    userId: text("user_id").notNull(),
    provider: text("provider").notNull(),
    encryptedApiKey: text("encrypted_api_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.provider] })],
);

export const corsairGoogleAccounts = pgTable(
  "corsair_google_accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    corsairTenantId: text("corsair_tenant_id").notNull(),
    label: text("label").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("corsair_google_accounts_user_id_idx").on(table.userId),
    index("corsair_google_accounts_active_idx").on(
      table.userId,
      table.isActive,
    ),
    uniqueIndex("corsair_google_accounts_tenant_id_unique").on(
      table.corsairTenantId,
    ),
  ],
);
