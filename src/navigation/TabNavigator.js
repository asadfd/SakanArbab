import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import DashboardOverdueScreen from '../screens/dashboard/OverdueScreen';

import PropertiesListScreen from '../screens/properties/PropertiesListScreen';
import PropertyDetailScreen from '../screens/properties/PropertyDetailScreen';
import RoomDetailScreen from '../screens/properties/RoomDetailScreen';
import BedUnitDetailScreen from '../screens/properties/BedUnitDetailScreen';

import ContractsListScreen from '../screens/contracts/ContractsListScreen';
import ContractDetailScreen from '../screens/contracts/ContractDetailScreen';
import CreateContractScreen from '../screens/contracts/CreateContractScreen';

import PaymentsListScreen from '../screens/payments/PaymentsListScreen';
import LogPaymentScreen from '../screens/payments/LogPaymentScreen';
import OverdueScreen from '../screens/payments/OverdueScreen';

import SettingsScreen from '../screens/settings/SettingsScreen';
import BackupScreen from '../screens/settings/BackupScreen';
import AdvisoryScreen from '../screens/settings/AdvisoryScreen';
import ExpensesScreen from '../screens/settings/ExpensesScreen';
import ExpenseDetailScreen from '../screens/settings/ExpenseDetailScreen';
import RoomPLScreen from '../screens/settings/RoomPLScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator;

const ACTIVE_COLOR = '#26215C';
const INACTIVE_COLOR = '#888780';

// ─── Stack navigators ────────────────────────────────────────────────────────

function DashboardStack() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={{ headerShown: false }}>
      <S.Screen name="DashboardScreen" component={DashboardScreen} />
      <S.Screen name="OverdueScreen" component={DashboardOverdueScreen} />
      <S.Screen name="ContractDetailScreen" component={ContractDetailScreen} />
    </S.Navigator>
  );
}

function PropertiesStack() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={{ headerShown: false }}>
      <S.Screen name="PropertiesListScreen" component={PropertiesListScreen} />
      <S.Screen name="PropertyDetailScreen" component={PropertyDetailScreen} />
      <S.Screen name="RoomDetailScreen" component={RoomDetailScreen} />
      <S.Screen name="BedUnitDetailScreen" component={BedUnitDetailScreen} />
      <S.Screen name="CreateContractScreen" component={CreateContractScreen} />
    </S.Navigator>
  );
}

function ContractsStack() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={{ headerShown: false }}>
      <S.Screen name="ContractsListScreen" component={ContractsListScreen} />
      <S.Screen name="ContractDetailScreen" component={ContractDetailScreen} />
      <S.Screen name="CreateContractScreen" component={CreateContractScreen} />
    </S.Navigator>
  );
}

function PaymentsStack() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={{ headerShown: false }}>
      <S.Screen name="PaymentsListScreen" component={PaymentsListScreen} />
      <S.Screen name="LogPaymentScreen" component={LogPaymentScreen} />
      <S.Screen name="OverdueScreen" component={OverdueScreen} />
    </S.Navigator>
  );
}

function MoreStack() {
  const S = createNativeStackNavigator();
  return (
    <S.Navigator screenOptions={{ headerShown: false }}>
      <S.Screen name="SettingsScreen" component={SettingsScreen} />
      <S.Screen name="BackupScreen" component={BackupScreen} />
      <S.Screen name="AdvisoryScreen" component={AdvisoryScreen} />
      <S.Screen name="ExpensesScreen" component={ExpensesScreen} />
      <S.Screen name="ExpenseDetailScreen" component={ExpenseDetailScreen} />
      <S.Screen name="RoomPLScreen" component={RoomPLScreen} />
    </S.Navigator>
  );
}

// ─── Tab navigator ───────────────────────────────────────────────────────────

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 56 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ACTIVE_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E0E0E0',
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom || 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Dashboard: 'home',
            Properties: 'office-building',
            Contracts: 'file-document-outline',
            Payments: 'cash',
            More: 'dots-horizontal',
          };
          return (
            <MaterialCommunityIcons
              name={icons[route.name] ?? 'circle'}
              size={size ?? 24}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStack} />
      <Tab.Screen name="Properties" component={PropertiesStack} />
      <Tab.Screen name="Contracts" component={ContractsStack} />
      <Tab.Screen name="Payments" component={PaymentsStack} />
      <Tab.Screen name="More" component={MoreStack} />
    </Tab.Navigator>
  );
}
