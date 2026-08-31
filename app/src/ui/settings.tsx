/**
 * App settings — the toggles Nathan asked to have "flexible" (IDEAS §18/§21/§24,
 * mockup 2026-08-16). In-memory only for now: nothing persists across a restart
 * until there is a settings store. Every one of these is a real switch that
 * other screens read, never a decorative row.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { setEarconsEnabled } from '../location';
import { createExpoFsAdapter } from '../storage/expoFsAdapter';
import { USER_CATALOG_FILE } from '../store/catalogStore';
import { USER_REFS_FILE } from '../live/userRefs';
import { saveTextFile } from './saveGpx';
import { PaddockTheme, radius } from './theme';
import { useTheme } from './themeContext';

/** How a stop at a red light is handled (§18 — UNSETTLED, hence a setting). */
export type RedLight = 'auto' | 'button' | 'off';
export interface Settings {
  redLight: RedLight;
  startMode: 'auto' | 'pick';
  tower: boolean;
  liveMap: boolean;
  earcons: boolean;
}

const DEFAULTS: Settings = {
  redLight: 'auto',
  startMode: 'auto',
  tower: true,
  liveMap: true,
  earcons: true,
};

interface Ctx { s: Settings; set: <K extends keyof Settings>(k: K, v: Settings[K]) => void }
const SettingsCtx = createContext<Ctx>({ s: DEFAULTS, set: () => {} });

/** One small JSON next to the ride data. Settings are preferences, not
 * evidence: a corrupt or missing file silently falls back to DEFAULTS rather
 * than blocking the app (unlike ride storage, where a bad read is a bug). */
const FILE = `${FileSystem.documentDirectory ?? ''}settings.json`;

async function load(): Promise<Partial<Settings> | null> {
  try {
    const info = await FileSystem.getInfoAsync(FILE);
    if (!info.exists) return null;
    return JSON.parse(await FileSystem.readAsStringAsync(FILE)) as Partial<Settings>;
  } catch {
    return null;
  }
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      const saved = await load();
      if (saved) setS((prev) => ({ ...prev, ...saved }));
      loaded.current = true;
    })();
  }, []);

  // The tracker is the only buzzer; keep it in step with the preference.
  useEffect(() => { setEarconsEnabled(s.earcons); }, [s.earcons]);

  // Write after every change, but never before the first read has landed —
  // otherwise the defaults would overwrite the saved file on launch.
  useEffect(() => {
    if (!loaded.current) return;
    FileSystem.writeAsStringAsync(FILE, JSON.stringify(s)).catch(() => {});
  }, [s]);
  const value = useMemo<Ctx>(
    () => ({ s, set: (k, v) => setS((prev) => ({ ...prev, [k]: v })) }),
    [s],
  );
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>;
}

export function useSettings(): Ctx {
  return useContext(SettingsCtx);
}

/* ------------------------------------------------------------------ screen */

