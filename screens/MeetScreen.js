import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Modal,
  Dimensions, Image, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../lib/store';
import { BRAND } from '../lib/theme';
import { LANGUAGES } from '../lib/languages';
import { fetchMyMeetProfile, fetchCards, swipe } from '../lib/meet';
import { kv } from '../lib/kv';
import SwipeStack from '../components/SwipeStack';
import Avatar from '../components/Avatar';

const { width: SW } = Dimensions.get('window');

export default function MeetScreen({ navigation }) {
  const { profile, settings } = useApp();
  const insets = useSafeAreaInsets();

  const [meetProfile, setMeetProfile] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState(null);
  const stackRef = useRef(null);
  const matchAnim = useRef(new Animated.Value(0)).current;

  const myLanguage = meetProfile?.language || settings?.writeLang || 'en';

  useEffect(() => {
    if (!profile?.phone) return;
    (async () => {
      const mp = await fetchMyMeetProfile(profile.phone);
      setMeetProfile(mp);
      if (mp) {
        const c = await fetchCards(profile.phone, mp.looking_for);
        setCards(c);
      }
      setLoading(false);
    })();
  }, [profile?.phone]);

  const showMatch = useCallback((peer, roomId) => {
    setMatch({ peer, roomId });
    Animated.spring(matchAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
  }, [matchAnim]);

  const dismissMatch = useCallback(() => {
    Animated.timing(matchAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => setMatch(null));
  }, [matchAnim]);

  const openMatchChat = useCallback(async () => {
    if (!match) return;
    const peerLang = match.peer?.language;
    if (peerLang && peerLang !== myLanguage) {
      await kv.set(`lingo:${match.roomId}`, { enabled: true, writeLang: myLanguage, readLang: peerLang });
    }
    dismissMatch();
    navigation.navigate('Chat', {
      roomId: match.roomId,
      peer: match.peer,
      myLanguage,
    });
  }, [match, myLanguage, dismissMatch, navigation]);

  const handleSwipe = useCallback(async (card, direction) => {
    const liked = direction === 'right' || direction === 'super';
    try {
      const result = await swipe(profile.phone, card.phone, liked);
      if (result.matched) showMatch(card, result.roomId);
    } catch (_) {}
  }, [profile?.phone, showMatch]);

  if (loading) {
    return <View style={[s.center, { backgroundColor: BRAND.void }]}><ActivityIndicator color={BRAND.purple} size="large" /></View>;
  }

  if (!meetProfile) {
    return (
      <View style={[s.center, { backgroundColor: BRAND.void, paddingTop: insets.top + 20 }]}>
        <Text style={{ fontSize: 60 }}>✨</Text>
        <Text style={s.setupTitle}>Set up your profile</Text>
        <Text style={s.setupSub}>Add photos so people can find you</Text>
        <TouchableOpacity style={s.setupBtn} onPress={() => navigation.navigate('Setup')} activeOpacity={0.85}>
          <Text style={s.setupBtnText}>Create Profile</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const myLang = LANGUAGES.find((l) => l.code === myLanguage);
  const peerLang = match?.peer ? LANGUAGES.find((l) => l.code === match.peer.language) : null;
  const isDiffLang = peerLang && peerLang.code !== myLanguage;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="settings-outline" size={26} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={s.logoWrap}>
          <Text style={s.logoMeet}>meet</Text>
          <Text style={s.logoWitma}>witma</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Matches')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="heart" size={26} color={BRAND.purple} />
        </TouchableOpacity>
      </View>

      {/* Swipe Stack */}
      <View style={s.stackWrap}>
        <SwipeStack ref={stackRef} cards={cards} onSwipe={handleSwipe} myLanguage={myLanguage} />
      </View>

      {/* Action buttons */}
      <View style={[s.actions, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={[s.actionBtn, s.nopeBtn]} onPress={() => stackRef.current?.swipeLeft()} activeOpacity={0.8}>
          <Text style={[s.actionIcon, { color: '#FF4444' }]}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, s.superBtn]} onPress={() => stackRef.current?.swipeSuper()} activeOpacity={0.8}>
          <Ionicons name="star" size={24} color={BRAND.cyan} />
        </TouchableOpacity>
        <TouchableOpacity style={[s.actionBtn, s.likeBtn]} onPress={() => stackRef.current?.swipeRight()} activeOpacity={0.8}>
          <Text style={[s.actionIcon, { color: BRAND.green }]}>♥</Text>
        </TouchableOpacity>
      </View>

      {/* Match Modal */}
      <Modal visible={!!match} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={[s.matchOverlay, { opacity: matchAnim, transform: [{ scale: matchAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
          <View style={s.matchContent}>
            <Text style={s.matchTitle}>It's a Match! 🎉</Text>
            {isDiffLang && (
              <View style={s.witmaBanner}>
                <Text style={s.witmaBannerText}>🌐  WITMA Mode — chat in your own language</Text>
              </View>
            )}
            <View style={s.matchPhotos}>
              <View style={s.matchPhotoWrap}>
                {meetProfile?.photos?.[0]
                  ? <Image source={{ uri: meetProfile.photos[0] }} style={s.matchPhoto} />
                  : <Avatar name={profile?.name} size={88} />}
                {myLang && <Text style={s.matchFlag}>{myLang.flag}</Text>}
              </View>
              <Text style={{ fontSize: 28 }}>💜</Text>
              <View style={s.matchPhotoWrap}>
                {match?.peer?.photos?.[0]
                  ? <Image source={{ uri: match.peer.photos[0] }} style={s.matchPhoto} />
                  : <Avatar name={match?.peer?.name} size={88} />}
                {peerLang && <Text style={s.matchFlag}>{peerLang.flag}</Text>}
              </View>
            </View>
            <Text style={s.matchNames}>{profile?.name} & {match?.peer?.name}</Text>
            <TouchableOpacity style={s.sayHiBtn} onPress={openMatchChat} activeOpacity={0.85}>
              <Text style={s.sayHiText}>Say Hi 👋</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.keepSwipingBtn} onPress={dismissMatch}>
              <Text style={s.keepSwipingText}>Keep Swiping</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.void },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  logoWrap: { flexDirection: 'row', alignItems: 'baseline' },
  logoMeet: { fontSize: 22, fontWeight: '800', color: '#fff' },
  logoWitma: { fontSize: 22, fontWeight: '800', color: BRAND.purple },
  stackWrap: { flex: 1, paddingHorizontal: 16, paddingBottom: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingTop: 8 },
  actionBtn: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  nopeBtn: { backgroundColor: '#1a0a0a', borderWidth: 2, borderColor: '#FF4444' },
  superBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#0a1a2a', borderWidth: 2, borderColor: BRAND.cyan },
  likeBtn: { backgroundColor: '#0a1a0a', borderWidth: 2, borderColor: BRAND.green },
  actionIcon: { fontSize: 26, fontWeight: '700' },
  setupTitle: { color: '#fff', fontSize: 24, fontWeight: '800', textAlign: 'center' },
  setupSub: { color: 'rgba(255,255,255,0.5)', fontSize: 15, textAlign: 'center' },
  setupBtn: { backgroundColor: BRAND.purple, borderRadius: 16, paddingHorizontal: 40, paddingVertical: 16, marginTop: 8 },
  setupBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  matchOverlay: { flex: 1, backgroundColor: 'rgba(9,10,15,0.96)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  matchContent: { width: '100%', maxWidth: 360, alignItems: 'center', gap: 16 },
  matchTitle: { fontSize: 32, fontWeight: '900', color: '#fff', textAlign: 'center' },
  witmaBanner: { backgroundColor: 'rgba(0,242,254,0.12)', borderRadius: 20, borderWidth: 1, borderColor: BRAND.cyan, paddingHorizontal: 16, paddingVertical: 8 },
  witmaBannerText: { color: BRAND.cyan, fontSize: 13, fontWeight: '600' },
  matchPhotos: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  matchPhotoWrap: { position: 'relative' },
  matchPhoto: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: BRAND.purple },
  matchFlag: { position: 'absolute', bottom: -2, right: -2, fontSize: 22 },
  matchNames: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '600' },
  sayHiBtn: { width: '100%', backgroundColor: BRAND.purple, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  sayHiText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  keepSwipingBtn: { paddingVertical: 12 },
  keepSwipingText: { color: 'rgba(255,255,255,0.45)', fontSize: 15 },
});
