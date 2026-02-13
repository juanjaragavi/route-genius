/**
 * RouteGenius — Bot User-Agent Filter
 *
 * Detects known bot/crawler user-agents for analytics filtering.
 */

const BOT_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /mediapartners/i,
  /facebookexternalhit/i,
  /linkedinbot/i,
  /twitterbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /google-structured-data/i,
  /bingbot/i,
  /yandex/i,
  /baiduspider/i,
  /duckduckbot/i,
  /semrush/i,
  /ahrefs/i,
  /mj12bot/i,
  /dotbot/i,
  /pingdom/i,
  /uptimerobot/i,
  /headlesschrome/i,
];

export function isBot(userAgent: string): boolean {
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}
