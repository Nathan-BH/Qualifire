/**
 * virgin-cycle23 brief 02: the ⋯ quick-action menu of an activity (feed card
 * and detail page). A transparent Modal: a full-screen backdrop that closes on
 * tap, and one card of rows anchored under the ⋯ button's measured window
 * rect. No icons, no sub-labels (CLAUDE.md rule 9). Labels come from the
 * caller so the ui-strings scanner sees them in the screen that owns them.
 */
import { useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { radius } from './theme';
import { useTheme } from './themeContext';

export interface MenuAnchor { x: number; y: number; width: number; height: number }
export interface MenuItem { label: string; onPress: () => void }

export function ActivityMenu(props: { anchor: MenuAnchor | null; items: MenuItem[]; onClose: () => void }) {
  const { t } = useTheme();
  const win = useWindowDimensions();
  const { anchor } = props;
  if (anchor === null || props.items.length === 0) return null;
  const top = Math.min(anchor.y + anchor.height + 2, win.height - 56 * props.items.length - 16);
  const right = Math.max(8, win.width - (anchor.x + anchor.width));
  return (
    <Modal transparent animationType="fade" visible onRequestClose={props.onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={props.onClose} />
      <View style={[st.card, { top, right, backgroundColor: t.card, borderColor: t.cardBorder }]}>
        {props.items.map((it) => (
          <Pressable key={it.label} style={st.row} onPress={() => { props.onClose(); it.onPress(); }}>
            <Text style={[st.rowText, { color: t.text }]}>{it.label}</Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

/** The ⋯ button; reports its window rect so the menu can anchor under it. */
export function MenuButton(props: { onOpen: (anchor: MenuAnchor) => void; style?: object }) {
  const { t } = useTheme();
  const ref = useRef<View | null>(null);
  return (
    <View ref={ref} collapsable={false} style={[st.btn, props.style]}>
      <Pressable hitSlop={6} style={st.btnHit}
        onPress={() => ref.current?.measureInWindow((x, y, width, height) => props.onOpen({ x, y, width, height }))}>
        <Text style={[st.btnText, { color: t.textDim }]}>⋯</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  card: { position: 'absolute', minWidth: 190, borderRadius: radius.btn, borderWidth: 1, paddingVertical: 4 },
  row: { paddingVertical: 13, paddingHorizontal: 16 },
  rowText: { fontSize: 14, fontWeight: '600' },
  btn: { width: 40, height: 40 },
  btnHit: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 22, lineHeight: 24 },
});
