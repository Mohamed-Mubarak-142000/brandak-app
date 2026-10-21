import { Image } from 'expo-image';
import { View } from 'react-native';

/** App mark, with the app-icon safe padding cropped in the UI. */
export function BrandMark({ size = 64, color }: { size?: number; color?: string }) {
  const imageSize = size / 0.8;
  return (
    <View style={{ width: size, height: size, overflow: 'hidden' }}>
      <Image
        source={require('../../assets/brand/fatrina-mark.png')}
        style={{ width: imageSize, height: imageSize, position: 'absolute', left: (size - imageSize) / 2, top: (size - imageSize) / 2 }}
        contentFit="contain"
        tintColor={color}
        accessibilityLabel="فاترينة"
        accessibilityRole="image"
      />
    </View>
  );
}
