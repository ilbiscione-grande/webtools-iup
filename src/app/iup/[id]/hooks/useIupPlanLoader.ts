import { useEffect } from "react";
import {
  AUTH_LOCAL_DRAFTS_KEY_PREFIX,
  FREE_SESSION_DRAFTS_KEY,
  buildReviewPoints,
  decodeOtherNotesMeta,
  defaultAssessment,
  getSeasonDefaults,
  inferPositionGroup,
  normalizeAssessment,
  type GoalRow,
  type Messages,
  type PlayerInfo,
  type ReviewPoint,
} from "@/lib/iup/editorUtils";
import { fetchIupPlanEditor } from "@/lib/iupApi";
import { supabase } from "@/lib/supabaseClient";
import { type PositionGroup } from "@/lib/goalSuggestions";

type LocalDraftSource = {
  mode: "FREE" | "AUTH";
  userId?: string | null;
} | null;

type LocalDraftEntry = {
  id: string;
  playerName: string;
  title: string;
  mainFocus: string;
  currentLevel: string;
  targetLevel: string;
  notes: string;
  createdAt: string;
};

type UseIupPlanLoaderArgs = {
  planId: string;
  messages: Messages;
  setLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  setStatus: (value: string | null) => void;
  setLocalDraftSource: (value: LocalDraftSource) => void;
  setPlanCreatedBy: (value: string | null) => void;
  setTitle: (value: string) => void;
  setPlanStatus: (value: "active" | "completed" | "archived") => void;
  setPeriodStart: (value: string) => void;
  setPeriodEnd: (value: string) => void;
  setCycleType: (value: "year" | "season") => void;
  setCycleLabel: (value: string) => void;
  setOtherNotes: (value: string) => void;
  setShortGoalsComment: (value: string) => void;
  setLongGoalsComment: (value: string) => void;
  setReviewCount: (value: number) => void;
  setReviewPoints: (value: ReviewPoint[]) => void;
  setSelectedReviewPointId: (value: string) => void;
  setNowState: (value: string) => void;
  setSelfAssessment: (value: ReturnType<typeof defaultAssessment>) => void;
  setShortGoals: (value: GoalRow[]) => void;
  setLongGoals: (value: GoalRow[]) => void;
  setPlayerInfo: (value: PlayerInfo) => void;
  setPhotoLinkDraft: (value: string) => void;
  setShortSuggestionFilter: (value: PositionGroup) => void;
  setLongSuggestionFilter: (value: PositionGroup) => void;
};

