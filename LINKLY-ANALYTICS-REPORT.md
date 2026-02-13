# Linkly Analytics & Reporting Tools - Comprehensive Report

## Executive Summary

Linkly is a sophisticated URL shortening and traffic routing tool that provides extensive analytics and reporting capabilities for tracking link performance. The platform measures multiple dimensions of user interaction and provides flexible reporting through dashboards, APIs, and integrations.

## 1. Core Analytics Measures

### 1.1 Click Tracking [linklyhq](https://linklyhq.com/es/support/click-tracking)

Linkly tracks the following information when users click on shortened links:

- **Internet Service Provider (ISP)**: Identifies the user's ISP
- **Country**: Geographic location at the country level
- **Referrer Information**: Source website if provided by the referral site
- **Destination URL**: The target URL where users are redirected
- **Query String Parameters**: Any URL parameters passed with the link click
- **Click Timestamp**: Precise time of each click
- **Repeat Visit Detection**: Whether the user has clicked the link previously

### 1.2 Data NOT Tracked [linklyhq](https://linklyhq.com/es/support/linkly-tracking-links-information)

For privacy compliance, Linkly explicitly does not track:

- City-level location data
- Exact GPS coordinates or addresses
- User PII (email, name, phone number)
- IP addresses
- User behavior on destination sites
- Form submissions
- Third-party retargeting pixel data

## 2. Reporting Features

### 2.1 Dashboard Traffic Analytics [app.linklyhq](https://app.linklyhq.com/spa/workspace/351505/clicks)

The main Traffic analytics interface provides:

- **All Traffic View**: Aggregate traffic across all links or filtered by specific dimensions
- **Time Range Selection**: Customizable date range picker (example: Jan 15 - Feb 13, 2026)
- **Timezone Support**: UTC and multiple regional timezones (Eastern, Central, Pacific, London, Paris, Berlin, Tokyo, Shanghai, Sydney)
- **Hourly Breakdown**: Option to view traffic distribution by hour
- **Bot Filtering**: Toggle to filter out known bot traffic
- **Unique Visitors**: View to isolate unique click counts
- **Export Functionality**: One-click data export in multiple formats

### 2.2 Public Analytics Dashboard [linklyhq](https://linklyhq.com/es/support/share-analytics)

Linkly enables sharing of link analytics publicly:

- Users can append `.stats` to any link URL to view public analytics
- Public dashboard shows total click count only
- Does not reveal other links in the workspace
- Useful for sharing performance metrics with clients or stakeholders
- No login required to view public analytics

## 3. API-Driven Analytics [linklyhq](https://linklyhq.com/es/support/analytics-api)

### 3.1 Analytics API Capabilities

The Analytics API provides programmatic access to traffic reports and raw click data:

**Automatic API Request Generation**:

- Linkly generates pre-formatted API requests within the UI
- Users can copy requests directly from traffic reports
- Requests include authentication credentials

**Output Formats Supported**:

- **JSON**: Structured data for applications
- **CSV**: Comma-separated values for spreadsheet import
- **TSV**: Tab-separated values for browser display and sheet pasting

### 3.2 Pivot Mode (Matrix Format)

The API supports matrix-format exports via the `pivot=link_id` parameter:

- Returns traffic across all links in a single request
- Dates as rows, links as columns
- Ideal for comparing performance across multiple shortened links
- Reduces API call overhead significantly

**Example Pivot Format**:

```
date       | Link1 | Link2
2026-01-01 | 45    | 12
2026-01-02 | 52    | 8
```

### 3.3 Raw Click Data Export

Access to granular, unprocessed click data:

- Includes complete parameters, timestamps, and geolocation
- Available through Export feature in traffic report tabs
- Fully formed API requests ready for application integration
- Cached for up to 3 hours

### 3.4 API Rate Limits & Usage Quotas [linklyhq](https://linklyhq.com/es/support/analytics-api)

**Rate Limits**:

- 50 requests per hour per workspace

**Usage Limits** (reset per billing period):

- **Free Plan**: 100 requests/month, 10 GB data scanned/month
- **Paid Monthly**: 2,000 requests/month, 2 TB data scanned/month
- **Paid Annual**: 24,000 requests/year, 24 TB data scanned/year
- **Unlimited Plans**: 10,000-120,000 requests, 2-24 TB scanning limits

## 4. Third-Party Integrations

Linkly supports integration with major analytics platforms:

