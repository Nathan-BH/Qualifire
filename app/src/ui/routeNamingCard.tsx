/**
 * STOP-step naming card (OPEN-ITEMS item 2; COLD-START §3 step 5 — "the only
 * true onboarding step... this is where landmarks are born on a cold start").
 * [UNTESTED ON DEVICE]
 *
 * Shown by RecordScreen's 'ending' phase whenever store/wayCreation.ts
 * drafted new endpoint(s) — since WP-F that includes a ride the live engine
 * DID score against some route, as long as its endpoint pair still has no
 * way of its own (matchedRouteLabel then swaps in the "scored as X, but…"
 * sub-copy so the card never contradicts what Result shows). Since WP-G an
 * existing directed way is ALSO offered here, in variant mode
 * (`existingWay` set): the card becomes "new route on this way" instead of
 * "new way", the endpoints render as fixed text (both already exist), and
 * ≥1 spec segment is required. Dumb UI: it owns only the two text inputs
 * and the spec segments; RecordScreen owns the draft, the build and the
 * saveUserCatalog() call. virgin-cycle18 brief 04 (Nathan
 * 2026-09-29): there is no "skip — keep it as a plain ride" any more — every
 * ride has a home. The second action is SAVE AS FREE RIDE (`onSaveFree`, the
 * caller writes the label) in both no-match variants; only the matched-way
 * variant keeps a plain `keep it as <way>` exit (`onSkip`), because that
 * ride is already timed under that way.
 * virgin-cycle18 brief 05 (Nathan 2026-09-29): a new-place input proposes
 * matching EXISTING places while you type (PlacePicker) — one tap points
 * that endpoint at the place instead of naming a twin — and a typed name
 * that already names a place is refused. onSave hands back the choices;
 * the caller applies them (applyEndpointChoices) before building.
 * virgin-cycle18 brief 06 (Nathan 2026-09-29): an endpoint that matched an
 * existing place is a PROPOSAL — it renders pre-filled with a `change` link
 * that opens the same picker (every place, the START pick marked). Explicit
 * wins and sticks for this card, as effectiveFromId does for the detected
 * start. The pick is never preselected: the ride went where it went.
 *
 * virgin-cycle15 brief 05 (Nathan 2026-09-26): when the ride was scored as
 * an existing way of an existing route (`existingRoute && matchedWayLabel`)
 * this card is no longer shown by default — RecordScreen shows a one-line
 * `not <way>?` link and only opens the card on tap. In that case the
 * explanatory body sentence is dropped: the rider already said it was
 * different.
 * virgin-cycle17 brief 03 (Nathan 2026-09-29): that variant's skip line reads
 * `keep it as <way>` — it was `no — it was <way>`, which he called out. Same
 * button, same onSkip: nothing is written on skip either way.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { cleanSpecs, sameSpecs, type EndpointChoice, type EndpointChoices, type RouteNames } from '../store/routeCreation';
import { specSuggestions } from '../store/waySpecs';
import { radius } from './theme';
import { useTheme } from './themeContext';
import {
  effectiveEndpointId, endpointOptions, matchingPlaces, newPlaceNameError, type PlaceOption,
} from '../store/placeSearch';
import { PlacePicker } from './placePicker';

export interface RouteNamingCardProps {
  /** label of the matched existing start landmark, or null => name input */
  startExistingLabel: string | null;
  /** label of the matched existing end landmark, or null => name input */
  endExistingLabel: string | null;
  /** start === end: one place, one input */
  loop: boolean;
  busy: boolean;
  /** WP-F: set when the live engine scored this ride against a route — the
   * card's sub-copy then says so explicitly, since Result will show it as
   * scored even though these endpoints have no way of their own yet. Absent
   * or null renders the original ("does not match any way") copy. */
  matchedWayLabel?: string | null;
  /** WP-G: set when draft.existingWayId is set — the card is then "new route
   * on this way" (title/copy/button change, ≥1 spec required, endpoints shown
   * as fixed text). `knownSpecLists` = specs of the routes already on it. */
  existingRoute?: { label: string; knownSpecLists: string[][] } | null;
  /** WP-G: catalog-wide spec vocabulary for the chips (specVocabulary()). */
  vocabulary?: string[];
  /** virgin-cycle18 brief 05: every place, most-used first (placeOptions).
   * A new-place input proposes matches from it while typing; a typed name
   * that equals one of them is refused. Absent/[] = no proposals (DEMO). */
  places?: readonly PlaceOption[];
  /** brief 05: the route (if any) between the EFFECTIVE pair once a choice
   * is not 'proposed' — the card flips into the "new way on …" variant on a
   * hit, exactly as if draftRouteCreation had resolved that pair. Absent =
   * never a variant after a choice (DEMO). */
  routeForPair?: (choices: EndpointChoices) => { label: string; knownSpecLists: string[][] } | null;
  /** virgin-cycle18 brief 06: the landmark ids the proposals stand for (null
   * = a new place). With `places`, an existing endpoint gets a `change` link
   * that opens the picker; without them (DEMO) it stays fixed text. */
  startProposedId?: string | null;
  endProposedId?: string | null;
  /** brief 06: the place picked on RECORD at START for each end (null = none
   * / 'new' / not known — the ride detail). Listed first and marked in the
   * picker when it differs from the proposal; never preselected (decision 2). */
  startPickedId?: string | null;
  endPickedId?: string | null;
  /** brief 05: `choices` says which endpoint the rider pointed at an existing
   * place instead of naming a new one (or instead of the proposal — brief 06).
   * The caller applies them with applyEndpointChoices before building. */
  onSave: (names: RouteNames, choices: EndpointChoices) => void;
  onSkip: () => void;
  /** virgin-cycle18 brief 04: SAVE AS FREE RIDE — shown instead of the old
   * plain-ride skip whenever this ride is not already timed under a way
   * (new-route card, and the "new way on <route>" card with no matched way).
   * The caller files the free-ride record (store/freeRides.ts markRideFree). */
  onSaveFree: () => void;
}

