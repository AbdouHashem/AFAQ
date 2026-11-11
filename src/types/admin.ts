import type { AfaqEvent } from './event';

export interface AdminDashboardStats {
  draftEventsCount: number;
  publishedEventsCount: number;
  hiddenEventsCount: number;
  totalRegistrationsCount: number;
  upcomingEventsCount: number;
  totalUsersCount: number;
}

export interface AdminRecentRegistration {
  id: string;
  userName: string;
  userEmail: string;
  eventId: string;
  eventTitle: string;
  createdAt: string;
  dateArabic: string;
  timeArabic: string;
}

export interface AdminDashboardData {
  stats: AdminDashboardStats;
  recentRegistrations: AdminRecentRegistration[];
}

export interface AdminEventItem extends AfaqEvent {
  registrationsCount: number;
}

export interface AdminEventRegistrationItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  eventId: string;
  eventTitle: string;
  createdAt: string;
  dateArabic: string;
  timeArabic: string;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  dateArabic: string;
  timeArabic: string;
  registrationsCount: number;
}
