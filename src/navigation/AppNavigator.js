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
  const [bootState, setBootState] = useState({ loading: true });

  async function resolveState(sessionOverride) {
    try {
      const session = sessionOverride ?? (await getSession());
      if (!session) return { loading: false, signedIn: false };

      await setupDatabase();
      await saveLocalAgent();

      const agent = await getAgent();
      return {
        loading: false,
        signedIn: true,
        initialRoute: agent?.business_name ? 'Main' : 'Setup',
      };
    } catch {
      return { loading: false, signedIn: false };
    }
  }

  useEffect(() => {
    let mounted = true;

    (async () => {
      const state = await resolveState();
      if (mounted) setBootState(state);
    })();

    const { data: sub } = onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (event === 'SIGNED_OUT') {
        clearUserId();
        setBootState({ loading: false, signedIn: false });
      } else if (event === 'SIGNED_IN' && session) {
        const state = await resolveState(session);
        if (mounted) setBootState(state);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (bootState.loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#26215C" />
      </View>
    );
  }

  return (
    <Root.Navigator
      screenOptions={{ headerShown: false, animation: 'none' }}
    >
      {!bootState.signedIn ? (
        <Root.Screen name="Auth" component={AuthScreen} />
      ) : bootState.initialRoute === 'Main' ? (
        <>
          <Root.Screen name="Main" component={TabNavigator} />
          <Root.Screen name="Setup" component={BusinessProfileScreen} />
        </>
      ) : (
        <>
          <Root.Screen name="Setup" component={BusinessProfileScreen} />
          <Root.Screen name="Main" component={TabNavigator} />
        </>
      )}
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
