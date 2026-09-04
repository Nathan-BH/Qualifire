/**
 * STOP-step naming card (OPEN-ITEMS item 2; COLD-START Â§3 step 5 â "the only
 * true onboarding step... this is where landmarks are born on a cold start").
 * [UNTESTED ON DEVICE]
 *
 * Shown by RecordScreen's 'ending' phase whenever store/wayCreation.ts
 * drafted new endpoint(s) â since WP-F that includes a ride the live engine
 * DID score against some route, as long as its endpoint pair still has no
 * way of its own (matchedRouteLabel then swaps in the "scored as X, butâ¦"
 * sub-copy so the card never contradicts what Result shows). Since WP-G an
 * existing directed way is ALSO offered here, in variant mode
 * (`existingWay` set): the card becomes "new route on this way" instead of
 * "new way", the endpoints render as fixed text (both already exist), and
 * â¥1 spec segment is required. Dumb UI: it owns only the two text inputs
 * and the spec segments; RecordScreen owns the draft, the build and the
 * saveUserCatalog() call. An endpoint that matched an EXISTING landmark
 * renders as fixed text, not an input. SKIP is always available and loses
 * nothing â the ride itself was already saved before this card exists.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { cleanSpecs, sameSpecs, type WayNames } from '../store/wayCreation';
import { specSuggestions } from '../store/routeSpecs';
import { radius } from './theme';
import { useTheme } from './themeContext';

export interface WayNamingCardProps {
  /** label of the matched existing start landmark, or null => name input */
  startExistingLabel: string | null;
  /** label of the matched existing end landmark, or null => name input */
  endExistingLabel: string | null;
  /** start === end: one place, one input */
  loop: boolean;
  busy: boolean;
  /** WP-F: set when the live engine scored this ride against a route â the
   * card's sub-copy then says so explicitly, since Result will show it as
   * scored even though these endpoints have no way of their own yet. Absent
   * or null renders the original ("does not match any way") copy. */
  matchedRouteLabel?: string | null;
  /** WP-G: set when draft.existingWayId is set â the card is then "new route
   * on this way" (title/copy/button change, â¥1 spec required, endpoints shown
   * as fixed text). `knownSpecLists` = specs of the routes already on it. */
  existingWay?: { label: string; knownSpecLists: string[][] } | null;
  /** WP-G: catalog-wide spec vocabulary for the chips (specVocabulary()). */
  vocabulary?: string[];
  onSave: (names: WayNames) => void;
  onSkip: () => void;
}

