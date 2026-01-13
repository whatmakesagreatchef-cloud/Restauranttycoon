import { clamp, randInt } from "./rng.js";
import { REVIEW_PLATFORMS, REVIEW_REPLY_ACTIONS, VIRAL } from "./data_reviews.js";
import { ensureCustomerData } from "./system_customers.js";

export function ensureReviewState(state){
  if(!state.reviewFeed) state.reviewFeed = [];
  if(state.reviewFeed.length > 140) state.reviewFeed = state.reviewFeed.slice(0, 140);
  return state;
}

export function ensureVenueReview(venue){
  if(venue.reviewBuzz == null) venue.reviewBuzz = 0; // -20..+20, impacts demand
  if(!venue.reviewStats){
    venue.reviewStats = { avgStars: 0, total: 0, newThisWeek: 0, negativeThisWeek: 0 };
  }
  return venue.reviewStats;
}

export function pickPlatform(rng, venue){
  // Weighted random with simple style/type tweaks
  const style = venue.menuStyle || "a_la_carte";
  const typeId = venue.typeId || "";

  const weights = REVIEW_PLATFORMS.map(p=>({ id:p.id, w:p.weight }));
  for(const p of weights){
    if(p.id==="tripadvisor" && (style==="winery" || style==="hotel")) p.w += 8;
    if(p.id==="instagram" && (style==="tasting" || style==="fine_dining")) p.w += 6;
    if(p.id==="tiktok" && (typeId==="truck" || style==="cafe")) p.w += 4;
    if(p.id==="google" && (style==="pub" || style==="cafe")) p.w += 6;
  }

  const sum = weights.reduce((a,p)=>a+p.w,0);
  let r = rng()*sum;
  for(const p of weights){
    r -= p.w;
    if(r <= 0) return p.id;
  }
  return "google";
}

export function ingestVenueReviews(state, venue, rng){
  ensureReviewState(state);
  ensureVenueReview(venue);

  const c = ensureCustomerData(venue);
  const list = c.reviews || [];

  let newCount = 0;
  let negCount = 0;

  for(const rv of list){
    if(rv.ingested) continue;

    if(rv.createdAtWeek == null) rv.createdAtWeek = state.week;
    if(rv.week == null) rv.week = rv.createdAtWeek;
    if(!rv.platform) rv.platform = pickPlatform(rng, venue);
    if(rv.replied == null) rv.replied = false;

    rv.ingested = true;

    newCount += 1;
    if((rv.stars||0) <= 2) negCount += 1;

    state.reviewFeed.unshift({
      week: rv.week,
      venueId: venue.id,
      venueName: venue.name,
      platform: rv.platform,
      stars: rv.stars,
      text: rv.text
    });
  }

  state.reviewFeed = state.reviewFeed.slice(0, 140);

  // Stats
  const recent = list.slice(0, 50);
  const total = list.length;
  const avg = recent.length ? (recent.reduce((a,x)=>a+(x.stars||0),0)/recent.length) : 0;

  venue.reviewStats.avgStars = Number(avg.toFixed(2));
  venue.reviewStats.total = total;
  venue.reviewStats.newThisWeek = newCount;
  venue.reviewStats.negativeThisWeek = negCount;

  // Buzz decay
  venue.reviewBuzz = clamp((venue.reviewBuzz||0) * 0.85, -20, 20);

  // Viral negative event
  if(newCount>0){
    const bad = list.find(x=>x.ingested && x.week===state.week && (x.stars||0) <= VIRAL.lowStarTrigger);
    if(bad){
      const pop = Number(venue.popularity||50);
      const chance = clamp(VIRAL.baseChance + (pop/2000), 0.02, 0.18);
      if(rng() < chance){
        const shock = clamp(6 + randInt(rng, 0, 12) + Math.round((pop-60)/10), 6, VIRAL.maxShock);
        venue.reviewBuzz = clamp((venue.reviewBuzz||0) - shock, -20, 20);
        state.logs.push({ week: state.week, type:"pr", msg:`${venue.name}: a low-star review went viral (${bad.platform}). Demand hit.` });
      }
    }
  }

  return { newCount, negCount, avgStars: venue.reviewStats.avgStars };
}

export function respondToReview(state, venueId, reviewId, action){
  const v = state.venues.find(x=>x.id===venueId);
  if(!v) return { ok:false };
  const c = ensureCustomerData(v);
  const r = (c.reviews||[]).find(x=>x.id===reviewId);
  if(!r || r.replied) return { ok:false };

  let a = REVIEW_REPLY_ACTIONS[action] || REVIEW_REPLY_ACTIONS.apology;

  // If action costs cash but you can't afford, fallback
  if((a.cash||0) > 0 && state.cash < a.cash){
    action = "apology";
    a = REVIEW_REPLY_ACTIONS.apology;
  }

  if((a.cash||0) > 0) state.cash -= a.cash;

  r.replied = true;
  r.replyAction = action;
  r.replyWeek = state.week;

  const stars = Number(r.stars||3);
  const starsWeight = (stars<=2) ? 1.2 : (stars==3 ? 0.6 : 0.35);

  v.localReputation = clamp((v.localReputation||50) + a.rep*starsWeight, 0, 100);
  v.reviewBuzz = clamp((v.reviewBuzz||0) + a.buzz*starsWeight, -20, 20);

  state.logs.push({ week: state.week, type:"review", msg:`Replied to review at ${v.name} (${action}).` });
  return { ok:true };
}
