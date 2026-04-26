import React, { useRef } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
interface CodeInputProps { onComplete: (code: string) => void; }
export default function CodeInput({ onComplete }: CodeInputProps) {
  const inputs = useRef<(TextInput | null)[]>([]);
  const values = useRef(['', '', '', '']);
  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '');
    values.current[index] = digit;
    if (digit.length === 1 && index < 3) { inputs.current[index + 1]?.focus(); }
    const code = values.current.join('');
    if (code.length === 4) { onComplete(code); }
  };
  return (<View>{[0, 1, 2, 3].map((i) => (<TextInput key={i} ref={(ref) => { inputs.current[i] = ref; }} maxLength={1} keyboardType="number-pad" onChangeText={(text) => handleChange(text, i)} />))}</View>);
}
