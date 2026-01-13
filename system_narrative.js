/**
 * NARRATIVE SYSTEM MODULE
 * Story-driven progression system inspired by Football Manager
 * 
 * Features:
 * - Chapter-based storytelling
 * - Character interactions
 * - Dynamic events based on performance
 * - Achievement tracking
 * - Tutorial integration
 */

import { RNG } from './rng.js';

/**
 * Story chapters and progression
 */
export const NARRATIVE_CHAPTERS = [
  {
    id: 0,
    title: "The Beginning",
    description: "Your journey starts here...",
    unlockCondition: null, // Always unlocked
    events: [
      {
        id: "welcome",
        title: "A New Chapter",
        text: `You've always dreamed of running your own restaurant empire. 
        
After years of working in kitchens across the city, saving every penny, and learning from the best (and worst) managers you've encountered, you finally have enough capital to make your move.

The question is: what kind of restaurateur will you become?`,
        choices: [
          {
            text: "Let's build an empire! 🚀",
            effect: (state) => {
              state.narrative.playerChoice = "ambitious";
              state.seenSetup = true;
            }
          }
        ],
        image: "🍽️"
      }
    ]
  },
  {
    id: 1,
    title: "First Steps",
    description: "Open your first venue and learn the ropes",
    unlockCondition: (state) => state.venues.length === 0,
    events: [
      {
        id: "first_venue_advice",
        title: "Location, Location, Location",
        text: `Your mentor, Chef Marcus, calls you with advice:

"Listen, I've seen too many talented people fail because they picked the wrong location for their first spot. You need somewhere with good foot traffic, but not so expensive that one bad month wipes you out.

Trust your gut, but also... do the math. This city doesn't forgive romantics."`,
        choices: [
          {
            text: "Thanks, Chef. I'll be careful. 🙏",
            effect: null
          }
        ],
        character: "chef_marcus"
      }
    ]
  },
  {
    id: 2,
    title: "Growing Pains",
    description: "Navigate the challenges of your first venue",
    unlockCondition: (state) => state.venues.length >= 1,
    events: [
      {
        id: "first_month_reflection",
        title: "One Month In",
        text: `You close the door at the end of your first month in business and lean against it, exhausted. 

Your phone buzzes - it's your partner, Sam:

"Hey! How's it going? Tell me everything. Are you surviving? Thriving? Crying into a walk-in cooler?"`,
        choices: [
          {
            text: "It's harder than I thought... 😅",
            effect: (state) => {
              state.narrative.relationshipWithSam = "honest";
            }
          },
          {
            text: "Everything's under control! 💪",
            effect: (state) => {
              state.narrative.relationshipWithSam = "confident";
            }
          },
          {
            text: "I might be in over my head... 😰",
            effect: (state) => {
              state.narrative.relationshipWithSam = "vulnerable";
            }
          }
        ],
        character: "partner_sam"
      }
    ]
  },
  {
    id: 3,
    title: "The Competition",
    description: "A rival restaurant opens nearby",
    unlockCondition: (state) => state.week >= 8 && state.venues.length >= 1,
    events: [
      {
        id: "rival_opens",
        title: "New Competition",
        text: `You notice construction next door has finished. A sleek new restaurant is opening - and it looks expensive.

The next morning, you find a note slipped under your door:

"Welcome to the neighborhood. May the best chef win. - Alessandro"

Through your window, you see a man in an expensive suit directing staff. He catches your eye and raises his coffee cup in a mock toast.`,
        choices: [
          {
            text: "Focus on my own restaurant 🎯",
            effect: (state) => {
              state.narrative.rivalApproach = "ignore";
            }
          },
          {
            text: "Visit and introduce myself 🤝",
            effect: (state) => {
              state.narrative.rivalApproach = "friendly";
              state.narrative.unlockEvent = "rival_meeting";
            }
          },
          {
            text: "Time to step up my game 🔥",
            effect: (state) => {
              state.narrative.rivalApproach = "competitive";
              state.narrative.motivationBoost = true;
            }
          }
        ],
        character: "rival_alessandro"
      }
    ]
  },
  {
    id: 4,
    title: "Expansion Dreams",
    description: "Consider opening a second location",
    unlockCondition: (state) => state.venues.length === 1 && state.cash > 200000,
    events: [
      {
        id: "expansion_opportunity",
        title: "A Call from Chef Marcus",
        text: `Chef Marcus calls you late one evening:

"I heard from a friend that the old waterfront space is available. Premium location. They want $300k but I bet you could negotiate. 

Here's the thing though - you're doing well with one place. Don't let ego drive the decision. Some of the best restaurateurs I know run one perfect spot. Some build empires. Neither is wrong. Just... different."`,
        choices: [
          {
            text: "I'm ready to expand! 🚀",
            effect: (state) => {
              state.narrative.expansionMindset = "empire";
            }
          },
          {
            text: "I need to master this one first 🎓",
            effect: (state) => {
              state.narrative.expansionMindset = "perfectionist";
            }
          },
          {
            text: "Let me think about it... 🤔",
            effect: (state) => {
              state.narrative.expansionMindset = "cautious";
            }
          }
        ],
        character: "chef_marcus"
      }
    ]
  }
];

