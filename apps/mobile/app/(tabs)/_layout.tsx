import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';

type IconName = keyof typeof Ionicons.glyphMap;

interface TabIconProps {
  name: IconName;
  color: string;
  focused: boolean;
}

function TabIcon({ name, color, focused }: TabIconProps) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={name} size={24} color={color} />
      {focused && <View style={[styles.indicator, { backgroundColor: color }]} />}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#5b78f5',
        tabBarInactiveTintColor: '#6b7280',
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'book' : 'book-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="commitments"
        options={{
          title: 'Commitments',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'checkmark-circle' : 'checkmark-circle-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'analytics' : 'analytics-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#16162a',
    borderTopColor: '#2a2a4a',
    borderTopWidth: 1,
    height: 85,
    paddingTop: 8,
    paddingBottom: 25,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});
