// config/mlConfig.ts

/**
 * Enhanced ML Configuration for Gemini Agents
 * 
 * This configuration optimizes the two-agent system:
 * - Scout: Fast entity extraction and research using search grounding
 * - Architect: Deep structural analysis using code execution
 */

export const ML_CONFIG = {
  // ============================================================================
  // MODEL SELECTION
  // ============================================================================
  
  // Scout Agent: Optimized for speed and search grounding
  // Use cases: Entity extraction, document analysis, graph expansion
  SCOUT_MODEL: 'gemini-2.0-flash-exp',  // Latest experimental model with best search
  
  // Architect Agent: Optimized for reasoning and code execution
  // Use cases: Network analysis, structural interpretation, metric computation
  ARCHITECT_MODEL: 'gemini-2.0-flash-thinking-exp-1219', // Thinking mode for complex analysis
  
  // ============================================================================
  // THINKING CONFIGURATION
  // ============================================================================
  
  // Scout: Light thinking for entity recognition and source evaluation
  THINKING_SCOUT: { 
    thinkingBudget: 2048,  // Increased for better source evaluation
  },
  
  // Architect: Deep thinking for historical interpretation
  THINKING_ARCHITECT: { 
    thinkingBudget: 8192,  // Maximum thinking for complex structural analysis
  },
  
  // ============================================================================
  // GENERATION CONFIGURATION
  // ============================================================================
  
  GENERATION_CONFIG: {
    temperature: 0.2,        // Low temperature for factual accuracy
    topP: 0.85,              // Slightly reduced for more focused outputs
    topK: 40,                // Standard sampling
    candidateCount: 1,       // Single best response
    maxOutputTokens: 8192,   // Generous limit for detailed analysis
  },
  
  // ============================================================================
  // SEARCH & GROUNDING CONFIGURATION
  // ============================================================================
  
  SEARCH_CONFIG: {
    // Dynamic retrieval thresholds
    dynamicRetrievalConfig: {
      mode: 'MODE_DYNAMIC',
      dynamicThreshold: 0.7,  // High threshold for quality sources
    },
  },
  
  // ============================================================================
  // SAFETY SETTINGS (Relaxed for historical content)
  // ============================================================================
  
  SAFETY_SETTINGS: [
    {
      category: 'HARM_CATEGORY_HATE_SPEECH',
      threshold: 'BLOCK_ONLY_HIGH',  // Historical content may discuss hate movements
    },
    {
      category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
      threshold: 'BLOCK_ONLY_HIGH',
    },
    {
      category: 'HARM_CATEGORY_HARASSMENT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
    {
      category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
      threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    },
  ],
  
  // ============================================================================
  // AGENT SPECIALIZATION PARAMETERS
  // ============================================================================
  
  AGENT_PARAMS: {
    scout: {
      maxEntitiesPerDocument: 15,      // Prevent over-extraction
      minConfidenceThreshold: 0.6,     // Only high-confidence entities
      requireSourceCitation: true,      // Every entity needs a source
      maxSearchQueries: 5,              // Limit search depth
    },
    
    architect: {
      minGraphSize: 10,                 // Minimum nodes for meaningful analysis
      maxGraphSize: 500,                // Simplify if larger (performance)
      requiredMetrics: [                // Must compute these
        'betweenness_centrality',
        'modularity',
        'frustration_index'
      ],
      interpretationMinLength: 500,     // Detailed interpretation required
      interpretationMaxLength: 2000,    // But not overly verbose
    },
  },
  
  // ============================================================================
  // PROVENANCE CONFIGURATION
  // ============================================================================
  
  PROVENANCE_DEFAULTS: {
    scoutConfidence: 0.75,              // Default confidence for Scout extractions
    architectConfidence: 0.9,           // Architect metrics are computational
    
    sourceClassificationMapping: {
      'peer_reviewed_journal': 'primary',
      'academic_book': 'primary',
      'government_archive': 'primary',
      'newspaper_contemporary': 'secondary',
      'blog_post': 'secondary',
      'social_media': 'hostile',        // Treat with extreme caution
    },
  },
  
  // ============================================================================
  // PERFORMANCE OPTIMIZATION
  // ============================================================================
  
  PERFORMANCE: {
    batchSize: 10,                      // Process nodes/edges in batches
    enableCaching: true,                // Cache Gemini responses
    maxConcurrentRequests: 3,           // Parallel API calls
    requestTimeout: 60000,              // 60s timeout
    retryAttempts: 3,                   // Retry failed requests
    retryDelay: 2000,                   // 2s between retries
  },
  
  // ============================================================================
  // UI FEEDBACK MESSAGES
  // ============================================================================
  
  LOADING_MESSAGES: {
    scout: {
      initializing: 'Scout Agent initializing research protocols...',
      searching: 'Searching historical archives and academic sources...',
      evaluating: 'Evaluating source credibility and relevance...',
      extracting: 'Extracting entities and relationships...',
      synthesizing: 'Synthesizing historical interpretation...',
    },
    
    architect: {
      initializing: 'Architect Agent loading graph structure...',
      computing: 'Computing network topology with NetworkX...',
      analyzing: 'Analyzing structural patterns and communities...',
      interpreting: 'Connecting structure to historical outcomes...',
      finalizing: 'Generating comprehensive structural report...',
    },
  },
} as const;

/**
 * Helper function to get appropriate loading message
 */
export function getLoadingMessage(
  agent: 'scout' | 'architect', 
  stage: string
): string {
  const messages = ML_CONFIG.LOADING_MESSAGES[agent];
  return messages[stage as keyof typeof messages] || `${agent} agent processing...`;
}

/**
 * Validate agent configuration
 */
export function validateAgentConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!ML_CONFIG.SCOUT_MODEL) {
    errors.push('Scout model not configured');
  }
  
  if (!ML_CONFIG.ARCHITECT_MODEL) {
    errors.push('Architect model not configured');
  }
  
  if (ML_CONFIG.THINKING_ARCHITECT.thinkingBudget < 4096) {
    errors.push('Architect thinking budget too low for complex analysis');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get recommended model based on task complexity
 */
export function getRecommendedModel(
  taskType: 'extraction' | 'analysis' | 'expansion',
  complexity: 'low' | 'medium' | 'high'
): string {
  if (taskType === 'extraction' || taskType === 'expansion') {
    return ML_CONFIG.SCOUT_MODEL;
  }
  
  // For analysis, use thinking model for high complexity
  if (complexity === 'high') {
    return ML_CONFIG.ARCHITECT_MODEL;
  }
  
  return ML_CONFIG.SCOUT_MODEL;
}