/**
 * Character profiles
 */
export const CHARACTERS = {
  chef_marcus: {
    name: "Chef Marcus",
    role: "Mentor",
    description: "Veteran restaurateur with 30 years experience",
    avatar: "👨‍🍳"
  },
  partner_sam: {
    name: "Sam",
    role: "Best Friend & Confidant",
    description: "Your biggest supporter and occasional voice of reason",
    avatar: "👤"
  },
  rival_alessandro: {
    name: "Alessandro",
    role: "Rival",
    description: "Successful restaurateur with money and connections",
    avatar: "🎭"
  },
  critic_morgan: {
    name: "Morgan Chen",
    role: "Food Critic",
    description: "Influential critic whose reviews can make or break restaurants",
    avatar: "✍️"
  },
  investor_victoria: {
    name: "Victoria Stone",
    role: "Potential Investor",
    description: "Venture capitalist interested in restaurant concepts",
    avatar: "💼"
  }
};

/**
 * Dynamic events based on game state
 */
export const DYNAMIC_EVENTS = {
  
  // Triggered by low cash
  cash_crisis: {
    trigger: (state) => state.cash < 50000 && state.venues.length > 0,
    title: "Cash Flow Crisis",
    text: `Your phone rings. It's Sam:

"Hey, I noticed your posts have been... less enthusiastic lately. Everything okay? You'd tell me if you were in trouble, right?"`,
    choices: [
      {
        text: "I'm managing. Just tight right now. 💪",
        effect: null
      },
      {
        text: "Honestly? I'm worried about payroll. 😟",
        effect: (state) => {
          state.narrative.askedForHelp = true;
          state.narrative.unlockEvent = "sam_offers_help";
        }
      }
    ]
  },
  
  // Triggered by high success
  success_milestone: {
    trigger: (state) => {
      const venue = state.venues[0];
      return venue && venue.reputation > 4.0 && state.week > 12;
    },
    title: "Making Waves",
    text: `You receive an email from a local food blogger:

"Your restaurant has become the talk of the neighborhood. Would you be interested in an interview for our 'Rising Stars' series?"

This could be great exposure... or unwanted pressure.`,
    choices: [
      {
        text: "Absolutely! Great PR opportunity. 📸",
        effect: (state) => {
          state.narrative.mediaExposure = "high";
          state.narrative.unlockEvent = "media_interview";
        }
      },
      {
        text: "Thanks, but I prefer to stay focused. 🎯",
        effect: (state) => {
          state.narrative.mediaExposure = "low";
        }
      }
    ]
  },
  
  // Triggered by staff issues
  staff_loyalty: {
    trigger: (state) => {
      const venue = state.venues[0];
      return venue && venue.staffMorale < 50 && state.week > 8;
    },
    title: "Staff Meeting",
    text: `Your head chef asks to speak with you privately:

"Look, we need to talk. The team is burning out. People are talking about leaving. You're a good boss, but... we need more support. Or more pay. Or just... something has to change."`,
    choices: [
      {
        text: "You're right. Let's fix this. 🤝",
        effect: (state) => {
          state.narrative.staffApproach = "supportive";
          state.narrative.unlockEvent = "staff_improvements";
        }
      },
      {
        text: "This is a tough business. Everyone knew that. 💼",
        effect: (state) => {
          state.narrative.staffApproach = "tough";
        }
      },
      {
        text: "Give me a week to figure out a plan. 📋",
        effect: (state) => {
          state.narrative.staffApproach = "strategic";
        }
      }
    ]
  }
};

/**
 * Initialize narrative state
 */
export function initNarrative() {
  return {
    chapter: 0,
    unlockedChapters: [0],
    completedEvents: [],
    activeEvent: null,
    playerChoices: {},
    relationships: {},
    achievements: [],
    week: 0
  };
}

/**
 * Check if new chapters should unlock
 */
export function updateNarrative(state) {
  if (!state.narrative) {
    state.narrative = initNarrative();
  }
  
  // Check chapter unlock conditions
  NARRATIVE_CHAPTERS.forEach(chapter => {
    if (!state.narrative.unlockedChapters.includes(chapter.id)) {
      if (!chapter.unlockCondition || chapter.unlockCondition(state)) {
        state.narrative.unlockedChapters.push(chapter.id);
        state.narrative.unlockedChapters.sort((a, b) => a - b);
        
        // Notify player of new chapter
        if (chapter.id > 0) {
          state.notifications = state.notifications || [];
          state.notifications.push({
            type: 'chapter',
            title: 'New Chapter Unlocked!',
            text: chapter.title,
            timestamp: Date.now()
          });
        }
      }
    }
  });
  
  // Check for dynamic events
  Object.entries(DYNAMIC_EVENTS).forEach(([key, event]) => {
    const eventId = `dynamic_${key}`;
    if (!state.narrative.completedEvents.includes(eventId)) {
      if (event.trigger(state)) {
        // Trigger this event
        state.narrative.pendingEvent = {
          id: eventId,
          ...event
        };
      }
    }
  });
  
  return state;
}

