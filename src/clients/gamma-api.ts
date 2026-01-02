/**
 * Gamma API Client for Polymarket
 *
 * The Gamma API provides rich market discovery and metadata. Unlike the CLOB API
 * which is focused on trading, Gamma is optimized for browsing, searching, and
 * discovering prediction markets.
 *
 * @remarks
 * - Base URL: https://gamma-api.polymarket.com
 * - Best for: Market discovery, trending markets, event groupings
 * - Rate limits are automatically handled by the RateLimiter
 *
 * @example
 * ```typescript
 * import { GammaApiClient, RateLimiter, Cache } from '@catalyst-team/poly-sdk';
 *
 * const client = new GammaApiClient(new RateLimiter(), new Cache());
 *
 * // Get trending markets by 24h volume
 * const trending = await client.getTrendingMarkets(20);
 *
 * // Search for specific markets
 * const btcMarkets = await client.getMarkets({
 *   active: true,
 *   closed: false,
 *   order: 'volume24hr',
 *   ascending: false,
 *   limit: 10,
 * });
 * ```
 *
 * @see {@link https://docs.polymarket.com/#gamma-api Gamma API Documentation}
 *
 * @module clients/gamma-api
 */

import { RateLimiter, ApiType } from '../core/rate-limiter.js';
import type { UnifiedCache } from '../core/unified-cache.js';
import { PolymarketError } from '../core/errors.js';

/** Gamma API base URL */
const GAMMA_API_BASE = 'https://gamma-api.polymarket.com';

const appendQueryParam = (
  query: URLSearchParams,
  key: string,
  value:
    | string
    | number
    | boolean
    | Date
    | Array<string | number | boolean | Date>
    | undefined
    | null
) => {
  if (value === undefined || value === null) return;
  const normalize = (v: string | number | boolean | Date) =>
    v instanceof Date ? v.toISOString() : String(v);
  if (Array.isArray(value)) {
    value.forEach((v) => query.append(key, normalize(v)));
    return;
  }
  query.set(key, normalize(value));
};

// ===== Types =====

/**
 * Market information from the Gamma API
 *
 * @remarks
 * Gamma markets include rich metadata like volume statistics, price changes,
 * and liquidity metrics that are useful for market discovery and analysis.
 */
export interface GammaMarket {
  /**
   * Internal Gamma market ID
   */
  id: string;

  /**
   * Condition ID matching the CLOB API
   * @example "0x82ace55cdcba920112a2b3548f21e6e117730144db4dd580456aaecf1a2ad751"
   */
  conditionId: string;

  /**
   * URL-friendly market slug
   * @example "will-btc-reach-100k-by-end-of-2024"
   */
  slug: string;

  /**
   * The prediction market question
   */
  question: string;

  /**
   * Detailed description and resolution criteria
   */
  description?: string;

  /**
   * Outcome names (typically ["Yes", "No"])
   */
  outcomes: string[];

  /**
   * Current prices for each outcome (0-1 range)
   * @example [0.65, 0.35] for 65% YES probability
   */
  outcomePrices: number[];

  /**
   * Total trading volume (lifetime, in USDC)
   */
  volume: number;

  /**
   * 24-hour trading volume (in USDC)
   */
  volume24hr?: number;

  /**
   * 7-day trading volume (in USDC)
   */
  volume1wk?: number;

  /**
   * Current available liquidity (in USDC)
   */
  liquidity: number;

  /**
   * Bid-ask spread (as decimal, e.g., 0.02 = 2%)
   */
  spread?: number;

  /**
   * 24-hour price change (as decimal, e.g., 0.05 = +5%)
   */
  oneDayPriceChange?: number;

  /**
   * 7-day price change (as decimal)
   */
  oneWeekPriceChange?: number;

  /**
   * Last traded price for the YES outcome
   */
  lastTradePrice?: number;

  /**
   * Best bid price for YES outcome
   */
  bestBid?: number;

