/**
 * Entity Extraction and Indexing System for Hard Memory
 * Provides entity-aware indexing to improve factual query retrieval
 */

export interface ExtractedEntity {
  text: string;
  type: EntityType;
  context: string; // Surrounding text
  confidence: number; // 0-1 confidence score
  startPos: number;
  endPos: number;
}

export type EntityType = 
  | 'PERSON' 
  | 'PLACE' 
  | 'ORG' 
  | 'PRODUCT' 
  | 'BRAND'
  | 'ANIMAL'
  | 'NUMBER' 
  | 'DATE'
  | 'UNIVERSITY'
  | 'CITY'
  | 'PET'
  | 'UNKNOWN';

export interface EntityIndex {
  [entity: string]: {
    type: EntityType;
    contexts: string[];
    memoryIds: string[];
    confidence: number;
  };
}

/**
 * Comprehensive entity extraction using multiple strategies
 */
export class EntityExtractor {
  
  // Known domain-specific entities from user context
  private domainEntities = {
    // Pets
    'solo': { type: 'PET' as EntityType, context: 'golden lab, uncle\'s dog' },
    'lilou': { type: 'PET' as EntityType, context: '13-year-old cat' },
    
    // Brands/Products
    'yexen': { type: 'BRAND' as EntityType, context: 'jewelry brand' },
    'zarvânex': { type: 'PRODUCT' as EntityType, context: 'AI chat application' },
    'zarvanex': { type: 'PRODUCT' as EntityType, context: 'AI chat application' },
    
    // Places
    'kazerun': { type: 'CITY' as EntityType, context: 'city in Iran' },
    'tehran': { type: 'CITY' as EntityType, context: 'capital of Iran' },
    'paris': { type: 'CITY' as EntityType, context: 'current location' },
    
    // Organizations
    'university of tehran': { type: 'UNIVERSITY' as EntityType, context: 'entrance exams, ranked 741' },
    
    // People
    'adrien': { type: 'PERSON' as EntityType, context: 'partner, autistic, financially supportive' },
    'ali moini': { type: 'PERSON' as EntityType, context: 'uncle, introduced to Jul' },
    'jul': { type: 'PERSON' as EntityType, context: 'Lucky Luke writer' },
  };

  /**
   * Extract entities from text using multiple strategies
   */
  extractEntities(text: string, contextWindow = 100): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const lowerText = text.toLowerCase();
    
    console.log('🏷️ [EntityExtractor] Extracting entities from text:', text.substring(0, 100) + '...');
    
    // 1. Domain-specific entity extraction (highest confidence)
    this.extractDomainEntities(text, lowerText, entities, contextWindow);
    
    // 2. Pattern-based extraction
    this.extractPatternBasedEntities(text, entities, contextWindow);
    
    // 3. Capitalized word extraction (proper nouns)
    this.extractCapitalizedEntities(text, entities, contextWindow);
    
    // 4. Number extraction
    this.extractNumbers(text, entities, contextWindow);
    
    console.log('🏷️ [EntityExtractor] Extracted entities:', entities.length);
    entities.forEach(entity => {
      console.log(`  - "${entity.text}" (${entity.type}) confidence: ${entity.confidence}`);
    });
    
