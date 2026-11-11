# AFAQ BRD (v2)

Updated version of the corrected BRD. It adds Google-only sign-in, the category "Explore" flow, the All Events page with filters and back navigation, the technical stack for Google AI Studio, security rules, the design system, the build phases, and deployment.

## 1. Product Overview

**Product:** AFAQ (آفاق), an Arabic-first web application for young people in Fayoum, Egypt.

**Problem:** Young people find events and learning opportunities through scattered social media posts and groups. This makes it hard to find opportunities, see full details, and register in one place.

**Solution:** One platform where users can discover events, search and filter them, view details, register, and see their registrations. Admins manage events from a dashboard.

**Users:** Primary users are young people in Fayoum. Secondary users are event admins.

**Tagline:** اكتشف آفاقك الجديدة (Discover What's Next).

## 2. MVP Scope

**In scope:**

- Home page and event discovery, including browse by category
- All Events page with search, filters, and back navigation
- Event details
- Login with a Google account (first login creates the user record)
- Register for an event and view my registrations
- Admin dashboard to create, edit, publish, hide, and delete events
- Admin view of event registrations (read-only)

**Out of scope (future):**

- Cancelling a registration
- User profile page
- Email and password sign-in
- Organizer accounts
- Online payments and ticketing
- QR code check-in
- Notifications
- Reviews and ratings
- Mobile apps
- Exporting registrations

## 3. User Roles and Business Rules

### 3.1 User Roles

**Visitor (not logged in)**

- Browse published events, search, filter, and view details.
- Log in with Google.

**Attendee (logged in)**

- Everything a visitor can do.
- Register for events and view my registrations.

**Admin**

- Open the admin dashboard.
- Create, edit, publish, hide, and delete events.
- View registrations for all events.

### 3.2 Business Rules

- Visitors see only published events.
- Only logged-in users can register for events.
- A user cannot register for the same event twice.
- Only admins can manage events.
- Users see only their own registrations. Admins see registrations for all events.
- Deleting an event removes it and its registrations for good.
- There is no public way to become an admin. The first admin is assigned manually, and every admin action is checked on the server.

## 4. Event Information

Every event has the fields below. A registration links one user to one event and stores the time it was made.

| Field | Required | Notes |
| --- | --- | --- |
| Title | Yes | Short event name |
| Description | Yes | What the event is about |
| Category | Yes | Workshop, Course, or Event |
| Date and time | Yes | Start date and time |
| Location | Yes | Venue name and area in Fayoum |
| Organizer | Yes | Name as plain text. Shown on cards and details, searchable, and used as a filter |
| Cover image | No | One image |
| Status | Yes | Draft, Published, or Hidden |

**Event statuses:**

| Status | Visible to visitors | Meaning |
| --- | --- | --- |
| Draft | No | Saved by an admin, never published |
| Published | Yes | Live on the platform |
| Hidden | No | Was published, now taken down but kept |

## 5. Pages and Key User Flows

**Public pages:** Home, Events (All Events), Event Details, Login.

**Attendee pages:** My Registrations.

**Admin pages:** Dashboard, Events List, Add Event, Edit Event, Registrations List.

### 5.1 Site map

- Public
  - Home
  - Events
    - Event Details
  - Login
- Attendee (logged in)
  - My Registrations
- Admin
  - Dashboard
  - Events List
    - Add Event
    - Edit Event
  - Registrations List

### 5.2 Home page

- Hero with the tagline, a "start exploring" button, and a search field.
- Latest events section (6 cards).
- **Browse by category** section with three cards (Workshop, Course, Event). Each card has an **Explore** button that opens the All Events page with that category already applied (`/events?category=...`).
- "How to register" section with three steps.

### 5.3 All Events page (`/events`)

- **Back** button at the top. It returns to the previous page (Home if the user came from there).
- Page title "All Events" and a search field that matches the title or the organizer.
- **Filters:** category chips (All, Workshop, Course, Event), an organizer dropdown built from the organizers that exist, and a "Clear filters" button.
- The category filter is applied automatically when the page opens from an Explore button.
- Event cards show: cover image, category badge, title, **organizer**, date, location, and a "Details" link.
- Only published events appear.
- Empty state with a clear Arabic message and a button to clear the filters.

### 5.4 Event Details page (`/events/:id`)

- Large cover image, title, category, date and time, location, **organizer**, and the full description.
- A fixed "Register now" button.
- **Back** button that returns to the list and keeps the search and filters that were applied.
- If the event does not exist: a "not found" page with a back button.

### 5.5 Key flows

**Flow 1: Discover and register for an event**

1. Home
2. Browse events (or Explore a category)
3. Event details
4. Log in with Google
5. Confirm registration
6. My Registrations

**Flow 2: Admin creates an event**

1. Admin login
2. Admin dashboard
3. Add event and enter details
4. Save as Draft or Publish
5. A published event appears on the platform

**Flow 3: User views registrations**

1. Log in
2. My Registrations
3. Open an event

## 6. User Stories

| ID | User story |
| --- | --- |
| US-01 | As a visitor, I want to browse events so that I can discover opportunities around me. |
| US-02 | As a visitor, I want to search and filter events by category and organizer so that I can find relevant ones easily. |
| US-03 | As a visitor, I want to view event details so that I can decide whether to attend. |
| US-04 | As an attendee, I want to register for an event so that I can reserve my place. |
| US-05 | As an attendee, I want to view my registrations so that I can keep track of events I joined. |
| US-06 | As an admin, I want to manage events so that the platform stays up to date. |
| US-07 | As an admin, I want to view event registrations so that I can manage attendance. |
| US-08 | As a visitor, I want to explore a category from the home page so that I can see all its events in one place. |

## 7. MVP Success Criteria

The MVP works when:

- Visitors can discover and view published events.
- The Explore button opens the All Events page with the right category applied, and Back works on the list and details pages.
- Users can log in with Google.
- Logged-in users can register for events, and duplicate registrations are blocked.
- Users can view their registrations.
- Admins can manage events and view registrations.
- Access permissions are enforced on the server, not only in the interface.

## 8. Non-Functional Requirements

- **Language and layout:** Arabic first, full right-to-left layout (`dir="rtl"`, `lang="ar"`). Directional arrows and icons flip with the layout.
- **Responsive:** Mobile-first, works on mobile, tablet, and desktop.
- **States:** Loading, empty, and error states for every list and page, with Arabic messages.
- **Validation:** Arabic validation messages next to every form field. The server repeats the same checks.
- **Accessibility:** Visible focus ring, alt text for images, enough color contrast, keyboard navigation.
- **SEO:** Arabic page title and meta description on every page.

## 9. Design System (Tailwind and Untitled UI style)

Values are defined as design tokens (CSS variables linked to the Tailwind setup). No color or size is written directly inside components. Only the two primary colors come from the brand board; the scales around them are proposed.

**Colors**

| Token | Role | Primary | Scale |
| --- | --- | --- | --- |
| brand (Deep Blue) | Trust and depth | #123B5D (700) | 50 #F1F3F5, 100 #DEE4E8, 200 #BDC8D2, 300 #94A7B6, 400 #6C859B, 500 #41627D, 600 #254B6A, 800 #0E2F4A, 900 #0B253A |
| accent (Turquoise) | Energy and ambition | #20C5C2 (500) | 50 #EDFAFA, 100 #D7F5F4, 200 #B3EBEA, 300 #84DFDD, 400 #51D2CF, 600 #1CA9A7, 700 #168A88, 800 #126E6D, 900 #0D5351 |
| neutral | Text, borders, backgrounds | Tailwind slate | White page background with generous white space |
| semantic | Status | success green-600, warning amber-500, error red-600 | |

**Typography:** IBM Plex Sans Arabic for headings and body, Cairo for secondary text and UI (buttons, fields, badges). Sizes: Display 48/56, H1 36, H2 30, H3 24, H4 20, body-lg 18, body 16, small 14, caption 12. Paragraph line-height 1.7. Weights 400, 500, 600, 700.

**Shape and spacing:** Spacing in multiples of 4px. Radius: sm 8px, md 12px (fields), lg 16px (cards), 2xl 24px (hero), full (buttons, badges). Light blue-tinted shadows (xs, sm, md). Container max width 1280px.

**Components**

- Button primary: brand-700 background, white text, pill shape, directional arrow. Secondary: accent-500 with brand-900 text. Outline: brand-700 border.
- Search input: 48px height, rounded, search icon. Select with the same style. Filter chip: accent-50 background, accent-200 border, remove (×) mark.
- Event card: 16:9 image, category badge, title, organizer, location, Arabic date, and "Details" link.
- Hero: Fayoum landscape image (lake, palms, mountains) under a dark blue gradient so the text stays readable.
- Every component has hover, focus (turquoise ring), disabled, and error states.

**Icons:** Lucide, outline only.

**Brand personality:** Youthful, futuristic, local with a Fayoum spirit.

## 10. Data Model

| Table | Fields |
| --- | --- |
| users | id (from the sign-in system), name, email (unique), created_at |
| events | id, title, description, category (workshop / course / event), starts_at, location, organizer, cover_image_url, status (draft / published / hidden, default draft), created_at |
| registrations | id, user_id, event_id (cascade delete), created_at, unique on (user_id, event_id) |
| user_roles | user_id, role (admin / user) |

## 11. Security Rules

- Access rules run in server code, not in the interface.
- The server identifies the user from the verified session. It never trusts a user id or role sent by the browser.
- Visitors read only events with status Published.
- A user reads and creates only their own registrations. A user cannot edit or delete registrations.
- Admin routes (`/admin/*`) and admin actions check the role from the `user_roles` table on every request. Anyone else gets "Not authorized".
- Roles are never stored in the interface or in the users table.
- No public page or endpoint can make a user an admin. The first admin is assigned manually.
- Cover image upload is allowed for admins only, limited to images and a maximum size.

## 12. Technical Approach

- **Builder:** Google AI Studio (Build mode).
- **Front end:** React, TypeScript, Tailwind CSS, Lucide icons.
- **Database:** Cloud SQL for PostgreSQL, enabled from the Enable Database card.
- **Authentication:** Google sign-in through Firebase Authentication.
- **Image storage:** Cloud Storage if available. If not, an image URL field replaces the upload.
- **Hosting:** Publish from AI Studio, which deploys to Cloud Run.
- **Not used:** Supabase, Vercel, and GitHub are not required in this path.

## 13. Build Phases

| Step | Content |
| --- | --- |
| 1 | Core: BRD, design system, tokens, base components, header, footer, Home with sample data |
| 2 | All Events and Event Details with sample data |
| 3 | Database (Cloud SQL), sample events moved to the database |
| 4 | Google sign-in |
| 5 | Registration and My Registrations |
| 6 | Polish: states, validation, responsive, SEO, accessibility |
| 7 | Admin: roles, protected routes, sidebar layout |
| 8 | Admin dashboard (counts and latest registrations) |
| 9 | Admin events list (search, status filter, publish, hide, delete with confirmation) |
| 10 | Add and edit event form (draft or publish, cover image) |
| 11 | Admin registrations view (read-only) |
| 12 | Publish to Cloud Run and test on the live link |

After each step, test the whole journey and continue only if everything works.

## 14. Deployment and Launch Checklist

- Publish from AI Studio and open the published link, not only the preview.
- Test with a second Google account and a real phone: log in, register for an event, open the admin pages.
- If login fails on the published link but works in the preview, the publishing domain probably needs to be added to the allowed domains of the sign-in system.
- Test wrong input: empty fields, very long text, a file that is not an image.
- Test data isolation: a user cannot see another user's registrations, a hidden event does not appear to visitors, and a normal user cannot open `/admin`.
- Delete sample data and test accounts before sharing the link.
- Agree who owns the Google account that hosts the project.
- Ask five people from the target audience to try the journey without help.

## 15. Open Decisions and Assumptions

- Google-only sign-in is accepted. Email and password are out of scope.
- The field list, the three categories, and the Profile and Cancel decisions are proposals to confirm with the team.
- Cover image upload depends on what AI Studio offers for storage. The URL field is the fallback.
- The free tier allows a limited number of full-stack apps per account, so plan test attempts accordingly.
