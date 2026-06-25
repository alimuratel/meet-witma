import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { BRAND } from '../lib/theme';

export default function PhoneScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (cleaned.length < 7) { Alert.alert('Enter a valid phone number'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: cleaned });
    if (error) { Alert.alert('Error', error.message); setLoading(false); return; }
    navigation.navigate('Otp', { phone: cleaned });
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <Text style={s.title}>Your Phone</Text>
        <Text style={s.sub}>We'll send you a verification code</Text>

        <TextInput
          style={s.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 234 567 8900"
          placeholderTextColor="#444"
          keyboardType="phone-pad"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={send}
        />

        <TouchableOpacity style={s.btn} onPress={send} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Send Code</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.void, paddingHorizontal: 28, gap: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  input: { backgroundColor: '#1a1a2e', color: '#fff', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 16, fontSize: 20, borderWidth: 1, borderColor: '#2a2a3e', letterSpacing: 1, marginTop: 16 },
  btn: { backgroundColor: BRAND.purple, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
