import { relations } from 'drizzle-orm';
import {
  customType,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const eventCategoryEnum = pgEnum('event_category', [
  'workshop',
  'course',
  'event',
]);

export const eventStatusEnum = pgEnum('event_status', [
  'draft',
  'published',
  'hidden',
]);

export const registrationStatusEnum = pgEnum('registration_status', [
  'active',
  'cancelled',
]);

export const userRoleEnum = pgEnum('user_role', ['admin', 'user']);

export const users = pgTable('users', {
  id: text('id').primaryKey(), // Firebase Auth UID
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const userRoles = pgTable('user_roles', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').default('user').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const events = pgTable('events', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: eventCategoryEnum('category').notNull(),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  location: text('location').notNull(),
  organizer: text('organizer').notNull(),
  coverImageUrl: text('cover_image_url'),
  status: eventStatusEnum('status').default('draft').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const eventMedia = pgTable('event_media', {
  id: uuid('id').defaultRandom().primaryKey(),
  mimeType: text('mime_type').notNull(),
  data: bytea('data').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const registrations = pgTable(
  'registrations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    status: registrationStatusEnum('status').default('active').notNull(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique('registrations_user_event_unique').on(table.userId, table.eventId),
  ]
);

export const usersRelations = relations(users, ({ many, one }) => ({
  registrations: many(registrations),
  userRole: one(userRoles, {
    fields: [users.id],
    references: [userRoles.userId],
  }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, {
    fields: [userRoles.userId],
    references: [users.id],
  }),
}));

export const eventsRelations = relations(events, ({ many }) => ({
  registrations: many(registrations),
}));

export const registrationsRelations = relations(registrations, ({ one }) => ({
  user: one(users, {
    fields: [registrations.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [registrations.eventId],
    references: [events.id],
  }),
}));
