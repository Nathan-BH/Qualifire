/**
 * Post-ride REPLAY — cycle15 brief 08 decision 6. Play/pause glyphs drawn with
 * plain Views (no icon library, no font glyph — none is in package.json and
 * this file must not add one). PlayIcon is a right-pointing triangle built
 * with the border trick; PauseIcon is two bars. Props: color only.
 */
import { StyleSheet, View } from 'react-native';

export function PlayIcon({ color }: { color: string }) {
  return <View style={[styles.triangle, { borderLeftColor: color }]} />;
}

export function PauseIcon({ color }: { color: string }) {
  return (
    <View style={styles.pauseWrap}>
      <View style={[styles.bar, { backgroundColor: color }]} />
      <View style={[styles.bar, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  triangle: {
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftWidth: 17,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 3,
  },
  pauseWrap: { flexDirection: 'row', gap: 4 },
  bar: { width: 4, height: 18, borderRadius: 1 },
});
