import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { colors, shadows } from '../theme/colors';
interface BottomSheetProps { visible: boolean; onClose: () => void; children: React.ReactNode; }
export default function BottomSheet({ visible, onClose, children }: BottomSheetProps) {
  return (<Modal visible={visible} transparent animationType="fade"><Pressable onPress={onClose}><view /></Pressable><View><View />{children}</View></Modal>);
}
export function SituationButton({ icon, iconBg, title, desc, onPress }: any) {
  return (<TouchableOpacity onPress={onPress}><view><text>{icon}</text></view><view><text>{title}</text><text>{desc}</text></view></TouchableOpacity>);
}
export function InviteButton({ icon, iconBg, title, desc, onPress }: any) {
  return (<TouchableOpacity onPress={onPress}><view><text>{icon}</text></view><view><text>{title}</text><text>{desc}</text></view></TouchableOpacity>);
}
