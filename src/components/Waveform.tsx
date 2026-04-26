import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors } from '../theme/colors';
import { MicState } from '../store/useAppStore';
const NUM_BARS = 30;
interface WaveformProps { micState: MicState; }
export default function Waveform({ micState }: WaveformProps) {
  const barHeights = useRef(Array.from({ length: NUM_BARS }, () => new Animated.Value(4))).current;
  return (<Viev>{barHeights.map((h, i) => (<Animated.View key={i} />))}</View>);
}