  /**
   * Best ask price for YES outcome
   */
  bestAsk?: number;

  /**
   * Market end/resolution date
   */
  endDate: Date;

  /**
   * Whether the market is currently active
   */
  active: boolean;

  /**
   * Whether the market has been resolved
   */
  closed: boolean;

  /**
   * URL to market image
   */
  image?: string;

  /**
   * URL to market icon
   */
  icon?: string;

  /**
   * Category tags (e.g., ["crypto", "bitcoin", "finance"])
   */
  tags?: string[];
}

/**
 * Event grouping from the Gamma API
 *
 * @remarks
 * Events group related markets together. For example, a "2024 US Election"
 * event might contain markets for each candidate and related predictions.
 */
export interface GammaEvent {
  /**
   * Internal Gamma event ID
   */
  id: string;

  /**
   * URL-friendly event slug
   */
  slug: string;

  /**
   * Event title
   * @example "2024 US Presidential Election"
   */
  title: string;

  /**
   * Event description
   */
  description?: string;

  /**
   * Markets belonging to this event
   */
  markets: GammaMarket[];

  /**
   * Event start date
   */
  startDate?: Date;

  /**
   * Event end date
   */
  endDate?: Date;

  /**
   * URL to event image
   */
  image?: string;
}

/**
 * Parameters for searching/filtering markets
 */
export interface MarketSearchParams {
  /**
   * Filter by market slug (single or multiple)
   */
  slug?: string | string[];

  /**
   * Filter by Gamma market IDs
   */
  id?: Array<number | string>;

  /**
   * Filter by condition ID
   */
  conditionId?: string;

  /**
   * Filter by condition IDs
   */
  conditionIds?: string[];

  /**
   * Filter by question IDs
   */
  questionIds?: string[];

  /**
   * Filter by CLOB token IDs
   */
  clobTokenIds?: string[];

  /**
   * Filter by market maker address
   */
  marketMakerAddress?: string[];

  /**
   * Filter by active status (Gamma extension)
   */
  active?: boolean;

  /**
   * Filter by closed status
   */
  closed?: boolean;

  /**
   * Minimum liquidity (numeric)
   */
  liquidityNumMin?: number;

  /**
   * Maximum liquidity (numeric)
   */
  liquidityNumMax?: number;

  /**
   * Minimum volume (numeric)
   */
  volumeNumMin?: number;

  /**
   * Maximum volume (numeric)
   */
  volumeNumMax?: number;

  /**
   * Start date lower bound (ISO string or Date)
   */
  startDateMin?: string | Date;

  /**
   * Start date upper bound (ISO string or Date)
   */
  startDateMax?: string | Date;

  /**
   * End date lower bound (ISO string or Date)
   */
  endDateMin?: string | Date;

  /**
   * End date upper bound (ISO string or Date)
   */
  endDateMax?: string | Date;

  /**
   * Filter by tag ID
   */
  tagId?: number;

  /**
   * Include related tags
   */
  relatedTags?: boolean;

  /**
   * Filter by "create your own market" flag
   */
  cyom?: boolean;

  /**
   * Filter by UMA resolution status
   */
  umaResolutionStatus?: string;

  /**
   * Filter by sports game ID
   */
  gameId?: string;

  /**
   * Filter by sports market types
   */
  sportsMarketTypes?: string[];

  /**
   * Minimum rewards size
   */
  rewardsMinSize?: number;

  /**
   * Include tag metadata
   */
  includeTag?: boolean;

  /**
   * Maximum number of results (default: 100)
   */
  limit?: number;

  /**
   * Offset for pagination
   */
  offset?: number;

  /**
   * Sort field (e.g., "volume24hr", "liquidity", "endDate")
   */
  order?: string;

  /**
   * Sort direction (true = ascending, false = descending)
   */
  ascending?: boolean;
}

/**
 * Parameters for searching/filtering events
 */
