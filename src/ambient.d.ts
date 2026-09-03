import { PgTable, PgColumn } from 'drizzle-orm/pg-core';
import { SQL } from 'drizzle-orm';
import {
  user,
  session,
  account,
  verification,
  role,
  permission,
  rolePermissions,
  settings,
  apiKeys,
  userRoleEnum,
  userStatusEnum,
} from '$lib/server/db/schema';
import type { AuthType, AuthUser } from '$lib/server/auth';
import { rolePermissions } from './lib/server/db/auth.schema';

declare global {
  type TargetingRules = {
    geo?: { mode: 'block' | 'allow'; countries: string[] };
    device?: { mode: 'block' | 'allow'; types: ('mobile' | 'desktop' | 'tablet')[] };
    ip?: { mode: 'block' | 'allow'; list: string[] };
  };

  type TrackingCodes = {
    gaId?: string; // Google Analytics (G-XXXX)
    gtmId?: string; // Google Tag Manager (GTM-XXXX)
    fbPixelId?: string; // Facebook Pixel
    histatsId?: string; // Histats
  };

  type UserRole = typeof schema.userRoleEnum.enumValues[number];
  type UserStatus = typeof schema.userStatusEnum.enumValues[number];

  type User = AuthUser;
  type Session = typeof session.$inferSelect;
  type Account = typeof account.$inferSelect;
  type Verification = typeof verification.$inferSelect;
  type Role = typeof role.$inferSelect;
  type Permission = typeof permission.$inferSelect;
  type RolePermission = typeof rolePermissions.$inferSelect;
  // ================================
  // Api Service Interfaces
  // ================================
  interface ApiResponse<T = any, M extends Record<string, any> = ApiMeta> {
    status: number;
    success: boolean;
    message: string;
    data?: T | null;
    error?: FetchError;
    meta?: M;
    headers?: Headers;
  }
  interface ApiMeta {
    page: number;
    limit: number;
    total_rows: number;
    total_pages: number;
    has_prev: boolean;
    has_next: boolean;
  }
  interface FetchError {
    code: string;
    message?: string;
    redirect_url?: string;
    details?: any;
    retryable?: boolean;
    timestamp?: string;
  }
  interface ErrorResponse extends ApiResponse<undefined, undefined> {
    error: {
      code: string;
      details?: Record<string, unknown>;
      redirect_url?: Record<string, unknown>;
    };
  }
  type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  interface FetchOptions {
    method?: HttpMethod;
    body?: any;
    headers?: HeadersInit;
    swrKey?: string;
    params?: Record<string, string | number | boolean | undefined>;
    timeout?: number;
    retries?: number;
    cache?: boolean;
    limit?: number;
    page?: number;
  }
  interface ApiClient {
    request: <T = any>(url: string, options?: FetchOptions) => Promise<ApiResponse<T>>;
    get: <T = any>(url: string, options?: Omit<FetchOptions, 'method'>) => Promise<ApiResponse<T>>;
    post: <T = any>(
      url: string,
      body?: any,
      options?: Omit<FetchOptions, 'method' | 'body'>
    ) => Promise<ApiResponse<T>>;
    put: <T = any>(
      url: string,
      body?: any,
      options?: Omit<FetchOptions, 'method' | 'body'>
    ) => Promise<ApiResponse<T>>;
    patch: <T = any>(
      url: string,
      body?: any,
      options?: Omit<FetchOptions, 'method' | 'body'>
    ) => Promise<ApiResponse<T>>;
    delete: <T = any>(
      url: string,
      options?: Omit<FetchOptions, 'method'>
    ) => Promise<ApiResponse<T>>;
  }

  interface ApiRequestOptions<DataT = any, TransformedT = DataT> {
    // Core options
    query?: Record<string, any> | (() => Record<string, any>);
    key?: string;
    watch?: Array<Readable<any>>;
    method?: HttpMethod;
    params?: Record<string, any>;
    body?: any | (() => any);
    headers?: Record<string, string> | (() => Record<string, string>);
    baseURL?: string;

    // Behavior options
    server?: boolean;
    lazy?: boolean;
    immediate?: boolean;
    deep?: boolean;
    dedupe?: 'cancel' | 'defer';
    timeout?: number;

    // Data handling
    default?: () => DataT;
    transform?: (input: DataT) => TransformedT | Promise<TransformedT>;
    pick?: string[];
    getCachedData?: (key: string) => DataT | undefined;

    // Custom fetch - gunakan dari ApiHandler
    $fetch?: CustomFetch;

    // Auth & CSRF
    auth?: boolean;
    csrfProtected?: boolean;
    multipart?: boolean;
  }
  interface ApiRequestState<T = any> {
    data: T | null;
    error: ApiError | null;
    pending: boolean;
    status: number | null;
    meta: ApiMeta | null;
    message: string | null;
  }
  interface ApiRequestReturn<T = any> {
    data: Readable<T | null>;
    error: Readable<ApiError | null>;
    pending: Readable<boolean>;
    status: Readable<number | null>;
    meta: Readable<ApiMeta | null>;
    message: Readable<string | null>;
    refresh: () => Promise<void>;
    execute: (overrideBody?: any, routeParams?: string) => Promise<void>;
    clear: () => void;
  }
  type CustomFetch = (
    method: HttpMethod,
    path: string,
    data?: any,
    headers?: Record<string, string>
  ) => Promise<ApiResponse<any>>;

  interface CacheItem<T> {
    data: T;
    timestamp: number;
  }

  type SortOrder = 'asc' | 'desc';
  interface QueryParams {
    page: number;
    limit: number;
    search?: string;
    sort_by?: string;
    order_by?: SortOrder;
    status?: string;
    include_deleted?: boolean;
    with_relations?: boolean;
    with_delete_column?: boolean;
    is_active?: boolean;
    is_verified?: boolean;
    user_id?: string;
    includes?: string[]; // e.g., ['user', 'category']
    fields?: string[]; // e.g., ['id', 'name', 'email']
    date_from?: string;
    date_to?: string;
    extra?: Record<string, any>;
  }
  interface DrizzleQueryOptions<TTable extends PgTable> {
    table: TTable;
    searchColumns?: PgColumn[];
    defaultSortColumn?: PgColumn;
    dateColumn?: PgColumn;
    deletedAtColumn?: PgColumn;
    customConditions?: (SQL | undefined)[];
  }

  interface PaginationMeta {
    current_page: number;
    total_pages: number;
    total_items: number;
    has_next: boolean;
    has_prev: boolean;
    limit: number;
  }

  interface PaginatedResult<T> {
    data: T[];
    pagination: PaginationMeta;
  }


  interface QueryState {
    page: number;
    limit: number;
    search: string;
    type: string;
    sort_by: string;
    order_by: 'asc' | 'desc';
    params: QueryParams;
    date_from: Date | string;
    date_to: Date | string;
  }
  interface QueryParamsConfig<T = any> {
    defaults: T;
    validators?: Partial<Record<keyof T, (value: any) => any>>;
  }

  type SearchFieldType = 'string' | 'number' | 'date' | 'boolean';

  interface SearchFieldConfig {
    field: string;
    type: SearchFieldType;
    searchable?: boolean; // Default: true
  }

  const DEFAULT_PAGINATION: QueryParams = {
    page: 1,
    limit: 10,
    order_by: 'desc'
  };

  // =======================
  // Setting Response
  // =======================

  type SiteSetting = {
    site_name?: string;
    site_tagline?: string;
    site_logo?: string;
    site_favicon?: string;
    site_meta_title?: string;
    site_meta_description?: string;
    site_url?: string;
    site_og_image?: string;
    site_og_title?: string;
    site_og_description?: string;
    site_keywords?: string;
    enable_register?: boolean;
    [key: string]: any;
  };
  // =======================
  // Campaign Types
  // =======================

  type CampaignPlatform =
    // E-commerce Global
    | 'amazon' | 'ebay' | 'aliexpress' | 'walmart' | 'etsy' | 'shopify' | 'bigcommerce'
    // E-commerce Asia
    | 'shopee' | 'lazada' | 'tokopedia' | 'bukalapak' | 'blibli' | 'tiktok' | 'temu' | 'shein'
    | 'jd' | 'taobao' | 'tmall' | 'pinduoduo' | 'coupang' | 'rakuten' | 'qoo10' | 'zilingo'
    // E-commerce Indonesia Lokal
    | 'tokopedia' | 'bukalapak' | 'blibli' | 'shopee' | 'lazada' | 'jd_id' | 'zalora'
    | 'sociolla' | 'orami' | 'ruparupa' | 'klikindomaret' | 'happyfresh' | 'sayurbox'
    // Travel & Hospitality
    | 'traveloka' | 'tiket' | 'agoda' | 'booking' | 'expedia' | 'airbnb' | 'trivago'
    | 'kayak' | 'skyscanner' | 'hotels' | 'tripadvisor' | 'pegipegi'
    // Digital Services & Streaming
    | 'spotify' | 'netflix' | 'disney' | 'youtube' | 'twitch' | 'vimeo' | 'apple_music'
    | 'amazon_prime' | 'hbo' | 'paramount'
    // Finance & Fintech
    | 'gojek' | 'grab' | 'ovo' | 'dana' | 'linkaja' | 'shopee_pay' | 'gopay'
    | 'paypal' | 'stripe' | 'paytm' | 'alipay' | 'wechat_pay'
    // E-commerce & Marketplace Lainnya
    | 'carousell' | 'olx' | 'mataharimall' | 'fabelio' | 'ishop' | 'matahari'
    | 'ace_hardware' | 'informa' | 'sofa' | 'h&m' | 'zara' | 'uniqlo' | 'zalora'
    // Gaming & Entertainment
    | 'steam' | 'epic_games' | 'playstation' | 'xbox' | 'nintendo' | 'mobile_legends'
    | 'freefire' | 'pubg' | 'valorant' | 'genshin_impact'
    // Health & Beauty
    | 'sociolla' | 'beautynesia' | 'makeover' | 'wardah' | 'mustika_ratu' | 'safi'
    | 'loreal' | 'watsons' | 'guardian'
    // Food & Delivery
    | 'gofood' | 'grabfood' | 'shopee_food' | 'deliveroo' | 'ubereats' | 'doordash'
    | 'zomato' | 'swiggy' | 'foodpanda'
    | 'custom';

  type OfferType =
    | 'affiliate'
    | 'cpa'
    | 'direct'
    | 'popunder'
    | 'cpl'
    | 'cps'
    | 'cpc'
    | 'cpm'
    | 'lead_generation'
    | 'incentive'
    | 'survey'
    | 'app_install'
    | 'subscription'
    | 'cashback';


  interface CampaignPlatformData {
    value: string;
    label: string;
    category: 'ecommerce' | 'marketplace' | 'travel' | 'digital' | 'fintech' | 'gaming' | 'beauty' | 'food' | 'fashion' | 'general';
    region: 'global' | 'asia' | 'indonesia' | 'europe' | 'america';
    icon?: string;
    color?: string;
    isIndonesian?: boolean;
    affiliateNetwork?: string;
    commissionRange?: string;
    cookieDuration?: string;
  }
}

export { };
