import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { useTheme } from '../logic/themeContext';

type Point = { timestamp: number; rating: number };

type Props = {
  points: Point[];
  height?: number;
};

const WIDTH_PADDING = 10;
const TOP_PADDING = 16;
const BOTTOM_PADDING = 8;

export default function RatingChart({ points, height = 140 }: Props) {
  const { colors } = useTheme();

  if (points.length < 2) {
    return (
      <View style={[styles.emptyBox, { height, borderColor: colors.border }]}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          Oldj meg legalább 2 feladványt, hogy itt megjelenjen a grafikon.
        </Text>
      </View>
    );
  }

  const ratings = points.map(p => p.rating);
  const minR = Math.min(...ratings);
  const maxR = Math.max(...ratings);
  const range = Math.max(maxR - minR, 1);

  // A tényleges szélességet a szülő adja meg layout-tal (100%), de az SVG viewBox-hoz
  // kell egy fix belső koordinátarendszer - 300 egység elég sima vonalhoz.
  const VIEW_WIDTH = 300;
  const chartWidth = VIEW_WIDTH - WIDTH_PADDING * 2;
  const chartHeight = height - TOP_PADDING - BOTTOM_PADDING;

  const coords = points.map((p, i) => {
    const x = WIDTH_PADDING + (i / (points.length - 1)) * chartWidth;
    const y = TOP_PADDING + chartHeight - ((p.rating - minR) / range) * chartHeight;
    return { x, y };
  });

  const polylinePoints = coords.map(c => `${c.x},${c.y}`).join(' ');
  const last = coords[coords.length - 1];

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`}>
        <Line
          x1={WIDTH_PADDING}
          y1={TOP_PADDING + chartHeight}
          x2={VIEW_WIDTH - WIDTH_PADDING}
          y2={TOP_PADDING + chartHeight}
          stroke={colors.border}
          strokeWidth={1}
        />
        <Polyline points={polylinePoints} fill="none" stroke={colors.accent} strokeWidth={2} />
        <Circle cx={last.x} cy={last.y} r={4} fill={colors.accent} />
      </Svg>
      <View style={styles.labels}>
        <Text style={[styles.labelText, { color: colors.textMuted }]}>{Math.round(minR)}</Text>
        <Text style={[styles.labelText, { color: colors.textMuted }]}>{Math.round(maxR)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  labelText: {
    fontSize: 10,
  },
});