import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const COLORS = ['#9D4EDD','#00F2FE','#00FF88','#FF4DCA','#0099FF','#FF6B35','#FFD700'];

function colorFor(name) {
  if (!name) return COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return COLORS[Math.abs(h) % COLORS.length];
}

export default function Avatar({ name, uri, size = 40 }) {
  const initials = name ? name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() : '?';
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  return (
    <View style={[s.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: colorFor(name) }]}>
      <Text style={[s.text, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '700' },
});
