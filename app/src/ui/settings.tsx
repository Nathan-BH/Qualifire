/**
 * App settings — the toggles Nathan asked to have "flexible" (IDEAS §18/§21/§24,
 * mockup 2026-08-16). Persisted to <documentDirectory>settings.json (legacy
 * API, load()/writeAsStringAsync below) — every one of these is a real
 * switch that other screens read, never a decorative row.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { setEarconsEnabled } from '../location';
import { loadSession } from '../location/session';
import { listRides } from '../storage';
import type { RideMeta } from '../storage/types';
import { createExpoFsAdapter, archiveStorageRoot } from '../storage/expoFsAdapter';
import { USER_CATALOG_FILE, currentCatalog, initCatalogStore, userCatalog } from '../store/catalogStore';
import { USER_REFS_FILE, initUserRefs } from '../live/userRefs';
import { initFreeRidePersistence, resetFreeRides } from '../store/freeRides';
import {
  addSport, deleteSport, MAX_SPORT_LABEL, renameSport, setActiveSport, SPORT_LABEL_PLACEHOLDER,
  sportUsage, type SportsFile,
} from '../store/sports';
import { currentSports, initSportStore, saveSports, sportWritesArmed } from '../store/sportStore';
import { initRideHistory, resetRecorded } from './lastRide';
import { saveTextFile } from './saveGpx';
import { DEFAULT_TIMING, setTimingMode, type TimingMode } from '../store/timing';
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
  /** WP-K: paint each sector of the route line in the tier it earned (live
   * map, ride-detail trace, RIDES row) — off keeps the line all yellow. */
  sectorColours: boolean;
  /** Which clock scores a ride (STATE.md ground rule): 'raw' = wall clock,
   * every stop counts (the default — luck counts); 'moving' = raw minus
   * detected stopped time, the opt-in. Read by store/timing.ts's scoredS(). */
  timing: TimingMode;
  /** WP-1 (2026-09-06, Q3): show the sport pill row on RECORD's setup phase
   * when 2+ sports exist. Off = switch sports only in SETTINGS → SPORTS.
   * Meaningless (and not rendered) below 2 sports. Default true. */
  showSportPillOnRecord: boolean;
}