/**
 * Get current available events for player
 */
export function getAvailableEvents(state) {
  if (!state.narrative) return [];
  
  const events = [];
  
  // Get events from unlocked chapters
  state.narrative.unlockedChapters.forEach(chapterId => {
    const chapter = NARRATIVE_CHAPTERS.find(c => c.id === chapterId);
    if (chapter && chapter.events) {
      chapter.events.forEach(event => {
        const eventId = `chapter_${chapterId}_${event.id}`;
        if (!state.narrative.completedEvents.includes(eventId)) {
          events.push({
            ...event,
            fullId: eventId,
            chapter: chapterId
          });
        }
      });
    }
  });
  
  // Add pending dynamic event
  if (state.narrative.pendingEvent) {
    events.push(state.narrative.pendingEvent);
  }
  
  return events;
}

/**
 * Complete an event and apply choices
 */
export function completeEvent(state, eventId, choiceIndex) {
  const events = getAvailableEvents(state);
  const event = events.find(e => e.fullId === eventId || e.id === eventId);
  
  if (!event) return state;
  
  // Apply choice effect
  const choice = event.choices[choiceIndex];
  if (choice && choice.effect) {
    choice.effect(state);
  }
  
  // Mark as completed
  state.narrative.completedEvents.push(eventId);
  
  // Clear pending event if it was dynamic
  if (state.narrative.pendingEvent && state.narrative.pendingEvent.id === eventId) {
    state.narrative.pendingEvent = null;
  }
  
  // Record choice
  state.narrative.playerChoices[eventId] = choiceIndex;
  
  return state;
}

/**
 * Get story progress percentage
 */
export function getStoryProgress(state) {
  if (!state.narrative) return 0;
  
  const totalChapters = NARRATIVE_CHAPTERS.length;
  const unlockedCount = state.narrative.unlockedChapters.length;
  
  return Math.round((unlockedCount / totalChapters) * 100);
}

/**
 * Generate weekly story update based on performance
 */
export function generateWeeklyStoryBeat(state) {
  const venue = state.venues[0];
  if (!venue) return null;
  
  const beats = [];
  
  // Performance-based story beats
  if (venue.reputation > 4.5) {
    beats.push({
      text: "Word on the street is your restaurant is one of the hottest tables in town.",
      mood: "success"
    });
  } else if (venue.reputation < 3.0) {
    beats.push({
      text: "You overhear diners complaining. You know you can do better than this.",
      mood: "challenge"
    });
  }
  
  if (state.cash > 500000) {
    beats.push({
      text: "Your bank account is looking healthy. Sam texts: 'Look at you, money bags! 💰'",
      mood: "success"
    });
  } else if (state.cash < 30000) {
    beats.push({
      text: "Another night counting pennies. Chef Marcus always said the first year was the hardest...",
      mood: "struggle"
    });
  }
  
  if (beats.length === 0) return null;
  
  // Return random beat
  return RNG.pick(beats);
}

/**
 * Achievement system
 */
export const ACHIEVEMENTS = [
  {
    id: "first_venue",
    name: "First Steps",
    description: "Open your first restaurant",
    condition: (state) => state.venues.length >= 1,
    icon: "🏪"
  },
  {
    id: "profitable_month",
    name: "In the Black",
    description: "Run a profitable month",
    condition: (state) => {
      // Check if last week had positive cash flow
      return state.weeklyReports && state.weeklyReports.length > 0 &&
             state.weeklyReports[state.weeklyReports.length - 1].profit > 0;
    },
    icon: "💰"
  },
  {
    id: "high_reputation",
    name: "Rising Star",
    description: "Reach 4.5 stars reputation",
    condition: (state) => state.venues.some(v => v.reputation >= 4.5),
    icon: "⭐"
  },
  {
    id: "empire_builder",
    name: "Empire Builder",
    description: "Own 3 or more venues",
    condition: (state) => state.venues.length >= 3,
    icon: "🏛️"
  },
  {
    id: "mentor",
    name: "Paying It Forward",
    description: "Train staff to level 5",
    condition: (state) => {
      return state.venues.some(v => 
        v.staff && (
          v.staff.gmSkill >= 5 || 
          v.staff.chefSkill >= 5 || 
          v.staff.fohSkill >= 5
        )
      );
    },
    icon: "🎓"
  }
];

/**
 * Check and award achievements
 */
export function updateAchievements(state) {
  if (!state.narrative) {
    state.narrative = initNarrative();
  }
  
  if (!state.narrative.achievements) {
    state.narrative.achievements = [];
  }
  
  ACHIEVEMENTS.forEach(achievement => {
    if (!state.narrative.achievements.includes(achievement.id)) {
      if (achievement.condition(state)) {
        state.narrative.achievements.push(achievement.id);
        
        // Notify player
        state.notifications = state.notifications || [];
        state.notifications.push({
          type: 'achievement',
          title: 'Achievement Unlocked!',
          text: `${achievement.icon} ${achievement.name}: ${achievement.description}`,
          timestamp: Date.now()
        });
      }
    }
  });
  
  return state;
}
