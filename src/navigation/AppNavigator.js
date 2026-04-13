import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { setupDatabase, getAgent, saveLocalAgent, clearUserId } from '../database/database';
import { getSession, onAuthStateChange } from '../services/authService';
import AuthScreen from '../screens/auth/AuthScreen';
import TabNavigator from './TabNavigator';
import BusinessProfileScreen from '../screens/setup/BusinessProfileScreen';

const Root = createNativeStackNavigator();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null); // null = loading
  const [remountKey, setRemountKey] = useState(0);

  async function resolveRoute() {
    try {
      const session = await getSession();
      if (!session) return 'Auth';

      await setupDatabase();
      await saveLocalAgent();

      const agent = await getAgent();
      return agent?.business_name ? 'Main' : 'Setup';
    } catch {
      return 'Auth';
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      const route = await resolveRoute();
      if (mounted) setInitialRoute(route);
    })();

    const { data: sub } = onAuthStateChange((event) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        clearUserId();
        setInitialRoute('Auth');
        setRemountKey((k) => k + 1);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#26215C" />
      </View>
    );
  }

  return (
    <Root.Navigator
      key={`nav-${remountKey}`}
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: 'none' }}
    >
      <Root.Screen name="Auth" component={AuthScreen} />
      <Root.Screen name="Setup" component={BusinessProfileScreen} />
      <Root.Screen name="Main" component={TabNavigator} />
    </Root.Navigator>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
