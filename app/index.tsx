import { Redirect } from 'expo-router';

import { useAppStore } from '@/state/useAppStore';

export default function Index() {
  const onboardingComplete = useAppStore((state) => state.onboardingComplete);
  const hasActiveTimer = useAppStore(
    (state) => Boolean(state.activeAttemptId && state.activePlan && state.timerEndsAt),
  );
  return (
    <Redirect href={!onboardingComplete ? '/onboarding' : hasActiveTimer ? '/timer' : '/(tabs)'} />
  );
}
