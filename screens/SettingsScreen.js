import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Alert, Image, FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../lib/store';
import { BRAND } from '../lib/theme';
import { LANGUAGES } from '../lib/languages';
import Avatar from '../components/Avatar';

const APP_VERSION = '1.0.0';

export default function SettingsScreen({ navigation }) {
  const { profile, settings, updateSettings, logout } = useApp();
  const insets = useSafeAreaInsets();
  const [langModal, setLangModal] = useState(false);

  const currentLang = LANGUAGES.find((l) => l.code === (settings?.writeLang || 'en'));

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => { await logout(); },
      },
    ]);
  };

  const handleSelectLang = async (code) => {
    setLangModal(false);
    await updateSettings({ writeLang: code });
  };

  const renderLangItem = ({ item }) => {
    const isActive = item.code === (settings?.writeLang || 'en');
    return (
      <TouchableOpacity
        style={[s.langRow, isActive && s.langRowActive]}
        onPress={() => handleSelectLang(item.code)}
        activeOpacity={0.7}
      >
        <Text style={s.langFlag}>{item.flag}</Text>
        <View style={{ flex: 1 }}>
          <Text style={s.langNative}>{item.native}</Text>
          <Text style={s.langEn}>{item.en}</Text>
        </View>
        {isActive && <Ionicons name="checkmark" size={20} color={BRAND.cyan} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 24 }]}>
        {/* Profile card */}
        <TouchableOpacity
          style={s.profileCard}
          onPress={() => navigation.navigate('Setup')}
          activeOpacity={0.8}
        >
          {profile?.avatar
            ? <Image source={{ uri: profile.avatar }} style={s.profileAvatar} />
            : <Avatar name={profile?.name} size={60} />}
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{profile?.name || 'No name'}</Text>
            <Text style={s.profileSub}>{profile?.phone}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.35)" />
        </TouchableOpacity>

        {/* Section: Preferences */}
        <Text style={s.sectionLabel}>PREFERENCES</Text>
        <View style={s.section}>
          <TouchableOpacity style={s.row} onPress={() => setLangModal(true)} activeOpacity={0.7}>
            <View style={s.rowLeft}>
              <View style={[s.rowIcon, { backgroundColor: 'rgba(0,242,254,0.12)' }]}>
                <Text style={{ fontSize: 18 }}>🌐</Text>
              </View>
              <View>
                <Text style={s.rowLabel}>My Language</Text>
                <Text style={s.rowSub}>Used for WITMA translation</Text>
              </View>
            </View>
            <View style={s.rowRight}>
              <Text style={s.rowValue}>{currentLang?.flag} {currentLang?.native}</Text>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
            </View>
          </TouchableOpacity>

          <View style={s.sep} />

          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Setup')} activeOpacity={0.7}>
            <View style={s.rowLeft}>
              <View style={[s.rowIcon, { backgroundColor: 'rgba(124,58,237,0.15)' }]}>
                <Ionicons name="person-outline" size={18} color={BRAND.purple} />
              </View>
              <View>
                <Text style={s.rowLabel}>Edit Meet Profile</Text>
                <Text style={s.rowSub}>Photos, bio, interests</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        </View>

        {/* Section: About */}
        <Text style={s.sectionLabel}>ABOUT</Text>
        <View style={s.section}>
          <View style={s.row}>
            <View style={s.rowLeft}>
              <View style={[s.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                <Ionicons name="information-circle-outline" size={18} color="rgba(255,255,255,0.5)" />
              </View>
              <Text style={s.rowLabel}>Version</Text>
            </View>
            <Text style={s.rowValue}>{APP_VERSION}</Text>
          </View>

          <View style={s.sep} />

          <TouchableOpacity
            style={s.row}
            onPress={() => Alert.alert('Support', 'hello@witma.app')}
            activeOpacity={0.7}
          >
            <View style={s.rowLeft}>
              <View style={[s.rowIcon, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                <Ionicons name="mail-outline" size={18} color="rgba(255,255,255,0.5)" />
              </View>
              <Text style={s.rowLabel}>Support</Text>
            </View>
            <View style={s.rowRight}>
              <Text style={s.rowValue}>hello@witma.app</Text>
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={s.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Language picker modal */}
      <Modal visible={langModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLangModal(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>My Language</Text>
            <TouchableOpacity onPress={() => setLangModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={s.modalSub}>Your messages will be translated to your match's language</Text>
          <FlatList
            data={LANGUAGES}
            keyExtractor={(l) => l.code}
            renderItem={renderLangItem}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.void },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 0 },

  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, marginBottom: 24 },
  profileAvatar: { width: 60, height: 60, borderRadius: 30 },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { color: '#fff', fontSize: 18, fontWeight: '700' },
  profileSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },

  sectionLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 8 },
  section: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { color: '#fff', fontSize: 15, fontWeight: '500' },
  rowSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 1 },
  rowValue: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 62 },

  logoutBtn: { backgroundColor: 'rgba(255,68,68,0.12)', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: 'rgba(255,68,68,0.25)' },
  logoutText: { color: '#FF4444', fontSize: 16, fontWeight: '600' },

  modal: { flex: 1, backgroundColor: '#0D0D1E', paddingTop: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  modalSub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, paddingHorizontal: 20, marginBottom: 16 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 13 },
  langRowActive: { backgroundColor: 'rgba(0,242,254,0.06)' },
  langFlag: { fontSize: 26, width: 34, textAlign: 'center' },
  langNative: { color: '#fff', fontSize: 15, fontWeight: '500' },
  langEn: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
});
