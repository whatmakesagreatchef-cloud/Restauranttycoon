export const REVIEW_PLATFORMS = [
  { id:"google", name:"Google", weight: 42 },
  { id:"tripadvisor", name:"TripAdvisor", weight: 18 },
  { id:"instagram", name:"Instagram", weight: 14 },
  { id:"tiktok", name:"TikTok", weight: 10 },
  { id:"local_press", name:"Local press", weight: 8 },
  { id:"food_blog", name:"Food blog", weight: 8 },
];

export const REVIEW_REPLY_ACTIONS = {
  apology:   { label:"Apology", rep:+0.8, buzz:+0.2, cash:0 },
  invite:    { label:"Invite back", rep:+1.3, buzz:+0.4, cash:15 },
  defensive: { label:"Defensive", rep:-1.5, buzz:-0.8, cash:0 },
  ignore:    { label:"Ignore", rep:-0.6, buzz:-0.3, cash:0 },
};

// Viral thresholds
export const VIRAL = {
  lowStarTrigger: 2,      // 1-2 star reviews can go viral
  baseChance: 0.04,       // baseline viral chance when triggered
  maxShock: 18,           // max negative buzz
};
