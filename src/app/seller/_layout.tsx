import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/auth/session';
import { useTheme } from '@/theme';

/** Seller area: signed-in users only. The desk itself checks the brand state. */
export default function SellerLayout() {
  const t = useTheme();
  const status = useSession((s) => s.status);
  if (status === 'guest') return <Redirect href="/(auth)/login" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.c.ground }, animation: 'slide_from_right' }} />;
}
