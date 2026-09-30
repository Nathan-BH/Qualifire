/**
 * virgin-cycle18 brief 05: one pill row of places, shared by the naming
 * card (typeahead proposals here; brief 06's "change" picker), and the
 * place detail's "Merge into…". Dumb: options in, a tap out. Mirrors the
 * RECORD tab's START pills (RecordScreen.tsx styles.pill/pillOn) so a place
 * looks the same wherever it is picked. `markedId` gets `markedSuffix`
 * appended to its label (brief 06: the place picked at START).
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PlaceOption } from '../store/placeSearch';
import { radius } from './theme';
import { useTheme } from './themeContext';

export interface PlacePickerProps {
  options: readonly PlaceOption[];
  selectedId: string | null;
  onPick: (id: string) => void;
  busy?: boolean;
  markedId?: string | null;
  markedSuffix?: string;
}

export function PlacePicker(props: PlacePickerProps) {
  const { t } = useTheme();
  if (props.options.length === 0) return null;
  return (
    <View style={st.row}>
      {props.options.map((o) => {
        const on = o.id === props.selectedId;
        const label = props.markedId === o.id && props.markedSuffix ? `${o.label}${props.markedSuffix}` : o.label;
        return (
          <Pressable
            key={o.id}
            style={[st.pill, { borderColor: on ? t.accent : t.cardBorder }]}
            disabled={props.busy}
            onPress={() => props.onPick(o.id)}
            accessibilityLabel={`${o.label}, ${o.detail}`}
          >
            <Text style={[st.pillText, { color: on ? t.accentText : t.text }]}>{label}</Text>
            {o.detail.length > 0 ? <Text style={[st.detail, { color: t.textDim }]}>{o.detail}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  pill: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: 12.5 },
  detail: { fontSize: 10.5 },
});
