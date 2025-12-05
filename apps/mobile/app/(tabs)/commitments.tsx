import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// Mock data
const mockCommitments = [
  {
    id: '1',
    title: 'Morning meditation',
    category: 'mindfulness',
    maslowLevel: 'self_actualization',
    frequency: 'daily',
    streak: 12,
    successProbability: 0.85,
    todayCompleted: true,
    currentCount: 12,
    targetCount: 30,
  },
  {
    id: '2',
    title: 'Drink 8 glasses of water',
    category: 'health',
    maslowLevel: 'physiological',
    frequency: 'daily',
    streak: 5,
    successProbability: 0.72,
    todayCompleted: false,
    currentCount: 5,
    targetCount: null,
  },
  {
    id: '3',
    title: 'Read for 30 minutes',
    category: 'learning',
    maslowLevel: 'self_actualization',
    frequency: 'daily',
    streak: 3,
    successProbability: 0.65,
    todayCompleted: false,
    currentCount: 3,
    targetCount: 21,
  },
  {
    id: '4',
    title: 'Call a friend or family member',
    category: 'connection',
    maslowLevel: 'love_belonging',
    frequency: 'weekly',
    streak: 4,
    successProbability: 0.78,
    todayCompleted: true,
    currentCount: 4,
    targetCount: null,
  },
];

const MASLOW_COLORS = {
  physiological: '#E57373',
  safety: '#FFB74D',
  love_belonging: '#81C784',
  esteem: '#64B5F6',
  self_actualization: '#BA68C8',
};

const MASLOW_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  physiological: 'heart',
  safety: 'shield-checkmark',
  love_belonging: 'people',
  esteem: 'ribbon',
  self_actualization: 'sparkles',
};

interface CommitmentCardProps {
  commitment: (typeof mockCommitments)[0];
  onPress: () => void;
  onToggle: () => void;
}

function CommitmentCard({ commitment, onPress, onToggle }: CommitmentCardProps) {
  const color = MASLOW_COLORS[commitment.maslowLevel as keyof typeof MASLOW_COLORS];
  const icon = MASLOW_ICONS[commitment.maslowLevel] || 'ellipse';

  return (
    <Pressable style={styles.commitmentCard} onPress={onPress}>
      <View style={styles.commitmentHeader}>
        <Pressable
          style={[
            styles.checkbox,
            commitment.todayCompleted && { backgroundColor: '#22c55e', borderColor: '#22c55e' },
          ]}
          onPress={onToggle}
        >
          {commitment.todayCompleted && (
            <Ionicons name="checkmark" size={18} color="white" />
          )}
        </Pressable>

        <View style={styles.commitmentInfo}>
          <Text
            style={[
              styles.commitmentTitle,
              commitment.todayCompleted && styles.completedTitle,
            ]}
          >
            {commitment.title}
          </Text>
          <View style={styles.commitmentMeta}>
            <View style={[styles.levelBadge, { backgroundColor: `${color}20` }]}>
              <Ionicons name={icon} size={12} color={color} />
              <Text style={[styles.levelText, { color }]}>
                {commitment.maslowLevel.replace('_', ' ')}
              </Text>
            </View>
            <Text style={styles.frequencyText}>{commitment.frequency}</Text>
          </View>
        </View>

        <View style={styles.streakContainer}>
          <Ionicons name="flame" size={16} color="#f59e0b" />
          <Text style={styles.streakNumber}>{commitment.streak}</Text>
        </View>
      </View>

      {/* Progress bar */}
      {commitment.targetCount && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(commitment.currentCount / commitment.targetCount) * 100}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {commitment.currentCount}/{commitment.targetCount}
          </Text>
        </View>
      )}

      {/* Success probability */}
      <View style={styles.probabilityContainer}>
        <Text style={styles.probabilityLabel}>Success likelihood</Text>
        <View style={styles.probabilityBar}>
          <View
            style={[
              styles.probabilityFill,
              { width: `${commitment.successProbability * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.probabilityValue}>
          {Math.round(commitment.successProbability * 100)}%
        </Text>
      </View>
    </Pressable>
  );
}

export default function CommitmentsScreen() {
  const router = useRouter();

  const activeCount = mockCommitments.length;
  const completedToday = mockCommitments.filter((c) => c.todayCompleted).length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Commitments</Text>
            <Text style={styles.subtitle}>
              {completedToday}/{activeCount} completed today
            </Text>
          </View>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push('/commitment/new')}
          >
            <Ionicons name="add" size={24} color="white" />
          </Pressable>
        </View>

        {/* Stats summary */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{activeCount}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <View style={styles.statValueRow}>
              <Ionicons name="flame" size={20} color="#f59e0b" />
              <Text style={styles.statValue}>
                {Math.max(...mockCommitments.map((c) => c.streak))}
              </Text>
            </View>
            <Text style={styles.statLabel}>Best Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {Math.round(
                (mockCommitments.reduce((acc, c) => acc + c.successProbability, 0) /
                  mockCommitments.length) *
                  100
              )}%
            </Text>
            <Text style={styles.statLabel}>Avg. Success</Text>
          </View>
        </View>

        {/* AI Suggestion */}
        <Pressable style={styles.suggestionCard}>
          <LinearGradient
            colors={['rgba(91, 120, 245, 0.15)', 'rgba(129, 199, 132, 0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.suggestionGradient}
          >
            <View style={styles.suggestionHeader}>
              <Ionicons name="bulb" size={20} color="#81C784" />
              <Text style={styles.suggestionLabel}>Suggested for you</Text>
            </View>
            <Text style={styles.suggestionTitle}>
              Take a 15-minute walk after lunch
            </Text>
            <Text style={styles.suggestionReason}>
              Based on your journal entries, this could help with your energy levels
              and has an 82% predicted success rate.
            </Text>
            <View style={styles.suggestionActions}>
              <Pressable style={styles.suggestionButton}>
                <Text style={styles.suggestionButtonText}>Add Commitment</Text>
              </Pressable>
              <Pressable style={styles.dismissButton}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </Pressable>
            </View>
          </LinearGradient>
        </Pressable>

        {/* Commitments List */}
        <View style={styles.listContainer}>
          <Text style={styles.sectionTitle}>Active Commitments</Text>
          {mockCommitments.map((commitment) => (
            <CommitmentCard
              key={commitment.id}
              commitment={commitment}
              onPress={() => router.push(`/commitment/${commitment.id}`)}
              onToggle={() => {
                // Handle toggle
              }}
            />
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
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
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5b78f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#16162a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  suggestionCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  suggestionGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(129, 199, 132, 0.2)',
    borderRadius: 16,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  suggestionLabel: {
    color: '#81C784',
    fontSize: 14,
    fontWeight: '600',
  },
  suggestionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestionReason: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  suggestionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  suggestionButton: {
    backgroundColor: '#81C784',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  suggestionButtonText: {
    color: '#1a1a2e',
    fontSize: 14,
    fontWeight: '600',
  },
  dismissButton: {
    padding: 8,
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  commitmentCard: {
    backgroundColor: '#16162a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  commitmentHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4b5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commitmentInfo: {
    flex: 1,
  },
  commitmentTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  completedTitle: {
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
  commitmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  frequencyText: {
    color: '#6b7280',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  streakNumber: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
    minWidth: 45,
    textAlign: 'right',
  },
  probabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 10,
  },
  probabilityLabel: {
    color: '#6b7280',
    fontSize: 12,
  },
  probabilityBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  probabilityFill: {
    height: '100%',
    backgroundColor: '#5b78f5',
    borderRadius: 2,
  },
  probabilityValue: {
    color: '#5b78f5',
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
});
