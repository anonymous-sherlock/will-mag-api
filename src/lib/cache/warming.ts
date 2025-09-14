/**
 * Cache warming strategies and utilities
 */

import { getCacheService } from "./cache-service";

export interface WarmingStrategy {
  /** Strategy name */
  name: string;
  /** Priority (higher = more important) */
  priority: number;
  /** Whether to run on startup */
  runOnStartup: boolean;
  /** Whether to run periodically */
  runPeriodically: boolean;
  /** Interval for periodic runs (in ms) */
  interval?: number;
  /** Function to execute for warming */
  warm: () => Promise<void>;
}

export interface WarmingConfig {
  /** Enable cache warming */
  enabled: boolean;
  /** Strategies to use */
  strategies: WarmingStrategy[];
  /** Maximum concurrent warming operations */
  maxConcurrent: number;
  /** Timeout for warming operations */
  timeout: number;
}

export class CacheWarmer {
  private strategies: WarmingStrategy[] = [];
  private running = false;
  private intervals: NodeJS.Timeout[] = [];

  constructor(private config: WarmingConfig) {
    this.strategies = config.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Start cache warming
   */
  async start(): Promise<void> {
    if (!this.config.enabled || this.running) {
      return;
    }

    this.running = true;
    console.warn("🔥 Starting cache warming...");

    // Run startup strategies
    await this.runStartupStrategies();

    // Start periodic strategies
    this.startPeriodicStrategies();

    console.warn("✅ Cache warming started");
  }

  /**
   * Stop cache warming
   */
  stop(): void {
    this.running = false;

    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];

    console.warn("🛑 Cache warming stopped");
  }

  /**
   * Run startup strategies
   */
  private async runStartupStrategies(): Promise<void> {
    const startupStrategies = this.strategies.filter(s => s.runOnStartup);

    if (startupStrategies.length === 0) {
      return;
    }

    console.warn(`Running ${startupStrategies.length} startup strategies...`);

    // Run strategies in parallel with concurrency limit
    const chunks = this.chunkArray(startupStrategies, this.config.maxConcurrent);

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(strategy => this.runStrategy(strategy)),
      );
    }
  }

  /**
   * Start periodic strategies
   */
  private startPeriodicStrategies(): void {
    const periodicStrategies = this.strategies.filter(s => s.runPeriodically && s.interval);

    for (const strategy of periodicStrategies) {
      const interval = setInterval(async () => {
        if (this.running) {
          await this.runStrategy(strategy);
        }
      }, strategy.interval);

      this.intervals.push(interval);
    }

    if (periodicStrategies.length > 0) {
      console.warn(`Started ${periodicStrategies.length} periodic strategies`);
    }
  }

  /**
   * Run a single strategy
   */
  private async runStrategy(strategy: WarmingStrategy): Promise<void> {
    try {
      console.warn(`🔥 Warming cache with strategy: ${strategy.name}`);
      await Promise.race([
        strategy.warm(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Strategy timeout")), this.config.timeout),
        ),
      ]);
      console.warn(`✅ Strategy ${strategy.name} completed`);
    }
    catch (error) {
      console.error(`❌ Strategy ${strategy.name} failed:`, error);
    }
  }

  /**
   * Add a new strategy
   */
  addStrategy(strategy: WarmingStrategy): void {
    this.strategies.push(strategy);
    this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove a strategy
   */
  removeStrategy(name: string): void {
    this.strategies = this.strategies.filter(s => s.name !== name);
  }

  /**
   * Get warming status
   */
  getStatus(): {
    running: boolean;
    strategies: Array<{ name: string; priority: number; runOnStartup: boolean; runPeriodically: boolean }>;
  } {
    return {
      running: this.running,
      strategies: this.strategies.map(s => ({
        name: s.name,
        priority: s.priority,
        runOnStartup: s.runOnStartup,
        runPeriodically: s.runPeriodically,
      })),
    };
  }

  /**
   * Utility to chunk array for concurrency control
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

/**
 * Common warming strategies
 */
export const commonWarmingStrategies = {
  /**
   * Warm profile list cache
   */
  profileList: (): WarmingStrategy => ({
    name: "profile-list",
    priority: 10,
    runOnStartup: true,
    runPeriodically: true,
    interval: 5 * 60 * 1000, // 5 minutes
    warm: async () => {
      const cache = getCacheService();

      // Warm first few pages
      for (let page = 1; page <= 3; page++) {
        const key = `profile:list:page:${page}:limit:20`;

        // Check if already cached
        const existing = await cache.get(key);
        if (!existing) {
          // This would typically call the actual handler
          // For now, we'll just log that we would warm it
          console.warn(`Would warm cache for key: ${key}`);
        }
      }
    },
  }),

  /**
   * Warm leaderboard cache
   */
  leaderboard: (): WarmingStrategy => ({
    name: "leaderboard",
    priority: 9,
    runOnStartup: true,
    runPeriodically: true,
    interval: 2 * 60 * 1000, // 2 minutes
    warm: async () => {
      const cache = getCacheService();

      // Warm leaderboard data
      const keys = [
        "leaderboard:main:page:1:limit:20",
        "leaderboard:stats",
      ];

      for (const key of keys) {
        const existing = await cache.get(key);
        if (!existing) {
          console.warn(`Would warm cache for key: ${key}`);
        }
      }
    },
  }),

  /**
   * Warm analytics cache
   */
  analytics: (): WarmingStrategy => ({
    name: "analytics",
    priority: 8,
    runOnStartup: true,
    runPeriodically: true,
    interval: 10 * 60 * 1000, // 10 minutes
    warm: async () => {
      const cache = getCacheService();

      // Warm analytics data
      const keys = [
        "analytics:dashboard",
        "analytics:detailed:daily",
        "analytics:contest",
        "analytics:votes",
      ];

      for (const key of keys) {
        const existing = await cache.get(key);
        if (!existing) {
          console.warn(`Would warm cache for key: ${key}`);
        }
      }
    },
  }),
};

/**
 * Default warming configuration
 */
export const defaultWarmingConfig: WarmingConfig = {
  enabled: true,
  strategies: [
    commonWarmingStrategies.profileList(),
    commonWarmingStrategies.leaderboard(),
    commonWarmingStrategies.analytics(),
  ],
  maxConcurrent: 3,
  timeout: 30000, // 30 seconds
};
