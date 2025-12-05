import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const MASLOW_COLORS = {
  physiological: '#E57373',
  safety: '#FFB74D',
  love_belonging: '#81C784',
  esteem: '#64B5F6',
  self_actualization: '#BA68C8',
};

// Mock data for insights
const mockMoodData = [
  { day: 'Mon', value: 6 },
  { day: 'Tue', value: 7 },
  { day: 'Wed', value: 5 },
  { day: 'Thu', value: 8 },
  { day: 'Fri', value: 7 },
  { day: 'Sat', value: 9 },
  { day: 'Sun', value: 8 },
];

const mockMaslowTrend = {
  physiological: { current: 75, change: 5 },
  safety: { current: 68, change: -2 },
  love_belonging: { current: 55, change: -8 },
  esteem: { current: 70, change: 3 },
  self_actualization: { current: 60, change: 10 },
};

const mockInsights = [
  {
    id: '1',
    type: 'pattern',
    icon: 'trending-up',
    title: 'Morning routines boost your mood',
    description:
      'Your mood scores are 35% higher on days when you journal before 9 AM.',
    color: '#22c55e',
  },
  {
    id: '2',
    type: 'suggestion',
    icon: 'bulb',
    title: 'Social connection opportunity',
    description:
      "You haven't written about friends or family in 5 days. Consider reaching out.",
    color: '#f59e0b',
  },
  {
    id: '3',
    type: 'achievement',
    icon: 'trophy',
    title: 'Self-Actualization growth',
    description:
      'Your focus on learning and creativity has increased by 40% this month.',
    color: '#BA68C8',
  },
];

function MoodChart() {
  const maxValue = 10;
  const chartHeight = 120;

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chart}>
        {mockMoodData.map((item, index) => {
          const height = (item.value / maxValue) * chartHeight;
          const isToday = index === mockMoodData.length - 1;

          return (
            <View key={item.day} style={styles.barContainer}>
              <View style={styles.barWrapper}>
                <LinearGradient
                  colors={isToday ? ['#5b78f5', '#4a5ce8'] : ['#3d47d1', '#303884']}
                  style={[styles.bar, { height }]}
                />
              </View>
              <Text style={[styles.barLabel, isToday && styles.barLabelActive]}>
                {item.day}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={styles.chartLegend}>
        <Text style={styles.legendText}>Average: 7.1</Text>
        <Text style={styles.legendText}>↑ 12% from last week</Text>
      </View>
    </View>
  );
}

function MaslowTrendCard() {
  return (
    <View style={styles.trendCard}>
      <Text style={styles.cardTitle}>Maslow Trends</Text>
      <Text style={styles.cardSubtitle}>Last 30 days</Text>

      <View style={styles.trendList}>
        {Object.entries(mockMaslowTrend).map(([level, data]) => {
          const color = MASLOW_COLORS[level as keyof typeof MASLOW_COLORS];
          const isPositive = data.change >= 0;

          return (
            <View key={level} style={styles.trendItem}>
              <View style={[styles.trendDot, { backgroundColor: color }]} />
              <Text style={styles.trendLabel}>{level.replace('_', ' ')}</Text>
              <View style={styles.trendScore}>
                <Text style={styles.scoreValue}>{data.current}</Text>
                <View
                  style={[
                    styles.changeIndicator,
                    { backgroundColor: isPositive ? '#22c55e20' : '#ef444420' },
                  ]}
                >
                  <Ionicons
                    name={isPositive ? 'arrow-up' : 'arrow-down'}
                    size={10}
                    color={isPositive ? '#22c55e' : '#ef4444'}
                  />
                  <Text
                    style={[
                      styles.changeText,
                      { color: isPositive ? '#22c55e' : '#ef4444' },
                    ]}
                  >
                    {Math.abs(data.change)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function InsightsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Insights</Text>
          <Text style={styles.subtitle}>Your personal growth analytics</Text>
        </View>

        {/* Mood Chart */}
        <View style={styles.moodCard}>
          <View style={styles.moodHeader}>
            <Text style={styles.cardTitle}>Mood This Week</Text>
            <View style={styles.moodBadge}>
              <Ionicons name="happy" size={16} color="#22c55e" />
              <Text style={styles.moodBadgeText}>Good</Text>
            </View>
          </View>
          <MoodChart />
        </View>

        {/* Maslow Trends */}
        <MaslowTrendCard />

        {/* AI Insights */}
        <View style={styles.insightsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="sparkles" size={20} color="#BA68C8" />
            <Text style={styles.sectionTitle}>AI Insights</Text>
          </View>

          {mockInsights.map((insight) => (
            <View key={insight.id} style={styles.insightCard}>
              <View
                style={[
                  styles.insightIconContainer,
                  { backgroundColor: `${insight.color}20` },
                ]}
              >
                <Ionicons
                  name={insight.icon as any}
                  size={20}
                  color={insight.color}
                />
              </View>
              <View style={styles.insightContent}>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightDescription}>{insight.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Commitment Success */}
        <View style={styles.successCard}>
          <Text style={styles.cardTitle}>Commitment Success Rate</Text>
          <View style={styles.successStats}>
            <View style={styles.successCircle}>
              <Text style={styles.successPercent}>78%</Text>
              <Text style={styles.successLabel}>This Month</Text>
            </View>
            <View style={styles.successDetails}>
              <View style={styles.successRow}>
                <Text style={styles.successDetailLabel}>Completed</Text>
                <Text style={styles.successDetailValue}>47</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successDetailLabel}>Missed</Text>
                <Text style={styles.successDetailValue}>13</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successDetailLabel}>Best category</Text>
                <Text style={styles.successDetailValue}>Meditation</Text>
              </View>
            </View>
          </View>
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
  moodCard: {
    backgroundColor: '#16162a',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  moodHeader: {
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
  cardSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  moodBadgeText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '500',
  },
  chartContainer: {},
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingBottom: 20,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 24,
    borderRadius: 6,
  },
  barLabel: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 8,
  },
  barLabelActive: {
    color: '#5b78f5',
    fontWeight: '600',
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 12,
  },
  legendText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  trendCard: {
    backgroundColor: '#16162a',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  trendList: {
    marginTop: 16,
    gap: 14,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  trendLabel: {
    flex: 1,
    color: '#d1d5db',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  trendScore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreValue: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'right',
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  insightsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  insightCard: {
    flexDirection: 'row',
    backgroundColor: '#16162a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  insightIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  insightDescription: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
  },
  successCard: {
    backgroundColor: '#16162a',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
  },
  successStats: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 24,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 6,
    borderColor: '#5b78f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successPercent: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  successLabel: {
    color: '#9ca3af',
    fontSize: 10,
    marginTop: 2,
  },
  successDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 10,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  successDetailLabel: {
    color: '#6b7280',
    fontSize: 13,
  },
  successDetailValue: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
});
