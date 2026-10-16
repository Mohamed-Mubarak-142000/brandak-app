import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { ReemKufi_500Medium, ReemKufi_700Bold } from '@expo-google-fonts/reem-kufi';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { queryClient } from '@/api/query-client';
import { AuthPromptSheet } from '@/auth/auth-prompt';
import { useSession } from '@/auth/session';
import { AnimatedSplash } from '@/features/onboarding/animated-splash';
import { OfflineBanner } from '@/features/system/offline-banner';
import { ThemeProvider, useTheme } from '@/theme';
import { ToastHost } from '@/ui';

SplashScreen.preventAutoHideAsync();

/**
 * Last-resort screen for a render error anywhere in the app: shows what went wrong with a retry
 * instead of the process dying. Plain styles on purpose — the theme provider may be what failed.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);
  return (
    <View style={styles.crash}>
      <Text style={styles.crashTitle}>حصلت مشكلة غير متوقعة</Text>
      <Text style={styles.crashBody}>جرّب تاني، ولو المشكلة فضلت ابعتلنا الرسالة دي:</Text>
      <Text style={styles.crashCode} selectable>
        {error.message}
      </Text>
      <Pressable onPress={retry} style={styles.crashBtn} accessibilityRole="button">
        <Text style={styles.crashBtnText}>إعادة المحاولة</Text>
      </Pressable>
    </View>
  );
}

// Arabic-only app. The expo-localization plugin forces RTL in native builds; this covers Expo Go
// and the very first launch.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

function AppStack() {
  const t = useTheme();
  return (
    <>
      <StatusBar style={t.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: t.c.ground },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" options={{ presentation: 'modal' }} />
        <Stack.Screen name="order/success" options={{ animation: 'fade', gestureEnabled: false }} />
      </Stack>
      <AuthPromptSheet />
      <OfflineBanner />
      <ToastHost />
    </>
  );
}

export default function RootLayout() {
  const hydrate = useSession((s) => s.hydrate);
  const sessionReady = useSession((s) => s.status !== 'loading');
  const [splashDone, setSplashDone] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    ReemKufi_500Medium,
    ReemKufi_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });
  const ready = (fontsLoaded || !!fontError) && sessionReady;

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <View style={styles.flex}>
              {ready && <AppStack />}
              {!splashDone && <AnimatedSplash ready={ready} onDone={() => setSplashDone(true)} />}
            </View>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  crash: { flex: 1, backgroundColor: '#FEFCF7', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  crashTitle: { fontSize: 20, fontWeight: '700', color: '#2A1D14', textAlign: 'center' },
  crashBody: { fontSize: 15, color: '#5B4839', textAlign: 'center' },
  crashCode: { fontSize: 12, color: '#B42318', textAlign: 'center', writingDirection: 'ltr' },
  crashBtn: { marginTop: 8, backgroundColor: '#C2500F', paddingHorizontal: 24, height: 48, borderRadius: 10, justifyContent: 'center' },
  crashBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