function Seg<T extends string>(props: {
  value: T; options: [T, string][]; onPick: (v: T) => void; t: PaddockTheme;
}) {
  const { t } = props;
  return (
    <View style={[st.seg, { borderColor: t.cardBorder }]}>
      {props.options.map(([v, label]) => {
        const on = props.value === v;
        return (
          <Pressable key={v} onPress={() => props.onPick(v)}
            style={[st.segBtn, on && { backgroundColor: t.accent }]}>
            <Text style={[st.segText, { color: on ? t.onAccent : t.textDim }, on && { fontWeight: '700' }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Switch({ on, onToggle, t }: { on: boolean; onToggle: () => void; t: PaddockTheme }) {
  return (
    <Pressable onPress={onToggle}
      style={[st.sw, { backgroundColor: on ? t.accent : t.cardBorder }]}>
      <View style={[st.knob, { left: on ? 22 : 3, backgroundColor: on ? '#fff' : t.textDim }]} />
    </Pressable>
  );
}

function Row(props: { label: string; hint?: string; t: PaddockTheme; children: React.ReactNode }) {
  return (
    <View style={[st.row, { borderBottomColor: props.t.cardBorder }]}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <Text style={{ color: props.t.text, fontSize: 14 }}>{props.label}</Text>
        {props.hint ? (
          <Text style={{ color: props.t.textDim, fontSize: 11.5, marginTop: 2 }}>{props.hint}</Text>
        ) : null}
      </View>
      {props.children}
    </View>
  );
}

/** Debug export (OPEN-ITEMS item 3, Part C — NOT item 5's whole-app
 * export/import, which stays parked): share ONE storage-root JSON via the
 * proven saveGpx.ts rungs. A missing file is an honest "nothing yet", never
 * an empty share. */
async function shareStoreFile(rel: string, outName: string): Promise<void> {
  try {
    const text = await createExpoFsAdapter().readText(rel);
    if (text === null) {
      Alert.alert('Nothing to share yet', `${rel} does not exist on this phone.`);
      return;
    }
    const res = await saveTextFile(outName, 'application/json', text);
    if (res.method === 'saf') Alert.alert('Exported', `${outName} saved to the folder you picked.`);
    else if (res.method === 'share-text') Alert.alert('Shared', `${outName} sent as text via the share sheet.`);
  } catch (e) {
    Alert.alert('Share failed', e instanceof Error ? e.message : String(e));
  }
}

/** e.g. 2026-08-31 -> "20260831", for stamped export names. */
function dateStamp(nowMs: number): string {
  const d = new Date(nowMs);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

export default function SettingsScreen() {
  const { t, mode, toggleMode } = useTheme();
  const { s, set } = useSettings();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text style={[st.h2, { color: t.textDim }]}>APPEARANCE</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Row label="Theme" hint="the race surface follows it" t={t}>
          <Seg t={t} value={mode === 'daylight' ? 'day' : 'night'}
            options={[['night', 'night'], ['day', 'day']]}
            onPick={(v) => { if ((v === 'day') !== (mode === 'daylight')) toggleMode(); }} />
        </Row>
      </View>

      <Text style={[st.h2, { color: t.textDim }]}>ON THE BIKE</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Row label="Red lights" t={t}
          hint="auto-pause is measured; a button is yours to press but makes stopped time self-reported (§18, unsettled)">
          <Seg t={t} value={s.redLight}
            options={[['auto', 'auto'], ['button', 'button'], ['off', 'off']]}
            onPick={(v) => set('redLight', v)} />
        </Row>
        <Row label="Live map" hint="moving dot on the route while riding" t={t}>
          <Switch on={s.liveMap} onToggle={() => set('liveMap', !s.liveMap)} t={t} />
        </Row>
        <Row label="Earcons" hint="one buzz + tier sound at each gate (D-019)" t={t}>
          <Switch on={s.earcons} onToggle={() => set('earcons', !s.earcons)} t={t} />
        </Row>
      </View>

      <Text style={[st.h2, { color: t.textDim }]}>STARTING A RIDE</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Row label="Start place" hint="detect where you are, or pick it yourself (§21)" t={t}>
          <Seg t={t} value={s.startMode}
            options={[['auto', 'detect'], ['pick', 'choose']]}
            onPick={(v) => set('startMode', v)} />
        </Row>
      </View>

      <Text style={[st.h2, { color: t.textDim }]}>SCORING</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {/* Cycle 024 (WP-A3): renamed from "Timing tower" — the tower left the
            Result tab with the RIDES/RESULT redesign; this switch now gates
            the ranking table inside Result's Personal Bests accordion. Still
            a real switch, never decorative (file doctrine, unchanged). */}
        <Row label="Rankings" hint="show where each ride placed against your others on that route" t={t}>
          <Switch on={s.tower} onToggle={() => set('tower', !s.tower)} t={t} />
        </Row>
      </View>

      <Text style={[st.h2, { color: t.textDim }]}>DATA</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Row label="Places & routes" t={t}
          hint="share catalog.user.json — everything the save flow created on this phone">
          <Pressable
            style={[st.shareBtn, { borderColor: t.cardBorder }]}
            onPress={() => void shareStoreFile(USER_CATALOG_FILE, `qualifire-catalog-${dateStamp(Date.now())}.json`)}
          >
            <Text style={[st.shareText, { color: t.text }]}>share</Text>
          </Pressable>
        </Row>
        <Row label="Reference lines" t={t}
          hint="share refs.user.json — the reference lines built from your rides (per-ride GPX+ lives on RIDES)">
          <Pressable
            style={[st.shareBtn, { borderColor: t.cardBorder }]}
            onPress={() => void shareStoreFile(USER_REFS_FILE, `qualifire-refs-${dateStamp(Date.now())}.json`)}
          >
            <Text style={[st.shareText, { color: t.text }]}>share</Text>
          </Pressable>
        </Row>
      </View>

      <Text style={{ color: t.textDim, fontSize: 11.5, marginTop: 12 }}>
        Saved on the phone and restored on launch. A corrupt file falls back to
        these defaults rather than blocking the app.
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  h2: { fontSize: 12, letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: radius.card, paddingHorizontal: 13 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  seg: { flexDirection: 'row', borderWidth: 1, borderRadius: 9, overflow: 'hidden' },
  segBtn: { paddingHorizontal: 9, paddingVertical: 6 },
  segText: { fontSize: 11.5 },
  sw: { width: 44, height: 25, borderRadius: 25, justifyContent: 'center' },
  knob: { position: 'absolute', width: 19, height: 19, borderRadius: 19 },
  shareBtn: { borderWidth: 1, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6 },
  shareText: { fontSize: 11.5, letterSpacing: 1 },
});
