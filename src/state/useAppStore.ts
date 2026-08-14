import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { InterventionPlan, RoadmapConcern, TaskAttempt, TaskRoadmap } from '@/domain';

const SHELL_KEY = 'hajimeru.shell.v1';

export interface AssessmentDraft {
  taskClarity?: boolean;
  aversion?: number;
  lowActivation?: number;
  rewardDistance?: number;
  timeAmbiguity?: number;
  cueWeakness?: number;
  competingReward?: number;
  eventCue?: string;
  competingAction?: string;
  /** A person-chosen reminder of why a small step matters; it never affects scoring. */
  valueAnchor?: string;
  /** Worry about forgetting, kept distinct from actual loss-of-track/cue difficulty. */
  forgettingWorry?: number;
  roadmapRequested?: boolean;
  desiredOutcome?: string;
  roadmapConcern?: RoadmapConcern;
  roadmapKnownContext?: string;
}

export interface ReflectionDraft {
  aversionAfter?: number;
  actualDifficulty?: number;
  continueDesire?: number;
}

interface ShellState {
  hydrated: boolean;
  onboardingComplete: boolean;
  largeText: boolean;
  reduceMotion: boolean;
  screenReaderOptimized: boolean;
  taskText: string;
  assessmentDraft: AssessmentDraft;
  selectedDurationMinutes: 1 | 3 | 5;
  activeAttemptId?: string;
  activePlan?: InterventionPlan;
  activeRoadmap?: TaskRoadmap;
  timerStartedAt?: string;
  timerEndsAt?: string;
  reflectionDraft: ReflectionDraft;
  initializeShell: () => Promise<void>;
  clearShellData: () => Promise<void>;
  finishOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  setAccessibilityShell: (value: {
    largeText: boolean;
    reduceMotion: boolean;
    screenReaderOptimized?: boolean;
  }) => Promise<void>;
  beginTask: (taskText: string) => void;
  updateAssessment: (patch: Partial<AssessmentDraft>) => void;
  setPlan: (plan: InterventionPlan) => void;
  setRoadmap: (roadmap?: TaskRoadmap) => void;
  prepareAttempt: (attemptId: string) => void;
  restoreAttempt: (attempt: TaskAttempt) => void;
  setDuration: (minutes: 1 | 3 | 5) => void;
  startTimer: (attemptId: string, startedAt: string, endsAt: string) => Promise<void>;
  clearTimer: () => Promise<void>;
  updateReflection: (patch: Partial<ReflectionDraft>) => void;
  resetFlow: () => Promise<void>;
}

type PersistedShell = Pick<
  ShellState,
  | 'onboardingComplete'
  | 'largeText'
  | 'reduceMotion'
  | 'screenReaderOptimized'
  | 'taskText'
  | 'assessmentDraft'
  | 'selectedDurationMinutes'
  | 'activeAttemptId'
  | 'activePlan'
  | 'activeRoadmap'
  | 'timerStartedAt'
  | 'timerEndsAt'
  | 'reflectionDraft'
>;

let persistenceQueue: Promise<void> = Promise.resolve();

function persistedSnapshot(state: ShellState): PersistedShell {
  return {
    onboardingComplete: state.onboardingComplete,
    largeText: state.largeText,
    reduceMotion: state.reduceMotion,
    screenReaderOptimized: state.screenReaderOptimized,
    taskText: state.taskText,
    assessmentDraft: state.assessmentDraft,
    selectedDurationMinutes: state.selectedDurationMinutes,
    activeAttemptId: state.activeAttemptId,
    activePlan: state.activePlan,
    activeRoadmap: state.activeRoadmap,
    timerStartedAt: state.timerStartedAt,
    timerEndsAt: state.timerEndsAt,
    reflectionDraft: state.reflectionDraft,
  };
}

function persistShell(state: ShellState): Promise<void> {
  const snapshot = persistedSnapshot(state);
  persistenceQueue = persistenceQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(SHELL_KEY, JSON.stringify(snapshot)));
  return persistenceQueue;
}

function isDuration(value: unknown): value is 1 | 3 | 5 {
  return value === 1 || value === 3 || value === 5;
}

