import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { api, ApiError } from './client';
import type { UploadPurpose, UploadResult } from './types';

export interface PickedImage {
  uri: string;
  name: string;
  type: string;
  width?: number;
  height?: number;
}

/** Opens the photo library (no permission prompt needed on modern iOS/Android pickers). */
export async function pickImages(opts: { multiple?: boolean; limit?: number; aspect?: [number, number] } = {}) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: opts.multiple,
    selectionLimit: opts.limit ?? 1,
    allowsEditing: !opts.multiple && !!opts.aspect,
    aspect: opts.aspect,
    quality: 1,
  });
  if (result.canceled) return [];
  return result.assets.map<PickedImage>((a, i) => ({
    uri: a.uri,
    name: a.fileName ?? `image-${Date.now()}-${i}.jpg`,
    type: a.mimeType ?? 'image/jpeg',
    width: a.width,
    height: a.height,
  }));
}

/** Longest side after resizing. Enough for full-screen zoom, small enough to upload on mobile data. */
const MAX_SIDE = 1600;

/**
 * Phone photos are 3–12 MB (and sometimes HEIC). The API takes ≤ 4 MB JPEG/PNG/WEBP and the
 * hosting platform drops larger bodies mid-upload — which surfaces as a "network" error. So every
 * image is resized and re-encoded as JPEG (~200–600 KB) before it leaves the phone.
 */
async function compress(file: PickedImage): Promise<PickedImage> {
  const ctx = ImageManipulator.manipulate(file.uri);
  const w = file.width ?? 0;
  const h = file.height ?? 0;
  if (w > MAX_SIDE || h > MAX_SIDE) ctx.resize(w >= h ? { width: MAX_SIDE } : { height: MAX_SIDE });
  const image = await ctx.renderAsync();
  const out = await image.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
  return { uri: out.uri, name: file.name.replace(/\.\w+$/, '') + '.jpg', type: 'image/jpeg', width: out.width, height: out.height };
}

/** Two-step upload: POST /uploads, then send the returned `id` in the entity's *FileId field. */
export async function uploadFile(file: PickedImage, purpose: UploadPurpose) {
  let ready = file;
  try {
    ready = await compress(file);
  } catch {
    // Fall back to the original; the API will say if it's too big or the wrong type.
  }

  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(ready.uri)).blob();
    form.append('file', blob, ready.name);
  } else {
    form.append('file', { uri: ready.uri, name: ready.name, type: ready.type } as unknown as Blob);
  }
  form.append('purpose', purpose);
  try {
    return await api.post<UploadResult>('/uploads', form);
  } catch (e) {
    // A dropped upload looks like "no internet"; say what most likely happened instead.
    if (e instanceof ApiError && e.code === 'NETWORK') {
      throw new ApiError(0, 'UPLOAD_FAILED', 'تعذّر رفع الصورة. تأكد من الاتصال وجرّب صورة تانية أو أصغر');
    }
    throw e;
  }
}