const DEFAULTS: Settings = {
  redLight: 'auto',
  startMode: 'auto',
  tower: true,
  liveMap: true,
  earcons: true,
  sectorColours: true,
  timing: DEFAULT_TIMING,
  showSportPillOnRecord: true,
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

  // Sync, not an effect: RecordScreen/RidesScreen/RideDetailScreen memoise
  // their verdicts on s.timing and recompute in THIS render pass, so the
  // register must already hold the new mode when they do (an effect would
  // lag one render). Idempotent, so StrictMode's double render is harmless.
  setTimingMode(s.timing);

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

/** WP-L: which row's help is showing (keyed by label); one at a time. */
interface Help { open: string | null; toggle: (key: string) => void }

function Row(props: {
  label: string; hint?: string; help: Help; t: PaddockTheme; children: React.ReactNode;
  /** WP-Q: a visual break above this row (top border + extra gap) so it
   * reads as its own group rather than a sibling of the row above — used for
   * DATA's "Reset to virgin" row, one step down from the two share rows. */
  sep?: boolean;
}) {
  const { t } = props;
  const hasHelp = props.hint !== undefined && props.hint !== '';
  const open = hasHelp && props.help.open === props.label;
  return (
    <View style={[
      st.row,
      { borderBottomColor: t.cardBorder },
      props.sep ? { borderTopWidth: 1, borderTopColor: t.cardBorder, marginTop: 4, paddingTop: 14 } : null,
    ]}>
      <View style={{ flex: 1, paddingRight: 10 }}>
        <View style={st.labelRow}>
          <Text style={{ color: t.text, fontSize: 14 }}>{props.label}</Text>
          {hasHelp ? (
            <Pressable
              onPress={() => props.help.toggle(props.label)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`About ${props.label}`}
              style={[st.helpBtn, { borderColor: t.cardBorder }, open && { backgroundColor: t.accent, borderColor: t.accent }]}
            >
              <Text style={[st.helpText, { color: open ? t.onAccent : t.textDim }]}>?</Text>
            </Pressable>
          ) : null}
        </View>
        {open ? (
          <Text style={{ color: t.textDim, fontSize: 11.5, marginTop: 4 }}>{props.hint}</Text>
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

/** WP-Q: e.g. 2026-09-02T22:11:46 -> "20260902-221146" — same shape as
 * storage/core.ts's makeRideId, for the reset archive folder's own name. */
function resetStamp(nowMs: number): string {
  const d = new Date(nowMs);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${dateStamp(nowMs)}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/** WP-Q §3.4 step "on confirm": move the storage root aside (settings.json's
 * theme read first and written back after, so it survives the move), then
 * clear every in-memory store and re-run the boot chain exactly as App.tsx
 * does at launch (§3.4 step 4) — all against the now-empty root, all
 * tolerant of missing files. Wrapped in one try/catch: if the move already
 * happened before a later step throws, the phone is still a consistent
 * "empty root" state (every init tolerates it), so no rollback is needed —
 * the catch text says so rather than claiming the reset failed outright. */
async function performReset(): Promise<void> {
  // Hoisted so the catch block can tell "the move itself never happened, so
  // nothing changed" apart from "the move happened, a later step failed, but
  // the phone is still a consistent empty-root state" — the two failure
  // messages are not interchangeable for a destructive operation.
  let asideName: string | null = null;
  let moved = false;
  try {
    const fs = createExpoFsAdapter();
    const theme = await fs.readText('settings.json');
    asideName = archiveStorageRoot('qualifire', resetStamp(Date.now()));
    moved = true;
    if (theme !== null) await fs.writeText('settings.json', theme);
    resetRecorded();
    resetFreeRides();
    // WP-1: sports.json lives under the same storage root that was just
    // moved aside — re-init it first (same order as App.tsx's boot chain) so
    // the in-memory sport list actually returns to zero, not a stale copy.
    await initSportStore(fs);
    await initCatalogStore(fs);
    await initUserRefs(fs);
    await initRideHistory(fs);
    await initFreeRidePersistence(fs);
    const movedMsg = asideName !== null
      ? `Your old data is in <documents>/${asideName} on the phone.`
      : 'There was nothing on this phone to move — it was already at first launch.';
    Alert.alert(
      'Reset done',
      `This build is back at its first launch. Close Qualifire fully and reopen it to see the launch animation and a clean RECORD tab.\n${movedMsg}`,
    );
  } catch (e) {
    const afterMoveMsg = moved
      ? `Your old data was moved aside${asideName !== null ? ` to <documents>/${asideName}` : ''}, but finishing the reset failed. Restart the app.`
      : 'Nothing was moved — the reset did not start. Your data is untouched.';
    Alert.alert('Reset failed', `${e instanceof Error ? e.message : String(e)}\n${afterMoveMsg}`);
  }
}

/** WP-Q §3.4: two-step confirm, second step destructive-styled, counts shown
 * up front, refused outright while a ride is recording. */
async function onResetPress(): Promise<void> {
  const active = await loadSession();
  if (active) {
    Alert.alert('A ride is being recorded', 'Stop it on the RECORD tab first.');
    return;
  }
  const rides = await listRides();
  const uc = userCatalog();
  const r = rides.length;
  const p = uc.landmarks.length;
  const w = uc.routes.length;
  const q = uc.ways.length;
  Alert.alert(
    'Reset to virgin?',
    `${r} ride${r === 1 ? '' : 's'}, ${p} place${p === 1 ? '' : 's'}, ${w} route${w === 1 ? '' : 's'}, ${q} way${q === 1 ? '' : 's'} and every result will be moved out of the app. Your settings and theme stay. Export anything you want to keep first (RIDES → Export GPX+, or the two share buttons above).`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue…',
        onPress: () => {
          Alert.alert(
            'Really reset?',
            'This cannot be undone from inside the app.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => void performReset() },
            ],
          );
        },
      },
    ],
  );
}

/**
 * WP-1 (2026-09-06): SETTINGS -> SPORTS — the sport switcher (a Seg-style
 * chip row, §3.2's global) plus the management list (add/rename/delete) and
 * the RECORD pill-row toggle (Q3). Q1: nothing is pre-created — the fill-in
 * placeholder IS the suggestion. Subscribes by local state (read
 * currentSports()/listRides() on mount and after every successful save) —
 * the same manual-tick pattern RidesScreen.tsx uses for resultsTick, because
 * this screen is a different module from the store.
 */
function SportsSection({ t, help }: { t: PaddockTheme; help: Help }) {
  const { s, set } = useSettings();
  const [sf, setSf] = useState<SportsFile>(() => currentSports());
  const [rides, setRides] = useState<RideMeta[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [addText, setAddText] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    listRides().then(setRides).catch(() => {});
  }, []);

  function refreshSports(): void {
    setSf(currentSports());
  }

  function usageFor(id: string) {
    return sportUsage(currentCatalog(), rides, id, sf);
  }

  async function handleAdd(): Promise<void> {
    const candidate = addSport(sf, addText.trim(), Date.now());
    if (Array.isArray(candidate)) {
      setAddError(candidate.join('; '));
      return;
    }
    const errs = await saveSports(candidate);
    if (errs.length > 0) {
      setAddError(errs.join('; '));
      return;
    }
    setAddError(null);
    setAddText('');
    refreshSports();
  }

  async function handleRename(id: string): Promise<void> {
    const candidate = renameSport(sf, id, renameText.trim());
    if (Array.isArray(candidate)) {
      setRenameError(candidate.join('; '));
      return;
    }
    const errs = await saveSports(candidate);
    if (errs.length > 0) {
      setRenameError(errs.join('; '));
      return;
    }
    setRenameError(null);
    setExpanded(null);
    refreshSports();
  }

  async function handleDelete(id: string): Promise<void> {
    const candidate = deleteSport(sf, id, usageFor(id));
    if (Array.isArray(candidate)) {
      Alert.alert('Cannot delete', candidate.join('; '));
      return;
    }
    const errs = await saveSports(candidate);
    if (errs.length > 0) {
      Alert.alert('Cannot delete', errs.join('; '));
      return;
    }
    setExpanded(null);
    refreshSports();
  }

  function confirmDelete(id: string, label: string): void {
    Alert.alert(
      `Delete "${label}"?`,
      'This cannot be undone from inside the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void handleDelete(id) },
      ],
    );
  }

  async function handleSwitch(id: string): Promise<void> {
    const candidate = setActiveSport(sf, id);
    if (Array.isArray(candidate)) return;
    await saveSports(candidate);
    refreshSports();
  }

  const inputStyle = [st.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.bg }];

  return (
    <>
      <Text style={[st.h2, { color: t.textDim }]}>SPORTS</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {sf.sports.length > 0 ? (
          <Row label="Active sport" hint="Everything on RECORD, ROUTES and RIDES is scoped to this one." help={help} t={t}>
            <Seg
              t={t}
              value={sf.activeSportId ?? sf.sports[0].id}
              options={sf.sports.map((sp): [string, string] => [sp.id, sp.label])}
              onPick={(id) => void handleSwitch(id)}
            />
          </Row>
        ) : (
          <Text style={{ color: t.textDim, fontSize: 12.5, paddingVertical: 8 }}>
            Add at least one sport to record. Name it what you like.
          </Text>
        )}

        {sf.sports.map((sp) => {
          const usage = usageFor(sp.id);
          const isActive = sp.id === sf.activeSportId;
          const canDelete = !isActive && usage.routes === 0 && usage.rides === 0;
          const isExpanded = expanded === sp.id;
          return (
            <View key={sp.id} style={[st.sportRow, { borderBottomColor: t.cardBorder }]}>
              <Pressable
                onPress={() => {
                  if (isExpanded) {
                    setExpanded(null);
                  } else {
                    setExpanded(sp.id);
                    setRenameText(sp.label);
                    setRenameError(null);
                  }
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: t.text, fontSize: 14 }}>{sp.label}</Text>
                  <Text style={{ color: t.textDim, fontSize: 11.5 }}>
                    {usage.routes} route{usage.routes === 1 ? '' : 's'} · {usage.rides} ride{usage.rides === 1 ? '' : 's'}
                  </Text>
                </View>
              </Pressable>
              {isExpanded ? (
                <View style={{ marginTop: 8, gap: 8 }}>
                  <TextInput
                    style={inputStyle}
                    value={renameText}
                    onChangeText={setRenameText}
                    placeholder={SPORT_LABEL_PLACEHOLDER}
                    placeholderTextColor={t.textDim}
                    maxLength={MAX_SPORT_LABEL}
                  />
                  {renameError ? <Text style={{ color: t.textDim, fontSize: 11 }}>{renameError}</Text> : null}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={[st.shareBtn, { borderColor: t.cardBorder }]} onPress={() => void handleRename(sp.id)}>
                      <Text style={[st.shareText, { color: t.text }]}>rename</Text>
                    </Pressable>
                    <Pressable
                      disabled={!canDelete}
                      style={[st.shareBtn, { borderColor: t.cardBorder }, !canDelete && { opacity: 0.4 }]}
                      onPress={() => { if (canDelete) confirmDelete(sp.id, sp.label); }}
                    >
                      <Text style={[st.shareText, { color: t.textDim }]}>delete</Text>
                    </Pressable>
                  </View>
                  {!canDelete ? (
                    <Text style={{ color: t.textDim, fontSize: 11 }}>
                      {isActive
                        ? 'switch to another sport first'
                        : `${usage.routes} route${usage.routes === 1 ? '' : 's'} · ${usage.rides} ride${usage.rides === 1 ? '' : 's'} — delete those first`}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })}

        <View style={{ marginTop: sf.sports.length > 0 ? 10 : 0, gap: 8 }}>
          <TextInput
            style={inputStyle}
            value={addText}
            onChangeText={setAddText}
            placeholder={SPORT_LABEL_PLACEHOLDER}
            placeholderTextColor={t.textDim}
            maxLength={MAX_SPORT_LABEL}
          />
          {addError ? <Text style={{ color: t.textDim, fontSize: 11 }}>{addError}</Text> : null}
          <Pressable style={[st.shareBtn, { alignSelf: 'flex-start', borderColor: t.cardBorder }]} onPress={() => void handleAdd()}>
            <Text style={[st.shareText, { color: t.text }]}>add sport</Text>
          </Pressable>
        </View>

        {!sportWritesArmed() ? (
          <Text style={{ color: t.textDim, fontSize: 11, marginTop: 10 }}>
            sports.json could not be read at boot — saving is disabled this session. Reset to virgin or fix the file (debug export) to recover.
          </Text>
        ) : null}

        {sf.sports.length >= 2 ? (
          <Row
            label="Sport picker on RECORD"
            hint="Show the sport row on RECORD. Off: switch sports here instead."
            help={help} t={t} sep
          >
            <Switch on={s.showSportPillOnRecord} onToggle={() => set('showSportPillOnRecord', !s.showSportPillOnRecord)} t={t} />
          </Row>
        ) : null}
      </View>
    </>
  );
}

export default function SettingsScreen() {
  const { t, mode, toggleMode } = useTheme();
  const { s, set } = useSettings();
  const [helpOpen, setHelpOpen] = useState<string | null>(null);
  const help: Help = {
    open: helpOpen,
    toggle: (k) => setHelpOpen((cur) => (cur === k ? null : k)),
  };
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={[st.h2, { color: t.textDim }]}>APPEARANCE</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Row label="Theme" hint="The map and race surface follow it." help={help} t={t}>
          <Seg t={t} value={mode === 'daylight' ? 'day' : 'night'}
            options={[['night', 'night'], ['day', 'day']]}
            onPick={(v) => { if ((v === 'day') !== (mode === 'daylight')) toggleMode(); }} />
        </Row>
      </View>

      <Text style={[st.h2, { color: t.textDim }]}>ON THE BIKE</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Row label="Red lights" t={t} help={help}
          hint="auto: a stop at a light is detected and the clock pauses by itself. button: you press to pause, so stopped time is self-reported. off: the clock never pauses.">
          <Seg t={t} value={s.redLight}
            options={[['auto', 'auto'], ['button', 'button'], ['off', 'off']]}
            onPick={(v) => set('redLight', v)} />
        </Row>
        <Row label="Live map" hint="Show the moving dot on the route while riding." help={help} t={t}>
          <Switch on={s.liveMap} onToggle={() => set('liveMap', !s.liveMap)} t={t} />
        </Row>
        <Row label="Sector colours" t={t} help={help}
          hint="Paint each stretch of the route line in the tier its sector earned — on the live map, in the ride view and on the RIDES list. Purple beats your best, green beats your recent average, yellow is an ordinary lap. Off keeps the whole line yellow.">
          <Switch on={s.sectorColours} onToggle={() => set('sectorColours', !s.sectorColours)} t={t} />
        </Row>
        <Row label="Earcons" hint="A short buzz at each gate crossing." help={help} t={t}>
          <Switch on={s.earcons} onToggle={() => set('earcons', !s.earcons)} t={t} />
        </Row>
      </View>

      <Text style={[st.h2, { color: t.textDim }]}>STARTING A RIDE</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Row label="Start place" hint="Detect where you are when a ride starts, or choose the place yourself." help={help} t={t}>
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
        <Row label="Timing" t={t} help={help}
          hint="wall clock is the lap as the road gave it — every stop counts, a red light is your luck; moving drops the time you stood still">
          <Seg t={t} value={s.timing}
            options={[['raw', 'wall clock'], ['moving', 'moving']]}
            onPick={(v) => set('timing', v)} />
        </Row>
        <Row label="Rankings" hint="Show where each ride placed against your others on that way. — in the ride detail and on RESULTS." help={help} t={t}>
          <Switch on={s.tower} onToggle={() => set('tower', !s.tower)} t={t} />
        </Row>
      </View>

      <SportsSection t={t} help={help} />

      <Text style={[st.h2, { color: t.textDim }]}>DATA</Text>
      <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
        <Row label="Places & routes" t={t} help={help}
          hint="Share catalog.user.json — every place, way and route created on this phone.">
          <Pressable
            style={[st.shareBtn, { borderColor: t.cardBorder }]}
            onPress={() => void shareStoreFile(USER_CATALOG_FILE, `qualifire-catalog-${dateStamp(Date.now())}.json`)}
          >
            <Text style={[st.shareText, { color: t.text }]}>share</Text>
          </Pressable>
        </Row>
        <Row label="Reference lines" t={t} help={help}
          hint="Share refs.user.json — the reference lines built from your rides. Per-ride GPX+ export lives on RIDES.">
          <Pressable
            style={[st.shareBtn, { borderColor: t.cardBorder }]}
            onPress={() => void shareStoreFile(USER_REFS_FILE, `qualifire-refs-${dateStamp(Date.now())}.json`)}
          >
            <Text style={[st.shareText, { color: t.text }]}>share</Text>
          </Pressable>
        </Row>
        {/* WP-Q Part B: visually separated from the two share rows above (a
            top border) so it never reads as a sibling "share" action. Text is
            dim, never the accent — this repo's own D-013 rule is "no red
            anywhere" (theme.ts), so "dim" (not a nonexistent "danger" token)
            is the honest reading of the brief's "danger/dim colour"; the
            destructive style lives entirely in the two-step Alert.alert
            confirm, same as RidesScreen's own delete button. */}
        <Row label="Reset to virgin" t={t} sep help={help}
          hint="Moves every ride, result, place, way and route aside and starts this build over from its first launch. Settings and theme are kept.">
          <Pressable
            style={[st.shareBtn, { borderColor: t.cardBorder }]}
            onPress={() => void onResetPress()}
          >
            <Text style={[st.shareText, { color: t.textDim }]}>reset…</Text>
          </Pressable>
        </Row>
      </View>

    </ScrollView>
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
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  helpBtn: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  helpText: { fontSize: 11, fontWeight: '700', lineHeight: 13 },
  // WP-1: SPORTS section — one management row per sport, plus the add row.
  sportRow: { paddingVertical: 10, borderBottomWidth: 1 },
  input: { borderWidth: 1, borderRadius: radius.btn, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
});
