import { Platform } from 'react-native';
import { supabase } from './supabase';

function randomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function readNativeFile(uri) {
  const FS = require('expo-file-system/legacy');
  const b64 = await FS.readAsStringAsync(uri, { encoding: FS.EncodingType.Base64 });
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function uploadMedia(uri, { room = 'uploads', name = 'file.jpg', contentType = 'image/jpeg' } = {}) {
  try {
    const folder = String(room).replace(/[^a-zA-Z0-9_-]/g, '_');
    const ext = (name.split('.').pop()) || 'jpg';
    const path = `${folder}/${randomId()}.${ext}`;

    let uploadData;
    const isNativeFile = Platform.OS !== 'web' && typeof uri === 'string' && uri.startsWith('file://');

    if (isNativeFile) {
      uploadData = await readNativeFile(uri);
    } else {
      uploadData = await fetch(uri).then((r) => r.blob());
    }

    const { error } = await supabase.storage.from('media').upload(path, uploadData, { contentType, upsert: false });
    if (error) throw error;

    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return { uri: data?.publicUrl || uri };
  } catch {
    return { uri };
  }
}
