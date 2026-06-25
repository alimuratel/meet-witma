import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Image, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../lib/store';
import { BRAND } from '../lib/theme';
import { saveMeetProfile, uploadMeetPhoto } from '../lib/meet';
import { LANGUAGES } from '../lib/languages';

const INTERESTS = [
  'Travel', 'Music', 'Art', 'Gaming', 'Fitness', 'Cooking',
  'Photography', 'Movies', 'Reading', 'Sports', 'Dancing',
  'Nature', 'Tech', 'Coffee', 'Yoga', 'Fashion',
];

const GENDERS = [
  { key: 'man', label: 'Man' },
  { key: 'woman', label: 'Woman' },
  { key: 'other', label: 'Other' },
];

const LOOKING_FOR = [
  { key: 'men', label: 'Men' },
  { key: 'women', label: 'Women' },
  { key: 'everyone', label: 'Everyone' },
];

export default function MeetSetupScreen({ navigation, route }) {
  const { profile, settings } = useApp();
  const insets = useSafeAreaInsets();
  const existing = route?.params?.existing;

  const [photos, setPhotos] = useState(existing?.photos || []);
  const [age, setAge] = useState(existing?.age ? String(existing.age) : '');
  const [gender, setGender] = useState(existing?.gender || 'man');
  const [lookingFor, setLookingFor] = useState(existing?.looking_for || 'everyone');
  const [bio, setBio] = useState(existing?.bio || '');
  const [interests, setInterests] = useState(existing?.interests || []);
  const [language, setLanguage] = useState(existing?.language || settings?.writeLang || 'en');
  const [saving, setSaving] = useState(false);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.7, base64: true,
    });
    if (!res.canceled) {
      const a = res.assets[0];
      const uri = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
      setPhotos((p) => [...p, uri].slice(0, 6));
    }
  };

  const removePhoto = (idx) => setPhotos((p) => p.filter((_, i) => i !== idx));

  const toggleInterest = (it) => {
    setInterests((prev) =>
      prev.includes(it) ? prev.filter((x) => x !== it) : [...prev, it].slice(0, 10)
    );
  };

  const save = async () => {
    if (!age || isNaN(Number(age)) || Number(age) < 18 || Number(age) > 99) {
      Alert.alert('Age', 'Please enter a valid age (18-99)'); return;
    }
    if (photos.length === 0) {
      Alert.alert('Photo', 'Please add at least one photo'); return;
    }
    setSaving(true);
    try {
      const uploadedPhotos = await Promise.all(
        photos.map(async (uri) => {
          if (uri.startsWith('http')) return uri;
          try { return await uploadMeetPhoto(uri); } catch { return uri; }
        })
      );
      await saveMeetProfile({
        phone: profile.phone,
        photos: uploadedPhotos,
        age: Number(age),
        gender,
        bio: bio.trim(),
        interests,
        looking_for: lookingFor,
        language,
        active: true,
      });
      navigation.replace('Home');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const myLang = LANGUAGES.find((l) => l.code === language);

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.container, { paddingBottom: 40 + insets.bottom }]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={s.title}>Meet Profile</Text>
      <Text style={s.sub}>Add photos and info so people can find you</Text>

      {/* Photos */}
      <Text style={s.label}>Photos (max 6)</Text>
      <View style={s.photoGrid}>
        {photos.map((uri, idx) => (
          <View key={idx} style={s.photoSlot}>
            <Image source={{ uri }} style={s.photoImg} />
            <TouchableOpacity style={s.removeBtn} onPress={() => removePhoto(idx)}>
              <Ionicons name="close-circle" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        ))}
        {photos.length < 6 && (
          <TouchableOpacity style={s.addPhoto} onPress={pickPhoto}>
            <Ionicons name="add" size={32} color={BRAND.purple} />
          </TouchableOpacity>
        )}
      </View>

      {/* Age */}
      <Text style={s.label}>Age</Text>
      <TextInput
        style={s.input}
        value={age}
        onChangeText={setAge}
        keyboardType="number-pad"
        placeholder="Your age"
        placeholderTextColor="#555"
        maxLength={2}
      />

      {/* Gender */}
      <Text style={s.label}>I am a</Text>
      <View style={s.pills}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g.key}
            style={[s.pill, gender === g.key && s.pillActive]}
            onPress={() => setGender(g.key)}
          >
            <Text style={[s.pillText, gender === g.key && s.pillTextActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Looking for */}
      <Text style={s.label}>Interested in</Text>
      <View style={s.pills}>
        {LOOKING_FOR.map((g) => (
          <TouchableOpacity
            key={g.key}
            style={[s.pill, lookingFor === g.key && s.pillActive]}
            onPress={() => setLookingFor(g.key)}
          >
            <Text style={[s.pillText, lookingFor === g.key && s.pillTextActive]}>{g.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Language (WITMA mode) */}
      <Text style={s.label}>My language {myLang ? myLang.flag : ''}</Text>
      <Text style={s.langNote}>🌐  WITMA automatically translates chats for everyone</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.langRow}>
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

      {/* Bio */}
      <Text style={s.label}>Bio</Text>
      <TextInput
        style={[s.input, { height: 90, textAlignVertical: 'top' }]}
        value={bio}
        onChangeText={setBio}
        placeholder="Write something about yourself..."
        placeholderTextColor="#555"
        multiline
        maxLength={200}
      />

      {/* Interests */}
      <Text style={s.label}>Interests (pick up to 10)</Text>
      <View style={s.interestGrid}>
        {INTERESTS.map((it) => {
          const active = interests.includes(it);
          return (
            <TouchableOpacity key={it} style={[s.interest, active && s.interestActive]} onPress={() => toggleInterest(it)}>
              <Text style={[s.interestText, active && s.interestTextActive]}>{it}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Save */}
      <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving} activeOpacity={0.85}>
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.saveBtnText}>Let's Go 🚀</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: BRAND.void },
  container: { padding: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 6 },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 28 },
  label: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 10, marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.8 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoSlot: { width: 100, height: 134, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 4, right: 4 },
  addPhoto: { width: 100, height: 134, borderRadius: 12, borderWidth: 2, borderColor: BRAND.purple, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(157,78,221,0.07)' },
  input: { backgroundColor: '#1a1a2e', color: '#fff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, borderWidth: 1, borderColor: '#2a2a3e' },
  pills: { flexDirection: 'row', gap: 10 },
  pill: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333', alignItems: 'center', backgroundColor: '#111' },
  pillActive: { borderColor: BRAND.purple, backgroundColor: 'rgba(157,78,221,0.15)' },
  pillText: { color: 'rgba(255,255,255,0.5)', fontWeight: '600', fontSize: 15 },
  pillTextActive: { color: BRAND.purple },
  langNote: { color: BRAND.cyan, fontSize: 12, marginBottom: 10, marginTop: -6 },
  langRow: { marginBottom: 4 },
  langChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#333', marginRight: 8, backgroundColor: '#111' },
  langChipActive: { borderColor: BRAND.cyan, backgroundColor: 'rgba(0,242,254,0.08)' },
  langFlag: { fontSize: 18 },
  langName: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500' },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interest: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#111' },
  interestActive: { borderColor: BRAND.purple, backgroundColor: 'rgba(157,78,221,0.15)' },
  interestText: { color: 'rgba(255,255,255,0.5)', fontWeight: '500', fontSize: 14 },
  interestTextActive: { color: BRAND.purple },
  saveBtn: { marginTop: 36, backgroundColor: BRAND.purple, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