export interface EventSearchParams {
  /**
   * Filter by event slug (single or multiple)
   */
  slug?: string | string[];

  /**
   * Filter by event IDs
   */
  id?: Array<number | string>;

  /**
   * Filter by tag ID
   */
  tagId?: number;

  /**
   * Exclude events with these tag IDs
   */
  excludeTagId?: Array<number | string>;

  /**
   * Filter by tag slug
   */
  tagSlug?: string;

  /**
   * Include related tags
   */
  relatedTags?: boolean;

  /**
   * Filter by active status
   */
  active?: boolean;

  /**
   * Filter by archived status
   */
  archived?: boolean;

  /**
   * Filter by featured status
   */
  featured?: boolean;

  /**
   * Filter by "create your own market" flag
   */
  cyom?: boolean;

  /**
   * Include chat data
   */
  includeChat?: boolean;

  /**
   * Include template data
   */
  includeTemplate?: boolean;

  /**
   * Filter by recurrence
   */
  recurrence?: string;

  /**
   * Filter by closed status
   */
  closed?: boolean;

  /**
   * Minimum liquidity (numeric)
   */
  liquidityMin?: number;

  /**
   * Maximum liquidity (numeric)
   */
  liquidityMax?: number;

  /**
   * Minimum volume (numeric)
   */
  volumeMin?: number;

  /**
   * Maximum volume (numeric)
   */
  volumeMax?: number;

  /**
   * Start date lower bound (ISO string or Date)
   */
  startDateMin?: string | Date;

  /**
   * Start date upper bound (ISO string or Date)
   */
  startDateMax?: string | Date;

  /**
   * End date lower bound (ISO string or Date)
   */
  endDateMin?: string | Date;

  /**
   * End date upper bound (ISO string or Date)
   */
  endDateMax?: string | Date;

  /**
   * Maximum number of results (default: 100)
   */
  limit?: number;

  /**
   * Offset for pagination
   */
  offset?: number;

  /**
   * Sort field (comma-separated list)
   */
  order?: string;

  /**
   * Sort direction (true = ascending, false = descending)
   */
  ascending?: boolean;
}

// ===== Client =====

/**
 * Gamma API client for market discovery and metadata
 *
 * @remarks
 * Use this client for:
 * - Discovering trending markets
 * - Searching for specific topics
 * - Getting market metadata and statistics
 * - Browsing events and market groupings
 *
 * For orderbook data and trading, use {@link ClobApiClient} and {@link TradingClient}.
 *
 * @example
 * ```typescript
 * const client = new GammaApiClient(rateLimiter, cache);
 *
 * // Find top volume markets
 * const trending = await client.getTrendingMarkets(20);
 * for (const market of trending) {
 *   console.log(market.question, '$' + market.volume24hr.toLocaleString());
 * }
 * ```
 */
export class GammaApiClient {
  /**
   * Creates a new Gamma API client
   *
   * @param rateLimiter - Rate limiter instance for API throttling
   * @param cache - Cache instance for storing data (supports both legacy Cache and CacheAdapter)
   */
  constructor(
    private rateLimiter: RateLimiter,
    private cache: UnifiedCache
  ) {}

  // ===== Market Queries =====

