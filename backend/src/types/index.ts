export interface ShortLink {
  slug: string;
  originalUrl: string;
  ownerId: string;       
  createdAt: string;   
}

export interface ClickEvent {
  slug: string;
  timestamp: string;    
  ip: string;
  userAgent: string;
  referrer: string;
}

export interface AnalyticsSummary {
  slug: string;
  totalClicks: number;
  recentEvents: ClickEvent[];
}

// Hono context variables injected by auth middleware
export type AuthVariables = {
  userId: string;       
  userEmail: string;     
};


export interface RateLimitOptions {
  endpoint: string;
  limit: number;
  windowSecs: number;
}
