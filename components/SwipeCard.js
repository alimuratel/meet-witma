import React from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { BRAND } from '../lib/theme';
import { LANGUAGES } from '../lib/languages';
import Avatar from './Avatar';

const GRAD_LAYERS = [0, 0.04, 0.1, 0.2, 0.33, 0.52, 0.72];

export default function SwipeCard({ profile, myLanguage, likeOpacity, nopeOpacity, superOpacity, style, ...rest }) {
  const photo = profile?.photos?.[0];
  const lang = LANGUAGES.find((l) => l.code === profile?.language);
  const isDiffLang = !!(profile?.language && myLanguage && profile.language !== myLanguage);

  return (
    <Animated.View style={[s.card, style]} {...rest}>
      {photo ? (
        <Image source={{ uri: photo }} style={s.photo} resizeMode="cover" />
      ) : (
        <View style={s.placeholder}>
          <Avatar name={profile?.name || '?'} size={110} />
        </View>
      )}

      {/* pseudo-gradient overlay */}
      <View style={s.gradWrap} pointerEvents="none">
        {GRAD_LAYERS.map((op, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: `rgba(0,0,0,${op})` }} />
        ))}
      </View>

      {/* WITMA mode badge */}
      {isDiffLang && (
        <View style={s.witmaBadge}>
          <Text style={s.witmaText}>🌐  WITMA</Text>
        </View>
      )}

      {/* Like stamp */}
      {likeOpacity && (
        <Animated.View style={[s.stamp, s.likeStamp, { opacity: likeOpacity }]}>
          <Text style={[s.stampText, { color: BRAND.green }]}>LIKE</Text>
        </Animated.View>
      )}

      {/* Nope stamp */}
      {nopeOpacity && (
        <Animated.View style={[s.stamp, s.nopeStamp, { opacity: nopeOpacity }]}>
          <Text style={[s.stampText, { color: '#FF4444' }]}>NOPE</Text>
        </Animated.View>
      )}

      {/* Super like stamp */}
      {superOpacity && (
        <Animated.View style={[s.stamp, s.superStamp, { opacity: superOpacity }]}>
          <Text style={[s.stampText, { color: BRAND.cyan }]}>SUPER</Text>
        </Animated.View>
      )}

      {/* Bottom info */}
      <View style={s.info}>
        <View style={s.nameRow}>
          <Text style={s.name}>{profile?.name}</Text>
          {!!profile?.age && <Text style={s.age}>{profile.age}</Text>}
          {lang ? <Text style={s.flag}>{lang.flag}</Text> : null}
        </View>
        {!!profile?.bio && (
          <Text style={s.bio} numberOfLines={2}>{profile.bio}</Text>
        )}
        {profile?.interests?.length > 0 && (
          <View style={s.chips}>
            {profile.interests.slice(0, 4).map((it) => (
              <View key={it} style={s.chip}>
                <Text style={s.chipText}>{it}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: BRAND.grey,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  photo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a1225' },
  gradWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 240, flexDirection: 'column' },
  witmaBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: BRAND.cyan,
  },
  witmaText: { color: BRAND.cyan, fontSize: 11.5, fontWeight: '700', letterSpacing: 0.5 },
  stamp: {
    position: 'absolute',
    top: 54,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 3,
  },
  likeStamp: { left: 20, borderColor: BRAND.green, transform: [{ rotate: '-20deg' }] },
  nopeStamp: { right: 20, borderColor: '#FF4444', transform: [{ rotate: '20deg' }] },
  superStamp: { alignSelf: 'center', left: '30%', borderColor: BRAND.cyan, transform: [{ rotate: '0deg' }] },
  stampText: { fontSize: 28, fontWeight: '900', letterSpacing: 2 },
  info: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingBottom: 22, paddingTop: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { fontSize: 26, fontWeight: '800', color: '#fff' },
  age: { fontSize: 22, fontWeight: '400', color: 'rgba(255,255,255,0.85)' },
  flag: { fontSize: 22 },
  bio: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
