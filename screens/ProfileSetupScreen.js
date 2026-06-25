import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../lib/store';
import { BRAND } from '../lib/theme';
import { LANGUAGES } from '../lib/languages';
import Avatar from '../components/Avatar';

export default function ProfileSetupScreen({ navigation, route }) {
  const { phone } = route.params;
  const insets = useSafeAreaInsets();
  const { registerProfile, updateSettings } = useApp();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.6, base64: true,
    });
    if (!res.canceled) {
      const a = res.assets[0];
      setAvatar(a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri);
    }
  };

  const finish = async () => {
    if (name.trim().length < 2) { Alert.alert('Enter your name'); return; }
    setSaving(true);
    try {
      await registerProfile({ phone, name: name.trim(), avatar });
      await updateSettings({ writeLang: language });
    } finally {
      setSaving(false);
    }
  };

  const myLang = LANGUAGES.find((l) => l.code === language);

  return (
    <ScrollView style={s.scroll} contentContainerStyle={[s.container, { paddingBottom: 40 + insets.bottom }]} keyboardShouldPersistTaps="handled">
      <Text style={s.title}>Your Profile</Text>

      <TouchableOpacity style={s.avatarWrap} onPress={pickPhoto} activeOpacity={0.8}>
        <Avatar name={name || '?'} uri={avatar} size={110} />
        <View style={s.camBadge}><Ionicons name="camera" size={18} color="#fff" /></View>
      </TouchableOpacity>

      <Text style={s.label}>Name</Text>
      <TextInput
        style={s.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor="#444"
        maxLength={30}
        autoFocus
      />

      <Text style={s.label}>My language {myLang?.flag || ''}</Text>
      <Text style={s.langNote}>🌐  WITMA will auto-translate chats based on this</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
        {LANGUAGES.slice(0, 20).map((l) => (
          <TouchableOpacity
            key={l.code}
            style={[s.langChip, language === l.code && s.langChipActive]}
            onPress={() => setLanguage(l.code)}
          >
            <Text style={s.langFlag}>{l.flag}</Text>
            <Text style={[s.langName, language === l.code && { color: BRAND.cyan }]}>{l.native}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={s.btn} onPress={finish} disabled={saving} activeOpacity={0.85}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Continue →</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BRAND.void },
  container: { padding: 28, gap: 12 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8 },
  avatarWrap: { alignSelf: 'center', marginBottom: 8, position: 'relative' },
  camBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: BRAND.purple, borderRadius: 16, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.8 },
  input: { backgroundColor: '#1a1a2e', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, borderWidth: 1, borderColor: '#2a2a3e' },
  langNote: { color: BRAND.cyan, fontSize: 12, marginTop: -4 },
  langChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#333', marginRight: 8, backgroundColor: '#111' },
  langChipActive: { borderColor: BRAND.cyan, backgroundColor: 'rgba(0,242,254,0.08)' },
  langFlag: { fontSize: 18 },
  langName: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500' },
  btn: { backgroundColor: BRAND.purple, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 16 },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
