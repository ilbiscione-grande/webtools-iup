import { useEffect, useMemo, useState } from "react";
import {
  defaultAssessment,
  inferReviewCadenceKind,
  normalizeAssessment,
  suggestedReviewPeriod,
  type AssessmentRow,
  type Messages,
  type ReviewCadenceKind,
  type ReviewPoint,
} from "@/lib/iup/editorUtils";

type UseIupReviewStateArgs = {
  messages: Messages;
  canEditPlan: boolean;
  periodStart: string;
  periodEnd: string;
  reviewCadenceConfig: Partial<Record<ReviewCadenceKind, { label: string; points: string[] }>>;
};

export function useIupReviewState(args: UseIupReviewStateArgs) {
  const { messages, canEditPlan, periodStart, periodEnd, reviewCadenceConfig } = args;

  const [nowState, setNowState] = useState("");
  const [selfAssessment, setSelfAssessment] = useState<AssessmentRow[]>(
    defaultAssessment()
  );
  const [reviewCount, setReviewCount] = useState(3);
  const [reviewPoints, setReviewPoints] = useState<ReviewPoint[]>([]);
  const [selectedReviewPointId, setSelectedReviewPointId] = useState("");

  const activeReviewPoint = useMemo(
    () => reviewPoints.find((point) => point.id === selectedReviewPointId) ?? null,
    [reviewPoints, selectedReviewPointId]
  );
  const activeReviewPointIndex = useMemo(
    () => reviewPoints.findIndex((point) => point.id === selectedReviewPointId),
    [reviewPoints, selectedReviewPointId]
  );
  const activeReviewPointEditable = useMemo(
    () =>
      !activeReviewPoint?.skipped &&
      (!activeReviewPoint?.completedAt || !!activeReviewPoint?.unlockedForEdit),
    [activeReviewPoint]
  );
  const reviewCadenceKind = useMemo<ReviewCadenceKind>(
    () => inferReviewCadenceKind(reviewCount),
    [reviewCount]
  );
  const reviewCadenceLabel = useMemo(
    () =>
      reviewCadenceConfig[reviewCadenceKind]?.label ??
      `${reviewCount} ${messages.iup.sessionCountSuffix}`,
    [messages.iup.sessionCountSuffix, reviewCadenceConfig, reviewCadenceKind, reviewCount]
  );

  const persistCurrentReviewAnswers = (overrideId?: string) => {
    const targetId = overrideId ?? selectedReviewPointId;
    if (!targetId) {
      return;
    }
    setReviewPoints((current) =>
      current.map((point) =>
        point.id === targetId
          ? {
              ...point,
              nowState,
              selfAssessment: selfAssessment.map((entry) => ({ ...entry })),
            }
          : point
      )
    );
  };

  useEffect(() => {
    if (!selectedReviewPointId) {
      return;
    }
    const selected = reviewPoints.find((point) => point.id === selectedReviewPointId);
    if (!selected) {
      return;
    }
    setNowState(selected.nowState ?? "");
    setSelfAssessment(normalizeAssessment(selected.selfAssessment));
  }, [reviewPoints, selectedReviewPointId]);

  const updateAssessment = (
    index: number,
    field: "score" | "note" | "coachScore",
    value: string | number
  ) => {
    setSelfAssessment((current) => {
      const next = [...current];
      next[index] = { ...next[index], [field]: value } as AssessmentRow;
      return next;
    });
  };

  const onSelectReviewPoint = (nextId: string) => {
    if (!nextId || nextId === selectedReviewPointId) {
      return;
    }
    persistCurrentReviewAnswers();
    setSelectedReviewPointId(nextId);
  };

  const onCompleteReviewPoint = (setStatus: (value: string) => void) => {
    if (!canEditPlan || !activeReviewPoint || activeReviewPoint.skipped) {
      return;
    }
    persistCurrentReviewAnswers(activeReviewPoint.id);
    const nextIndex = reviewPoints.findIndex(
      (point, index) =>
        index > activeReviewPointIndex && !point.skipped && !point.completedAt
    );
    setReviewPoints((current) =>
      current.map((point, index) => {
        if (point.id === activeReviewPoint.id) {
          return {
            ...point,
            completedAt: new Date().toISOString(),
            unlockedForEdit: false,
          };
        }
        if (nextIndex >= 0 && index === nextIndex && !point.dueDate) {
          return {
            ...point,
            dueDate: suggestedReviewPeriod(
              index,
              current.length,
              periodStart,
              periodEnd,
              reviewCadenceKind
            ),
          };
        }
        return point;
      })
    );
    if (nextIndex >= 0 && nextIndex < reviewPoints.length) {
      setSelectedReviewPointId(reviewPoints[nextIndex]?.id ?? selectedReviewPointId);
      const suggested = suggestedReviewPeriod(
        nextIndex,
        reviewPoints.length,
        periodStart,
        periodEnd,
        reviewCadenceKind
      );
      setStatus(
        suggested
          ? `${messages.iup.reviewMarkedDoneWithSuggestion} ${suggested}.`
          : messages.iup.reviewMarkedDone
      );
      return;
    }
    setStatus(messages.iup.lastReviewDone);
  };

  const onUnlockReviewPoint = (setStatus: (value: string) => void) => {
    if (!canEditPlan || !activeReviewPoint) {
      return;
    }
    setReviewPoints((current) =>
      current.map((point) =>
        point.id === activeReviewPoint.id ? { ...point, unlockedForEdit: true } : point
      )
    );
    setStatus(messages.iup.reviewUnlocked);
  };

  const onToggleSkipReviewPoint = (pointId: string) => {
    if (!canEditPlan) {
      return;
    }
    setReviewPoints((current) =>
      current.map((point) => {
        if (point.id !== pointId) {
          return point;
        }
        const nextSkipped = !point.skipped;
        return {
          ...point,
          skipped: nextSkipped,
          completedAt: nextSkipped ? undefined : point.completedAt,
          unlockedForEdit: nextSkipped ? false : point.unlockedForEdit,
        };
      })
    );
    if (activeReviewPoint?.id === pointId && !activeReviewPoint.skipped) {
      const nextOpen = reviewPoints.find(
        (point) => point.id !== pointId && !point.skipped && !point.completedAt
      );
      if (nextOpen) {
        setSelectedReviewPointId(nextOpen.id);
      }
    }
  };

  const onChangeReviewPointPeriod = (pointId: string, value: string) => {
    if (!canEditPlan) {
      return;
    }
    setReviewPoints((current) =>
      current.map((point) => (point.id === pointId ? { ...point, dueDate: value } : point))
    );
  };

  const onApplySuggestedReviewDate = (pointId: string, index: number) => {
    if (!canEditPlan) {
      return;
    }
    const suggestion = suggestedReviewPeriod(
      index,
      reviewPoints.length,
      periodStart,
      periodEnd,
      reviewCadenceKind
    );
    if (!suggestion) {
      return;
    }
    setReviewPoints((current) =>
      current.map((point) =>
        point.id === pointId ? { ...point, dueDate: suggestion } : point
      )
    );
  };

  return {
    nowState,
    selfAssessment,
    reviewCount,
    reviewPoints,
    selectedReviewPointId,
    activeReviewPoint,
    activeReviewPointEditable,
    reviewCadenceKind,
    reviewCadenceLabel,
    setNowState,
    setSelfAssessment,
    setReviewCount,
    setReviewPoints,
    setSelectedReviewPointId,
    persistCurrentReviewAnswers,
    updateAssessment,
    onSelectReviewPoint,
    onCompleteReviewPoint,
    onUnlockReviewPoint,
    onToggleSkipReviewPoint,
    onChangeReviewPointPeriod,
    onApplySuggestedReviewDate,
  };
}
