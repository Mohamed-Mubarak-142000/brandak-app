import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { api } from './client';
import type { UploadPurpose, UploadResult } from './types';

export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}

/** Opens the photo library (no permission prompt needed on modern iOS/Android pickers). */
export async function pickImages(opts: { multiple?: boolean; limit?: number; aspect?: [number, number] } = {}) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: opts.multiple,
    selectionLimit: opts.limit ?? 1,
    allowsEditing: !opts.multiple && !!opts.aspect,
    aspect: opts.aspect,
    quality: 0.8,
  });
  if (result.canceled) return [];
  return result.assets.map<PickedImage>((a, i) => ({
    uri: a.uri,
    name: a.fileName ?? `image-${Date.now()}-${i}.jpg`,
    type: a.mimeType ?? 'image/jpeg',
  }));
}

/** Two-step upload: POST /uploads, then send the returned `id` in the entity's *FileId field. */
export async function uploadFile(file: PickedImage, purpose: UploadPurpose) {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append('file', blob, file.name);
  } else {
    form.append('file', { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }
  form.append('purpose', purpose);
  return api.post<UploadResult>('/uploads', form);
}
