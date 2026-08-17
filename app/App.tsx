/**
 * Qualifire — Phase 1 tracker (B-24) + Preview tab + two-mode theming.
 *
 * Theming: DAYLIGHT default / NIGHT toggle (persisted; see themeContext).
 * Race mode follows the theme. Preview renders in night always (mockup).
 *
 * IMPORTANT: `./src/location` must be imported at module scope. It calls
 * TaskManager.defineTask, and when Android relaunches this bundle headlessly
 * (app killed, foreground service still delivering fixes) only module-scope
 * code runs — no components mount. Importing it here guarantees the task
 * exists in every launch mode.
 */
import './src/location';
import { useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  BackHandler,
  Pressable,
  StatusBar as RNStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import RecordScreen from './src/ui/RecordScreen';
import RidesScreen from './src/ui/RidesScreen';
import RoutesScreen from './src/ui/RoutesScreen';
import ResultScreen from './src/ui/ResultScreen';
import SettingsScreen, { SettingsProvider } from './src/ui/settings';
import DemoScreen from './src/ui/DemoScreen';
import { PaddockTheme, night } from './src/ui/theme';
import { ThemeProvider, useTheme } from './src/ui/themeContext';
import { initRecordedPersistence } from './src/ui/lastRide';
import { createExpoFsAdapter } from './src/storage/expoFsAdapter';

// 'demo' = the old Preview tab, renamed (IDEAS §26, 2026-08-16): the real
// screens ARE the latest design now; this tab remains only as the quick
// sound/colour/flow demo. Future real tabs (routes) join the bottom bar.
// The five real tabs of the mockup (2026-08-16), plus 'demo' kept for the
// quick sound/colour/flow check (IDEAS §26).
type Tab = 'record' | 'rides' | 'routes' | 'result' | 'settings' | 'demo';

/**
 * Android 15 forces edge-to-edge: the app draws under the system navigation
 * bar and is expected to pad itself using WindowInsets. Reading insets needs
 * react-native-safe-area-context — a NATIVE module not in build 2. STOPGAP:
 * hardcoded 48dp (standard 3-button nav height on Nathan's phone).
 * TODO(build 3): add react-native-safe-area-context (batch with the audio
 * module for earcons) and replace this with useSafeAreaInsets().bottom.
 */
const NAV_BAR_STOPGAP = 48;

function Shell() {
  const [tab, setTab] = useState<Tab>('record');
  const { t } = useTheme();
  // The demo renders night-mode regardless of app theme.
  const chrome: PaddockTheme = tab === 'demo' ? night : t;
  const styles = useMemo(() => makeStyles(chrome), [chrome]);

  // System back: other tabs → Record; from Record, default behaviour (app
  // backgrounds). PreviewScreen registers its own handler (runs first) to walk
  // its internal screens back to its home before this one fires.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (tab !== 'record') {
        setTab('record');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [tab]);

  // B-40: rehydrate the comparison window once per launch. Fire-and-forget —
  // boot never blocks or fails on the cache (D-023: it is a convenience, the
  // JSONL stays the only truth). The state bump re-renders once when history
  // arrives so ghost counts on the idle screen refresh without a location tick.
  const [, setWindowHydrated] = useState(false);
  useEffect(() => {
    initRecordedPersistence(createExpoFsAdapter()).then(
      () => setWindowHydrated(true),
      () => {},
    );
  }, []);

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        {tab === 'record' ? <RecordScreen />
          : tab === 'rides' ? <RidesScreen />
          : tab === 'routes' ? <RoutesScreen />
          : tab === 'result' ? <ResultScreen />
          : tab === 'settings' ? <SettingsScreen />
          : <DemoScreen />}
      </View>
      {/* Six tabs do not fit at a readable size, so the bar SCROLLS sideways
          rather than wrapping or shrinking the text (Nathan, 2026-08-16). */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {(['record', 'rides', 'routes', 'result', 'settings', 'demo'] as const).map((tb) => (
          <Pressable
            key={tb}
            style={[styles.tab, tab === tb && styles.tabActiveBar]}
            onPress={() => setTab(tb)}
          >
            <Text style={[styles.tabText, tab === tb && styles.tabActive]}>{tb}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <StatusBar style={chrome.statusBar} />
    </View>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
      <Shell />
    </SettingsProvider>
    </ThemeProvider>
  );
}

const makeStyles = (t: PaddockTheme) =>
  StyleSheet.create({
    // Top inset: RN's SafeAreaView is iOS-only, but Android exposes the status
    // bar height in JS — no native module needed (unlike the bottom nav bar).
    root: { flex: 1, backgroundColor: t.bg, paddingTop: RNStatusBar.currentHeight ?? 0 },
    content: { flex: 1 },
    tabBar: {
      flexGrow: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.cardBorder,
      paddingBottom: NAV_BAR_STOPGAP,
    },
    // Each tab keeps a readable width; the bar scrolls when they overflow.
    tabBarContent: { flexDirection: 'row', alignItems: 'stretch' },
    tab: {
      minWidth: 92,
      flex: 1,
      alignItems: 'center',
      paddingVertical: 14,
      borderTopWidth: 3,
      borderTopColor: 'transparent',
    },
    tabText: {
      color: t.textDim,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    tabActive: { color: t.text },
    tabActiveBar: { borderTopColor: t.accent },
  });
