import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ojknhuvetrlhfdnmgvsl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SjqKckr4D71fDPokNijotA_iA489zzQ';

// Module-level singleton: every import returns this same instance,
// sharing one auth session, one token refresh loop, and HTTP keepalive
// across the whole app. Never create a second client.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
  global: {
    headers: { 'x-client-info': 'sakanarbab-mobile' },
  },
});

// Pause token auto-refresh while the app is backgrounded; resume on foreground.
// Prevents silent refresh failures and battery drain when the app isn't visible.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
