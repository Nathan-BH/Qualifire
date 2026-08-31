/**
 * STOP-step naming card (OPEN-ITEMS item 2; COLD-START §3 step 5 — "the only
 * true onboarding step... this is where landmarks are born on a cold start").
 * [UNTESTED ON DEVICE]
 *
 * Shown by RecordScreen's 'ending' phase when the just-finished ride never
 * locked a route and store/wayCreation.ts drafted new endpoint(s). Dumb UI:
 * it owns only the two text inputs; RecordScreen owns the draft, the build
 * and the saveUserCatalog() call. An endpoint that matched an EXISTING
 * landmark renders as fixed text, not an input. SKIP is always available and
 * loses nothing — the ride itself was already saved before this card exists.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  onSave: (names: { start: string; end: string }) => void;
  onSkip: () => void;
}

export function WayNamingCard(props: WayNamingCardProps) {
  const { t } = useTheme();
  const [startName, setStartName] = useState('');
  const [endName, setEndName] = useState('');
  const needStart = props.startExistingLabel === null;
  const needEnd = props.endExistingLabel === null && !props.loop;
  const complete = (!needStart || startName.trim().length > 0) && (!needEnd || endName.trim().length > 0);

  const inputStyle = [st.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.bg }];
  return (
    <View style={[st.card, { backgroundColor: t.card, borderColor: t.cardBorder }]}>
      <Text style={[st.title, { color: t.text }]}>New way — name where you rode</Text>
      <Text style={[st.sub, { color: t.textDim }]}>
        {props.loop
          ? 'This ride looped from and back to one new place.'
          : 'This ride does not match any way you have. Name its start and end to make it a real route — this ride becomes its reference.'}
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

      <Pressable
        style={[st.saveBtn, { backgroundColor: t.accent }, (!complete || props.busy) && st.dim]}
        disabled={!complete || props.busy}
        onPress={() => props.onSave({ start: startName, end: endName })}
      >
        <Text style={[st.saveText, { color: t.onAccent }]}>CREATE WAY</Text>
      </Pressable>
      <Pressable style={st.skipBtn} disabled={props.busy} onPress={props.onSkip}>
        <Text style={[st.skipText, { color: t.textDim }]}>skip — keep it as a plain ride</Text>
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
  saveBtn: { marginTop: 14, borderRadius: radius.btn, paddingVertical: 12, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', letterSpacing: 1 },
  skipBtn: { paddingVertical: 10, alignItems: 'center' },
  skipText: { fontSize: 13 },
  dim: { opacity: 0.45 },
});
