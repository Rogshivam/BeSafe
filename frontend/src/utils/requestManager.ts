// Production-ready request manager with caching, debouncing, and retry logic
interface RequestCache {
  [key: string]: {
    data: any;
    timestamp: number;
    ttl: number;
  };
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timestamp: number;
}

class RequestManager {
  private cache: RequestCache = {};
  private pendingRequests: Map<string, PendingRequest[]> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // Cache TTL in milliseconds
  private readonly CACHE_TTL = {
    'emergency/history': 30000, // 30 seconds
    'emergency/active': 10000,  // 10 seconds
    'children': 60000,          // 1 minute
    'evidence': 45000,          // 45 seconds
    'relationships': 120000,    // 2 minutes
    'location': 5000,           // 5 seconds
    'default': 15000            // 15 seconds
  };

  // Retry configuration
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second
  private readonly RETRY_BACKOFF = 2; // Exponential backoff

  /**
   * Get cache key for request
   */
  private getCacheKey(url: string, params?: any): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${url}:${paramString}`;
  }

  /**
   * Get TTL for a specific endpoint
   */
  private getTTL(url: string): number {
    for (const [key, ttl] of Object.entries(this.CACHE_TTL)) {
      if (url.includes(key)) return ttl;
    }
    return this.CACHE_TTL.default;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cacheEntry: RequestCache[string]): boolean {
    return Date.now() - cacheEntry.timestamp < cacheEntry.ttl;
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    Object.keys(this.cache).forEach(key => {
      if (now - this.cache[key].timestamp >= this.cache[key].ttl) {
        delete this.cache[key];
      }
    });
  }

  /**
   * Debounce function to prevent rapid repeated requests
   */
  public debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number = 300
  ): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve, reject) => {
        // Clear existing timer
        if (this.debounceTimers.has(key)) {
          clearTimeout(this.debounceTimers.get(key)!);
        }

        // Set new timer
        const timer = setTimeout(async () => {
          try {
            const result = await func(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            this.debounceTimers.delete(key);
          }
        }, delay);

        this.debounceTimers.set(key, timer);
      });
    };
  }

  /**
   * Retry function with exponential backoff
   */
  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    retries: number = this.MAX_RETRIES,
    delay: number = this.RETRY_DELAY
  ): Promise<T> {
    try {
      return await requestFn();
    } catch (error: any) {
      // Don't retry on 4xx errors (client errors)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      if (retries <= 0) {
        throw error;
      }

      console.warn(`Request failed, retrying in ${delay}ms... (${retries} retries left)`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.retryRequest(requestFn, retries - 1, delay * this.RETRY_BACKOFF);
    }
  }

  /**
   * Make an HTTP request with caching, deduplication, and retry logic
   */
  public async request<T>(
    url: string,
    options: RequestInit = {},
    enableCache: boolean = true,
    enableRetry: boolean = true
  ): Promise<T> {
    const cacheKey = this.getCacheKey(url, options.body);

    // Clean expired cache entries periodically
    this.cleanExpiredCache();

    // Check cache first
    if (enableCache && this.cache[cacheKey] && this.isCacheValid(this.cache[cacheKey])) {
      console.log(`Cache hit for: ${url}`);
      return this.cache[cacheKey].data;
    }

    // Check if there's already a pending request for the same URL
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`Request deduplication for: ${url}`);
      const pending = this.pendingRequests.get(cacheKey)!;
      
      return new Promise((resolve, reject) => {
        pending.push({ resolve, reject, timestamp: Date.now() });
      });
    }

    // Create new pending request array
    this.pendingRequests.set(cacheKey, []);

    const requestFn = async (): Promise<T> => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        (error as any).response = response;
        throw error;
      }

      const data = await response.json();

      // Cache successful responses
      if (enableCache && response.ok) {
        this.cache[cacheKey] = {
          data,
          timestamp: Date.now(),
          ttl: this.getTTL(url)
        };
      }

      return data;
    };

    try {
      const result = enableRetry 
        ? await this.retryRequest(requestFn)
        : await requestFn();

      // Resolve all pending requests
      const pending = this.pendingRequests.get(cacheKey) || [];
      pending.forEach(({ resolve }) => resolve(result));
      this.pendingRequests.delete(cacheKey);

      return result;
    } catch (error) {
      // Reject all pending requests
      const pending = this.pendingRequests.get(cacheKey) || [];
      pending.forEach(({ reject }) => reject(error));
      this.pendingRequests.delete(cacheKey);

      throw error;
    }
  }

  /**
   * Clear cache for specific URL or all cache
   */
  public clearCache(url?: string): void {
    if (url) {
      const keysToDelete = Object.keys(this.cache).filter(key => key.includes(url));
      keysToDelete.forEach(key => delete this.cache[key]);
    } else {
      this.cache = {};
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: Object.keys(this.cache).length,
      keys: Object.keys(this.cache)
    };
  }
}

// Export singleton instance
export const requestManager = new RequestManager();

// Export convenience functions
export const debouncedRequest = <T>(
  key: string,
  url: string,
  options?: RequestInit,
  delay?: number
) => requestManager.debounce(key, () => requestManager.request<T>(url, options), delay);

export const cachedRequest = <T>(url: string, options?: RequestInit) => 
  requestManager.request<T>(url, options, true, true);

export const freshRequest = <T>(url: string, options?: RequestInit) => 
  requestManager.request<T>(url, options, false, true);
