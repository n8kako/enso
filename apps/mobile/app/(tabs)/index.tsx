import { View, Text, ScrollView, StyleSheet, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// Maslow level colors
const MASLOW_COLORS = {
  physiological: '#E57373',
  safety: '#FFB74D',
  love_belonging: '#81C784',
  esteem: '#64B5F6',
  self_actualization: '#BA68C8',
};

export default function HomeScreen() {
  const router = useRouter();

  // Mock data - would come from store
  const mockProfile = {
    displayName: 'Welcome back',
    streak: 7,
    wellbeingScore: 72,
    maslowScores: {
      physiological: 75,
      safety: 68,
      love_belonging: 55,
      esteem: 70,
      self_actualization: 60,
    },
  };

  const mockActiveCommitments = [
    { id: '1', title: 'Morning meditation', completed: true },
    { id: '2', title: 'Drink 8 glasses of water', completed: false },
    { id: '3', title: 'Read for 30 minutes', completed: false },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{mockProfile.displayName}</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={20} color="#f59e0b" />
            <Text style={styles.streakText}>{mockProfile.streak}</Text>
          </View>
        </View>

        {/* Quick Journal Entry Button */}
        <Pressable
          style={styles.journalButton}
          onPress={() => router.push('/journal/new')}
        >
          <LinearGradient
            colors={['#5b78f5', '#4a5ce8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.journalButtonGradient}
          >
            <Ionicons name="create-outline" size={24} color="white" />
            <Text style={styles.journalButtonText}>Start journaling...</Text>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
          </LinearGradient>
        </Pressable>

        {/* Wellbeing Score Card */}
        <View style={styles.wellbeingCard}>
          <View style={styles.wellbeingHeader}>
            <Text style={styles.cardTitle}>Wellbeing Score</Text>
            <Text style={styles.wellbeingScore}>{mockProfile.wellbeingScore}</Text>
          </View>

          {/* Maslow Pyramid Visualization */}
          <View style={styles.pyramidContainer}>
            {Object.entries(mockProfile.maslowScores)
              .reverse()
              .map(([level, score], index) => (
                <View key={level} style={styles.pyramidRow}>
                  <View
                    style={[
                      styles.pyramidBar,
                      {
                        width: `${100 - index * 12}%`,
                        backgroundColor: MASLOW_COLORS[level as keyof typeof MASLOW_COLORS],
                        opacity: 0.3 + (score / 100) * 0.7,
                      },
                    ]}
                  >
                    <Text style={styles.pyramidLabel}>
                      {level.replace('_', ' ')}
                    </Text>
                    <Text style={styles.pyramidScore}>{score}%</Text>
                  </View>
                </View>
              ))}
          </View>
        </View>

        {/* Today's Commitments */}
        <View style={styles.commitmentsCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Today's Commitments</Text>
            <Pressable onPress={() => router.push('/(tabs)/commitments')}>
              <Text style={styles.seeAllText}>See all</Text>
            </Pressable>
          </View>

          {mockActiveCommitments.map((commitment) => (
            <Pressable
              key={commitment.id}
              style={styles.commitmentItem}
              onPress={() => router.push(`/commitment/${commitment.id}`)}
            >
              <View
                style={[
                  styles.checkbox,
                  commitment.completed && styles.checkboxCompleted,
                ]}
              >
                {commitment.completed && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text
                style={[
                  styles.commitmentTitle,
                  commitment.completed && styles.commitmentCompleted,
                ]}
              >
                {commitment.title}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* AI Insight Card */}
        <View style={styles.insightCard}>
          <LinearGradient
            colors={['rgba(91, 120, 245, 0.15)', 'rgba(186, 104, 200, 0.15)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.insightGradient}
          >
            <View style={styles.insightHeader}>
              <Ionicons name="sparkles" size={20} color="#BA68C8" />
              <Text style={styles.insightLabel}>AI Insight</Text>
            </View>
            <Text style={styles.insightText}>
              Your Love & Belonging score has been lower lately. Consider reaching out
              to a friend today - even a quick message can strengthen connections.
            </Text>
          </LinearGradient>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 30 }} />
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
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
  },
  date: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  streakText: {
    color: '#f59e0b',
    fontWeight: '600',
    fontSize: 16,
  },
  journalButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  journalButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 12,
  },
  journalButtonText: {
    flex: 1,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
  },
  wellbeingCard: {
    backgroundColor: '#16162a',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  wellbeingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  wellbeingScore: {
    fontSize: 32,
    fontWeight: '700',
    color: '#5b78f5',
  },
  pyramidContainer: {
    gap: 8,
  },
  pyramidRow: {
    alignItems: 'center',
  },
  pyramidBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  pyramidLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  pyramidScore: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  commitmentsCard: {
    backgroundColor: '#16162a',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
    color: '#5b78f5',
    fontSize: 14,
    fontWeight: '500',
  },
  commitmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4b5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompleted: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  commitmentTitle: {
    color: 'white',
    fontSize: 15,
    flex: 1,
  },
  commitmentCompleted: {
    color: '#6b7280',
    textDecorationLine: 'line-through',
  },
  insightCard: {
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  insightGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(186, 104, 200, 0.2)',
    borderRadius: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  insightLabel: {
    color: '#BA68C8',
    fontSize: 14,
    fontWeight: '600',
  },
  insightText: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 22,
  },
});