export function WayNamingCard(props: WayNamingCardProps) {
  const { t } = useTheme();
  const [startName, setStartName] = useState('');
  const [endName, setEndName] = useState('');
  // WP-G: committed spec segments + the open input.
  const [specs, setSpecs] = useState<string[]>([]);
  const [specDraft, setSpecDraft] = useState('');
  const needStart = props.startExistingLabel === null;
  const needEnd = props.endExistingLabel === null && !props.loop;
  const nameComplete = (!needStart || startName.trim().length > 0) && (!needEnd || endName.trim().length > 0);

  const existingWay = props.existingWay ?? null;
  const effectiveSpecs = cleanSpecs([...specs, specDraft]);
  const dupList = existingWay
    ? existingWay.knownSpecLists.find((l) => sameSpecs(l, effectiveSpecs)) ?? null
    : null;
  // Only a TYPED list can be a duplicate: on open effectiveSpecs is [] and would
  // match the way's plain route, showing the "already exists" hint before
  // anything is typed (Inspect, WP-G). The ≥1-spec rule already disables the button.
  const duplicate = dupList !== null && effectiveSpecs.length > 0;
  const complete = nameComplete && (!existingWay || effectiveSpecs.length > 0) && !duplicate;

  const commitSpec = () => {
    const s = specDraft.trim();
    if (s.length === 0) return;
    setSpecs((prev) => [...prev, s]);
    setSpecDraft('');
  };
  const removeSpecFrom = (index: number) => {
    setSpecs((prev) => prev.slice(0, index));
  };

  const suggestions = specSuggestions(existingWay?.knownSpecLists ?? [], props.vocabulary ?? [], cleanSpecs(specs));

  const inputStyle = [st.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.bg }];
  return (
    <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      <Text style={[st.title, { color: t.text }]}>
        {existingWay ? `New route on ${existingWay.label}` : 'New way â name where you rode'}
      </Text>
      <Text style={[st.sub, { color: t.textDim }]}>
        {existingWay
          ? props.matchedRouteLabel
            ? `Scored as ${props.matchedRouteLabel}. Was this a different route? Add what made it different to save it as a new route on this way â this ride becomes its reference.`
            : `${existingWay.label} is a way you have, but this ride did not follow any of its routes. Name what made it different to save it as a new route â this ride becomes its reference.`
          : props.loop
            ? 'This ride looped from and back to one new place.'
            : props.matchedRouteLabel
              ? `Scored as ${props.matchedRouteLabel}, but no way of yours runs between these two places. Name them to make this a route of its own â this ride becomes its reference.`
              : 'This ride does not match any way you have. Name its start and end to make it a real route â this ride becomes its reference.'}
      </Text>

      <Text style={[st.label, { color: t.textDim }]}>STARTED AT</Text>
      {needStart ? (
        <TextInput
          style={inputStyle}
          value={startName}
          onChangeText={setStartName}
          placeholder="e.g. Home"
          placeholderTextColor={t.textDim}
          editable={!props.busy}
          maxLength={40}
        />
      ) : (
        <Text style={[st.fixed, { color: t.text }]}>{props.startExistingLabel}</Text>
      )}

      {!props.loop && (
        <>
          <Text style={[st.label, { color: t.textDim }]}>ENDED AT</Text>
          {needEnd ? (
            <TextInput
              style={inputStyle}
              value={endName}
              onChangeText={setEndName}
              placeholder="e.g. Work"
              placeholderTextColor={t.textDim}
              editable={!props.busy}
              maxLength={40}
            />
          ) : (
            <Text style={[st.fixed, { color: t.text }]}>{props.endExistingLabel}</Text>
          )}
        </>
      )}

      <Text style={[st.label, { color: t.textDim }]}>
        {existingWay ? 'SPECIFICATIONS (required) â e.g. Dry, Left' : 'SPECIFICATIONS (optional) â e.g. Dry, Left'}
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
              <Text style={[st.specPillText, { color: t.text }]}>{s} Ã</Text>
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
          already exists as {existingWay!.label}
          {dupList.length ? ` Â· ${dupList.join(' Â· ')}` : ''} â pick it on RECORD next time, or add another
          specification
        </Text>
      )}

      <Pressable
        style={[st.saveBtn, { backgroundColor: t.accent }, (!complete || props.busy) && st.dim]}
        disabled={!complete || props.busy}
        onPress={() => props.onSave({ start: startName, end: endName, specs: effectiveSpecs })}
      >
        <Text style={[st.saveText, { color: t.onAccent }]}>{existingWay ? 'ADD ROUTE' : 'CREATE WAY'}</Text>
      </Pressable>
      <Pressable style={st.skipBtn} disabled={props.busy} onPress={props.onSkip}>
        <Text style={[st.skipText, { color: t.textDim }]}>
          {existingWay
            ? props.matchedRouteLabel
              ? `no â it was ${props.matchedRouteLabel}`
              : 'skip â keep it as a plain ride'
            : 'skip â keep it as a plain ride'}
        </Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.card, padding: 16, gap: 6 },
  title: { fontSize: 16, fontWeight: '700' },
  sub: { fontSize: 12.5, marginBottom: 6 },
  label: { fontSize: 11, letterSpacing: 2, marginTop: 6 },
  fixed: { fontSize: 15, paddingVertical: 6 },
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
  skipBtn: { paddingVertical: 10, alignItems: 'center' },
  skipText: { fontSize: 13 },
  dim: { opacity: 0.45 },
});
