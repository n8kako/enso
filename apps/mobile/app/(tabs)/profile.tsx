import { View, Text, ScrollView, StyleSheet, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';

interface SettingsItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  showArrow?: boolean;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
}

function SettingsItem({
  icon,
  label,
  value,
  onPress,
  showArrow = true,
  toggle,
  toggleValue,
  onToggle,
}: SettingsItemProps) {
  return (
    <Pressable style={styles.settingsItem} onPress={onPress} disabled={toggle}>
      <View style={styles.settingsItemLeft}>
        <View style={styles.settingsIconContainer}>
          <Ionicons name={icon} size={20} color="#5b78f5" />
        </View>
        <Text style={styles.settingsLabel}>{label}</Text>
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: '#374151', true: '#5b78f5' }}
          thumbColor="white"
        />
      ) : (
        <View style={styles.settingsItemRight}>
          {value && <Text style={styles.settingsValue}>{value}</Text>}
          {showArrow && <Ionicons name="chevron-forward" size={20} color="#6b7280" />}
        </View>
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>John Doe</Text>
            <Text style={styles.userEmail}>john.doe@example.com</Text>
          </View>
          <Pressable style={styles.editButton}>
            <Ionicons name="pencil" size={18} color="#5b78f5" />
          </Pressable>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>47</Text>
            <Text style={styles.statLabel}>Entries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>78%</Text>
            <Text style={styles.statLabel}>Success Rate</Text>
          </View>
        </View>

        {/* AI Personality */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Companion</Text>
          <View style={styles.settingsCard}>
            <SettingsItem
              icon="chatbubbles"
              label="AI Personality"
              value="Balanced"
              onPress={() => {}}
            />
            <SettingsItem
              icon="volume-high"
              label="Response Length"
              value="Medium"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingsCard}>
            <SettingsItem
              icon="notifications"
              label="Notifications"
              toggle
              toggleValue={notificationsEnabled}
              onToggle={setNotificationsEnabled}
            />
            <SettingsItem
              icon="moon"
              label="Dark Mode"
              toggle
              toggleValue={darkMode}
              onToggle={setDarkMode}
            />
            <SettingsItem
              icon="alarm"
              label="Daily Reminder"
              value="9:00 AM"
              onPress={() => {}}
            />
            <SettingsItem
              icon="globe"
              label="Timezone"
              value="PST"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Focus Areas */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Focus Areas</Text>
          <View style={styles.focusAreasCard}>
            {[
              { name: 'Love & Belonging', color: '#81C784', active: true },
              { name: 'Self-Actualization', color: '#BA68C8', active: true },
              { name: 'Esteem', color: '#64B5F6', active: false },
            ].map((area) => (
              <View
                key={area.name}
                style={[
                  styles.focusAreaChip,
                  { borderColor: area.active ? area.color : '#374151' },
                ]}
              >
                <View
                  style={[
                    styles.focusAreaDot,
                    { backgroundColor: area.active ? area.color : '#374151' },
                  ]}
                />
                <Text
                  style={[
                    styles.focusAreaText,
                    { color: area.active ? area.color : '#6b7280' },
                  ]}
                >
                  {area.name}
                </Text>
              </View>
            ))}
            <Pressable style={styles.editFocusButton}>
              <Text style={styles.editFocusText}>Edit focus areas</Text>
            </Pressable>
          </View>
        </View>

        {/* Privacy & Data */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Data</Text>
          <View style={styles.settingsCard}>
            <SettingsItem
              icon="shield-checkmark"
              label="Data Privacy"
              onPress={() => {}}
            />
            <SettingsItem
              icon="download"
              label="Export My Data"
              onPress={() => {}}
            />
            <SettingsItem
              icon="trash"
              label="Delete Account"
              onPress={() => {}}
            />
          </View>
        </View>

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.settingsCard}>
            <SettingsItem icon="help-circle" label="Help & FAQ" onPress={() => {}} />
            <SettingsItem icon="mail" label="Contact Support" onPress={() => {}} />
            <SettingsItem icon="star" label="Rate Enso" onPress={() => {}} />
          </View>
        </View>

        {/* Sign Out */}
        <Pressable style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <Text style={styles.versionText}>Enso v0.1.0</Text>

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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16162a',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5b78f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  userEmail: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 2,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(91, 120, 245, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#16162a',
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 4,
  },
  statNumber: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  settingsCard: {
    backgroundColor: '#16162a',
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(91, 120, 245, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    color: 'white',
    fontSize: 15,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsValue: {
    color: '#9ca3af',
    fontSize: 14,
  },
  focusAreasCard: {
    backgroundColor: '#16162a',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  focusAreaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  focusAreaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  focusAreaText: {
    fontSize: 13,
    fontWeight: '500',
  },
  editFocusButton: {
    paddingVertical: 8,
  },
  editFocusText: {
    color: '#5b78f5',
    fontSize: 13,
    fontWeight: '500',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  versionText: {
    color: '#4b5563',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },
});
