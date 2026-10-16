import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Illustration, Sheet, Text } from '@/ui';
import { useAuthPrompt } from './use-auth';

/** "Sign in to continue" — shown when a guest tries something that needs an account. */
export function AuthPromptSheet() {
  const router = useRouter();
  const { open, reason, close } = useAuthPrompt();
  const go = (path: '/(auth)/login' | '/(auth)/register') => {
    close();
    router.push(path);
  };
  return (
    <Sheet open={open} onClose={close}>
      <View style={styles.center}>
        <Illustration name="bag" size={140} />
        <Text variant="section" align="center">
          سجّل عشان تكمل
        </Text>
        <Text variant="body" color="ink2" align="center">
          {reason || 'محتاج حساب عشان تعمل الخطوة دي.'} التسجيل بياخد أقل من دقيقة.
        </Text>
      </View>
      <Button label="إنشاء حساب جديد" onPress={() => go('/(auth)/register')} />
      <Button label="عندي حساب، سجّل دخول" variant="secondary" onPress={() => go('/(auth)/login')} />
    </Sheet>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', gap: 8, paddingBottom: 8 } });
