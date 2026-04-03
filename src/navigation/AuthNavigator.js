import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import BusinessProfileScreen from '../screens/setup/BusinessProfileScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator({ initialRoute = 'Login' }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="BusinessProfile" component={BusinessProfileScreen} />
    </Stack.Navigator>
  );
}
