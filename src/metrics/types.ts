export type CacheStats = {
  hits: number;
  misses: number;

  averageHitTime: number;
  averageMissTime: number;
};

export type CacheMetrics = {
  operation: string;
  // this indicates the ratio of cache hits
  hitRatio: number;
  // this indicate how much time we are saving compared with average miss time
  timeSavedRatio: number;
  // this indicates how much faster on average your request is when it hits cache
  performanceGain: number;
};