  /**
   * Get markets with optional filters and sorting
   *
   * @param params - Search and filter parameters
   * @returns Array of markets matching the criteria
   *
   * @remarks
   * Common sort fields:
   * - `volume24hr` - 24-hour trading volume
   * - `liquidity` - Available liquidity
   * - `endDate` - Market end date
   * - `volume` - Lifetime volume
   *
   * @example
   * ```typescript
   * // Get active markets sorted by 24h volume
   * const markets = await client.getMarkets({
   *   active: true,
   *   closed: false,
   *   order: 'volume24hr',
   *   ascending: false,
   *   limit: 50,
   * });
   *
   * // Search by slug
   * const market = await client.getMarkets({
   *   slug: 'will-btc-reach-100k',
   *   limit: 1,
   * });
   * ```
   */
  async getMarkets(params?: MarketSearchParams): Promise<GammaMarket[]> {
    const query = new URLSearchParams();
    appendQueryParam(query, 'slug', params?.slug);
    appendQueryParam(query, 'id', params?.id);
    appendQueryParam(query, 'condition_id', params?.conditionId);
    appendQueryParam(query, 'condition_ids', params?.conditionIds);
    appendQueryParam(query, 'question_ids', params?.questionIds);
    appendQueryParam(query, 'clob_token_ids', params?.clobTokenIds);
    appendQueryParam(query, 'market_maker_address', params?.marketMakerAddress);
    appendQueryParam(query, 'active', params?.active);
    appendQueryParam(query, 'closed', params?.closed);
    appendQueryParam(query, 'liquidity_num_min', params?.liquidityNumMin);
    appendQueryParam(query, 'liquidity_num_max', params?.liquidityNumMax);
    appendQueryParam(query, 'volume_num_min', params?.volumeNumMin);
    appendQueryParam(query, 'volume_num_max', params?.volumeNumMax);
    appendQueryParam(query, 'start_date_min', params?.startDateMin);
    appendQueryParam(query, 'start_date_max', params?.startDateMax);
    appendQueryParam(query, 'end_date_min', params?.endDateMin);
    appendQueryParam(query, 'end_date_max', params?.endDateMax);
    appendQueryParam(query, 'tag_id', params?.tagId);
    appendQueryParam(query, 'related_tags', params?.relatedTags);
    appendQueryParam(query, 'cyom', params?.cyom);
    appendQueryParam(query, 'uma_resolution_status', params?.umaResolutionStatus);
    appendQueryParam(query, 'game_id', params?.gameId);
    appendQueryParam(query, 'sports_market_types', params?.sportsMarketTypes);
    appendQueryParam(query, 'rewards_min_size', params?.rewardsMinSize);
    appendQueryParam(query, 'include_tag', params?.includeTag);
    appendQueryParam(query, 'limit', params?.limit);
    appendQueryParam(query, 'offset', params?.offset);
    appendQueryParam(query, 'order', params?.order);
    appendQueryParam(query, 'ascending', params?.ascending);

    return this.rateLimiter.execute(ApiType.GAMMA_API, async () => {
      const response = await fetch(`${GAMMA_API_BASE}/markets?${query}`);
      if (!response.ok)
        throw PolymarketError.fromHttpError(
          response.status,
          await response.json().catch(() => null)
        );
      const data = (await response.json()) as unknown[];
      if (!Array.isArray(data)) return [];
      return data.map((item) => this.normalizeMarket(item as Record<string, unknown>));
    });
  }

  /**
   * Get a single market by its URL slug
   *
   * @param slug - The URL-friendly market slug
   * @returns The market if found, null otherwise
   *
   * @example
   * ```typescript
   * const market = await client.getMarketBySlug('will-btc-reach-100k');
   * if (market) {
   *   console.log(market.question);
   * }
   * ```
   */
  async getMarketBySlug(slug: string): Promise<GammaMarket | null> {
    const markets = await this.getMarkets({ slug, limit: 1 });
    return markets[0] || null;
  }

  /**
   * Get a single market by condition ID
   *
   * @param conditionId - The unique condition identifier
   * @returns The market if found, null otherwise
   *
   * @remarks
   * For more reliable market data by condition ID, prefer {@link ClobApiClient.getMarket}.
   *
   * @example
   * ```typescript
   * const market = await client.getMarketByConditionId('0x82ace55...');
   * ```
   */
  async getMarketByConditionId(conditionId: string): Promise<GammaMarket | null> {
    const markets = await this.getMarkets({ conditionId, limit: 1 });
    return markets[0] || null;
  }

