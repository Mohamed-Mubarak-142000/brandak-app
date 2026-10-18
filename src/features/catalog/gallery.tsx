import { Image } from 'expo-image';
import { ImageOff, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { IconButton, Tap, Text } from '@/ui';

const THUMB = 58;

/**
 * Product images in a rounded card: swipe between them, pick one from the thumbnail column on
 * the side, tap to open a full-screen pinch-to-zoom viewer. `children` floats on top (back,
 * share, wishlist).
 */
export function Gallery({ images, width, height, children }: { images: string[]; width: number; height: number; children?: React.ReactNode }) {
  const t = useTheme();
  const list = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const thumbs = images.length > 1;

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(Math.abs(e.nativeEvent.contentOffset.x) / width);
    if (i !== index) setIndex(i);
  };

  const go = (i: number) => {
    setIndex(i);
    list.current?.scrollToIndex({ index: i, animated: true });
  };

  return (
    <View style={[styles.card, { width, height, backgroundColor: t.c.accentSoft, borderRadius: t.radius.xl }]}>
      {images.length ? (
        <FlatList
          ref={list}
          horizontal
          pagingEnabled
          data={images}
          keyExtractor={(u, i) => `${u}-${i}`}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          onScroll={onScroll}
          scrollEventThrottle={32}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item, index: i }) => (
            <Tap pressScale={1} onPress={() => setZoom(i)} accessibilityLabel={`صورة ${i + 1} من ${images.length}، اضغط للتكبير`}>
              <Image source={item} style={{ width, height }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
            </Tap>
          )}
        />
      ) : (
        <View style={styles.empty}>
          <ImageOff size={40} color={t.c.lineStrong} />
          <Text variant="meta" color="ink3">
            مفيش صور للمنتج ده لسه
          </Text>
        </View>
      )}

      {thumbs && (
        <ScrollView
          style={[styles.thumbs, { top: 72, maxHeight: height - 72 - 16 }]}
          contentContainerStyle={styles.thumbsInner}
          showsVerticalScrollIndicator={false}
        >
          {images.map((u, i) => (
            <Tap
              key={`${u}-${i}`}
              onPress={() => go(i)}
              pressScale={0.95}
              accessibilityLabel={`عرض الصورة ${i + 1}`}
              accessibilityState={{ selected: i === index }}
              style={[
                styles.thumb,
                { borderRadius: t.radius.md, borderColor: i === index ? t.c.brand : t.c.surface, backgroundColor: t.c.surface },
              ]}
            >
              <Image source={u} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
            </Tap>
          ))}
        </ScrollView>
      )}

      {children}
      <ZoomViewer images={images} start={zoom} onClose={() => setZoom(null)} />
    </View>
  );
}

function ZoomViewer({ images, start, onClose }: { images: string[]; start: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  if (start === null) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.viewer}>
        <FlatList
          horizontal
          pagingEnabled
          data={images}
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          keyExtractor={(u, i) => `${u}-${i}`}
          renderItem={({ item }) => <ZoomableImage uri={item} width={width} height={height} />}
          showsHorizontalScrollIndicator={false}
        />
        <View style={[styles.close, { top: insets.top + 8 }]}>
          <IconButton icon={X} label="إغلاق" onPress={onClose} color="onAccent" background="overlay" />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ZoomableImage({ uri, width, height }: { uri: string; width: number; height: number }) {
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.set(Math.max(1, Math.min(4, saved.value * e.scale)));
    })
    .onEnd(() => {
      saved.set(scale.value);
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = scale.value > 1 ? 1 : 2.5;
      scale.set(withTiming(next, { duration: 220 }));
      saved.set(next);
    });
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, doubleTap)}>
      <Animated.View style={[{ width, height }, style]}>
        <Image source={uri} style={{ width, height }} contentFit="contain" />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', alignSelf: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  thumbs: { position: 'absolute', end: 12 },
  thumbsInner: { gap: 8 },
  thumb: { width: THUMB, height: THUMB * 1.15, borderWidth: 2, overflow: 'hidden' },
  viewer: { flex: 1, backgroundColor: '#000' },
  close: { position: 'absolute', end: 12 },
});
