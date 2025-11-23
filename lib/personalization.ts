import type { UserPreferences } from '@/types';

export function generateSystemPrompt(preferences: UserPreferences | null): string {
  if (!preferences) {
    console.log('[DEBUG] No preferences found, using default system prompt');
    return "You are Zarvânex, a helpful AI assistant. Be friendly, informative, and engaging in your responses.";
  }

  console.log('[DEBUG] Generating system prompt with preferences:', {
    hasNickname: !!preferences.nickname,
    hasBackground: !!preferences.background,
    hasInterests: !!preferences.interests?.length,
    conversationTone: preferences.conversation_style?.tone,
    interestCount: preferences.interests?.length || 0
  });

  const parts: string[] = [
    "You are Zarvânex, a helpful AI assistant."
  ];

  // Basic identity information
  if (preferences.nickname || preferences.display_name) {
    const name = preferences.nickname || preferences.display_name;
    parts.push(`The user prefers to be called "${name}".`);
  }

  if (preferences.pronouns) {
    parts.push(`The user's pronouns are ${preferences.pronouns}.`);
  }

  // Personal context
  if (preferences.bio) {
    parts.push(`\nUser Background:\n${preferences.bio}`);
  }

  if (preferences.occupation) {
    parts.push(`\nUser's Occupation: ${preferences.occupation}`);
  }

  if (preferences.goals) {
    parts.push(`\nUser's Goals: ${preferences.goals}`);
  }

  if (preferences.background) {
    parts.push(`\nUser's Experience/Background: ${preferences.background}`);
  }

  // Interests and expertise
  if (preferences.interests && preferences.interests.length > 0) {
    parts.push(`\nUser's Interests: ${preferences.interests.join(', ')}`);
  }

  if (preferences.skills && preferences.skills.length > 0) {
    parts.push(`\nUser's Skills: ${preferences.skills.join(', ')}`);
  }

  if (preferences.content_preferences?.expertise_areas.length > 0) {
    parts.push(`\nUser's Expertise Areas: ${preferences.content_preferences.expertise_areas.join(', ')}`);
  }

  if (preferences.content_preferences?.topics_of_interest.length > 0) {
    parts.push(`\nTopics User is Interested In: ${preferences.content_preferences.topics_of_interest.join(', ')}`);
  }

  // Location context
  if (preferences.location) {
    parts.push(`\nUser's Location: ${preferences.location}`);
  }

  // Communication style preferences
  parts.push(`\nCommunication Guidelines:`);
  
  if (preferences.conversation_style) {
    const style = preferences.conversation_style;
    
    // Tone
    switch (style.tone) {
      case 'professional':
        parts.push("- Maintain a professional and business-like tone");
        break;
      case 'casual':
        parts.push("- Use a casual, relaxed tone");
        break;
      case 'friendly':
        parts.push("- Be warm, friendly, and personable");
        break;
      case 'balanced':
        parts.push("- Use a balanced tone that's professional yet approachable");
        break;
    }

    // Formality
    switch (style.formality) {
      case 'formal':
        parts.push("- Use formal language and proper grammar");
        break;
      case 'casual':
        parts.push("- Use casual language, contractions are fine");
        break;
      case 'adaptive':
        parts.push("- Adapt formality to match the user's style and context");
        break;
    }

    // Verbosity
    switch (style.verbosity) {
      case 'concise':
        parts.push("- Keep responses concise and to the point");
        break;
      case 'detailed':
        parts.push("- Provide detailed explanations and comprehensive information");
        break;
      case 'comprehensive':
        parts.push("- Give thorough, comprehensive responses with examples and context");
        break;
    }

    // Humor
    if (style.humor) {
      parts.push("- Feel free to use appropriate humor and wit");
    } else {
      parts.push("- Keep responses serious and avoid humor");
    }

    // Empathy level
    switch (style.empathy_level) {
      case 'high':
        parts.push("- Show high empathy and emotional understanding");
        break;
      case 'medium':
        parts.push("- Show moderate empathy while staying helpful");
        break;
      case 'low':
        parts.push("- Focus on practical help over emotional support");
        break;
    }

    // Technical depth
    switch (style.technical_depth) {
      case 'basic':
        parts.push("- Explain technical concepts in simple, accessible terms");
        break;
      case 'medium':
        parts.push("- Use moderate technical detail, explain complex terms");
        break;
      case 'advanced':
        parts.push("- Use technical language freely, assume technical knowledge");
        break;
    }
  }

  // Communication preferences
  if (preferences.communication_prefs) {
    const comm = preferences.communication_prefs;

    if (comm.preferred_greeting && comm.preferred_greeting !== 'Hello') {
      parts.push(`- Greet the user with: "${comm.preferred_greeting}"`);
    }

    switch (comm.explanation_style) {
      case 'examples':
        parts.push("- Use concrete examples to explain concepts");
        break;
      case 'step_by_step':
        parts.push("- Break down explanations into clear steps");
        break;
      case 'conceptual':
        parts.push("- Focus on conceptual understanding over details");
        break;
    }

    switch (comm.feedback_preference) {
      case 'direct':
        parts.push("- Give direct, straightforward feedback");
        break;
      case 'constructive':
        parts.push("- Provide constructive, helpful feedback");
        break;
      case 'encouraging':
        parts.push("- Be encouraging and supportive in feedback");
        break;
    }

    switch (comm.learning_style) {
      case 'visual_and_text':
        parts.push("- Suggest visual aids, diagrams, or examples when helpful");
        break;
      case 'text_only':
        parts.push("- Focus on clear textual explanations");
        break;
      case 'interactive':
        parts.push("- Encourage interactive learning and questions");
        break;
    }
  }

  // Content preferences
  if (preferences.content_preferences) {
    const content = preferences.content_preferences;
    
    switch (content.preferred_examples) {
      case 'theoretical':
        parts.push("- Use theoretical and abstract examples");
        break;
      case 'real_world':
        parts.push("- Use real-world, practical examples");
        break;
      case 'mixed':
        parts.push("- Use both theoretical and practical examples");
        break;
    }

    if (content.content_filters.length > 0) {
      parts.push(`- Avoid topics: ${content.content_filters.join(', ')}`);
    }
  }

  // Context preferences
  if (preferences.context_preferences) {
    const context = preferences.context_preferences;
    
    if (context.personalization_level === 'high') {
      parts.push("- Reference the user's background and preferences frequently");
    } else if (context.personalization_level === 'medium') {
      parts.push("- Occasionally reference the user's background when relevant");
    } else {
      parts.push("- Keep responses general unless specifically asked about personal topics");
    }

    if (context.adapt_to_patterns) {
      parts.push("- Pay attention to the user's communication patterns and adapt accordingly");
    }
  }

  parts.push("\nRemember to be helpful, accurate, and engaging while following these personalization guidelines.");

  const finalPrompt = parts.join(' ');
  console.log('[DEBUG] Generated system prompt:', finalPrompt);
  console.log('📏 System prompt length:', finalPrompt.length, 'characters');

  return finalPrompt;
}

