import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Image, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../lib/store';
import { kv } from '../lib/kv';
import { BRAND } from '../lib/theme';
import { LANGUAGES } from '../lib/languages';
import { fetchMatches } from '../lib/meet';
import Avatar from '../components/Avatar';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function MatchesScreen({ navigation }) {
  const { profile, settings } = useApp();
  const insets = useSafeAreaInsets();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const myLanguage = settings?.writeLang || 'en';

  const load = useCallback(async () => {
    if (!profile?.phone) return;
    const data = await fetchMatches(profile.phone);
    setMatches(data);
  }, [profile?.phone]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openChat = useCallback(async (m) => {
    const peerLang = m.peer?.language;
    if (peerLang && peerLang !== myLanguage) {
      await kv.set(`lingo:${m.roomId}`, { enabled: true, writeLang: myLanguage, readLang: peerLang });
    }
    navigation.navigate('Chat', { roomId: m.roomId, peer: m.peer, myLanguage });
  }, [myLanguage, navigation]);

  const renderItem = ({ item: m }) => {
    const lang = LANGUAGES.find((l) => l.code === m.peer?.language);
    const isDiffLang = lang && lang.code !== myLanguage;
    const photo = m.peer?.photos?.[0];

    return (
      <TouchableOpacity style={s.row} onPress={() => openChat(m)} activeOpacity={0.75}>
        <View style={s.photoWrap}>
          {photo
            ? <Image source={{ uri: photo }} style={s.photo} />
            : <Avatar name={m.peer?.name || '?'} size={58} />
          }
          {lang && <Text style={s.flagBadge}>{lang.flag}</Text>}
        </View>

        <View style={s.info}>
          <View style={s.nameRow}>
            <Text style={s.name}>{m.peer?.name || 'Unknown'}</Text>
            {m.peer?.age ? <Text style={s.age}>{m.peer.age}</Text> : null}
          </View>
          <View style={s.metaRow}>
            {isDiffLang && (
              <View style={s.witmaBadge}>
                <Text style={s.witmaText}>🌐 WITMA</Text>
              </View>
            )}
            <Text style={s.time}>{timeAgo(m.matched_at)}</Text>
          </View>
        </View>

        <Ionicons name="chatbubble-outline" size={20} color="rgba(255,255,255,0.35)" />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Matches</Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={BRAND.purple} size="large" />
        </View>
      ) : matches.length === 0 ? (
        <View style={s.center}>
          <Text style={{ fontSize: 48 }}>💜</Text>
          <Text style={s.emptyTitle}>No matches yet</Text>
          <Text style={s.emptySub}>Keep swiping to find your match</Text>
          <TouchableOpacity style={s.swipeBtn} onPress={() => navigation.goBack()}>
            <Text style={s.swipeBtnText}>Start Swiping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={BRAND.purple} />}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ItemSeparatorComponent={() => <View style={s.sep} />}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.void },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  emptySub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center' },
  swipeBtn: { backgroundColor: BRAND.purple, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  swipeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  photoWrap: { position: 'relative' },
  photo: { width: 58, height: 58, borderRadius: 29 },
  flagBadge: { position: 'absolute', bottom: -2, right: -4, fontSize: 16 },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '700', color: '#fff' },
  age: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  witmaBadge: { backgroundColor: 'rgba(0,242,254,0.1)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: BRAND.cyan },
  witmaText: { color: BRAND.cyan, fontSize: 10, fontWeight: '700' },
  time: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.06)', marginLeft: 88 },
});
