/**
 * virgin-cycle15 brief 02 (Nathan 2026-09-26): the first sport is named on
 * RECORD, not in SETTINGS. Rendered by RecordScreen inside the setup flow's
 * zero-sports block once RECORD has been pressed with no sport configured.
 * Dumb UI, controlled: RecordScreen owns the text, the addSport/saveSports
 * call and the arm that follows (the big RECORD button is the confirm — there
 * is deliberately no button here). "not now" backs out to the label state.
 * The 2nd+ sport is still added in SETTINGS -> SPORTS; this file never touches
 * the store.
 */
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MAX_SPORT_LABEL, SPORT_LABEL_PLACEHOLDER } from '../store/sports';
import { radius } from './theme';
import { useTheme } from './themeContext';

export interface FirstSportPromptProps {
  value: string;
  onChange: (v: string) => void;
  /** validation / store refusal, shown under the input; null = nothing */
  error: string | null;
  busy: boolean;
  onDismiss: () => void;
}

export function FirstSportPrompt(props: FirstSportPromptProps) {
  const { t } = useTheme();
  return (
    <View style={st.wrap}>
      <Text style={[st.label, { color: t.textDim }]}>YOUR FIRST SPORT</Text>
      <TextInput
        style={[st.input, { color: t.text, borderColor: t.cardBorder, backgroundColor: t.bg }]}
        value={props.value}
        onChangeText={props.onChange}
        placeholder={SPORT_LABEL_PLACEHOLDER}
        placeholderTextColor={t.textDim}
        editable={!props.busy}
        maxLength={MAX_SPORT_LABEL}
        autoFocus
        autoCapitalize="words"
        returnKeyType="done"
        accessibilityLabel="Sport name"
      />
      {props.error ? <Text style={[st.hint, { color: t.textDim }]}>{props.error}</Text> : null}
      <Pressable style={st.dismissBtn} disabled={props.busy} onPress={props.onDismiss}>
        <Text style={[st.dismissText, { color: t.textDim }]}>not now</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 11, letterSpacing: 2, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: radius.btn, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  hint: { fontSize: 11.5 },
  dismissBtn: { paddingVertical: 8, alignSelf: 'flex-start' },
  dismissText: { fontSize: 13 },
});
