/**
 * Temporal Awareness System
 * Provides time context for AI conversations
 */

export interface TemporalContext {
  currentDateTime: string;
  currentDate: string;
  currentTime: string;
  dayOfWeek: string;
  timezone: string;
  timeOfDay: string; // morning, afternoon, evening, night
  season: string;
  isWeekend: boolean;
}

/**
 * Get the current temporal context
 */
export function getCurrentTemporalContext(): TemporalContext {
  const now = new Date();

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

  const dayOfWeek = dayNames[now.getDay()];
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  // Get timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Time of day
  const hour = now.getHours();
  let timeOfDay: string;
  if (hour >= 5 && hour < 12) {
    timeOfDay = 'morning';
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = 'afternoon';
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = 'evening';
  } else {
    timeOfDay = 'night';
  }

  // Season (Northern hemisphere)
  const month = now.getMonth();
  let season: string;
  if (month >= 2 && month <= 4) {
    season = 'spring';
  } else if (month >= 5 && month <= 7) {
    season = 'summer';
  } else if (month >= 8 && month <= 10) {
    season = 'autumn';
  } else {
    season = 'winter';
  }

  // Format date and time
  const currentDate = `${dayOfWeek}, ${monthNames[month]} ${now.getDate()}, ${now.getFullYear()}`;
  const currentTime = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const currentDateTime = `${currentDate} at ${currentTime}`;

  return {
    currentDateTime,
    currentDate,
    currentTime,
    dayOfWeek,
    timezone,
    timeOfDay,
    season,
    isWeekend
  };
}

/**
 * Format a date as a relative time string
 */
export function getRelativeTimeString(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();

  const diffMs = now.getTime() - targetDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // Future dates
  if (diffMs < 0) {
    const absDiffDays = Math.abs(diffDays);
    if (absDiffDays === 0) return 'later today';
    if (absDiffDays === 1) return 'tomorrow';
    if (absDiffDays < 7) return `in ${absDiffDays} days`;
    if (absDiffDays < 14) return 'next week';
    return `in ${Math.ceil(absDiffDays / 7)} weeks`;
  }

  // Past dates
  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
  if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffWeeks === 1) return 'last week';
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  if (diffMonths === 1) return 'last month';
  if (diffMonths < 12) return `${diffMonths} months ago`;
  if (diffYears === 1) return 'last year';
  return `${diffYears} years ago`;
}

/**
 * Get a descriptive time context string
 */
export function getTimeContextDescription(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const relative = getRelativeTimeString(targetDate);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = dayNames[targetDate.getDay()];

  // For recent dates, include day of week
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays >= 1 && diffDays < 7) {
    return `${relative} (${dayOfWeek})`;
  }

  return relative;
}

/**
 * Generate temporal context for system prompt
 */
export function generateTemporalPrompt(): string {
  const context = getCurrentTemporalContext();

  const parts: string[] = [
    '\n## ⏰ Temporal Awareness',
    `Current Date & Time: ${context.currentDateTime}`,
    `Timezone: ${context.timezone}`,
    `It is currently ${context.timeOfDay}${context.isWeekend ? ' on the weekend' : ''}.`,
    '',
    'You have full awareness of time. When referencing memories or past conversations, use relative time expressions (e.g., "3 days ago", "last week") to help the user understand the temporal context. Consider the time of day when appropriate (e.g., greeting appropriately for morning/evening).'
  ];

  return parts.join('\n');
}

/**
 * Format memory timestamp for display
 */
export function formatMemoryTimestamp(createdAt: Date | string, updatedAt?: Date | string): string {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const createdRelative = getRelativeTimeString(created);

  if (updatedAt) {
    const updated = typeof updatedAt === 'string' ? new Date(updatedAt) : updatedAt;
    const updatedRelative = getRelativeTimeString(updated);

    // Only show updated if different from created
    if (createdRelative !== updatedRelative) {
      return `Created ${createdRelative}, updated ${updatedRelative}`;
    }
  }

  return `Created ${createdRelative}`;
}

/**
 * Format conversation timestamp
 */
export function formatConversationTimestamp(timestamp: Date | string): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const relative = getRelativeTimeString(date);
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // For today's messages, include the time
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = new Date(now.getTime() - 86400000).toDateString() === date.toDateString();

  if (isToday) {
    return `today at ${timeStr}`;
  }
  if (isYesterday) {
    return `yesterday at ${timeStr}`;
  }

  return relative;
}
