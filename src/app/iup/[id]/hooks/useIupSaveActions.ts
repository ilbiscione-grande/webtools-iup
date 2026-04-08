import {
  AUTH_LOCAL_DRAFTS_KEY_PREFIX,
  FREE_SESSION_DRAFTS_KEY,
  customSuggestionsKey,
  defaultAssessment,
  encodeOtherNotesMeta,
  getReviewPointLabel,
  mergeUniqueSuggestions,
  type GoalRow,
  type Messages,
  type PlayerInfo,
  type ReviewCadenceKind,
  type ReviewPoint,
} from "@/lib/iup/editorUtils";
import {
  archiveIupPlan,
  deleteIupPlan,
  saveIupPlayerAssessment,
  saveUserGoalSuggestions,
  saveIupPlanEditor,
  updateIupPlayerProfile,
} from "@/lib/iupApi";
import { type GoalSuggestion, type PositionGroup } from "@/lib/goalSuggestions";

type LocalDraftSource = {
  mode: "FREE" | "AUTH";
  userId?: string | null;
} | null;

type UseIupSaveActionsArgs = {
  messages: Messages;
  planId: string;
  canEditPlan: boolean;
  canPlayerSelfAssess: boolean;
  canManagePlan: boolean;
  step: number;
  title: string;
  periodStart: string;
  periodEnd: string;
  cycleType: "year" | "season";
  cycleLabel: string;
  nowState: string;
  otherNotes: string;
  shortGoalsComment: string;
  longGoalsComment: string;
  reviewCount: number;
  reviewPoints: ReviewPoint[];
  reviewCadenceKind: ReviewCadenceKind;
  reviewCadenceConfig: Partial<Record<ReviewCadenceKind, { label: string; points: string[] }>>;
  selectedReviewPointId: string;
  selfAssessment: Array<{ area: string; score: number; note: string; coachScore?: number }>;
  shortGoals: GoalRow[];
  longGoals: GoalRow[];
  shortSuggestionFilter: PositionGroup;
  longSuggestionFilter: PositionGroup;
  customShortSuggestions: GoalSuggestion[];
  customLongSuggestions: GoalSuggestion[];
  playerInfo: PlayerInfo;
  localDraftSource: LocalDraftSource;
  persistCurrentReviewAnswers: () => void;
  setSaving: (value: boolean) => void;
  setStatus: (value: string | null) => void;
  setPlanStatus: (value: "active" | "completed" | "archived") => void;
  setCustomShortSuggestions: React.Dispatch<React.SetStateAction<GoalSuggestion[]>>;
  setCustomLongSuggestions: React.Dispatch<React.SetStateAction<GoalSuggestion[]>>;
  navigateHome: () => void;
};

