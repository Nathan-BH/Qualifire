/**
 * Qualifire — Phase 1 tracker (B-24) + Preview tab + two-mode theming.
 *
 * Theming: DAYLIGHT default / NIGHT toggle (persisted; see themeContext).
 * Race mode follows the theme. Demo tab follows the theme too (Cycle 020,
 * Nathan 2026-08-19: it no longer forces night).
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
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LaunchAnimation } from './src/ui/launchAnimation';
import RecordScreen from './src/ui/RecordScreen';
import RidesScreen from './src/ui/RidesScreen';
import RoutesScreen from './src/ui/RoutesScreen';
import ResultScreen from './src/ui/ResultScreen';
import SettingsScreen, { SettingsProvider } from './src/ui/settings';
import DemoScreen from './src/ui/DemoScreen';
import { PaddockTheme } from './src/ui/theme';
import { ThemeProvider, useTheme } from './src/ui/themeContext';
import { initRideHistory } from './src/ui/lastRide';
import { initFreeRidePersistence } from './src/store/freeRides';
import { createExpoFsAdapter } from './src/storage/expoFsAdapter';
import { TabNavProvider, type Tab } from './src/ui/tabNav';

/**
 * Android 15 forces edge-to-edge: the app draws under the system navigation
 * bar and is expected to pad itself using WindowInsets. Build 2's stopgap was
 * a hardcoded 48dp; react-native-safe-area-context ships since build 3, so
 * the bar now reads the REAL inset via useSafeAreaInsets (Shell sits inside
 * SafeAreaProvider — see App below). Floor of 12dp so a gesture-nav phone,
 * which can report a near-zero inset, keeps a minimum thumb gap
 * [ASSUMPTION — verify on device].
 */
const NAV_BAR_MIN_PAD = 12;

function Shell() {
  const [tab, setTab] = useState<Tab>('record');
  // Cycle 024 (WP-A2): RecordScreen reports whether it wants the tab bar
  // hidden (armed/running/ending, or an in-flight launch mark) — Shell owns
  // the bar, RecordScreen owns whether it should be visible right now.
  const [recFullscreen, setRecFullscreen] = useState(false);
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, NAV_BAR_MIN_PAD);
  // Cycle 020 (Nathan 2026-08-19): the demo tab follows the day/night theme
  // like every other tab, rather than being forced into night mode.
  const chrome: PaddockTheme = t;

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

  // Rehydrate the comparison window once per launch, from the persistent
  // results/ store (cycle 024, WP-A1 — replaced B-40's results-cache.json;
  // that file is left on disk, unread). Fire-and-forget — boot never blocks
  // or fails on it (D-023: the store is a derived convenience, the raw
  // JSONL stays the only truth). The state bump re-renders once when history
  // arrives so ghost counts on the idle screen refresh without a location tick.
  const [, setWindowHydrated] = useState(false);
  useEffect(() => {
    initRideHistory(createExpoFsAdapter()).then(
      () => setWindowHydrated(true),
      () => {},
    );
    // WP-B: the free-ride cache rehydrates the same way, alongside the
    // fixed-route store above — same fire-and-forget shape, same file (D-023:
    // both are derived conveniences, never load-bearing for boot).
    void initFreeRidePersistence(createExpoFsAdapter());
  }, []);

  // Cycle 024 (WP-A2, Nathan 2026-08-19): "when you press record but are on
  // the race screen, the other tabs in the footer disappear — full screen,
  // no tab browsing." The bar is hidden ENTIRELY (not just dimmed) while on
  // the record tab and RecordScreen reports itself fullscreen.
  const tabBarHidden = tab === 'record' && recFullscreen;
  // WP-A2 hides the tab bar entirely while fullscreen, which also removes
  // the only thing padding the screen for the device's bottom gesture-nav
  // inset (the bar's own paddingBottom, via bottomPad above) — so content
  // ran flush under the OS nav/back-gesture strip during armed/running/
  // ending (Nathan, 2026-08-24). Apply the same inset directly to `content`
  // whenever the bar isn't there to absorb it.
  const styles = useMemo(
    () => makeStyles(chrome, bottomPad, tabBarHidden),
    [chrome, bottomPad, tabBarHidden],
  );

  return (
    <TabNavProvider go={setTab}>
      <View style={styles.root}>
        <View style={styles.content}>
          {tab === 'record' ? <RecordScreen onFullscreenChange={setRecFullscreen} />
            : tab === 'rides' ? <RidesScreen />
            : tab === 'routes' ? <RoutesScreen />
            : tab === 'result' ? <ResultScreen />
            : tab === 'settings' ? <SettingsScreen />
            : <DemoScreen />}
        </View>
        {/* Six tabs do not fit at a readable size, so the bar SCROLLS sideways
            rather than wrapping or shrinking the text (Nathan, 2026-08-16). */}
        {!tabBarHidden && (
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
        )}
        <StatusBar style={chrome.statusBar} />
      </View>
    </TabNavProvider>
  );
}

export default function App() {
  // BRAND.md ratified motion (Nathan 2026-08-17, "must feature"): cold-start
  // launch animation overlay, mounted above Shell but inside ThemeProvider
  // (LaunchAnimation calls useTheme). `booting` lives HERE, not in Shell, so
  // Shell still mounts immediately underneath — B-40 boot hydration is not
  // delayed — and the overlay plays exactly once per cold JS start (App
  // never remounts on resume; a headless relaunch mounts no components here
  // at all, so this is a no-op there too).
  const [booting, setBooting] = useState(true);
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <SettingsProvider>
          <Shell />
        </SettingsProvider>
        {booting && <LaunchAnimation onDone={() => setBooting(false)} />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const makeStyles = (t: PaddockTheme, bottomPad: number, tabBarHidden: boolean) =>
  StyleSheet.create({
    // Top inset: RN's SafeAreaView is iOS-only, but Android exposes the status
    // bar height in JS — no native module needed (unlike the bottom nav bar).
    root: { flex: 1, backgroundColor: t.bg, paddingTop: RNStatusBar.currentHeight ?? 0 },
    // When the tab bar is hidden (WP-A2 fullscreen), nothing else absorbs the
    // bottom gesture-nav inset, so content takes it directly here instead.
    content: { flex: 1, paddingBottom: tabBarHidden ? bottomPad : 0 },
    tabBar: {
      flexGrow: 0,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.cardBorder,
      paddingBottom: bottomPad,
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
