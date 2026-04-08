interface Env {
  FLEET_CACHE: KVNamespace;
  FLEET_STATS: DurableObjectNamespace;
}

interface ProxyRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  transform?: {
    removeHeaders?: string[];
    addHeaders?: Record<string, string>;
  };
  cacheTtl?: number;
  retryAttempts?: number;
}

interface CacheEntry {
  body: string;
  headers: Record<string, string>;
  timestamp: number;
  ttl: number;
}

interface Stats {
  requests: number;
  cachedResponses: number;
  bytesSaved: number;
  errors: number;
  circuitBreakerTrips: number;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private failureThreshold: number = 5,
    private resetTimeout = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker open');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure() {
    this.failures++;
    this.lastFailure = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  private reset() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
}

class StatsTracker {
  constructor(private state: DurableObjectStub) {}

  async recordRequest(cached: boolean, bytesSaved: number, error: boolean = false) {
    await this.state.fetch('https://stats.internal/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cached, bytesSaved, error })
    });
  }

  async recordCircuitBreakerTrip() {
    await this.state.fetch('https://stats.internal/circuit-trip', {
      method: 'POST'
    });
  }
}
const sh = {"Content-Security-Policy":"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; frame-ancestors 'none'","X-Frame-Options":"DENY"};
export default { async fetch(r: Request) { const u = new URL(r.url); if (u.pathname==='/health') return new Response(JSON.stringify({status:'ok'}),{headers:{'Content-Type':'application/json',...sh}}); return new Response(html,{headers:{'Content-Type':'text/html;charset=UTF-8',...sh}}); }};