    return entities.sort((a, b) => b.confidence - a.confidence);
  }
  
  private extractDomainEntities(text: string, lowerText: string, entities: ExtractedEntity[], contextWindow: number) {
    for (const [entityText, info] of Object.entries(this.domainEntities)) {
      const index = lowerText.indexOf(entityText);
      if (index !== -1) {
        const context = this.getContext(text, index, entityText.length, contextWindow);
        entities.push({
          text: text.substring(index, index + entityText.length), // Preserve original casing
          type: info.type,
          context: context,
          confidence: 0.95, // Very high confidence for known entities
          startPos: index,
          endPos: index + entityText.length
        });
      }
    }
  }
  
  private extractPatternBasedEntities(text: string, entities: ExtractedEntity[], contextWindow: number) {
    const patterns = [
      // University patterns
      { regex: /\b[A-Z][a-zA-Z\s]+University(?:\s+of\s+[A-Z][a-zA-Z]+)?\b/g, type: 'UNIVERSITY' as EntityType },
      
      // Product/brand patterns (capitalized sequences)
      { regex: /\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)*\b/g, type: 'PRODUCT' as EntityType },
      
      // Score patterns (X/Y, X out of Y)
      { regex: /\b\d+\/\d+\b|\b\d+\s+out\s+of\s+\d+\b/g, type: 'NUMBER' as EntityType },
      
      // Date patterns
      { regex: /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/g, type: 'DATE' as EntityType },
      { regex: /\b\d{1,2}\/\d{1,2}\/\d{4}\b|\b\d{4}-\d{2}-\d{2}\b/g, type: 'DATE' as EntityType },
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        const entityText = match[0];
        const context = this.getContext(text, match.index, entityText.length, contextWindow);
        
        // Check if this overlaps with existing entities
        const overlaps = entities.some(e => 
          (match.index >= e.startPos && match.index < e.endPos) ||
          (match.index + entityText.length > e.startPos && match.index + entityText.length <= e.endPos)
        );
        
        if (!overlaps) {
          entities.push({
            text: entityText,
            type: pattern.type,
            context: context,
            confidence: 0.8,
            startPos: match.index,
            endPos: match.index + entityText.length
          });
        }
      }
    }
  }
  
  private extractCapitalizedEntities(text: string, entities: ExtractedEntity[], contextWindow: number) {
    // Extract standalone capitalized words that might be proper nouns
    const capitalizedRegex = /\b[A-Z][a-z]{2,}\b/g;
    let match;
    
    while ((match = capitalizedRegex.exec(text)) !== null) {
      const entityText = match[0];
      
      // Skip common words
      const skipWords = ['The', 'And', 'But', 'Or', 'For', 'With', 'By', 'From', 'To', 'In', 'On', 'At', 'As', 'Of'];
      if (skipWords.includes(entityText)) continue;
      
      // Check if already extracted
      const alreadyExists = entities.some(e => 
        e.text.toLowerCase() === entityText.toLowerCase() ||
        (match.index >= e.startPos && match.index < e.endPos)
      );
      
      if (!alreadyExists) {
        const context = this.getContext(text, match.index, entityText.length, contextWindow);
        entities.push({
          text: entityText,
          type: 'UNKNOWN',
          context: context,
          confidence: 0.6, // Lower confidence for unknown proper nouns
          startPos: match.index,
          endPos: match.index + entityText.length
        });
      }
    }
  }
  
  private extractNumbers(text: string, entities: ExtractedEntity[], contextWindow: number) {
    // Extract significant numbers (not years, not single digits in most contexts)
    const numberRegex = /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/g;
    let match;
    
    while ((match = numberRegex.exec(text)) !== null) {
      const entityText = match[0];
      
      // Skip if already covered
      const overlaps = entities.some(e => 
        match.index >= e.startPos && match.index < e.endPos
      );
      
      if (!overlaps) {
        const context = this.getContext(text, match.index, entityText.length, contextWindow);
        
        // Higher confidence for numbers in certain contexts
        let confidence = 0.5;
        const lowerContext = context.toLowerCase();
        if (lowerContext.includes('score') || lowerContext.includes('grade') || 
            lowerContext.includes('collections') || lowerContext.includes('volumes')) {
          confidence = 0.8;
        }
        
        entities.push({
          text: entityText,
          type: 'NUMBER',
          context: context,
          confidence: confidence,
          startPos: match.index,
          endPos: match.index + entityText.length
        });
      }
    }
  }
  
  private getContext(text: string, startPos: number, length: number, contextWindow: number): string {
    const start = Math.max(0, startPos - contextWindow);
    const end = Math.min(text.length, startPos + length + contextWindow);
    return text.substring(start, end).trim();
  }
  
  /**
   * Build entity index from extracted entities
   */
  buildEntityIndex(memoryId: string, entities: ExtractedEntity[]): EntityIndex {
    const index: EntityIndex = {};
    
    for (const entity of entities) {
      const key = entity.text.toLowerCase();
      
      if (!index[key]) {
        index[key] = {
          type: entity.type,
          contexts: [],
          memoryIds: [],
          confidence: 0
        };
      }
      
      index[key].contexts.push(entity.context);
      if (!index[key].memoryIds.includes(memoryId)) {
        index[key].memoryIds.push(memoryId);
      }
      index[key].confidence = Math.max(index[key].confidence, entity.confidence);
    }
    
    return index;
  }
  
  /**
   * Search entity index for exact matches
   */
  searchEntityIndex(query: string, entityIndex: EntityIndex): Array<{entity: string, info: EntityIndex[string], relevance: number}> {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);
    
    const matches: Array<{entity: string, info: EntityIndex[string], relevance: number}> = [];
    
    for (const [entity, info] of Object.entries(entityIndex)) {
      let relevance = 0;
      
      // Exact match
      if (entity === queryLower) {
        relevance = info.confidence;
      }
      // Partial match
      else if (entity.includes(queryLower) || queryLower.includes(entity)) {
        relevance = info.confidence * 0.8;
      }
      // Word overlap
      else {
        const entityWords = entity.split(/\s+/);
        const overlap = queryWords.filter(word => entityWords.includes(word)).length;
        if (overlap > 0) {
          relevance = info.confidence * 0.6 * (overlap / Math.max(queryWords.length, entityWords.length));
        }
      }
      
      if (relevance > 0.3) { // Minimum threshold
        matches.push({ entity, info, relevance });
      }
    }
    
    return matches.sort((a, b) => b.relevance - a.relevance);
  }
}

export const entityExtractor = new EntityExtractor();