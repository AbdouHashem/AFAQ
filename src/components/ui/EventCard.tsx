import React, { useState } from 'react';
import { ArrowLeft, Calendar, GraduationCap, MapPin, Users } from 'lucide-react';
import type { AfaqEvent } from '../../types/event';

export interface EventCardProps {
  event: AfaqEvent;
  detailsLabel?: string;
  onViewDetails?: (event: AfaqEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  detailsLabel = 'عرض التفاصيل',
  onViewDetails,
}) => {
  const [imageError, setImageError] = useState(false);

  const handleDetailsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onViewDetails) {
      e.preventDefault();
      onViewDetails(event);
    }
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
      {/* 16:9 Cover Image + Category Badge */}
      <div className="relative aspect-video w-full overflow-hidden bg-brand-50">
        {event.coverImageUrl && !imageError ? (
          <img
            src={event.coverImageUrl}
            alt={event.title}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-brand-50 via-white to-accent-50 px-6 text-center">
            <GraduationCap
              className="h-9 w-9 text-brand-400"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span className="font-ui text-small font-semibold text-brand-700 line-clamp-1">
              {event.title}
            </span>
          </div>
        )}

        {/* Category Badge over Image */}
        <span className="absolute top-3 end-3 inline-flex items-center rounded-full bg-accent-500 px-3 py-1 font-ui text-caption font-semibold text-brand-900 shadow-xs whitespace-nowrap">
          {event.categoryLabel}
        </span>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="text-h4 font-bold text-brand-900 leading-snug line-clamp-2 group-hover:text-brand-700 transition-colors">
          {event.title}
        </h3>

        <div className="flex flex-col gap-2 text-small text-slate-600">
          <div className="flex items-center gap-2">
            <Users
              className="h-4 w-4 shrink-0 text-brand-500"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="truncate font-medium text-slate-700">{event.organizer}</span>
          </div>

          <div className="flex items-center gap-2">
            <MapPin
              className="h-4 w-4 shrink-0 text-brand-500"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="truncate">{event.location}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar
              className="h-4 w-4 shrink-0 text-brand-500"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="tabular-nums">{event.dateArabic}</span>
          </div>
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100">
          <a
            href={`/events/${event.id}`}
            onClick={handleDetailsClick}
            className="inline-flex items-center gap-1.5 font-ui text-small font-semibold text-accent-800 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded-sm transition-colors"
          >
            <span>{detailsLabel}</span>
            <ArrowLeft
              className="h-4 w-4 shrink-0 transition-transform duration-150 group-hover:-translate-x-0.5"
              strokeWidth={2}
              aria-hidden="true"
            />
          </a>
        </div>
      </div>
    </article>
  );
};
