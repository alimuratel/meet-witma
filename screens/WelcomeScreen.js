import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BRAND } from '../lib/theme';

const { height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.top}>
        <View style={s.logoWrap}>
          <Text style={s.logoMeet}>meet</Text>
          <Text style={s.logoWitma}>witma</Text>
        </View>
        <Text style={s.tagline}>Meet people. No language barrier.</Text>
        <Text style={s.sub}>You speak your language.{'\n'}They speak theirs.{'\n'}WITMA handles the rest. 🌐</Text>
      </View>

      <View style={s.cards}>
        {['🇯🇵 → 🇹🇷', '🇧🇷 → 🇩🇪', '🇰🇷 → 🇬🇧'].map((pair, i) => (
          <View key={i} style={[s.demoCard, { transform: [{ rotate: `${(i - 1) * 6}deg` }, { translateY: i * -20 }], zIndex: 3 - i }]}>
            <Text style={s.demoEmoji}>{pair}</Text>
            <Text style={s.demoLabel}>WITMA Mode ✓</Text>
          </View>
        ))}
      </View>

      <View style={s.bottom}>
        <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('Phone')} activeOpacity={0.85}>
          <Text style={s.btnText}>Get Started</Text>
        </TouchableOpacity>
        <Text style={s.terms}>By continuing you agree to our Terms & Privacy Policy</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.void, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28 },
  top: { alignItems: 'center', marginTop: 40 },
  logoWrap: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  logoMeet: { fontSize: 42, fontWeight: '900', color: '#fff' },
  logoWitma: { fontSize: 42, fontWeight: '900', color: BRAND.purple },
  tagline: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 12 },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 24 },
  cards: { height: 200, width: '80%', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  demoCard: { position: 'absolute', backgroundColor: BRAND.grey, borderRadius: 20, padding: 20, alignItems: 'center', width: 160, borderWidth: 1, borderColor: 'rgba(157,78,221,0.3)' },
  demoEmoji: { fontSize: 28, marginBottom: 6 },
  demoLabel: { color: BRAND.cyan, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  bottom: { width: '100%', alignItems: 'center', gap: 12 },
  btn: { width: '100%', backgroundColor: BRAND.purple, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  terms: { color: 'rgba(255,255,255,0.3)', fontSize: 11, textAlign: 'center' },
});