  // ===== Event Queries =====

  /**
   * Get events with optional filters
   *
   * @param params - Filter parameters (see {@link EventSearchParams})
   * @returns Array of events matching the criteria
   *
   * @example
   * ```typescript
   * // Get all active events
   * const events = await client.getEvents({ active: true, limit: 20 });
   *
   * // Get a specific event by slug
   * const election = await client.getEvents({ slug: '2024-us-election' });
   *
   * // Filter by tag
   * const politics = await client.getEvents({ tagId: 123, active: true, limit: 20 });
   * ```
   */
  async getEvents(params?: EventSearchParams): Promise<GammaEvent[]> {
    const query = new URLSearchParams();
    appendQueryParam(query, 'slug', params?.slug);
    appendQueryParam(query, 'id', params?.id);
    appendQueryParam(query, 'tag_id', params?.tagId);
    appendQueryParam(query, 'exclude_tag_id', params?.excludeTagId);
    appendQueryParam(query, 'tag_slug', params?.tagSlug);
    appendQueryParam(query, 'related_tags', params?.relatedTags);
    appendQueryParam(query, 'active', params?.active);
    appendQueryParam(query, 'archived', params?.archived);
    appendQueryParam(query, 'featured', params?.featured);
    appendQueryParam(query, 'cyom', params?.cyom);
    appendQueryParam(query, 'include_chat', params?.includeChat);
    appendQueryParam(query, 'include_template', params?.includeTemplate);
    appendQueryParam(query, 'recurrence', params?.recurrence);
    appendQueryParam(query, 'closed', params?.closed);
    appendQueryParam(query, 'liquidity_min', params?.liquidityMin);
    appendQueryParam(query, 'liquidity_max', params?.liquidityMax);
    appendQueryParam(query, 'volume_min', params?.volumeMin);
    appendQueryParam(query, 'volume_max', params?.volumeMax);
    appendQueryParam(query, 'start_date_min', params?.startDateMin);
    appendQueryParam(query, 'start_date_max', params?.startDateMax);
    appendQueryParam(query, 'end_date_min', params?.endDateMin);
    appendQueryParam(query, 'end_date_max', params?.endDateMax);
    appendQueryParam(query, 'limit', params?.limit);
    appendQueryParam(query, 'offset', params?.offset);
    appendQueryParam(query, 'order', params?.order);
    appendQueryParam(query, 'ascending', params?.ascending);

    return this.rateLimiter.execute(ApiType.GAMMA_API, async () => {
      const response = await fetch(`${GAMMA_API_BASE}/events?${query}`);
      if (!response.ok)
        throw PolymarketError.fromHttpError(
          response.status,
          await response.json().catch(() => null)
        );
      const data = (await response.json()) as unknown[];
      if (!Array.isArray(data)) return [];
      return data.map((item) => this.normalizeEvent(item as Record<string, unknown>));
    });
  }

  /**
   * Get a single event by its URL slug
   *
   * @param slug - The URL-friendly event slug
   * @returns The event if found, null otherwise
   *
   * @example
   * ```typescript
   * const event = await client.getEventBySlug('2024-us-election');
   * if (event) {
   *   console.log(`${event.title} has ${event.markets.length} markets`);
   * }
   * ```
   */
  async getEventBySlug(slug: string): Promise<GammaEvent | null> {
    const events = await this.getEvents({ slug, limit: 1 });
    return events[0] || null;
  }

