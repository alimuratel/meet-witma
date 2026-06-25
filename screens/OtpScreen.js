import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { BRAND } from '../lib/theme';

export default function OtpScreen({ navigation, route }) {
  const { phone } = route.params;
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const verify = async () => {
    if (otp.length < 4) { Alert.alert('Enter the verification code'); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.verifyOtp({ phone, token: otp, type: 'sms' });
    if (error) { Alert.alert('Invalid code', error.message); setLoading(false); return; }
    navigation.replace('ProfileSetup', { phone });
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <Text style={s.title}>Enter Code</Text>
        <Text style={s.sub}>Sent to {phone}</Text>

        <TextInput
          style={s.input}
          value={otp}
          onChangeText={setOtp}
          placeholder="------"
          placeholderTextColor="#444"
          keyboardType="number-pad"
          autoFocus
          maxLength={6}
          textAlign="center"
          returnKeyType="done"
          onSubmitEditing={verify}
        />

        <TouchableOpacity style={s.btn} onPress={verify} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Verify</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backText}>← Change number</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.void, paddingHorizontal: 28, gap: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 15, color: 'rgba(255,255,255,0.5)' },
  input: { backgroundColor: '#1a1a2e', color: '#fff', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 20, fontSize: 32, borderWidth: 1, borderColor: '#2a2a3e', letterSpacing: 12, marginTop: 16 },
  btn: { backgroundColor: BRAND.purple, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  back: { alignItems: 'center', marginTop: 8 },
  backText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
});
