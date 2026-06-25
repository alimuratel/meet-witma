import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { kv } from '../lib/kv';
import { useApp } from '../lib/store';
import { BRAND } from '../lib/theme';
import { LANGUAGES } from '../lib/languages';
import Avatar from '../components/Avatar';

const TRANSLATE_URL = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&dt=t&q=';

async function translateText(text, targetLang) {
  if (!text || !targetLang) return text;
  try {
    const res = await fetch(`${TRANSLATE_URL}${encodeURIComponent(text)}&tl=${targetLang}`);
    const data = await res.json();
    return data?.[0]?.map((s) => s?.[0]).filter(Boolean).join('') || text;
  } catch { return text; }
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ navigation, route }) {
  const { roomId, peer, myLanguage: myLang } = route.params;
  const { profile } = useApp();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState([]);
  const [translations, setTranslations] = useState({});
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [lingoSettings, setLingoSettings] = useState(null);
  const listRef = useRef(null);
  const listReadyRef = useRef(false);

  const myPhone = profile?.phone;
  const myLanguage = myLang || 'en';
  const peerLang = LANGUAGES.find((l) => l.code === peer?.language);

  useEffect(() => {
    kv.get(`lingo:${roomId}`).then((ls) => { if (ls) setLingoSettings(ls); });
  }, [roomId]);

  // Translate a single peer message into my language, cache result
  const translatePeerMsg = useCallback(async (msg) => {
    if (!lingoSettings?.enabled || !myLanguage) return;
    if (msg.sender_phone === myPhone) return;
    if (translations[msg.id]) return;
    const translated = await translateText(msg.text, myLanguage);
    if (translated && translated !== msg.text) {
      setTranslations((prev) => ({ ...prev, [msg.id]: translated }));
    }
  }, [lingoSettings, myLanguage, myPhone, translations]);

  // Translate all peer messages in a batch after load
  const translateBatch = useCallback(async (msgs) => {
    if (!lingoSettings?.enabled || !myLanguage) return;
    const peerMsgs = msgs.filter((m) => m.sender_phone !== myPhone && !translations[m.id]);
    for (const m of peerMsgs) {
      const translated = await translateText(m.text, myLanguage);
      if (translated && translated !== m.text) {
        setTranslations((prev) => ({ ...prev, [m.id]: translated }));
      }
    }
  }, [lingoSettings, myLanguage, myPhone, translations]);

  useEffect(() => {
    // Load messages from meet_messages table
    supabase.from('meet_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const msgs = data || [];
        setMessages(msgs);
        setLoading(false);
        translateBatch(msgs);
      });

    const channel = supabase
      .channel(`chat:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public',
        table: 'meet_messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const msg = payload.new;
        setMessages((prev) => [...prev, msg]);
        if (msg.sender_phone !== myPhone) {
          setTimeout(() => translatePeerMsg(msg), 100);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, myPhone]);

  // Re-translate when lingoSettings loads (after messages)
  useEffect(() => {
    if (lingoSettings?.enabled && messages.length) {
      translateBatch(messages);
    }
  }, [lingoSettings]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');

    let finalText = text;
    let originalText = null;

    if (lingoSettings?.enabled && lingoSettings.readLang) {
      try {
        const translated = await translateText(text, lingoSettings.readLang);
        if (translated && translated !== text) {
          finalText = translated;
          originalText = text;
        }
      } catch {}
    }

    await supabase.from('meet_messages').insert({
      room_id: roomId,
      sender_phone: myPhone,
      text: finalText,
      original_text: originalText,
      seen: false,
    });
    setSending(false);
  }, [draft, roomId, myPhone, lingoSettings, sending]);

  const renderItem = useCallback(({ item }) => {
    const isMe = item.sender_phone === myPhone;

    // My message: show what I typed (original_text), greyed = what peer sees (translated text)
    // Peer message: show translated text (via translations cache), greyed = their original
    let mainText = item.text;
    let subText = null;

    if (isMe) {
      mainText = item.original_text || item.text;
      if (item.original_text && item.original_text !== item.text) {
        subText = item.text; // what peer sees
      }
    } else {
      const translated = translations[item.id];
      if (translated) {
        mainText = translated;
        subText = item.text; // peer's original
      }
    }

    return (
      <View style={[s.msgRow, isMe && s.msgRowMe]}>
        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
          <Text style={s.msgText}>{mainText}</Text>
          {subText && subText !== mainText && (
            <Text style={s.subText}>
              {isMe ? '→ ' : '← '}{subText}
            </Text>
          )}
          <Text style={s.time}>{formatTime(item.created_at)}</Text>
        </View>
      </View>
    );
  }, [myPhone, translations]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[s.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={s.headerInfo}>
            {peer?.photos?.[0]
              ? <Image source={{ uri: peer.photos[0] }} style={s.headerPhoto} />
              : <Avatar name={peer?.name} size={36} />}
            <View>
              <Text style={s.headerName}>{peer?.name}</Text>
              {peerLang && (
                <Text style={s.headerLang}>{peerLang.flag} {peerLang.native}</Text>
              )}
            </View>
          </View>
          {lingoSettings?.enabled && (
            <View style={s.witmaBadge}><Text style={s.witmaText}>🌐</Text></View>
          )}
        </View>

        {loading ? (
          <View style={s.center}><ActivityIndicator color={BRAND.purple} /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 12, gap: 6 }}
            onContentSizeChange={() => {
              if (!listReadyRef.current) {
                listRef.current?.scrollToEnd({ animated: false });
                listReadyRef.current = true;
              }
            }}
            onLayout={() => { if (!listReadyRef.current) listRef.current?.scrollToEnd({ animated: false }); }}
          />
        )}

        {/* Input */}
        <View style={[s.inputRow, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={s.input}
            value={draft}
            onChangeText={setDraft}
            placeholder={lingoSettings?.enabled
              ? `Write in ${LANGUAGES.find((l) => l.code === myLanguage)?.native || 'your language'}…`
              : 'Message…'}
            placeholderTextColor="#555"
            multiline
            maxLength={2000}
            onSubmitEditing={send}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[s.sendBtn, sending && s.sendBtnDisabled]}
            onPress={send}
            activeOpacity={0.8}
            disabled={sending}
          >
            {sending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={20} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.void },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerPhoto: { width: 36, height: 36, borderRadius: 18 },
  headerName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  headerLang: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  witmaBadge: { backgroundColor: 'rgba(0,242,254,0.1)', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: BRAND.cyan },
  witmaText: { fontSize: 14 },
  msgRow: { flexDirection: 'row' },
  msgRowMe: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  bubbleMe: { backgroundColor: '#3b1f6e', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#1e1f2a', borderBottomLeftRadius: 4 },
  msgText: { color: '#fff', fontSize: 15, lineHeight: 20 },
  subText: { color: 'rgba(255,255,255,0.32)', fontSize: 11, fontStyle: 'italic', lineHeight: 16 },
  time: { color: 'rgba(255,255,255,0.3)', fontSize: 10, alignSelf: 'flex-end' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12, paddingTop: 8, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)' },
  input: { flex: 1, backgroundColor: '#1a1a2e', color: '#fff', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120, borderWidth: 1, borderColor: '#2a2a3e' },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: BRAND.purple, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
});
