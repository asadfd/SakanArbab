import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { saveLocalAgent, getAgent } from '../../database/database';

const PIN_LENGTH = 4;

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState(null); // 'setup' | 'confirm' | 'unlock'
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function detectMode() {
      const stored = await SecureStore.getItemAsync('app_pin');
      setMode(stored ? 'unlock' : 'setup');
    }
    detectMode();
  }, []);

  function shake() {
    setPin('');
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }

  async function handlePinComplete(entered) {
    if (mode === 'setup') {
      setFirstPin(entered);
      setPin('');
      setMode('confirm');
      setErrorMsg('');
      return;
    }

    if (mode === 'confirm') {
      if (entered !== firstPin) {
        setErrorMsg("PINs don't match. Try again.");
        shake();
        setMode('setup');
        setFirstPin('');
        return;
      }
      await SecureStore.setItemAsync('app_pin', entered);
      saveLocalAgent();
      const agent = getAgent();
      if (agent?.business_name) {
        navigation.getParent()?.replace('Main');
      } else {
        navigation.getParent()?.replace('Setup');
      }
      return;
    }

    if (mode === 'unlock') {
      const stored = await SecureStore.getItemAsync('app_pin');
      if (entered !== stored) {
        setErrorMsg('Incorrect PIN. Try again.');
        shake();
        return;
      }
      setErrorMsg('');
      const agent = getAgent();
      if (agent?.business_name) {
        navigation.getParent()?.replace('Main');
      } else {
        navigation.getParent()?.replace('Setup');
      }
    }
  }

  function pressDigit(digit) {
    if (pin.length >= PIN_LENGTH) return;
    setErrorMsg('');
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      handlePinComplete(next);
    }
  }

  function pressDelete() {
    setPin(p => p.slice(0, -1));
    setErrorMsg('');
  }

  if (!mode) return null;

  const title =
    mode === 'setup' ? 'Create PIN' :
    mode === 'confirm' ? 'Confirm PIN' :
    'Enter PIN';

  const subtitle =
    mode === 'setup' ? 'Set a 4-digit PIN to secure your app' :
    mode === 'confirm' ? 'Re-enter your PIN to confirm' :
    'Enter your PIN to continue';

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#26215C" />

      <View style={styles.hero}>
        <Text style={styles.appName}>SakanArbab</Text>
        <Text style={styles.appNameArabic}>سكن أرباب</Text>
      </View>

      <View style={styles.pinArea}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <Animated.View style={[styles.dotsRow, { transform: [{ translateX: shakeAnim }] }]}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i < pin.length && styles.dotFilled]}
            />
          ))}
        </Animated.View>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      </View>

      <View style={styles.keypad}>
        {[['1','2','3'],['4','5','6'],['7','8','9'],['','0','del']].map((row, ri) => (
          <View key={ri} style={styles.keyRow}>
            {row.map((key, ki) => {
              if (key === '') return <View key={ki} style={styles.keyPlaceholder} />;
              if (key === 'del') {
                return (
                  <TouchableOpacity key={ki} style={styles.key} onPress={pressDelete} activeOpacity={0.6}>
                    <Text style={styles.keyDel}>⌫</Text>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity key={ki} style={styles.key} onPress={() => pressDigit(key)} activeOpacity={0.6}>
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#26215C',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  hero: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  appNameArabic: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  pinArea: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 8,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    marginTop: 4,
  },
  keypad: {
    width: '100%',
    gap: 12,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  key: {
    flex: 1,
    aspectRatio: 1.6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPlaceholder: {
    flex: 1,
    aspectRatio: 1.6,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  keyDel: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.7)',
  },
});
