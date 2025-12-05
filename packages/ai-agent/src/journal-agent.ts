/**
 * Journal Agent
 *
 * The interactive AI companion that engages with users during journaling.
 * Provides real-time responses, insights, and support.
 */

import type {
  AIPersonality,
  MaslowLevel,
  MaslowProfile,
  UserStats,
  JournalEntry,
  AIMessage,
  Commitment,
} from '@enso/core';

import { generateId } from '@enso/core';

import {
  getJournalResponsePrompt,
  getFollowUpPrompt,
  getCommitmentSuggestionPrompt,
  getDailyReflectionPrompt,
  getRiskAssessmentPrompt,
  getEntryAnalysisPrompt,
} from './prompts';

/**
 * LLM Provider interface - abstract away the specific AI service
 */
export interface LLMProvider {
  complete(prompt: string, options?: LLMOptions): Promise<string>;
  streamComplete(prompt: string, options?: LLMOptions): AsyncIterator<string>;
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

/**
 * Risk assessment result
 */
export interface RiskAssessment {
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  indicators: string[];
  suggestedResponse: string;
}

/**
 * Entry analysis result
 */
export interface EntryAnalysis {
  sentimentScore: number;
  emotions: Array<{ name: string; intensity: number }>;
  themes: string[];
  maslowLevels: MaslowLevel[];
  keyInsight: string;
}

/**
 * Agent configuration
 */
export interface JournalAgentConfig {
  personality: AIPersonality;
  maxResponseLength: number;
  enableRiskDetection: boolean;
  responseTemperature: number;
}

const DEFAULT_CONFIG: JournalAgentConfig = {
  personality: 'balanced',
  maxResponseLength: 500,
  enableRiskDetection: true,
  responseTemperature: 0.7,
};

/**
 * Journal Agent class
 */
export class JournalAgent {
  private llm: LLMProvider;
  private config: JournalAgentConfig;

