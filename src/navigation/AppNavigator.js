import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { getAgent } from '../database/database';
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';
import BusinessProfileScreen from '../screens/setup/BusinessProfileScreen';

const Root = createNativeStackNavigator();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState(null); // null = loading

  useEffect(() => {
    async function checkAuth() {
      try {
        const pin = await SecureStore.getItemAsync('app_pin');
        if (!pin) { setInitialRoute('Auth'); return; }

        const agent = getAgent();
        if (!agent) { setInitialRoute('Auth'); return; }

        setInitialRoute(agent.business_name ? 'Main' : 'Setup');
      } catch {
        setInitialRoute('Auth');
      }
    }
    checkAuth();
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
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: 'none' }}
    >
      <Root.Screen name="Auth" component={AuthNavigator} />
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
