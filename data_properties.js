export const LEASE_REVIEW_TYPES = [
  { id:"cpi", name:"CPI review" },
  { id:"fixed", name:"Fixed % increases" },
  { id:"market", name:"Market review" },
  { id:"turnover", name:"Turnover rent component" }
];

export const MAKE_GOOD_LEVELS = [
  { id:"light", name:"Light make-good" },
  { id:"standard", name:"Standard make-good" },
  { id:"heavy", name:"Heavy make-good" }
];

export const APPROVAL_LEVELS = [
  { id:"flex", name:"Flexible approvals" },
  { id:"standard", name:"Standard approvals" },
  { id:"strict", name:"Strict approvals" }
];

export const DISTRICTS = [
  { id:"cbd", name:"CBD / Core", traffic: 85, rentBias: 1.25 },
  { id:"strip", name:"Dining Strip", traffic: 80, rentBias: 1.18 },
  { id:"suburb", name:"Suburb Hub", traffic: 65, rentBias: 0.95 },
  { id:"waterfront", name:"Waterfront", traffic: 75, rentBias: 1.10 },
  { id:"industrial", name:"Industrial", traffic: 45, rentBias: 0.70 },
  { id:"tourist", name:"Tourist Quarter", traffic: 78, rentBias: 1.22 },
  { id:"campus", name:"University / Campus", traffic: 70, rentBias: 1.00 },
];

export const SHELL_TYPES = [
  { id:"small_shop", name:"Small street shop", sizeRange:[55, 110], rentPerSqmWeekly:[12, 22], fitoutComplexity: 0.9 },
  { id:"corner_site", name:"Corner site", sizeRange:[90, 180], rentPerSqmWeekly:[16, 28], fitoutComplexity: 1.0 },
  { id:"large_dining", name:"Large dining room", sizeRange:[160, 320], rentPerSqmWeekly:[14, 26], fitoutComplexity: 1.15 },
  { id:"pub_kitchen_shell", name:"Pub kitchen shell", sizeRange:[180, 360], rentPerSqmWeekly:[12, 24], fitoutComplexity: 1.10 },
  { id:"hotel_pad", name:"Hotel pad (FOH integrated)", sizeRange:[120, 240], rentPerSqmWeekly:[10, 22], fitoutComplexity: 1.05 },
  { id:"winery_shell", name:"Winery venue shell", sizeRange:[140, 280], rentPerSqmWeekly:[9, 20], fitoutComplexity: 1.10 },
];
