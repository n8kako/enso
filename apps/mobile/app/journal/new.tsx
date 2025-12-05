import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Mood scale configuration
const moodEmojis = ['😢', '😔', '😕', '😐', '🙂', '😊', '😄', '😁', '🤩', '🥳'];
const moodLabels = [
  'Terrible',
  'Bad',
  'Poor',
  'Okay',
  'Fair',
  'Good',
  'Great',
  'Amazing',
  'Fantastic',
  'Perfect',
];

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

// Mock AI responses for demonstration
const mockAIResponses = [
  "It sounds like you're experiencing some meaningful moments today. What stands out most to you about this?",
  "I notice you mentioned feeling challenged. Those moments often teach us the most. What do you think this experience is showing you?",
  "That's a beautiful reflection. Taking time to recognize these feelings is an important step. Would you like to explore what triggered this?",
  "I appreciate you sharing that with me. Sometimes putting thoughts into words helps us understand them better. What would make today feel more complete?",
];

function MoodSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <View style={styles.moodContainer}>
      <Text style={styles.moodLabel}>How are you feeling?</Text>
      <View style={styles.moodScale}>
        {moodEmojis.map((emoji, index) => {
          const isSelected = index + 1 === value;
          return (
            <Pressable
              key={index}
              style={[styles.moodItem, isSelected && styles.moodItemSelected]}
              onPress={() => {
                onChange(index + 1);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Text style={[styles.moodEmoji, !isSelected && styles.moodEmojiDim]}>
                {emoji}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {value > 0 && <Text style={styles.moodValueLabel}>{moodLabels[value - 1]}</Text>}
    </View>
  );
}

function AIMessageBubble({ message }: { message: AIMessage }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  if (message.role === 'user') {
    return (
      <Animated.View style={[styles.userBubble, { opacity: fadeAnim }]}>
        <Text style={styles.userBubbleText}>{message.content}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.aiBubbleContainer, { opacity: fadeAnim }]}>
      <View style={styles.aiAvatar}>
        <Ionicons name="sparkles" size={16} color="#BA68C8" />
      </View>
      <View style={styles.aiBubble}>
        {message.isTyping ? (
          <TypingIndicator />
        ) : (
          <Text style={styles.aiBubbleText}>{message.content}</Text>
        )}
      </View>
    </Animated.View>
  );
}

function TypingIndicator() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    animate(dot1, 0);
    animate(dot2, 150);
    animate(dot3, 300);
  }, []);

  return (
    <View style={styles.typingContainer}>
      {[dot1, dot2, dot3].map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            styles.typingDot,
            {
              opacity: dot.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 1],
              }),
              transform: [
                {
                  scale: dot.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.3],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

export default function NewJournalEntry() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [content, setContent] = useState('');
  const [mood, setMood] = useState(0);
  const [energy, setEnergy] = useState(5);
  const [showMoodSelector, setShowMoodSelector] = useState(true);
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [replyInput, setReplyInput] = useState('');

  // Start conversation when user submits initial entry
  const handleInitialSubmit = () => {
    if (!content.trim() || mood === 0) return;

    setShowMoodSelector(false);

    // Add user's entry as first message
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    setAiMessages([userMessage]);

    // Simulate AI thinking
    setIsAITyping(true);
    setTimeout(() => {
      const aiResponse: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: mockAIResponses[Math.floor(Math.random() * mockAIResponses.length)],
        timestamp: new Date(),
      };
      setAiMessages((prev) => [...prev, aiResponse]);
      setIsAITyping(false);
    }, 1500);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Handle reply to AI
  const handleReply = () => {
    if (!replyInput.trim()) return;

    const userMessage: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: replyInput.trim(),
      timestamp: new Date(),
    };
    setAiMessages((prev) => [...prev, userMessage]);
    setReplyInput('');

    // Simulate AI response
    setIsAITyping(true);
    setTimeout(() => {
      const aiResponse: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: mockAIResponses[Math.floor(Math.random() * mockAIResponses.length)],
        timestamp: new Date(),
      };
      setAiMessages((prev) => [...prev, aiResponse]);
      setIsAITyping(false);
    }, 1200);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Scroll to bottom when messages update
  useEffect(() => {
    if (aiMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [aiMessages, isAITyping]);

  const handleSave = () => {
    // Save the entry
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="white" />
          </Pressable>
          <Text style={styles.headerTitle}>
            {showMoodSelector ? 'New Entry' : 'Journaling'}
          </Text>
          {!showMoodSelector && (
            <Pressable onPress={handleSave} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </Pressable>
          )}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {showMoodSelector ? (
            <>
              {/* Date Display */}
              <Text style={styles.dateText}>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>

              {/* Mood Selector */}
              <MoodSelector value={mood} onChange={setMood} />

              {/* Energy Level */}
              <View style={styles.energyContainer}>
                <Text style={styles.energyLabel}>Energy level: {energy}/10</Text>
                <View style={styles.energyBar}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Pressable
                      key={i}
                      style={[
                        styles.energySegment,
                        i < energy && styles.energySegmentActive,
                      ]}
                      onPress={() => {
                        setEnergy(i + 1);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    />
                  ))}
                </View>
              </View>

              {/* Journal Content Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  ref={inputRef}
                  style={styles.journalInput}
                  placeholder="What's on your mind today..."
                  placeholderTextColor="#6b7280"
                  value={content}
                  onChangeText={setContent}
                  multiline
                  textAlignVertical="top"
                  autoFocus
                />
              </View>

              {/* Submit Button */}
              {content.trim() && mood > 0 && (
                <Pressable style={styles.continueButton} onPress={handleInitialSubmit}>
                  <LinearGradient
                    colors={['#5b78f5', '#BA68C8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.continueGradient}
                  >
                    <Text style={styles.continueText}>Start Journaling with AI</Text>
                    <Ionicons name="sparkles" size={18} color="white" />
                  </LinearGradient>
                </Pressable>
              )}
            </>
          ) : (
            <>
              {/* AI Conversation */}
              <View style={styles.conversationHeader}>
                <View style={styles.moodIndicator}>
                  <Text style={styles.moodIndicatorEmoji}>{moodEmojis[mood - 1]}</Text>
                  <Text style={styles.moodIndicatorText}>{moodLabels[mood - 1]}</Text>
                </View>
              </View>

              {/* Messages */}
              {aiMessages.map((message) => (
                <AIMessageBubble key={message.id} message={message} />
              ))}

              {/* Typing Indicator */}
              {isAITyping && (
                <AIMessageBubble
                  message={{
                    id: 'typing',
                    role: 'assistant',
                    content: '',
                    timestamp: new Date(),
                    isTyping: true,
                  }}
                />
              )}

              {/* Quick Actions */}
              {aiMessages.length > 1 && !isAITyping && (
                <View style={styles.quickActions}>
                  <Pressable style={styles.quickAction}>
                    <Ionicons name="bulb-outline" size={16} color="#5b78f5" />
                    <Text style={styles.quickActionText}>Suggest commitment</Text>
                  </Pressable>
                  <Pressable style={styles.quickAction}>
                    <Ionicons name="analytics-outline" size={16} color="#5b78f5" />
                    <Text style={styles.quickActionText}>Analyze mood</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Reply Input */}
        {!showMoodSelector && (
          <View style={styles.replyContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Continue the conversation..."
              placeholderTextColor="#6b7280"
              value={replyInput}
              onChangeText={setReplyInput}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[styles.sendButton, !replyInput.trim() && styles.sendButtonDisabled]}
              onPress={handleReply}
              disabled={!replyInput.trim()}
            >
              <Ionicons
                name="send"
                size={20}
                color={replyInput.trim() ? 'white' : '#6b7280'}
              />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#5b78f5',
    borderRadius: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  dateText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  moodContainer: {
    marginBottom: 24,
  },
  moodLabel: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  moodScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodItem: {
    width: (width - 60) / 10,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  moodItemSelected: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  moodEmoji: {
    fontSize: 20,
  },
  moodEmojiDim: {
    opacity: 0.4,
  },
  moodValueLabel: {
    color: '#5b78f5',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
  },
  energyContainer: {
    marginBottom: 24,
  },
  energyLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 10,
  },
  energyBar: {
    flexDirection: 'row',
    gap: 4,
  },
  energySegment: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
  },
  energySegmentActive: {
    backgroundColor: '#f59e0b',
  },
  inputContainer: {
    backgroundColor: '#16162a',
    borderRadius: 16,
    padding: 16,
    minHeight: 200,
    marginBottom: 20,
  },
  journalInput: {
    color: 'white',
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
    minHeight: 160,
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  continueText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  conversationHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  moodIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  moodIndicatorEmoji: {
    fontSize: 20,
  },
  moodIndicatorText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#5b78f5',
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '85%',
    marginBottom: 16,
  },
  userBubbleText: {
    color: 'white',
    fontSize: 15,
    lineHeight: 22,
  },
  aiBubbleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    gap: 8,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(186, 104, 200, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBubble: {
    backgroundColor: '#16162a',
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
  },
  aiBubbleText: {
    color: '#e5e7eb',
    fontSize: 15,
    lineHeight: 22,
  },
  typingContainer: {
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#BA68C8',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    marginLeft: 40,
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(91, 120, 245, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
  },
  quickActionText: {
    color: '#5b78f5',
    fontSize: 13,
    fontWeight: '500',
  },
  replyContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#16162a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: 'white',
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5b78f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#374151',
  },
});
