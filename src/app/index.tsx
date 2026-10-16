import { Redirect } from 'expo-router';

import { PREF, prefs } from '@/lib/storage';

/** Entry gate: first launch → onboarding; afterwards straight to the store (guests welcome). */
export default function Index() {
  return <Redirect href={prefs.get(PREF.onboardingDone, false) ? '/(tabs)' : '/onboarding'} />;
}
