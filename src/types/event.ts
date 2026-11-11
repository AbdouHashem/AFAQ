export type EventCategory = 'workshop' | 'course' | 'event';

export type EventStatus = 'draft' | 'published' | 'hidden';

export interface AfaqEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  categoryLabel: string;
  dateArabic: string;
  timeArabic: string;
  startsAt: string;
  location: string;
  organizer: string;
  coverImageUrl?: string;
  status: EventStatus;
}

export interface CategoryMeta {
  id: EventCategory;
  label: string;
  pluralLabel: string;
  description: string;
  countLabel: string;
}

export interface UserRegistrationItem {
  id: string;
  eventId: string;
  createdAt: string;
  eventTitle: string;
  eventCategory: EventCategory;
  categoryLabel: string;
  eventStartsAt: string;
  dateArabic: string;
  timeArabic: string;
  eventLocation: string;
  eventOrganizer: string;
  eventCoverImageUrl?: string;
}