  /**
   * Get a single event by its ID
   *
   * @param id - The internal event ID
   * @returns The event if found, null otherwise
   *
   * @example
   * ```typescript
   * const event = await client.getEventById('12345');
   * ```
   */
  async getEventById(id: string): Promise<GammaEvent | null> {
    return this.rateLimiter.execute(ApiType.GAMMA_API, async () => {
      const response = await fetch(`${GAMMA_API_BASE}/events/${id}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw PolymarketError.fromHttpError(
          response.status,
          await response.json().catch(() => null)
        );
      }
      const data = (await response.json()) as Record<string, unknown>;
      return this.normalizeEvent(data);
    });
  }

  // ===== Trending =====

  /**
   * Get trending markets sorted by 24-hour volume
   *
   * @param limit - Maximum number of markets to return (default: 20)
   * @returns Array of active markets sorted by volume
   *
   * @remarks
   * This is a convenience method equivalent to:
   * ```typescript
   * getMarkets({
   *   active: true,
   *   closed: false,
   *   order: 'volume24hr',
   *   ascending: false,
   *   limit,
   * })
   * ```
   *
   * @example
   * ```typescript
   * // Get top 10 trending markets
   * const trending = await client.getTrendingMarkets(10);
   *
   * for (const market of trending) {
   *   console.log(`${market.question}`);
   *   console.log(`  24h Volume: $${market.volume24hr?.toLocaleString()}`);
   *   console.log(`  YES Price: ${(market.outcomePrices[0] * 100).toFixed(1)}%`);
   * }
   * ```
   */
  async getTrendingMarkets(limit = 20): Promise<GammaMarket[]> {
    return this.getMarkets({
      active: true,
      closed: false,
      order: 'volume24hr',
      ascending: false,
      limit,
    });
  }

  // ===== Data Normalization =====

  private normalizeMarket(m: Record<string, unknown>): GammaMarket {
    return {
      id: String(m.id || ''),
      conditionId: String(m.conditionId || ''),
      slug: String(m.slug || ''),
      question: String(m.question || ''),
      description: m.description ? String(m.description) : undefined,
      outcomes: this.parseJsonArray(m.outcomes, ['Yes', 'No']),
      outcomePrices: this.parseJsonArray(m.outcomePrices, [0.5, 0.5]).map(
        Number
      ),
      volume: Number(m.volume || 0),
      volume24hr: m.volume24hr !== undefined ? Number(m.volume24hr) : undefined,
      volume1wk: m.volume1wk !== undefined ? Number(m.volume1wk) : undefined,
      liquidity: Number(m.liquidity || 0),
      spread: m.spread !== undefined ? Number(m.spread) : undefined,
      oneDayPriceChange:
        m.oneDayPriceChange !== undefined
          ? Number(m.oneDayPriceChange)
          : undefined,
      oneWeekPriceChange:
        m.oneWeekPriceChange !== undefined
          ? Number(m.oneWeekPriceChange)
          : undefined,
      lastTradePrice:
        m.lastTradePrice !== undefined ? Number(m.lastTradePrice) : undefined,
      bestBid: m.bestBid !== undefined ? Number(m.bestBid) : undefined,
      bestAsk: m.bestAsk !== undefined ? Number(m.bestAsk) : undefined,
      endDate: new Date(String(m.endDate || Date.now())),
      active: Boolean(m.active),
      closed: Boolean(m.closed),
      image: m.image ? String(m.image) : undefined,
      icon: m.icon ? String(m.icon) : undefined,
      tags: m.tags ? this.parseJsonArray(m.tags, []) : undefined,
    };
  }

  private normalizeEvent(e: Record<string, unknown>): GammaEvent {
    const markets = e.markets;
    return {
      id: String(e.id || ''),
      slug: String(e.slug || ''),
      title: String(e.title || ''),
      description: e.description ? String(e.description) : undefined,
      markets: Array.isArray(markets)
        ? markets.map((m: Record<string, unknown>) => this.normalizeMarket(m))
        : [],
      startDate: e.startDate ? new Date(String(e.startDate)) : undefined,
      endDate: e.endDate ? new Date(String(e.endDate)) : undefined,
      image: e.image ? String(e.image) : undefined,
    };
  }

  private parseJsonArray<T>(value: unknown, fallback: T[]): T[] {
    if (Array.isArray(value)) return value as T[];
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}