- **Google Analytics 4**: Fire GA4 tags on link clicks
- **Google Tag Manager**: Custom event tracking
- **Meta Pixel (Facebook)**: Retargeting pixel integration
- **TikTok Pixel**: Platform-specific conversion tracking
- **LinkedIn Insight Tag**: B2B conversion tracking
- **Retargeting Tags**: Custom HTML pixels (head and body tags)

## 5. Advanced Reporting Features

### 5.1 Click Notifications [linklyhq](https://linklyhq.com/es/support/click-tracking)

- Email alerts for each link click
- Real-time notifications for important campaigns
- Rate-limited to prevent email flooding

### 5.2 Parameter & SubID Tracking [linklyhq](https://linklyhq.com/es/support/share-analytics)

- Ability to track custom URL parameters
- SubID parameter support for granular campaign attribution
- Integration with UTM parameters

### 5.3 UTM Parameter Builder [linklyhq](https://linklyhq.com/es/support/share-analytics)

- Automated UTM tag generation and application
- Supports: Source, Medium, Campaign, Term, Content
- Required fields: Source, Medium, Campaign

### 5.4 QR Code Analytics [linklyhq](https://linklyhq.com/es/support/share-analytics)

- Dedicated analytics for QR code scans
- Scan tracking and conversion measurement
- QR-specific traffic attribution

### 5.5 Monthly Email Reports [linklyhq](https://linklyhq.com/es/support/share-analytics)

- Automated summary reports delivered via email
- Customizable report contents
- Scheduled delivery to stakeholders

## 6. Data Presentation Methods

### 6.1 Dashboard Visualizations

- Real-time click counters
- Time-series graphs
- Geographic heat maps (country-level)
- Traffic trend analysis
- Device type breakdowns (browser, OS, device classification)

### 6.2 Export & Integration Options

- **CSV Export**: For spreadsheet analysis
- **Google Sheets Integration**: Live data feeds and add-ons
- **Excel Live Feeds**: Real-time data source connections
- **Zapier Integration**: No-code workflow automation
- **n8n Integration**: Self-hosted automation
- **BigQuery Integration**: SQL-based analytics on high volume data

### 6.3 BigQuery Advanced Analytics [linklyhq](https://linklyhq.com/es/support/analytics-api)

For enterprise analytics needs:

- Direct SQL access to click data
- Unlimited query capability
- Real-time data updates
- Integration with Looker, Data Studio, Tableau
- Data consolidation with other business metrics
- **Cost**: Free for Unlimited plans, $100/month add-on for other plans

## 7. Webhook & Real-Time Notifications

- **Webhooks**: Real-time POST requests on click events
- Sends detailed click information immediately
- Custom webhook URL management
- Integration with automation platforms
- Complete click details including geolocation and parameters

---

## Next.js Implementation Prompt for Coder Agent

## Development Brief: Linkly Analytics Dashboard Integration

You are tasked with building a sophisticated analytics dashboard component for a Next.js application that integrates with Linkly's traffic routing and analytics API.

### Project Requirements

#### 1. Core Features to Implement

**Dashboard Overview Component**:

- Display real-time total clicks across all tracked links
- Show click trends over a customizable date range (daily, hourly granularity)
- Implement timezone selector matching Linkly's supported timezones
- Create toggles for filtering bot traffic and viewing unique visitors only
- Integrate time range picker UI (date range selector)

**Link Performance Table**:

- Display all shortened links in the workspace
- Columns: Link name, destination URL, click count, click-through rate, creation date
- Sortable/filterable table interface
- Quick stats badges (total clicks, unique visitors, performance indicator)
- Use Linkly's pivot mode (`pivot=link_id`) to fetch all link metrics in a single API call

**Traffic Visualization**:

- Time-series chart showing clicks over selected date range
- Geographic breakdown (country-level distribution)
- Device/browser breakdown
- Hourly distribution chart for selected date

**Public Analytics Sharing**:

- UI to enable/disable public analytics for each link
- Display public analytics URL (`.stats` suffix)
- Copy-to-clipboard button for sharing
- Permission toggles in link settings

**Data Export Functionality**:

- Export to CSV button (format=csv parameter)
- Export to JSON button (format=json parameter)
- Export to TSV button (format=tsv parameter)
- Bulk export all links using pivot mode

#### 2. API Integration Requirements

**Authentication**:

- Store Linkly API Key and Workspace ID in environment variables
- Implement secure API request generation in server-side route handlers
- Do not expose credentials to client-side code

**API Endpoints to Implement**:

- `GET /api/analytics/traffic` - Fetch all traffic with date range, timezone, and format filters
- `GET /api/analytics/links` - Get link-level metrics using pivot mode
- `GET /api/analytics/export` - Export raw click data in requested format
- `POST /api/analytics/webhook-setup` - Configure webhook URLs for real-time updates

