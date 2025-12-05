/**
 * Conversation Manager
 *
 * Manages the interactive conversation flow during journaling sessions.
 * Handles turn-taking, context management, and conversation state.
 */

import type {
  AIMessage,
  JournalEntry,
  MaslowProfile,
  UserStats,
  AIPersonality,
} from '@enso/core';

import { generateId } from '@enso/core';
import { JournalAgent, LLMProvider, EntryAnalysis } from './journal-agent';

/**
 * Conversation state
 */
export interface ConversationState {
  id: string;
  entryId: string;
  messages: AIMessage[];
  startedAt: Date;
  lastActivityAt: Date;
  isActive: boolean;
  analysis?: EntryAnalysis;
  suggestionsOffered: boolean;
  turnCount: number;
}

/**
 * Conversation configuration
 */
export interface ConversationConfig {
  maxTurns: number;
  autoFollowUpDelay: number; // milliseconds
  offerSuggestionsAfterTurns: number;
  inactivityTimeout: number; // milliseconds
}

const DEFAULT_CONVERSATION_CONFIG: ConversationConfig = {
  maxTurns: 20,
  autoFollowUpDelay: 5000,
  offerSuggestionsAfterTurns: 4,
  inactivityTimeout: 300000, // 5 minutes
};

/**
 * Event types for conversation
 */
export type ConversationEvent =
  | { type: 'user_message'; content: string }
  | { type: 'ai_response'; message: AIMessage }
  | { type: 'analysis_complete'; analysis: EntryAnalysis }
  | { type: 'suggestion_offered' }
  | { type: 'conversation_ended'; reason: 'user' | 'timeout' | 'max_turns' };

/**
 * Conversation event handler
 */
export type ConversationEventHandler = (event: ConversationEvent) => void;

/**
 * Conversation Manager class
 */
export class ConversationManager {
  private agent: JournalAgent;
  private config: ConversationConfig;
  private conversations: Map<string, ConversationState>;
  private eventHandlers: Map<string, ConversationEventHandler[]>;
  private inactivityTimers: Map<string, NodeJS.Timeout>;

  constructor(agent: JournalAgent, config?: Partial<ConversationConfig>) {
    this.agent = agent;
    this.config = { ...DEFAULT_CONVERSATION_CONFIG, ...config };
    this.conversations = new Map();
    this.eventHandlers = new Map();
    this.inactivityTimers = new Map();
  }

  /**
   * Start a new conversation for a journal entry
   */
  async startConversation(
    entryId: string,
    initialContent: string,
    mood: number,
    energy: number,
    profile: MaslowProfile,
    stats: UserStats
  ): Promise<ConversationState> {
    const conversationId = generateId();

    // Create user's initial message
    const userMessage: AIMessage = {
      id: generateId(),
      role: 'user',
      content: initialContent,
      timestamp: new Date(),
    };

    // Get AI response
    const aiResponse = await this.agent.respondToEntry(
      initialContent,
      mood,
      energy,
      profile,
      stats
    );

    // Start entry analysis in background
    const analysisPromise = this.agent.analyzeEntry(initialContent);

    // Create conversation state
    const state: ConversationState = {
      id: conversationId,
      entryId,
      messages: [userMessage, aiResponse],
      startedAt: new Date(),
      lastActivityAt: new Date(),
      isActive: true,
      suggestionsOffered: false,
      turnCount: 1,
    };

    this.conversations.set(conversationId, state);

    // Emit events
    this.emit(conversationId, { type: 'user_message', content: initialContent });
    this.emit(conversationId, { type: 'ai_response', message: aiResponse });

    // Handle analysis completion
    analysisPromise.then((analysis) => {
      if (this.conversations.has(conversationId)) {
        const currentState = this.conversations.get(conversationId)!;
        currentState.analysis = analysis;
        this.emit(conversationId, { type: 'analysis_complete', analysis });
      }
    });

    // Start inactivity timer
    this.resetInactivityTimer(conversationId);

    return state;
  }

  /**
   * Add a user message to an existing conversation
   */
  async addUserMessage(
    conversationId: string,
    content: string,
    profile: MaslowProfile
  ): Promise<AIMessage | null> {
    const state = this.conversations.get(conversationId);
    if (!state || !state.isActive) {
      return null;
    }

    // Check max turns
    if (state.turnCount >= this.config.maxTurns) {
      await this.endConversation(conversationId, 'max_turns');
      return null;
    }

    // Add user message
    const userMessage: AIMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    state.messages.push(userMessage);
    state.turnCount++;
    state.lastActivityAt = new Date();

    this.emit(conversationId, { type: 'user_message', content });

    // Generate AI response
    const aiResponse = await this.agent.generateFollowUp(state.messages, profile);
    state.messages.push(aiResponse);

    this.emit(conversationId, { type: 'ai_response', message: aiResponse });

    // Check if we should offer suggestions
    if (
      !state.suggestionsOffered &&
      state.turnCount >= this.config.offerSuggestionsAfterTurns
    ) {
      state.suggestionsOffered = true;
      this.emit(conversationId, { type: 'suggestion_offered' });
    }

    // Reset inactivity timer
    this.resetInactivityTimer(conversationId);

    return aiResponse;
  }

  /**
   * Get current conversation state
   */
  getConversation(conversationId: string): ConversationState | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Get all messages in a conversation
   */
  getMessages(conversationId: string): AIMessage[] {
    return this.conversations.get(conversationId)?.messages ?? [];
  }

  /**
   * End a conversation
   */
  async endConversation(
    conversationId: string,
    reason: 'user' | 'timeout' | 'max_turns'
  ): Promise<void> {
    const state = this.conversations.get(conversationId);
    if (!state) return;

    state.isActive = false;

    // Clear inactivity timer
    const timer = this.inactivityTimers.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      this.inactivityTimers.delete(conversationId);
    }

    this.emit(conversationId, { type: 'conversation_ended', reason });
  }

  /**
   * Subscribe to conversation events
   */
  subscribe(conversationId: string, handler: ConversationEventHandler): () => void {
    if (!this.eventHandlers.has(conversationId)) {
      this.eventHandlers.set(conversationId, []);
    }
    this.eventHandlers.get(conversationId)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(conversationId);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Emit an event to subscribers
   */
  private emit(conversationId: string, event: ConversationEvent): void {
    const handlers = this.eventHandlers.get(conversationId) ?? [];
    for (const handler of handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in conversation event handler:', error);
      }
    }
  }

  /**
   * Reset the inactivity timer for a conversation
   */
  private resetInactivityTimer(conversationId: string): void {
    // Clear existing timer
    const existingTimer = this.inactivityTimers.get(conversationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.endConversation(conversationId, 'timeout');
    }, this.config.inactivityTimeout);

    this.inactivityTimers.set(conversationId, timer);
  }

  /**
   * Clean up old conversations
   */
  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [id, state] of this.conversations) {
      if (now - state.lastActivityAt.getTime() > maxAge) {
        this.endConversation(id, 'timeout');
        this.conversations.delete(id);
        this.eventHandlers.delete(id);
      }
    }
  }
}

/**
 * Create a conversation manager instance
 */
export function createConversationManager(
  llmProvider: LLMProvider,
  personality: AIPersonality = 'balanced',
  config?: Partial<ConversationConfig>
): ConversationManager {
  const agent = new JournalAgent(llmProvider, { personality });
  return new ConversationManager(agent, config);
}
