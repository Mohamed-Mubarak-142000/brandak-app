import { Image } from 'expo-image';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Modal, StyleSheet, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { IconButton, Tap } from '@/ui';

/** Swipeable product images with dots; tap opens a full-screen pinch-to-zoom viewer. */
export function Gallery({ images, height }: { images: string[]; height: number }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const list = images.length ? images : [null];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(Math.abs(e.nativeEvent.contentOffset.x) / width);
    if (i !== index) setIndex(i);
  };

  return (
    <View style={{ height, backgroundColor: t.c.sunken }}>
      <FlatList
        horizontal
        pagingEnabled
        data={list}
        keyExtractor={(u, i) => `${u}-${i}`}
        onScroll={onScroll}
        scrollEventThrottle={32}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item, index: i }) => (
          <Tap pressScale={1} onPress={() => item && setZoom(i)} accessibilityLabel={`صورة ${i + 1} من ${list.length}، اضغط للتكبير`}>
            <Image source={item} style={{ width, height }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
          </Tap>
        )}
      />
      {list.length > 1 && (
        <View style={styles.dots} pointerEvents="none">
          {list.map((_, i) => (
            <View key={i} style={[styles.dot, { backgroundColor: i === index ? t.c.brand : 'rgba(255,255,255,0.8)', width: i === index ? 20 : 7 }]} />
          ))}
        </View>
      )}
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
  dots: { position: 'absolute', bottom: 14, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  dot: { height: 7, borderRadius: 4 },
  viewer: { flex: 1, backgroundColor: '#000' },
  close: { position: 'absolute', end: 12 },
});
