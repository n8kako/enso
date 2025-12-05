import { View, Text, ScrollView, StyleSheet, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// Mock journal entries
const mockEntries = [
  {
    id: '1',
    date: new Date(2024, 11, 5, 9, 30),
    preview: 'Woke up feeling refreshed today. Had a great meditation session and...',
    mood: 8,
    tags: ['gratitude', 'morning'],
    hasAIConversation: true,
  },
  {
    id: '2',
    date: new Date(2024, 11, 4, 21, 15),
    preview: 'Challenging day at work. The project deadline is approaching and I...',
    mood: 5,
    tags: ['work', 'stress'],
    hasAIConversation: true,
  },
  {
    id: '3',
    date: new Date(2024, 11, 4, 8, 45),
    preview: 'Starting the day with intention. My goals for today are...',
    mood: 7,
    tags: ['goals', 'morning'],
    hasAIConversation: false,
  },
  {
    id: '4',
    date: new Date(2024, 11, 3, 20, 0),
    preview: 'Had dinner with old friends tonight. It reminded me how important...',
    mood: 9,
    tags: ['friends', 'connection'],
    hasAIConversation: true,
  },
];

const moodColors = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
];

function getMoodColor(mood: number): string {
  return moodColors[Math.max(0, Math.min(9, mood - 1))];
}

function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Today, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}

interface JournalEntryCardProps {
  entry: (typeof mockEntries)[0];
  onPress: () => void;
}

function JournalEntryCard({ entry, onPress }: JournalEntryCardProps) {
  return (
    <Pressable style={styles.entryCard} onPress={onPress}>
      <View style={styles.entryHeader}>
        <View style={styles.entryMeta}>
          <View style={[styles.moodDot, { backgroundColor: getMoodColor(entry.mood) }]} />
          <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
        </View>
        {entry.hasAIConversation && (
          <View style={styles.aiIndicator}>
            <Ionicons name="sparkles" size={12} color="#BA68C8" />
          </View>
        )}
      </View>

      <Text style={styles.entryPreview} numberOfLines={2}>
        {entry.preview}
      </Text>

      <View style={styles.tagsContainer}>
        {entry.tags.map((tag) => (
          <View key={tag} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

export default function JournalScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Journal</Text>
        <Pressable
          style={styles.newButton}
          onPress={() => router.push('/journal/new')}
        >
          <Ionicons name="add" size={24} color="white" />
        </Pressable>
      </View>

      {/* Quick prompts */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.promptsScroll}
        contentContainerStyle={styles.promptsContainer}
      >
        {[
          { emoji: '🙏', text: 'Gratitude' },
          { emoji: '🎯', text: 'Goals' },
          { emoji: '💭', text: 'Reflection' },
          { emoji: '📝', text: 'Free write' },
        ].map((prompt) => (
          <Pressable
            key={prompt.text}
            style={styles.promptChip}
            onPress={() => router.push('/journal/new')}
          >
            <Text style={styles.promptEmoji}>{prompt.emoji}</Text>
            <Text style={styles.promptText}>{prompt.text}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Entries list */}
      <FlatList
        data={mockEntries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JournalEntryCard
            entry={item}
            onPress={() => router.push(`/journal/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color="#4b5563" />
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyText}>
              Start journaling to see your entries here
            </Text>
          </View>
        }
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
  },
  newButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5b78f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptsScroll: {
    maxHeight: 50,
    marginBottom: 16,
  },
  promptsContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16162a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  promptEmoji: {
    fontSize: 16,
  },
  promptText: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  entryCard: {
    backgroundColor: '#16162a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  entryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryDate: {
    color: '#9ca3af',
    fontSize: 13,
  },
  aiIndicator: {
    backgroundColor: 'rgba(186, 104, 200, 0.15)',
    padding: 6,
    borderRadius: 12,
  },
  entryPreview: {
    color: '#e5e7eb',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: 'rgba(91, 120, 245, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#5b78f5',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
