"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CurrentStateStep } from "./components/CurrentStateStep";
import { CheckinsSection } from "./components/CheckinsSection";
import { GoalsStep } from "./components/GoalsStep";
import { IupHeader } from "./components/IupHeader";
import { PlayerProfileStep } from "./components/PlayerProfileStep";
import { useIupAuthInit } from "./hooks/useIupAuthInit";
import { useIupPlanLoader } from "./hooks/useIupPlanLoader";
import { useIupPhotoState } from "./hooks/useIupPhotoState";
import { useIupSaveActions } from "./hooks/useIupSaveActions";
import { useIupSuggestionsState } from "./hooks/useIupSuggestionsState";
import { SummaryStep } from "./components/SummaryStep";
import { useIupReviewState } from "./hooks/useIupReviewState";
import { useI18n } from "@/lib/i18n";
import {
  createIupCheckin,
  deleteIupCheckin,
  fetchIupCheckins,
  type IupCheckin,
} from "@/lib/iupApi";
import {
  getReviewCadenceConfig,
  type GoalRow,
  type PlayerInfo,
} from "@/lib/iup/editorUtils";

export default function IupPlanPage() {
  const { messages } = useI18n();
  const reviewCadenceConfig = useMemo(() => getReviewCadenceConfig(messages), [messages]);
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const planId = params?.id ?? "";
  const stepLabels = [
    messages.iup.playerProfile,
    messages.iup.currentState,
    messages.iup.shortGoals,
    messages.iup.longGoals,
    messages.iup.other,
  ] as const;
  const stepDescriptions = [
    messages.iup.photoHint,
    messages.iup.stepDescriptionCurrentState,
    messages.iup.stepDescriptionShortGoals,
    messages.iup.stepDescriptionLongGoals,
    messages.iup.stepDescriptionSummary,
  ] as const;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [checkins, setCheckins] = useState<IupCheckin[]>([]);
  const [checkinsLoading, setCheckinsLoading] = useState(false);
  const [checkinNote, setCheckinNote] = useState("");
  const [checkinRating, setCheckinRating] = useState("");
  const [checkinGoalId, setCheckinGoalId] = useState("");
  const [checkinReviewPointId, setCheckinReviewPointId] = useState("");

  const [title, setTitle] = useState("IUP Plan");
  const [planStatus, setPlanStatus] = useState<
    "active" | "completed" | "archived"
  >("active");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [cycleType, setCycleType] = useState<"year" | "season">("season");
  const [cycleLabel, setCycleLabel] = useState("");
  const [shortGoals, setShortGoals] = useState<GoalRow[]>([]);
  const [longGoals, setLongGoals] = useState<GoalRow[]>([]);
  const [otherNotes, setOtherNotes] = useState("");
  const [shortGoalsComment, setShortGoalsComment] = useState("");
  const [longGoalsComment, setLongGoalsComment] = useState("");
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo>(null);
  const [planCreatedBy, setPlanCreatedBy] = useState<string | null>(null);
  const [localDraftSource, setLocalDraftSource] = useState<{
    mode: "FREE" | "AUTH";
    userId?: string | null;
  } | null>(null);
  const filePickerRef = useRef<HTMLInputElement | null>(null);
  const cameraPickerRef = useRef<HTMLInputElement | null>(null);

  const {
    isSignedIn,
    signedInUserId,
    showCoachAssessment,
  } = useIupAuthInit();

  const {
    shortSuggestionFilter,
    longSuggestionFilter,
    shortCustomGoal,
    longCustomGoal,
    expandedShortSuggestions,
    expandedLongSuggestions,
    customShortSuggestions,
    customLongSuggestions,
    groupedShortSuggestions,
    groupedLongSuggestions,
    setShortSuggestionFilter,
    setLongSuggestionFilter,
    setShortCustomGoal,
    setLongCustomGoal,
    setExpandedShortSuggestions,
    setExpandedLongSuggestions,
    setCustomShortSuggestions,
    setCustomLongSuggestions,
    applySuggestion,
    isGoalSelected,
    toggleExpandedSuggestion,
    addCustomGoal,
  } = useIupSuggestionsState({ playerInfo, isSignedIn });

  const {
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
  } = useIupReviewState({
    messages,
    canEditPlan: Boolean(localDraftSource) || (!!isSignedIn && !!planCreatedBy && !!signedInUserId && signedInUserId === planCreatedBy),
    periodStart,
    periodEnd,
    reviewCadenceConfig,
  });

  const {
    showPhotoActions,
    showPhotoLinkInput,
    photoLinkDraft,
    setShowPhotoActions,
    setShowPhotoLinkInput,
    setPhotoLinkDraft,
    onSelectPhotoFile,
    onApplyPhotoLink,
    onRemovePhoto,
  } = useIupPhotoState({
    messages,
    setPlayerInfo,
    setStatus,
  });

  const canSave = useMemo(() => !!planId && !saving, [planId, saving]);

  useIupPlanLoader({
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
  });

  const removeGoal = (
    setter: React.Dispatch<React.SetStateAction<GoalRow[]>>,
    index: number
  ) => {
    setter((current) => current.filter((_, i) => i !== index));
  };
  const canManagePlan = useMemo(
    () =>
      !localDraftSource &&
      isSignedIn &&
      !!planCreatedBy &&
      !!signedInUserId &&
      signedInUserId === planCreatedBy,
    [isSignedIn, localDraftSource, planCreatedBy, signedInUserId]
  );
  const canEditPlan = useMemo(
    () => Boolean(localDraftSource) || canManagePlan,
    [localDraftSource, canManagePlan]
  );
  const isPlayerViewer = useMemo(
    () =>
      !localDraftSource &&
      !!signedInUserId &&
      !!playerInfo?.userId &&
      signedInUserId === playerInfo.userId &&
      !canManagePlan,
    [canManagePlan, localDraftSource, playerInfo?.userId, signedInUserId]
  );
  const canPlayerSelfAssess = useMemo(
    () => isPlayerViewer && activeReviewPointEditable && planStatus !== "archived",
    [activeReviewPointEditable, isPlayerViewer, planStatus]
  );
  const canCreateCheckin = useMemo(
    () => (canManagePlan || isPlayerViewer) && planStatus !== "archived",
    [canManagePlan, isPlayerViewer, planStatus]
  );
  const canEditCurrentStep = useMemo(
    () => canEditPlan || (step === 1 && canPlayerSelfAssess),
    [canEditPlan, canPlayerSelfAssess, step]
  );
  const { onSave, onComplete, onArchive, onDelete } = useIupSaveActions({
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
    navigateHome: () => router.push("/"),
  });
  const stepCompletion = useMemo(() => {
    const step0Complete = !!playerInfo?.name?.trim();
    const step1Complete = nowState.trim().length > 0;
    const step2Complete = shortGoals.some(
      (goal) => goal.title.trim() || goal.description.trim()
    );
    const step3Complete = longGoals.some(
      (goal) => goal.title.trim() || goal.description.trim()
    );
    return [step0Complete, step1Complete, step2Complete, step3Complete, true] as const;
  }, [longGoals, nowState, playerInfo?.name, shortGoals]);
  const stepProgress = useMemo(
    () => ((step + 1) / stepLabels.length) * 100,
    [step]
  );
  const checkinGoalOptions = useMemo(
    () =>
      [...shortGoals, ...longGoals].filter(
        (goal) => !!goal.id && !!(goal.title.trim() || goal.description.trim())
      ),
    [longGoals, shortGoals]
  );
  const nextStepLabel = useMemo(
    () => (step < stepLabels.length - 1 ? stepLabels[step + 1] : ""),
    [step]
  );
  const onSelectStep = (index: number) => {
    setStep(index);
    setStatus(null);
  };

  useEffect(() => {
    const loadCheckins = async () => {
      if (!planId || localDraftSource || !isSignedIn) {
        setCheckins([]);
        return;
      }
      setCheckinsLoading(true);
      const result = await fetchIupCheckins(planId);
      setCheckinsLoading(false);
      if (!result.ok) {
        setStatus(result.error);
        setCheckins([]);
        return;
      }
      setCheckins(result.checkins);
    };
    void loadCheckins();
  }, [isSignedIn, localDraftSource, planId]);

  const onCreateCheckin = async () => {
    const trimmed = checkinNote.trim();
    if (!trimmed || !planId || !canCreateCheckin) {
      return;
    }
    setSaving(true);
    const result = await createIupCheckin({
      planId,
      goalId: checkinGoalId || undefined,
      reviewPointId: checkinReviewPointId || undefined,
      note: trimmed,
      rating: checkinRating ? Number(checkinRating) : undefined,
      authorRole: isPlayerViewer ? "player" : "coach",
    });
    setSaving(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    const nextCheckins = await fetchIupCheckins(planId);
    if (!nextCheckins.ok) {
      setStatus(nextCheckins.error);
      return;
    }
    setCheckins(nextCheckins.checkins);
    setCheckinNote("");
    setCheckinRating("");
    setCheckinGoalId("");
    setCheckinReviewPointId("");
    setStatus(messages.iup.checkinSaved);
  };

  const onDeleteCheckin = async (checkinId: string) => {
    setSaving(true);
    const result = await deleteIupCheckin(checkinId);
    setSaving(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setCheckins((current) => current.filter((entry) => entry.id !== checkinId));
    setStatus(messages.iup.checkinDeleted);
  };
  return (
    <main className="app-shell iup-main">
      <div className="iup-top-actions">
        <Link
          href="/"
          className="iup-top-icon"
          title={messages.common.back}
          aria-label={messages.common.back}
        >
          ←
        </Link>
        <Link
          href="/settings"
          className="iup-top-icon"
          title={messages.settings.pageTitle}
          aria-label={messages.settings.pageTitle}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M19.3 12a7.8 7.8 0 0 0-.07-1l2-1.55-1.9-3.3-2.4.78a7.9 7.9 0 0 0-1.73-1L14.8 3h-3.6l-.42 2.93a7.9 7.9 0 0 0-1.73 1l-2.4-.78-1.9 3.3 2 1.55a7.8 7.8 0 0 0 0 2l-2 1.55 1.9 3.3 2.4-.78a7.9 7.9 0 0 0 1.73 1L11.2 21h3.6l.42-2.93a7.9 7.9 0 0 0 1.73-1l2.4.78 1.9-3.3-2-1.55c.05-.33.07-.66.07-1Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      {loading ? <p>{messages.iup.loading}</p> : null}
      {error ? <p className="alert-error">{error}</p> : null}
      {!loading && !error && !canEditPlan ? (
        <p className="alert-warning">
          {isPlayerViewer ? messages.iup.readOnlyPlayerAccess : messages.iup.readOnlyAccess}
        </p>
      ) : null}

      {!loading && !error ? (
        <section className="card card-strong">
          <IupHeader
            messages={messages}
            playerInfo={playerInfo}
            canEditPlan={canEditPlan}
            canManagePlan={canManagePlan}
            saving={saving}
            planStatus={planStatus}
            activeReviewPoint={activeReviewPoint}
            activeReviewPointEditable={activeReviewPointEditable}
            selectedReviewPointId={selectedReviewPointId}
            reviewPoints={reviewPoints}
            reviewCadenceKind={reviewCadenceKind}
            reviewCadenceConfig={reviewCadenceConfig}
            showPhotoActions={showPhotoActions}
            showPhotoLinkInput={showPhotoLinkInput}
            photoLinkDraft={photoLinkDraft}
            filePickerRef={filePickerRef}
            cameraPickerRef={cameraPickerRef}
            onSelectPhotoFile={onSelectPhotoFile}
            onTogglePhotoActions={() => setShowPhotoActions((current) => !current)}
            onTogglePhotoLinkInput={() => setShowPhotoLinkInput((current) => !current)}
            onPhotoLinkDraftChange={setPhotoLinkDraft}
            onApplyPhotoLink={onApplyPhotoLink}
            onRemovePhoto={onRemovePhoto}
            onCompleteReviewPoint={() => onCompleteReviewPoint(setStatus)}
            onArchive={onArchive}
            onDelete={onDelete}
            onSelectReviewPoint={(value) => {
              onSelectReviewPoint(value);
              setStatus(null);
            }}
            onUnlockReviewPoint={() => onUnlockReviewPoint(setStatus)}
          />

          <div className="card step-shell">
            <div aria-hidden className="step-track">
              <div className="step-fill" style={{ width: `${stepProgress}%` }} />
            </div>
            <div className="step-grid">
              {stepLabels.map((label, index) => {
                const isCurrent = index === step;
                const isDone = stepCompletion[index];
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => onSelectStep(index)}
                    className={`step-btn${isCurrent ? " current" : ""}${isDone ? " done" : ""}`}
                  >
                    <span className="step-index">
                      {index + 1}
                    </span>
                    <span className="step-label">{label}</span>
                  </button>
                );
              })}
            </div>
            <div className="step-help">
              <strong>{messages.iup.stepPrefix} {step + 1}: {stepLabels[step]}</strong>
              <div className="step-help-text">
                {stepDescriptions[step]}
              </div>
            </div>
          </div>

          <fieldset
            disabled={!canEditCurrentStep || saving || (step !== 4 && step !== 0 && !activeReviewPointEditable)}
            className="step-fieldset"
          >
            {step === 0 ? (
              <PlayerProfileStep
                messages={messages}
                playerInfo={playerInfo}
                onPlayerInfoChange={(updater) =>
                  setPlayerInfo((current) => (current ? updater(current) : current))
                }
              />
            ) : null}

            {step === 1 ? (
              <CurrentStateStep
                messages={messages}
                selfAssessment={selfAssessment}
                nowState={nowState}
                isSignedIn={isSignedIn}
                showCoachAssessment={showCoachAssessment && canManagePlan}
                canEdit={canEditPlan || canPlayerSelfAssess}
                onUpdateAssessment={updateAssessment}
                onNowStateChange={setNowState}
              />
            ) : null}

            {step === 2 ? (
              <GoalsStep
                messages={messages}
                title={messages.iup.shortGoals}
                commentLabel={messages.iup.shortComment}
                commentPlaceholder={messages.iup.shortGoalsPlaceholder}
                filterValue={shortSuggestionFilter}
                groupedSuggestions={groupedShortSuggestions}
                goals={shortGoals}
                customGoal={shortCustomGoal}
                expandedSuggestions={expandedShortSuggestions}
                commentValue={shortGoalsComment}
                onFilterChange={setShortSuggestionFilter}
                onApplySuggestion={(suggestion) =>
                  applySuggestion(setShortGoals, suggestion)
                }
                isGoalSelected={(suggestion) => isGoalSelected(shortGoals, suggestion)}
                onToggleExpandedSuggestion={(key) =>
                  toggleExpandedSuggestion(setExpandedShortSuggestions, key)
                }
                onCustomGoalChange={setShortCustomGoal}
                onAddCustomGoal={() =>
                  addCustomGoal(setShortGoals, shortCustomGoal, () => setShortCustomGoal(""))
                }
                onRemoveGoal={(index) => removeGoal(setShortGoals, index)}
                onCommentChange={setShortGoalsComment}
                suggestionKeyPrefix="short"
              />
            ) : null}

            {step === 3 ? (
              <GoalsStep
                messages={messages}
                title={messages.iup.longGoals}
                commentLabel={messages.iup.longComment}
                commentPlaceholder={messages.iup.longGoalsPlaceholder}
                filterValue={longSuggestionFilter}
                groupedSuggestions={groupedLongSuggestions}
                goals={longGoals}
                customGoal={longCustomGoal}
                expandedSuggestions={expandedLongSuggestions}
                commentValue={longGoalsComment}
                onFilterChange={setLongSuggestionFilter}
                onApplySuggestion={(suggestion) =>
                  applySuggestion(setLongGoals, suggestion)
                }
                isGoalSelected={(suggestion) => isGoalSelected(longGoals, suggestion)}
                onToggleExpandedSuggestion={(key) =>
                  toggleExpandedSuggestion(setExpandedLongSuggestions, key)
                }
                onCustomGoalChange={setLongCustomGoal}
                onAddCustomGoal={() =>
                  addCustomGoal(setLongGoals, longCustomGoal, () => setLongCustomGoal(""))
                }
                onRemoveGoal={(index) => removeGoal(setLongGoals, index)}
                onCommentChange={setLongGoalsComment}
                suggestionKeyPrefix="long"
              />
            ) : null}

            {step === 4 ? (
              <SummaryStep
                messages={messages}
                cycleType={cycleType}
                cycleLabel={cycleLabel}
                periodStart={periodStart}
                periodEnd={periodEnd}
                reviewCadenceLabel={reviewCadenceLabel}
                otherNotes={otherNotes}
                shortGoalsComment={shortGoalsComment}
                longGoalsComment={longGoalsComment}
                reviewPoints={reviewPoints}
                reviewCadenceKind={reviewCadenceKind}
                reviewCadenceConfig={reviewCadenceConfig}
                canEditPlan={canEditPlan}
                onChangeReviewPointPeriod={onChangeReviewPointPeriod}
                onApplySuggestedReviewDate={onApplySuggestedReviewDate}
                onToggleSkipReviewPoint={onToggleSkipReviewPoint}
              />
            ) : null}
          </fieldset>
        </section>
      ) : null}

      {!loading && !error && !localDraftSource ? (
        <CheckinsSection
          messages={messages}
          checkins={checkins}
          loading={checkinsLoading}
          canCreate={canCreateCheckin}
          goalOptions={checkinGoalOptions}
          reviewPoints={reviewPoints}
          draftNote={checkinNote}
          draftRating={checkinRating}
          draftGoalId={checkinGoalId}
          draftReviewPointId={checkinReviewPointId}
          currentUserId={signedInUserId}
          onDraftNoteChange={setCheckinNote}
          onDraftRatingChange={setCheckinRating}
          onDraftGoalIdChange={setCheckinGoalId}
          onDraftReviewPointIdChange={setCheckinReviewPointId}
          onCreate={onCreateCheckin}
          onDelete={onDeleteCheckin}
        />
      ) : null}

      {status ? <p className="status-line">{status}</p> : null}

      {!loading ? (
        <div className="sticky-nav">
          <div className="row sticky-inner">
            <button
              onClick={() => {
                setStep((current) => Math.max(0, current - 1));
                setStatus(null);
              }}
              disabled={step === 0 || !!error}
            >
              {messages.iup.previous}
            </button>
            <div className="row gap-8">
              <button
                onClick={() => {
                  if (error) {
                    return;
                  }
                  if (step === 4) {
                    if (!canEditPlan) {
                      return;
                    }
                    onComplete();
                    return;
                  }
                  setStep((current) => Math.min(4, current + 1));
                  setStatus(null);
                }}
                disabled={saving || !!error || (step === 4 && !canEditPlan)}
              >
                {step === 4 ? messages.iup.complete : `${messages.iup.next}${nextStepLabel ? `: ${nextStepLabel}` : ""}`}
              </button>
              <button className="primary" onClick={onSave} disabled={!canSave || (!canEditPlan && !canPlayerSelfAssess) || !!error}>
                {saving
                  ? messages.iup.saving
                  : !canEditPlan
                    ? canPlayerSelfAssess
                      ? messages.iup.saveSelfAssessment
                      : isPlayerViewer
                        ? messages.iup.rolePlayerView
                        : messages.iup.roleReadOnly
                    : localDraftSource
                      ? messages.iup.saveLocal
                      : messages.iup.saveIup}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}





