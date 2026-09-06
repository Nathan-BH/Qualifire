/**
 * Full-screen gate editor (WP-J extended scope, 2026-09-05). Nathan:
 * "since WP-J redesigns the gate adjusting feature, also apply it to the
 * current gates editing via the ROUTES tab. Upon pressing edit, open in a
 * new tab with a proper openmap render so I can adjust the gates more
 * precisely."
 *
 * Third instance of the "screen owns intent, Shell owns chrome" split
 * (App.tsx's `recFullscreen`/`rideDetail` came first) — Shell mount-swaps
 * this in over whatever tab is active and hides the tab bar, exactly like
 * RideDetailScreen. Owns the save exactly as RideDetailScreen owns
 * onPromote: `confirmEditGates`/`onEditGates` below are moved from
 * RoutesScreen.tsx (WP-I) unchanged in substance — only the destination of
 * "done" changes (`tabNav.closeGateAdjust()` in place of `setEditing(null);
 * bump()`, since RoutesScreen re-reads the catalog on its own remount).
 *
 * [UNTESTED ON DEVICE]
 */
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useTabNav, type GateAdjustRequest } from './tabNav.tsx';
import { useTheme } from './themeContext.tsx';
import { GateAdjustCard } from './gateAdjustCard.tsx';
import { currentCatalog } from '../store/catalogStore.ts';
import { wayLabelIn } from '../store/defaultWay.ts';
import { getStoredResult, storedResultsForWay } from '../store/resultsStore.ts';
import { clearLastRide, dropRecorded, getLastRide, replaceRecorded } from './lastRide.ts';
import { editWayGates, gateEditDraftFor } from '../store/routeFromRide.ts';
import { createExpoFsAdapter } from '../storage/expoFsAdapter.ts';

export default function GateAdjustScreen({ request }: { request: GateAdjustRequest }) {
  const { t } = useTheme();
  const tabNav = useTabNav();
  const { height: winH } = useWindowDimensions();
  const [busy, setBusy] = useState(false);

  // Pure read, resolved once per request — the card copies it into its own
  // state on mount, so re-resolving on every render would be pointless.
  const draft = useMemo(() => gateEditDraftFor(request.wayId), [request.wayId]);
  // The full "Home → Work · Dry" name — there is no way header for context on
  // this screen, so NOT routeVariantLabel, which would print just "plain"/"Dry".
  const label = wayLabelIn(currentCatalog(), request.wayId);
  // Half the window, floor = the inline default (280) — on a ~780-dp phone
  // that is ~390 px vs 280 inline; the ScrollView keeps the chips/pad/
  // buttons reachable on any phone. A non-scrolling `fill` layout was
  // considered and rejected: on a short phone it would push the pad
  // off-screen with no recovery; RideDetail's ScrollView-hosted 300-px map
  // is the proven precedent.
  const mapHeight = Math.max(280, Math.round(winH * 0.5));

  // WP-I's confirmEditGates/onEditGates, moved verbatim from RoutesScreen.tsx
  // (136-176) with routeId now closed over from `request` and the "done"
  // exit changed to tabNav.closeGateAdjust() — RoutesScreen no longer keeps
  // any editing state to clear or bump().
  function confirmEditGates(chainageM: number[]) {
    const n = storedResultsForWay(request.wayId).length;
    const ghosts = n === 0
      ? 'There are no past results on this way yet.'
      : `Its ${n} past result${n === 1 ? ' is' : 's are'} discarded and re-timed from the recordings against the new gates — old times and ranks do not survive.`;
    Alert.alert(
      `Move the gates of "${wayLabelIn(currentCatalog(), request.wayId)}"?`,
      `This way's history will be reset and past ghosts will be lost.\n\n${ghosts} The reference line and ride recordings are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save & reset', style: 'destructive', onPress: () => void onEditGates(chainageM) },
      ],
    );
  }

  async function onEditGates(chainageM: number[]) {
    setBusy(true);
    try {
      const out = await editWayGates(request.wayId, chainageM, createExpoFsAdapter());
      if (!out.ok) {
        Alert.alert('Could not save the gates', out.errors.join('\n'));
        return;
      }
      if (out.moved) {
        for (const id of out.clearedRideIds) dropRecorded(id);
        if (getLastRide()?.wayId === request.wayId) clearLastRide();
        for (const id of out.clearedRideIds) {
          const r = getStoredResult(id);
          if (r) replaceRecorded(r);
        }
      }
      tabNav.closeGateAdjust();
    } catch (e) {
      Alert.alert('Could not save the gates', e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <View style={st.topBar}>
        <Pressable onPress={() => tabNav.closeGateAdjust()} hitSlop={8}>
          <Text style={[st.backText, { color: t.textDim }]}>‹ BACK</Text>
        </Pressable>
        <Text style={[st.topTitle, { color: t.text }]}>EDIT GATES</Text>
        <View style={{ width: 56 }} />{/* balances ‹ BACK so the title centres, as RideDetail's date does */}
      </View>
      {draft === null ? (
        <Text style={{ color: t.textDim, fontSize: 13 }}>
          This way's gates cannot be edited — it has no reference line or gate set on file.
        </Text>
      ) : (
        <GateAdjustCard
          key={request.wayId}
          wayId={request.wayId}
          refLine={draft.ref}
          refLengthM={draft.refLengthM}
          initialChainageM={draft.chainageM}
          busy={busy}
          mapHeight={mapHeight}
          title={`Sector gates — ${label}`}
          subtitle="Tap a gate on the map or below to nudge it — start and finish too. Saving moved gates resets this way's history: past results are re-timed from their recordings against the new gates, old times and ranks do not survive."
          discardLabel="discard nudges — keep the current gates"
          onKeep={() => tabNav.closeGateAdjust()}
          onSave={(ch) => confirmEditGates(ch)}
        />
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  backText: { fontSize: 14, fontWeight: '700' },
  topTitle: { fontSize: 15, fontWeight: '800', letterSpacing: 2 },
});