export function formatUserContext(preferences: UserPreferences | null): string {
  if (!preferences) return '';

  const contextParts: string[] = [];

  // Quick reference format for chat context
  if (preferences.nickname) {
    contextParts.push(`Name: ${preferences.nickname}`);
  }

  if (preferences.occupation) {
    contextParts.push(`Role: ${preferences.occupation}`);
  }

  if (preferences.interests && preferences.interests.length > 0) {
    contextParts.push(`Interests: ${preferences.interests.slice(0, 3).join(', ')}${preferences.interests.length > 3 ? '...' : ''}`);
  }

  if (preferences.conversation_style) {
    const style = preferences.conversation_style;
    contextParts.push(`Style: ${style.tone}, ${style.verbosity}, ${style.technical_depth} technical`);
  }

  return contextParts.length > 0 ? `[User Context: ${contextParts.join(' | ')}]` : '';
}

export function shouldIncludePersonalization(preferences: UserPreferences | null): boolean {
  if (!preferences) return false;
  
  // Only include personalization if user has set meaningful preferences
  return !!(
    preferences.bio ||
    preferences.nickname ||
    preferences.occupation ||
    (preferences.interests && preferences.interests.length > 0) ||
    (preferences.skills && preferences.skills.length > 0) ||
    preferences.goals ||
    preferences.background
  );
}