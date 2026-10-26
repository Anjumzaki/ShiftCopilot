import React, {useEffect} from 'react';
import {StatusBar, Text} from 'react-native';
import {NavigationContainer, DarkTheme} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from './src/screens/HomeScreen';
import ZonesScreen from './src/screens/ZonesScreen';
import EarningsScreen from './src/screens/EarningsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import {startCapture} from './src/native/UberNotifications';
import {ensureChannels} from './src/native/ShiftService';
import {theme} from './src/theme';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.bg,
    card: theme.card,
    text: theme.text,
    border: theme.border,
    primary: theme.accent,
  },
};

const icon =
  (glyph: string) =>
  ({color}: {color: string}) =>
    <Text style={{color, fontSize: 18}}>{glyph}</Text>;

export default function App() {
  useEffect(() => {
    ensureChannels().catch(() => {});
    startCapture().catch(() => {});
  }, []);

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      <Tab.Navigator
        screenOptions={{
          headerStyle: {backgroundColor: theme.bg},
          headerTitleStyle: {color: theme.text, fontWeight: '800'},
          tabBarStyle: {backgroundColor: theme.card, borderTopColor: theme.border},
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textDim,
        }}>
        <Tab.Screen
          name="Now"
          component={HomeScreen}
          options={{title: 'ShiftCopilot', tabBarIcon: icon('⚡')}}
        />
        <Tab.Screen name="Zones" component={ZonesScreen} options={{tabBarIcon: icon('🗺')}} />
        <Tab.Screen name="Earnings" component={EarningsScreen} options={{tabBarIcon: icon('💰')}} />
        <Tab.Screen name="Settings" component={SettingsScreen} options={{tabBarIcon: icon('⚙')}} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