export function RouteNamingCard(props: RouteNamingCardProps) {
  const { t } = useTheme();
  const [startName, setStartName] = useState('');
  const [endName, setEndName] = useState('');
  // brief 05: an endpoint the rider pointed at an existing place (typeahead
  // tap). 'proposed' = as drafted (new place named below, or the matched one).
  const [startChoice, setStartChoice] = useState<EndpointChoice>({ kind: 'proposed' });
  const [endChoice, setEndChoice] = useState<EndpointChoice>({ kind: 'proposed' });
  const places = props.places ?? [];
  const placeLabel = (id: string) => places.find((p) => p.id === id)?.label ?? id;
  // brief 06: which endpoint's "change" picker is open (one at a time).
  const [pickerOpen, setPickerOpen] = useState<'start' | 'end' | null>(null);
  const startProposedId = props.startProposedId ?? null;
  const endProposedId = props.endProposedId ?? null;
  const effStartId = effectiveEndpointId(startProposedId, startChoice);
  const effEndId = effectiveEndpointId(endProposedId, endChoice);
  // brief 06: the picker's options — every place, the START pick first when
  // it is one. Same list for both ends; the proposal is the selected pill.
  const startOptions = startProposedId !== null ? endpointOptions(places, props.startPickedId ?? null) : [];
  const endOptions = endProposedId !== null ? endpointOptions(places, props.endPickedId ?? null) : [];
  // WP-G: committed spec segments + the open input.
  const [specs, setSpecs] = useState<string[]>([]);
  const [specDraft, setSpecDraft] = useState('');
  // An input is shown for a 'new' endpoint the rider has not pointed elsewhere.
  const bothProposed = startChoice.kind === 'proposed' && endChoice.kind === 'proposed';
  // brief 06 (decision 4): a loop drafted on a NEW place stays a loop (the end
  // follows the start's choice — applyEndpointChoices); otherwise the pair
  // is a loop iff both ends now stand for the same place.
  const loop = bothProposed
    ? props.loop
    : props.loop && startProposedId === null
      ? true
      : effStartId !== null && effStartId === effEndId;
  const needStart = props.startExistingLabel === null && startChoice.kind === 'proposed';
  const needEnd = props.endExistingLabel === null && !loop && endChoice.kind === 'proposed';
  // 06b (Inspect finding 6): ENDED AT stays visible when a CHOICE made the
  // pair a loop, so its `change` link can undo it. Hidden only for a drafted
  // loop nobody touched, or a loop on a NEW place (the end follows the
  // start — nothing to change).
  const hideEnd = props.loop && (bothProposed || startProposedId === null);
  const startLabel = startChoice.kind === 'existing' ? placeLabel(startChoice.landmarkId) : props.startExistingLabel;
  const endLabel = endChoice.kind === 'existing' ? placeLabel(endChoice.landmarkId) : props.endExistingLabel;
  // brief 05 (decision 1/3): proposals while typing, and a taken name is refused.
  const startMatches = needStart ? matchingPlaces(places, startName) : [];
  const endMatches = needEnd ? matchingPlaces(places, endName) : [];
  const placeLabels = places.map((p) => p.label);
  const startNameErr = needStart ? newPlaceNameError(placeLabels, startName, needEnd ? endName : null) : null;
  const endNameErr = needEnd ? newPlaceNameError(placeLabels, endName, needStart ? startName : null) : null;
  const nameComplete =
    (!needStart || startName.trim().length > 0) && (!needEnd || endName.trim().length > 0) &&
    startNameErr === null && endNameErr === null;
  const choices: EndpointChoices = { start: startChoice, end: endChoice };

  // brief 05 (decision 4): the variant question is asked of the EFFECTIVE
  // pair. Both 'proposed' = what the parent drafted; any choice = ask the parent.
  const existingRoute =
    startChoice.kind === 'proposed' && endChoice.kind === 'proposed'
      ? props.existingRoute ?? null
      : props.routeForPair?.(choices) ?? null;
  const effectiveSpecs = cleanSpecs([...specs, specDraft]);
  const dupList = existingRoute
    ? existingRoute.knownSpecLists.find((l) => sameSpecs(l, effectiveSpecs)) ?? null
    : null;
  // Only a TYPED list can be a duplicate: on open effectiveSpecs is [] and would
  // match the way's plain route, showing the "already exists" hint before
  // anything is typed (Inspect, WP-G). The ≥1-spec rule already disables the button.
  const duplicate = dupList !== null && effectiveSpecs.length > 0;
  const complete = nameComplete && (!existingRoute || effectiveSpecs.length > 0) && !duplicate;

  const commitSpec = () => {
    const s = specDraft.trim();
    if (s.length === 0) return;
    setSpecs((prev) => [...prev, s]);
    setSpecDraft('');
  };
  const removeSpecFrom = (index: number) => {
    setSpecs((prev) => prev.slice(0, index));
  };

  const suggestions = specSuggestions(existingRoute?.knownSpecLists ?? [], props.vocabulary ?? [], cleanSpecs(specs));

  const inputStyle = [st.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.bg }];
  return (
    <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      <Text style={[st.title, { color: t.text }]}>
        {existingRoute ? `New way on ${existingRoute.label}` : 'New route — name where you rode'}
      </Text>
      {!(existingRoute && props.matchedWayLabel) && (
        <Text style={[st.sub, { color: t.textDim }]}>
          {existingRoute
            ? `${existingRoute.label} is a route you have, but this ride did not follow any of its ways. Name what made it different to save it as a new way — this ride becomes its reference.`
            : loop
              ? startLabel !== null
                ? `This ride looped from and back to ${startLabel}.`
                : 'This ride looped from and back to one new place.'
              : props.matchedWayLabel
                ? `Scored as ${props.matchedWayLabel}, but no route of yours runs between these two places. Name them to make this a way of its own — this ride becomes its reference.`
                : 'This ride does not match any route you have. Name its start and end to make it a real way — this ride becomes its reference.'}
        </Text>
      )}

      <Text style={[st.label, { color: t.textDim }]}>STARTED AT</Text>
      {needStart ? (
        <>
          <TextInput
            style={inputStyle}
            value={startName}
            onChangeText={setStartName}
            placeholder="e.g. Home"
            placeholderTextColor={t.textDim}
            editable={!props.busy}
            maxLength={40}
          />
          {/* brief 05: existing places that match what is typed — one tap uses one */}
          <PlacePicker
            options={startMatches}
            selectedId={null}
            busy={props.busy}
            onPick={(id) => { setStartChoice({ kind: 'existing', landmarkId: id }); setStartName(''); }}
          />
          {startNameErr !== null && <Text style={[st.hint, { color: t.textDim }]}>{startNameErr}</Text>}
        </>
      ) : (
        <>
          <View style={st.fixedRow}>
            <Text style={[st.fixed, { color: t.text }]}>{startLabel}</Text>
            {startProposedId === null ? (
              // brief 05: a typeahead pick on a NEW endpoint — back to typing
              startChoice.kind === 'existing' && (
                <Pressable disabled={props.busy} onPress={() => setStartChoice({ kind: 'proposed' })} hitSlop={8}>
                  <Text style={[st.changeLink, { color: t.textDim }]}>change</Text>
                </Pressable>
              )
            ) : startOptions.length > 1 ? (
              // brief 06 (decision 1): a proposal, not a verdict — open the picker
              <Pressable disabled={props.busy} onPress={() => setPickerOpen((v) => (v === 'start' ? null : 'start'))} hitSlop={8}>
                <Text style={[st.changeLink, { color: t.textDim }]}>{pickerOpen === 'start' ? 'close' : 'change'}</Text>
              </Pressable>
            ) : null}
          </View>
          {pickerOpen === 'start' && startProposedId !== null && (
            <PlacePicker
              options={startOptions}
              selectedId={effStartId}
              busy={props.busy}
              markedId={props.startPickedId ?? null}
              markedSuffix=" · picked at START"
              onPick={(id) => {
                setStartChoice(id === startProposedId ? { kind: 'proposed' } : { kind: 'existing', landmarkId: id });
                setPickerOpen(null);
              }}
            />
          )}
        </>
      )}

      {!hideEnd && (
        <>
          <Text style={[st.label, { color: t.textDim }]}>ENDED AT</Text>
          {needEnd ? (
            <>
              <TextInput
                style={inputStyle}
                value={endName}
                onChangeText={setEndName}
                placeholder="e.g. Work"
                placeholderTextColor={t.textDim}
                editable={!props.busy}
                maxLength={40}
              />
              <PlacePicker
                options={endMatches}
                selectedId={null}
                busy={props.busy}
                onPick={(id) => { setEndChoice({ kind: 'existing', landmarkId: id }); setEndName(''); }}
              />
              {endNameErr !== null && <Text style={[st.hint, { color: t.textDim }]}>{endNameErr}</Text>}
            </>
          ) : (
            <>
              <View style={st.fixedRow}>
                <Text style={[st.fixed, { color: t.text }]}>{endLabel}</Text>
                {endProposedId === null ? (
                  endChoice.kind === 'existing' && (
                    <Pressable disabled={props.busy} onPress={() => setEndChoice({ kind: 'proposed' })} hitSlop={8}>
                      <Text style={[st.changeLink, { color: t.textDim }]}>change</Text>
                    </Pressable>
                  )
                ) : endOptions.length > 1 ? (
                  <Pressable disabled={props.busy} onPress={() => setPickerOpen((v) => (v === 'end' ? null : 'end'))} hitSlop={8}>
                    <Text style={[st.changeLink, { color: t.textDim }]}>{pickerOpen === 'end' ? 'close' : 'change'}</Text>
                  </Pressable>
                ) : null}
              </View>
              {pickerOpen === 'end' && endProposedId !== null && (
                <PlacePicker
                  options={endOptions}
                  selectedId={effEndId}
                  busy={props.busy}
                  markedId={props.endPickedId ?? null}
                  markedSuffix=" · picked at START"
                  onPick={(id) => {
                    setEndChoice(id === endProposedId ? { kind: 'proposed' } : { kind: 'existing', landmarkId: id });
                    setPickerOpen(null);
                  }}
                />
              )}
            </>
          )}
        </>
      )}

      <Text style={[st.label, { color: t.textDim }]}>
        {existingRoute ? 'SPECIFICATIONS (required) — e.g. Dry, Left' : 'SPECIFICATIONS (optional) — e.g. Dry, Left'}
      </Text>
      {specs.length > 0 && (
        <View style={st.pillRow}>
          {specs.map((s, i) => (
            <Pressable
              key={`${s}:${i}`}
              style={[st.specPill, { borderColor: t.cardBorder }]}
              disabled={props.busy}
              onPress={() => removeSpecFrom(i)}
            >
              <Text style={[st.specPillText, { color: t.text }]}>{s} ×</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={st.specInputRow}>
        <TextInput
          style={[inputStyle, { flex: 1 }]}
          value={specDraft}
          onChangeText={setSpecDraft}
          onSubmitEditing={commitSpec}
          placeholder="e.g. Dry, Left, Fast"
          placeholderTextColor={t.textDim}
          editable={!props.busy}
          maxLength={24}
        />
        <Pressable
          style={[st.specAddBtn, { borderColor: t.cardBorder }, (props.busy || specDraft.trim().length === 0) && st.dim]}
          disabled={props.busy || specDraft.trim().length === 0}
          onPress={commitSpec}
        >
          <Text style={[st.specAddText, { color: t.text }]}>+</Text>
        </Pressable>
      </View>
      {suggestions.length > 0 && (
        <View style={st.pillRow}>
          {suggestions.map((s) => (
            <Pressable
              key={s}
              style={[st.specPill, { borderColor: t.cardBorder }]}
              disabled={props.busy}
              onPress={() => setSpecs((prev) => [...prev, s])}
            >
              <Text style={[st.specPillText, { color: t.textDim }]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {duplicate && dupList && (
        <Text style={[st.hint, { color: t.textDim }]}>
          already exists as {existingRoute!.label}
          {dupList.length ? ` · ${dupList.join(' · ')}` : ''} — pick it on RECORD next time, or add another
          specification
        </Text>
      )}

      <Pressable
        style={[st.saveBtn, { backgroundColor: t.accent }, (!complete || props.busy) && st.dim]}
        disabled={!complete || props.busy}
        onPress={() => props.onSave({ start: startName, end: endName, specs: effectiveSpecs }, choices)}
      >
        <Text style={[st.saveText, { color: t.onAccent }]}>{existingRoute ? 'ADD WAY' : 'CREATE ROUTE'}</Text>
      </Pressable>
      {existingRoute && props.matchedWayLabel ? (
        // cycle17 03: the ride is already timed as this way — keeping it costs nothing.
        <Pressable style={st.skipBtn} disabled={props.busy} onPress={props.onSkip}>
          <Text style={[st.skipText, { color: t.textDim }]}>{`keep it as ${props.matchedWayLabel}`}</Text>
        </Pressable>
      ) : (
        // virgin-cycle18 brief 04: the other real choice. No plain-ride skip.
        <Pressable
          style={[st.freeBtn, { borderColor: t.cardBorder }, props.busy && st.dim]}
          disabled={props.busy}
          onPress={props.onSaveFree}
        >
          <Text style={[st.freeText, { color: t.text }]}>SAVE AS FREE RIDE</Text>
        </Pressable>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: 16, gap: 6 },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 12.5, marginBottom: 6 },
  label: { fontSize: 11, letterSpacing: 2, marginTop: 6 },
  fixed: { fontSize: 15, paddingVertical: 6 },
  fixedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  changeLink: { fontSize: 12.5, textDecorationLine: 'underline', paddingVertical: 6 },
  input: { borderWidth: 1, borderRadius: radius.btn, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  specPill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  specPillText: { fontSize: 12.5 },
  specInputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  specAddBtn: {
    borderWidth: 1, borderRadius: radius.btn, paddingHorizontal: 14, paddingVertical: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  specAddText: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 11.5, marginTop: 6 },
  saveBtn: { marginTop: 14, borderRadius: radius.btn, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  freeBtn: { marginTop: 8, borderWidth: 1, borderRadius: radius.btn, paddingVertical: 12, alignItems: 'center' },
  freeText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  skipBtn: { paddingVertical: 10, alignItems: 'center' },
  skipText: { fontSize: 13 },
  dim: { opacity: 0.45 },
});