export function useIupSaveActions(args: UseIupSaveActionsArgs) {
  const {
    messages,
    planId,
    canEditPlan,
    canPlayerSelfAssess,
    canManagePlan,
    step,
    title,
    periodStart,
    periodEnd,
    cycleType,
    cycleLabel,
    nowState,
    otherNotes,
    shortGoalsComment,
    longGoalsComment,
    reviewCount,
    reviewPoints,
    reviewCadenceKind,
    reviewCadenceConfig,
    selectedReviewPointId,
    selfAssessment,
    shortGoals,
    longGoals,
    shortSuggestionFilter,
    longSuggestionFilter,
    customShortSuggestions,
    customLongSuggestions,
    playerInfo,
    localDraftSource,
    persistCurrentReviewAnswers,
    setSaving,
    setStatus,
    setPlanStatus,
    setCustomShortSuggestions,
    setCustomLongSuggestions,
    navigateHome,
  } = args;

  const persistLocalDraft = async () => {
    const updated = {
      id: planId,
      playerName: playerInfo?.name?.trim() || messages.iup.unnamedPlayer,
      title: title.trim() || messages.iup.localDraftTitleFallback,
      mainFocus: shortGoals.find((goal) => goal.title.trim())?.title.trim() || "",
      currentLevel: nowState.trim(),
      targetLevel: longGoals.find((goal) => goal.title.trim())?.title.trim() || "",
      notes: encodeOtherNotesMeta(otherNotes, shortGoalsComment, longGoalsComment),
      createdAt: new Date().toISOString(),
    };

    if (localDraftSource?.mode === "AUTH" && localDraftSource.userId) {
      const key = AUTH_LOCAL_DRAFTS_KEY_PREFIX + localDraftSource.userId;
      const raw = window.localStorage.getItem(key);
      const list = raw ? (JSON.parse(raw) as Array<typeof updated>) : [];
      const next = Array.isArray(list)
        ? list.map((entry) => (entry.id === planId ? updated : entry))
        : [updated];
      window.localStorage.setItem(key, JSON.stringify(next));
    } else {
      const raw = window.sessionStorage.getItem(FREE_SESSION_DRAFTS_KEY);
      const list = raw ? (JSON.parse(raw) as Array<typeof updated>) : [];
      const next = Array.isArray(list)
        ? list.map((entry) => (entry.id === planId ? updated : entry))
        : [updated];
      window.sessionStorage.setItem(FREE_SESSION_DRAFTS_KEY, JSON.stringify(next));
    }
  };

  const savePlayerProfile = async () => {
    if (!playerInfo?.id) {
      return { ok: true } as const;
    }
    return updateIupPlayerProfile(playerInfo.id, {
      name: playerInfo.name,
      number: playerInfo.number,
      positionLabel: playerInfo.positionLabel,
      birthDate: playerInfo.birthDate,
      dominantFoot: playerInfo.dominantFoot,
      heightCm: playerInfo.heightCm,
      weightKg: playerInfo.weightKg,
      nationality: playerInfo.nationality,
      birthPlace: playerInfo.birthPlace,
      injuryNotes: playerInfo.injuryNotes,
      photoUrl: playerInfo.photoUrl,
    });
  };

  const buildPayload = (status: "active" | "completed") => ({
    planId,
    title,
    periodStart: periodStart || undefined,
    periodEnd: periodEnd || undefined,
    nowState,
    otherNotes: encodeOtherNotesMeta(otherNotes, shortGoalsComment, longGoalsComment),
    reviewCount,
    cycleType,
    cycleLabel,
    status,
    reviewPoints: reviewPoints.map((point, index) => ({
      id: point.id || `rp-${index + 1}`,
      label: getReviewPointLabel(
        point,
        index,
        reviewCadenceKind,
        reviewCadenceConfig,
        messages.iup.sessionPrefix
      ),
      dueDate: point.dueDate || undefined,
      note: point.note,
      completedAt: point.completedAt,
      unlockedForEdit: point.unlockedForEdit,
      skipped: point.skipped,
      nowState: point.id === selectedReviewPointId ? nowState : point.nowState ?? "",
      selfAssessment:
        point.id === selectedReviewPointId
          ? selfAssessment.map((entry) => ({ ...entry }))
          : point.selfAssessment?.map((entry) => ({ ...entry })) ?? defaultAssessment(),
    })),
    selfAssessment: selfAssessment.map((entry) => ({
      area: entry.area,
      score: entry.score,
      note: entry.note,
      coachScore: entry.coachScore,
    })),
    shortGoals: shortGoals.filter((goal) => goal.title.trim() || goal.description.trim()),
    longGoals: longGoals.filter((goal) => goal.title.trim() || goal.description.trim()),
  });

  const persistCustomSuggestions = () => {
    const toCustomSuggestions = (
      goals: GoalRow[],
      fallbackGroup: PositionGroup
    ): GoalSuggestion[] =>
      goals
        .filter((goal) => goal.title.trim() && goal.description.trim())
        .map((goal) => ({
          title: goal.title.trim(),
          description: goal.description.trim(),
          groups: fallbackGroup === "all" ? ["all"] : ["all", fallbackGroup],
        }));

    const nextCustomShort = mergeUniqueSuggestions(
      customShortSuggestions,
      toCustomSuggestions(shortGoals, shortSuggestionFilter)
    );
    const nextCustomLong = mergeUniqueSuggestions(
      customLongSuggestions,
      toCustomSuggestions(longGoals, longSuggestionFilter)
    );

    const persistLocalSuggestions = () => {
      if (typeof window === "undefined") {
        return;
      }
      window.localStorage.setItem(
        customSuggestionsKey("short"),
        JSON.stringify(nextCustomShort)
      );
      window.localStorage.setItem(
        customSuggestionsKey("long"),
        JSON.stringify(nextCustomLong)
      );
      setCustomShortSuggestions(nextCustomShort);
      setCustomLongSuggestions(nextCustomLong);
    };

    const persistRemoteSuggestions = async () => {
      const [shortResult, longResult] = await Promise.all([
        saveUserGoalSuggestions({
          horizon: "short",
          suggestions: nextCustomShort.map((entry) => ({
            horizon: "short",
            title: entry.title,
            description: entry.description,
            groups: entry.groups,
          })),
        }),
        saveUserGoalSuggestions({
          horizon: "long",
          suggestions: nextCustomLong.map((entry) => ({
            horizon: "long",
            title: entry.title,
            description: entry.description,
            groups: entry.groups,
          })),
        }),
      ]);
      if (!shortResult.ok) {
        throw new Error(shortResult.error);
      }
      if (!longResult.ok) {
        throw new Error(longResult.error);
      }
      setCustomShortSuggestions(nextCustomShort);
      setCustomLongSuggestions(nextCustomLong);
    };

    if (localDraftSource?.mode === "FREE") {
      persistLocalSuggestions();
      return Promise.resolve();
    }

    return persistRemoteSuggestions();
  };

  const onSave = async () => {
    if (!planId) {
      return;
    }
    if (!canEditPlan) {
      if (!canPlayerSelfAssess) {
        setStatus(messages.iup.noPermissionSave);
        return;
      }
    }
    persistCurrentReviewAnswers();

    if (localDraftSource) {
      setSaving(true);
      try {
        await persistLocalDraft();
        await persistCustomSuggestions();
        setStatus(messages.iup.localDraftSaved);
      } catch (saveError) {
        setStatus(
          saveError instanceof Error ? saveError.message : messages.iup.couldNotSaveLocalDraft
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!canEditPlan && canPlayerSelfAssess) {
      setSaving(true);
      const result = await saveIupPlayerAssessment({
        planId,
        nowState,
        selfAssessment: selfAssessment.map((entry) => ({
          area: entry.area,
          score: entry.score,
          note: entry.note,
          coachScore: entry.coachScore,
        })),
        selectedReviewPointId,
        reviewNowState: nowState,
        reviewSelfAssessment: selfAssessment.map((entry) => ({
          area: entry.area,
          score: entry.score,
          note: entry.note,
          coachScore: entry.coachScore,
        })),
      });
      setSaving(false);
      if (!result.ok) {
        setStatus(result.error);
        return;
      }
      setStatus(messages.iup.saved);
      return;
    }

    setSaving(true);
    const profileResult = await savePlayerProfile();
    if (!profileResult.ok) {
      setSaving(false);
      setStatus(profileResult.error);
      return;
    }
    const result = await saveIupPlanEditor(buildPayload("active"));
    if (!result.ok) {
      setSaving(false);
      setStatus(result.error);
      return;
    }
    try {
      await persistCustomSuggestions();
    } catch (persistError) {
      setSaving(false);
      setStatus(
        persistError instanceof Error
          ? persistError.message
          : messages.iup.couldNotSaveSuggestions
      );
      return;
    }
    setSaving(false);
    setStatus(messages.iup.saved);
    setPlanStatus("active");
  };

  const onComplete = async () => {
    if (!planId || !canEditPlan) {
      return;
    }
    if (step !== 4) {
      setStatus(messages.iup.finishGuideBeforeComplete);
      return;
    }
    persistCurrentReviewAnswers();
    setSaving(true);
    const profileResult = await savePlayerProfile();
    if (!profileResult.ok) {
      setSaving(false);
      setStatus(profileResult.error);
      return;
    }
    const result = await saveIupPlanEditor(buildPayload("completed"));
    if (!result.ok) {
      setSaving(false);
      setStatus(result.error);
      return;
    }
    try {
      await persistCustomSuggestions();
    } catch (persistError) {
      setSaving(false);
      setStatus(
        persistError instanceof Error
          ? persistError.message
          : messages.iup.couldNotSaveSuggestions
      );
      return;
    }
    setSaving(false);
    setPlanStatus("completed");
    setStatus(messages.iup.markedComplete);
  };

  const onArchive = async () => {
    if (!planId || !canManagePlan) {
      return;
    }
    const ok = window.confirm(messages.iup.archiveConfirm);
    if (!ok) {
      return;
    }
    setSaving(true);
    const result = await archiveIupPlan(planId);
    setSaving(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setPlanStatus("archived");
    setStatus(messages.iup.archived);
  };

  const onDelete = async () => {
    if (!planId || !canManagePlan) {
      return;
    }
    const ok = window.confirm(messages.iup.deleteConfirm);
    if (!ok) {
      return;
    }
    setSaving(true);
    const result = await deleteIupPlan(planId);
    setSaving(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    navigateHome();
  };

  return { onSave, onComplete, onArchive, onDelete };
}