**Rate Limiting Handling**:

- Implement request queuing for API calls
- Cache API responses appropriately (suggest 5-minute cache)
- Handle 429 Too Many Requests responses gracefully
- Display cached-data indicators in UI when serving from cache

#### 3. Database Schema (if local caching needed)

```typescript
// TypeScript interface for cached analytics
interface LinkAnalytics {
  link_id: string;
  link_name: string;
  destination_url: string;
  total_clicks: number;
  unique_clicks: number;
  last_updated: Date;
  daily_breakdown: DailyMetric[];
  geography: CountryMetric[];
  devices: DeviceMetric[];
}

interface DailyMetric {
  date: string;
  clicks: number;
  unique: number;
}

interface CountryMetric {
  country: string;
  clicks: number;
  percentage: number;
}

interface DeviceMetric {
  type: string; // browser, mobile, tablet
  clicks: number;
}
```

#### 4. UI/UX Specifications

**Design System**:

- Use the Linkly dashboard aesthetic as reference (teal/green accent color: #1fbfa6)
- Responsive grid layout (mobile, tablet, desktop)
- Light/dark mode support (if available in design system)

**Key UI Components**:

- Date range selector with preset options (Last 7 days, Last 30 days, etc.)
- Timezone selector dropdown
- Filter controls (bot filter toggle, unique visitors toggle)
- Loading states and skeleton screens
- Empty state messaging
- Error boundaries with retry functionality
- "No data" messaging for date ranges with zero traffic

**Performance Optimization**:

- Implement React Query or SWR for data fetching and caching
- Pagination for large link tables (50+ links)
- Virtual scrolling for large datasets
- Debounced search filtering
- Lazy load chart visualizations

#### 5. Features to Integrate (Phase 2)

- Webhook integration to receive real-time click notifications
- Email notification triggers for click thresholds
- Custom parameter tracking (SubID, UTM breakdown)
- Link tagging and filtering by tag
- Comparison view for multiple links
- Monthly email report generation
- BigQuery integration for advanced analytics

#### 6. Technology Stack Recommendations

**Frontend**:

- Next.js 14+ (App Router)
- React 18+
- TailwindCSS for styling
- Recharts or Chart.js for visualizations
- Tanstack React Query for server state management
- Zod or TypeScript for type safety

**Backend**:

- Next.js API routes or API handler functions
- node-fetch or axios for HTTP requests
- Rate limiting middleware (e.g., redis-based)
- Response caching strategy

**Testing**:

- Jest for unit tests
- React Testing Library for component tests
- Mock Linkly API responses
- Test API rate limiting scenarios

#### 7. API Request Examples

```typescript
// Example API requests for Linkly Analytics

// Fetch all traffic data
const getTrafficData = async (dateRange: DateRange, timezone: string) => {
  const response = await fetch(
    `${LINKLY_API_BASE}/clicks?start_date=${dateRange.start}&end_date=${dateRange.end}&timezone=${timezone}`,
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    },
  );
  return response.json();
};

// Get all links with pivot mode (single call)
const getAllLinksMetrics = async () => {
  const response = await fetch(
    `${LINKLY_API_BASE}/clicks?pivot=link_id&format=json`,
    {
      headers: { Authorization: `Bearer ${API_KEY}` },
    },
  );
  return response.json();
};

// Export data in CSV format
const exportData = async (format: "csv" | "json" | "tsv") => {
  const response = await fetch(`${LINKLY_API_BASE}/export?format=${format}`, {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  return response.blob();
};
```

#### 8. Success Criteria

- ✅ Dashboard loads performance metrics within 2 seconds
- ✅ Support all Linkly timezone options
- ✅ Correctly parse and display CSV, JSON, and TSV export formats
- ✅ Handle API rate limiting gracefully
- ✅ Display accurate click metrics (test against actual Linkly data)
- ✅ All UI elements responsive on mobile devices
- ✅ No credentials exposed in client-side code
- ✅ Real-time updates optional but ideal via webhooks
- ✅ Comprehensive error handling with user-friendly messaging

---

## Conclusion

Linkly provides a comprehensive analytics platform with detailed click tracking, flexible reporting APIs, and multiple integration options. The tool measures critical traffic metrics including geography, device types, referrer sources, and custom parameters while maintaining user privacy by not collecting PII or exact location data. The combination of dashboard analytics, programmatic API access, and third-party integrations makes Linkly suitable for integration into custom Next.js applications for sophisticated traffic analysis and campaign attribution.
