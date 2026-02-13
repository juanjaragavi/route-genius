# RouteGenius

**Probabilistic Traffic Rotation for TopNetworks, Inc.**

RouteGenius is a Phase 1 MVP that enables probabilistic traffic distribution across multiple destination URLs. Similar to Linkly's "Rotate Traffic" feature, it allows you to split incoming clicks between different landing pages based on configurable weight percentages.

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?logo=tailwind-css)
![License](https://img.shields.io/badge/License-Proprietary-red)

## Features

- **Probabilistic URL Rotation** — Distribute traffic across multiple destinations using weighted random selection
- **Non-Sticky Distribution** — Each click is an independent draw (no cookie-based persistence)
- **Real-Time Simulation** — Test your rotation configuration with 1,000 simulated clicks before going live
- **Auto-Save** — Configuration changes persist automatically with visual feedback
- **Spanish UI** — Fully localized interface for Spanish-speaking users

## Tech Stack

| Layer     | Technology                             |
| --------- | -------------------------------------- |
| Framework | Next.js 16.1.6 (App Router, Turbopack) |
| Language  | TypeScript 5.x                         |
| Styling   | Tailwind CSS 4.x                       |
| Icons     | Lucide React                           |
| Font      | Poppins (via next/font)                |
| Storage   | File-based JSON (Phase 1)              |

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/juanjaragavi/route-genius.git
cd route-genius

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3070](http://localhost:3070) in your browser.

### Available Scripts

| Command          | Description                           |
| ---------------- | ------------------------------------- |
| `npm run dev`    | Start development server on port 3070 |
| `npm run build`  | Create optimized production build     |
| `npm run start`  | Start production server               |
| `npm run lint`   | Run ESLint and Prettier checks        |
| `npm run format` | Auto-fix formatting with Prettier     |

## How It Works

### 1. Configure Your Link

Set a main destination URL and add secondary destinations with weight percentages:

```markdown
Main URL (40%): <https://example.com/landing-a>
Secondary #1 (30%): <https://example.com/landing-b>
Secondary #2 (30%): <https://example.com/landing-c>
```

### 2. Use the Tracking URL

Share your RouteGenius tracking link:

```markdown
<http://localhost:3070/api/redirect/demo-link-001>
```

### 3. Traffic Distribution

Each visitor is redirected to one of your configured destinations based on the probabilistic algorithm:

```typescript
// Weighted random selection with cumulative distribution
const destinations = buildWeightedDestinations(link);
const random = Math.random() * 100;
let cumulative = 0;

for (const dest of destinations) {
  cumulative += dest.weight;
  if (random <= cumulative) return dest.url;
}
```

## Project Structure

```markdown
route-genius/
├── app/
│ ├── api/redirect/[linkId]/ # Redirect API endpoint
│ ├── actions.ts # Server Actions
│ ├── globals.css # Global styles & brand tokens
│ ├── layout.tsx # Root layout
│ └── page.tsx # Main editor page
├── components/
│ ├── Header.tsx # App header
│ ├── LinkEditorForm.tsx # Main configuration form
│ └── SimulationResults.tsx # Monte Carlo simulation display
├── lib/
│ ├── mock-data.ts # File-based storage (Phase 1)
│ ├── rotation.ts # Probabilistic algorithm
│ └── types.ts # TypeScript interfaces
└── .route-genius-store.json # Local data store (gitignored)
```

## API Reference

### GET `/api/redirect/[linkId]`

Performs a 307 Temporary Redirect to a probabilistically selected destination.

**Response Codes:**

- `307` — Redirect to selected destination
- `404` — Link not found
- `410` — Link is disabled or expired

**Example:**

```bash
curl -I http://localhost:3070/api/redirect/demo-link-001
# HTTP/1.1 307 Temporary Redirect
# Location: https://google.com/
```

## Roadmap

### Phase 1 (Current) ✅

- [x] Probabilistic rotation algorithm
- [x] Link editor UI with Spanish localization
- [x] Simulation mode (1,000 clicks)
- [x] File-based persistence
- [x] Auto-save with debounce

### Phase 2 (Planned)

- [ ] Supabase/PostgreSQL database integration
- [ ] User authentication & workspaces
- [ ] Click analytics dashboard
- [ ] Link expiration & scheduling
- [ ] A/B test reporting

## Brand Colors

| Color | Hex       | Usage             |
| ----- | --------- | ----------------- |
| Blue  | `#2563eb` | Primary actions   |
| Cyan  | `#0891b2` | Secondary accents |
| Lime  | `#84cc16` | Success states    |

## License

Proprietary — © 2026 TopNetworks, Inc. All rights reserved.

---

Built with ❤️ by [TopNetworks](https://topnetworks.co)