  constructor(llm: LLMProvider, config?: Partial<JournalAgentConfig>) {
    this.llm = llm;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update agent personality
   */
  setPersonality(personality: AIPersonality): void {
    this.config.personality = personality;
  }

  /**
   * Generate a response to a journal entry
   */
  async respondToEntry(
    entryContent: string,
    mood: number,
    energy: number,
    profile: MaslowProfile,
    stats: UserStats
  ): Promise<AIMessage> {
    // Check for risk indicators if enabled
    if (this.config.enableRiskDetection) {
      const risk = await this.assessRisk(entryContent);
      if (risk.riskLevel === 'high') {
        return this.createCrisisResponse(risk);
      }
    }

    const prompt = getJournalResponsePrompt(
      this.config.personality,
      profile,
      stats,
      entryContent,
      mood,
      energy
    );

    const response = await this.llm.complete(prompt, {
      maxTokens: this.config.maxResponseLength,
      temperature: this.config.responseTemperature,
    });

    return {
      id: generateId(),
      role: 'assistant',
      content: response.trim(),
      timestamp: new Date(),
      metadata: {
        emotionalTone: await this.detectEmotionalTone(response),
      },
    };
  }

  /**
   * Generate a follow-up question based on conversation
   */
  async generateFollowUp(
    conversationHistory: AIMessage[],
    profile: MaslowProfile
  ): Promise<AIMessage> {
    const historyForPrompt = conversationHistory.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const prompt = getFollowUpPrompt(
      this.config.personality,
      historyForPrompt,
      profile
    );

    const response = await this.llm.complete(prompt, {
      maxTokens: 200,
      temperature: this.config.responseTemperature,
    });

    return {
      id: generateId(),
      role: 'assistant',
      content: response.trim(),
      timestamp: new Date(),
    };
  }

  /**
   * Suggest a commitment based on recent journal entries
   */
  async suggestCommitment(
    recentEntries: JournalEntry[],
    existingCommitments: Commitment[],
    profile: MaslowProfile
  ): Promise<AIMessage> {
    const entryContents = recentEntries.map((e) => e.content);
    const commitmentTitles = existingCommitments
      .filter((c) => c.status === 'active')
      .map((c) => c.title);

    const prompt = getCommitmentSuggestionPrompt(
      this.config.personality,
      profile,
      entryContents,
      commitmentTitles
    );

    const response = await this.llm.complete(prompt, {
      maxTokens: 300,
      temperature: 0.8,
    });

    return {
      id: generateId(),
      role: 'assistant',
      content: response.trim(),
      timestamp: new Date(),
      metadata: {
        suggestionsOffered: true,
      },
    };
  }

  /**
   * Generate end-of-day reflection
   */
  async generateDailyReflection(
    profile: MaslowProfile,
    stats: UserStats,
    todayEntries: JournalEntry[],
    commitments: Commitment[]
  ): Promise<AIMessage> {
    const entryContents = todayEntries.map((e) => e.content);
    const completed = commitments
      .filter((c) => {
        const todayCheckIn = c.checkIns.find((ci) => {
          const ciDate = new Date(ci.timestamp);
          const today = new Date();
          return (
            ciDate.getDate() === today.getDate() &&
            ciDate.getMonth() === today.getMonth() &&
            ciDate.getFullYear() === today.getFullYear()
          );
        });
        return todayCheckIn?.completed;
      })
      .map((c) => c.title);

    const missed = commitments
      .filter((c) => c.status === 'active' && !completed.includes(c.title))
      .map((c) => c.title);

    const prompt = getDailyReflectionPrompt(
      this.config.personality,
      profile,
      stats,
      entryContents,
      completed,
      missed
    );

    const response = await this.llm.complete(prompt, {
      maxTokens: 300,
      temperature: 0.7,
    });

    return {
      id: generateId(),
      role: 'assistant',
      content: response.trim(),
      timestamp: new Date(),
    };
  }

  /**
   * Analyze a journal entry for insights
   */
  async analyzeEntry(entryContent: string): Promise<EntryAnalysis> {
    const prompt = getEntryAnalysisPrompt(entryContent);

    const response = await this.llm.complete(prompt, {
      maxTokens: 500,
      temperature: 0.3, // Lower temperature for analysis
    });

    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]) as EntryAnalysis;
    } catch {
      // Return default analysis on parse error
      return {
        sentimentScore: 0,
        emotions: [],
        themes: [],
        maslowLevels: [],
        keyInsight: 'Unable to analyze entry',
      };
    }
  }

  /**
   * Assess entry for risk indicators
   */
  async assessRisk(entryContent: string): Promise<RiskAssessment> {
    const prompt = getRiskAssessmentPrompt(entryContent);

    const response = await this.llm.complete(prompt, {
      maxTokens: 300,
      temperature: 0.2, // Very low for consistent risk assessment
    });

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      return JSON.parse(jsonMatch[0]) as RiskAssessment;
    } catch {
      return {
        riskLevel: 'none',
        indicators: [],
        suggestedResponse: '',
      };
    }
  }

  /**
   * Create a crisis response for high-risk situations
   */
  private createCrisisResponse(risk: RiskAssessment): AIMessage {
    const content = `I hear that you're going through a really difficult time. What you're feeling matters, and you don't have to face this alone.

If you're in crisis or having thoughts of harming yourself, please reach out to a crisis helpline:
- National Suicide Prevention Lifeline: 988 (US)
- Crisis Text Line: Text HOME to 741741
- International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/

Would you like to talk more about what you're experiencing? I'm here to listen.`;

    return {
      id: generateId(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      metadata: {
        emotionalTone: 'supportive-crisis',
      },
    };
  }

  /**
   * Detect the emotional tone of a response
   */
  private async detectEmotionalTone(response: string): Promise<string> {
    // Simple heuristic-based detection
    const lowerResponse = response.toLowerCase();

    if (lowerResponse.includes('proud') || lowerResponse.includes('great job')) {
      return 'celebratory';
    }
    if (lowerResponse.includes('sounds tough') || lowerResponse.includes('difficult')) {
      return 'empathetic';
    }
    if (lowerResponse.includes('what if') || lowerResponse.includes('consider')) {
      return 'curious';
    }
    if (lowerResponse.includes('try') || lowerResponse.includes('could')) {
      return 'encouraging';
    }

    return 'neutral';
  }
}

/**
 * Create a journal agent with mock LLM for testing
 */
export function createMockJournalAgent(config?: Partial<JournalAgentConfig>): JournalAgent {
  const mockLLM: LLMProvider = {
    async complete(prompt: string): Promise<string> {
      // Return simple mock responses for testing
      if (prompt.includes('risk')) {
        return '{"riskLevel": "none", "indicators": [], "suggestedResponse": ""}';
      }
      if (prompt.includes('analysis')) {
        return '{"sentimentScore": 0.5, "emotions": [], "themes": [], "maslowLevels": [], "keyInsight": "Test insight"}';
      }
      return 'Thank you for sharing. How does that make you feel?';
    },
    async *streamComplete(): AsyncIterator<string> {
      yield 'Thank you for sharing.';
    },
  };

  return new JournalAgent(mockLLM, config);
}