export const useAppStore = create<ShellState>((set, get) => ({
  hydrated: false,
  onboardingComplete: false,
  largeText: false,
  reduceMotion: false,
  screenReaderOptimized: false,
  taskText: '',
  assessmentDraft: {},
  selectedDurationMinutes: 3,
  reflectionDraft: {},
  initializeShell: async () => {
    try {
      const raw = await AsyncStorage.getItem(SHELL_KEY);
      const parsed = raw
        ? (JSON.parse(raw) as Partial<PersistedShell>)
        : {};
      set({
        onboardingComplete: parsed.onboardingComplete === true,
        largeText: parsed.largeText === true,
        reduceMotion: parsed.reduceMotion === true,
        screenReaderOptimized: parsed.screenReaderOptimized === true,
        taskText: typeof parsed.taskText === 'string' ? parsed.taskText : '',
        assessmentDraft: parsed.assessmentDraft ?? {},
        selectedDurationMinutes: isDuration(parsed.selectedDurationMinutes)
          ? parsed.selectedDurationMinutes
          : 3,
        activeAttemptId:
          typeof parsed.activeAttemptId === 'string' ? parsed.activeAttemptId : undefined,
        activePlan: parsed.activePlan,
        activeRoadmap: parsed.activeRoadmap,
        timerStartedAt:
          typeof parsed.timerStartedAt === 'string' ? parsed.timerStartedAt : undefined,
        timerEndsAt: typeof parsed.timerEndsAt === 'string' ? parsed.timerEndsAt : undefined,
        reflectionDraft: parsed.reflectionDraft ?? {},
        hydrated: true,
      });
    } catch {
      set({ hydrated: true });
    }
  },
  clearShellData: async () => {
    persistenceQueue = persistenceQueue
      .catch(() => undefined)
      .then(() => AsyncStorage.removeItem(SHELL_KEY));
    await persistenceQueue;
    set({
      onboardingComplete: false,
      largeText: false,
      reduceMotion: false,
      screenReaderOptimized: false,
      taskText: '',
      assessmentDraft: {},
      selectedDurationMinutes: 3,
      activeAttemptId: undefined,
      activePlan: undefined,
      activeRoadmap: undefined,
      timerStartedAt: undefined,
      timerEndsAt: undefined,
      reflectionDraft: {},
    });
  },
  finishOnboarding: async () => {
    set({ onboardingComplete: true });
    await persistShell(get());
  },
  resetOnboarding: async () => {
    set({ onboardingComplete: false });
    await persistShell(get());
  },
  setAccessibilityShell: async ({ largeText, reduceMotion, screenReaderOptimized }) => {
    set({
      largeText,
      reduceMotion,
      ...(screenReaderOptimized === undefined ? {} : { screenReaderOptimized }),
    });
    await persistShell(get());
  },
  beginTask: (taskText) => {
    set({
      taskText: taskText.trim(),
      assessmentDraft: {},
      activePlan: undefined,
      activeRoadmap: undefined,
      activeAttemptId: undefined,
      timerStartedAt: undefined,
      timerEndsAt: undefined,
      reflectionDraft: {},
    });
    void persistShell(get());
  },
  updateAssessment: (patch) => {
    set((state) => ({ assessmentDraft: { ...state.assessmentDraft, ...patch } }));
    void persistShell(get());
  },
  setPlan: (activePlan) => {
    set({ activePlan });
    void persistShell(get());
  },
  setRoadmap: (activeRoadmap) => {
    set({ activeRoadmap });
    void persistShell(get());
  },
  prepareAttempt: (activeAttemptId) => {
    set({ activeAttemptId });
    void persistShell(get());
  },
  restoreAttempt: (attempt) => {
    const answers = attempt.assessment.answers;
    const timerEndsAt =
      attempt.startedAt && !attempt.endedAt
        ? new Date(
            new Date(attempt.startedAt).getTime() + attempt.plan.durationMinutes * 60_000,
          ).toISOString()
        : undefined;
    set({
      taskText: attempt.taskText,
      assessmentDraft: {
        taskClarity: answers.taskClarity ?? undefined,
        aversion: answers.aversion ?? undefined,
        lowActivation: answers.lowActivation ?? undefined,
        rewardDistance: answers.rewardDistance ?? undefined,
        timeAmbiguity: answers.timeAmbiguity ?? undefined,
        cueWeakness: answers.cueWeakness ?? undefined,
        competingReward: answers.competingReward ?? undefined,
        eventCue: attempt.plan.startCue,
        valueAnchor: attempt.plan.valueAnchor ?? undefined,
        roadmapRequested: attempt.roadmap !== undefined && attempt.roadmap !== null,
        desiredOutcome: attempt.roadmap?.goalState,
        roadmapConcern: attempt.roadmap?.consultation?.concern,
        roadmapKnownContext: attempt.roadmap?.consultation?.knownContext ?? undefined,
      },
      selectedDurationMinutes: attempt.plan.durationMinutes,
      activeAttemptId: attempt.id,
      activePlan: attempt.plan,
      activeRoadmap: attempt.roadmap ?? undefined,
      timerStartedAt: attempt.startedAt ?? undefined,
      timerEndsAt,
      reflectionDraft: {},
    });
    void persistShell(get());
  },
  setDuration: (selectedDurationMinutes) => {
    set({ selectedDurationMinutes });
    void persistShell(get());
  },
  startTimer: async (activeAttemptId, timerStartedAt, timerEndsAt) => {
    set({ activeAttemptId, timerStartedAt, timerEndsAt });
    await persistShell(get());
  },
  clearTimer: async () => {
    set({ timerStartedAt: undefined, timerEndsAt: undefined });
    await persistShell(get());
  },
  updateReflection: (patch) => {
    set((state) => ({ reflectionDraft: { ...state.reflectionDraft, ...patch } }));
    void persistShell(get());
  },
  resetFlow: async () => {
    set({
      taskText: '',
      assessmentDraft: {},
      selectedDurationMinutes: 3,
      activePlan: undefined,
      activeRoadmap: undefined,
      activeAttemptId: undefined,
      timerStartedAt: undefined,
      timerEndsAt: undefined,
      reflectionDraft: {},
    });
    await persistShell(get());
  },
}));