export function useIupPlanLoader(args: UseIupPlanLoaderArgs) {
  const {
    planId,
    messages,
    setLoading,
    setError,
    setStatus,
    setLocalDraftSource,
    setPlanCreatedBy,
    setTitle,
    setPlanStatus,
    setPeriodStart,
    setPeriodEnd,
    setCycleType,
    setCycleLabel,
    setOtherNotes,
    setShortGoalsComment,
    setLongGoalsComment,
    setReviewCount,
    setReviewPoints,
    setSelectedReviewPointId,
    setNowState,
    setSelfAssessment,
    setShortGoals,
    setLongGoals,
    setPlayerInfo,
    setPhotoLinkDraft,
    setShortSuggestionFilter,
    setLongSuggestionFilter,
  } = args;

  useEffect(() => {
    const load = async () => {
      if (!planId) {
        setError(messages.iup.missingId);
        setLoading(false);
        return;
      }
      setLoading(true);
      const result = await fetchIupPlanEditor(planId);
      setLoading(false);
      if (!result.ok) {
        try {
          let localDraft: LocalDraftEntry | null = null;
          let source: LocalDraftSource = null;

          const freeRaw = window.sessionStorage.getItem(FREE_SESSION_DRAFTS_KEY);
          if (freeRaw) {
            const freeList = JSON.parse(freeRaw) as LocalDraftEntry[];
            if (Array.isArray(freeList)) {
              localDraft = freeList.find((entry) => entry?.id === planId) ?? null;
              if (localDraft) {
                source = { mode: "FREE" };
              }
            }
          }

          if (!localDraft && supabase) {
            const { data } = await supabase.auth.getUser();
            const authUserId = data.user?.id;
            if (authUserId) {
              const authRaw = window.localStorage.getItem(
                AUTH_LOCAL_DRAFTS_KEY_PREFIX + authUserId
              );
              if (authRaw) {
                const authList = JSON.parse(authRaw) as LocalDraftEntry[];
                if (Array.isArray(authList)) {
                  localDraft = authList.find((entry) => entry?.id === planId) ?? null;
                  if (localDraft) {
                    source = { mode: "AUTH", userId: authUserId };
                  }
                }
              }
            }
          }

          if (!localDraft) {
            setError(result.error);
            return;
          }

          const year = new Date().getFullYear();
          const defaults = getSeasonDefaults(year);
          const baseAssessment = defaultAssessment();
          const decodedDraftNotes = decodeOtherNotesMeta(localDraft.notes || "");
          const draftPoints = buildReviewPoints(
            3,
            defaults.periodStart,
            defaults.periodEnd,
            undefined,
            messages.iup.sessionPrefix
          ).map((point, idx) => ({
            ...point,
            nowState: idx === 0 ? localDraft.currentLevel || "" : "",
            selfAssessment: baseAssessment.map((entry) => ({ ...entry })),
          }));

          setLocalDraftSource(source);
          setPlanCreatedBy(null);
          setTitle(localDraft.title || messages.iup.localDraftTitleFallback);
          setPlanStatus("active");
          setPeriodStart(defaults.periodStart);
          setPeriodEnd(defaults.periodEnd);
          setCycleType("season");
          setCycleLabel(defaults.cycleLabel);
          setOtherNotes(decodedDraftNotes.otherNotes);
          setShortGoalsComment(decodedDraftNotes.shortGoalsComment);
          setLongGoalsComment(decodedDraftNotes.longGoalsComment);
          setReviewCount(3);
          setReviewPoints(draftPoints);
          setSelectedReviewPointId(draftPoints[0]?.id ?? "");
          setNowState(draftPoints[0]?.nowState ?? "");
          setSelfAssessment(
            draftPoints[0]?.selfAssessment?.map((entry) => ({ ...entry })) ?? baseAssessment
          );
          setShortGoals(
            localDraft.mainFocus?.trim()
              ? [{ title: localDraft.mainFocus.trim(), description: "" }]
              : []
          );
          setLongGoals(
            localDraft.targetLevel?.trim()
              ? [{ title: localDraft.targetLevel.trim(), description: "" }]
              : []
          );
          setPlayerInfo({
            name: localDraft.playerName || messages.iup.unnamedPlayer,
            teamName:
              source?.mode === "AUTH"
                ? messages.iup.authLocalTeam
                : messages.iup.freeTemporaryTeam,
          });
          setPhotoLinkDraft("");
          setShortSuggestionFilter("all");
          setLongSuggestionFilter("all");
          setError(null);
          setStatus(messages.iup.localDraftModeSavedDevice);
          return;
        } catch {
          setError(result.error);
          return;
        }
      }

      setLocalDraftSource(null);
      const { plan, goals, player } = result.data;
      const start = plan.periodStart ?? "";
      const end = plan.periodEnd ?? "";
      const count = plan.reviewCount ?? 3;
      const decodedPlanNotes = decodeOtherNotesMeta(plan.otherNotes ?? "");
      const baseAssessment = normalizeAssessment(plan.selfAssessment ?? []);
      const loadedReviewPoints = buildReviewPoints(
        count,
        start,
        end,
        (plan.reviewPoints ?? []).map((point) => ({
          id: point.id,
          label: point.label,
          dueDate: point.dueDate ?? "",
          note: point.note,
          nowState: point.nowState ?? "",
          completedAt: point.completedAt,
          unlockedForEdit: point.unlockedForEdit ?? false,
          skipped: point.skipped ?? false,
          selfAssessment:
            point.selfAssessment?.map((entry) => ({
              area: entry.area,
              score: Math.min(5, Math.max(1, entry.score || 3)),
              note: entry.note,
              coachScore:
                typeof entry.coachScore === "number"
                  ? Math.min(5, Math.max(1, entry.coachScore))
                  : undefined,
            })) ?? undefined,
        })),
        messages.iup.sessionPrefix
      );
      const normalizedReviewPoints = loadedReviewPoints.map((point, idx) => ({
        ...point,
        nowState: point.nowState ?? (idx === 0 ? plan.nowState ?? "" : ""),
        unlockedForEdit: point.unlockedForEdit ?? false,
        skipped: point.skipped ?? false,
        selfAssessment:
          normalizeAssessment(point.selfAssessment ?? baseAssessment).map((entry) => ({
            ...entry,
          })),
      }));
      const short = goals
        .filter((goal) => goal.horizon === "short")
        .map((goal) => ({
          id: goal.id,
          title: goal.title,
          description: goal.description,
        }));
      const long = goals
        .filter((goal) => goal.horizon === "long")
        .map((goal) => ({
          id: goal.id,
          title: goal.title,
          description: goal.description,
        }));
      const positionGroup = inferPositionGroup(player?.positionLabel);

      setPlanCreatedBy(plan.createdBy ?? null);
      setTitle(plan.title || "IUP Plan");
      setPlanStatus(
        plan.status === "archived"
          ? "archived"
          : plan.status === "completed"
            ? "completed"
            : "active"
      );
      setPeriodStart(start);
      setPeriodEnd(end);
      setCycleType(plan.cycleType ?? "season");
      setCycleLabel(plan.cycleLabel ?? "");
      setOtherNotes(decodedPlanNotes.otherNotes);
      setShortGoalsComment(decodedPlanNotes.shortGoalsComment);
      setLongGoalsComment(decodedPlanNotes.longGoalsComment);
      setReviewCount(count);
      setReviewPoints(normalizedReviewPoints);
      setSelectedReviewPointId(normalizedReviewPoints[0]?.id ?? "");
      setNowState(normalizedReviewPoints[0]?.nowState ?? "");
      setSelfAssessment(
        normalizeAssessment(normalizedReviewPoints[0]?.selfAssessment ?? baseAssessment)
      );
      setShortGoals(short.length > 0 ? short : []);
      setLongGoals(long.length > 0 ? long : []);
      setPlayerInfo(
        player
          ? {
              id: player.id,
              name: player.name,
              teamName: player.teamName,
              positionLabel: player.positionLabel,
              number: player.number,
              birthDate: player.birthDate,
              dominantFoot: player.dominantFoot,
              heightCm: player.heightCm,
              weightKg: player.weightKg,
              nationality: player.nationality,
              birthPlace: player.birthPlace,
              injuryNotes: player.injuryNotes,
              photoUrl: player.photoUrl,
            }
          : null
      );
      setPhotoLinkDraft(player?.photoUrl ?? "");
      setShortSuggestionFilter(positionGroup);
      setLongSuggestionFilter(positionGroup);
      setError(null);
      setStatus(null);
    };

    load();
  }, [
    messages.iup.authLocalTeam,
    messages.iup.freeTemporaryTeam,
    messages.iup.localDraftModeSavedDevice,
    messages.iup.localDraftTitleFallback,
    messages.iup.missingId,
    messages.iup.sessionPrefix,
    messages.iup.unnamedPlayer,
    planId,
    setCycleLabel,
    setCycleType,
    setError,
    setLoading,
    setLongGoals,
    setLongGoalsComment,
    setLongSuggestionFilter,
    setLocalDraftSource,
    setNowState,
    setOtherNotes,
    setPeriodEnd,
    setPeriodStart,
    setPhotoLinkDraft,
    setPlanCreatedBy,
    setPlanStatus,
    setPlayerInfo,
    setReviewCount,
    setReviewPoints,
    setSelectedReviewPointId,
    setSelfAssessment,
    setShortGoals,
    setShortGoalsComment,
    setShortSuggestionFilter,
    setStatus,
    setTitle,
  ]);
}
