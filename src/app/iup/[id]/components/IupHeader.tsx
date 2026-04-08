import { type ChangeEvent, type RefObject } from "react";
import {
  getAge,
  getBirthYear,
  getBmi,
  getReviewPointLabel,
  type Messages,
  type PlayerInfo,
  type ReviewCadenceKind,
  type ReviewPoint,
} from "@/lib/iup/editorUtils";

type IupHeaderProps = {
  messages: Messages;
  playerInfo: PlayerInfo;
  canEditPlan: boolean;
  canManagePlan: boolean;
  saving: boolean;
  planStatus: "active" | "completed" | "archived";
  activeReviewPoint: ReviewPoint | null;
  activeReviewPointEditable: boolean;
  selectedReviewPointId: string;
  reviewPoints: ReviewPoint[];
  reviewCadenceKind: ReviewCadenceKind;
  reviewCadenceConfig: Partial<Record<ReviewCadenceKind, { label: string; points: string[] }>>;
  showPhotoActions: boolean;
  showPhotoLinkInput: boolean;
  photoLinkDraft: string;
  filePickerRef: RefObject<HTMLInputElement | null>;
  cameraPickerRef: RefObject<HTMLInputElement | null>;
  onSelectPhotoFile: (event: ChangeEvent<HTMLInputElement>) => void;
  onTogglePhotoActions: () => void;
  onTogglePhotoLinkInput: () => void;
  onPhotoLinkDraftChange: (value: string) => void;
  onApplyPhotoLink: () => void;
  onRemovePhoto: () => void;
  onCompleteReviewPoint: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onSelectReviewPoint: (value: string) => void;
  onUnlockReviewPoint: () => void;
};

export function IupHeader(props: IupHeaderProps) {
  const {
    messages,
    playerInfo,
    canEditPlan,
    canManagePlan,
    saving,
    planStatus,
    activeReviewPoint,
    activeReviewPointEditable,
    selectedReviewPointId,
    reviewPoints,
    reviewCadenceKind,
    reviewCadenceConfig,
    showPhotoActions,
    showPhotoLinkInput,
    photoLinkDraft,
    filePickerRef,
    cameraPickerRef,
    onSelectPhotoFile,
    onTogglePhotoActions,
    onTogglePhotoLinkInput,
    onPhotoLinkDraftChange,
    onApplyPhotoLink,
    onRemovePhoto,
    onCompleteReviewPoint,
    onArchive,
    onDelete,
    onSelectReviewPoint,
    onUnlockReviewPoint,
  } = props;

  return (
    <>
      <div className="card iup-profile">
        <div className="iup-avatar-wrap">
          {canEditPlan ? (
            <button
              type="button"
              className="iup-avatar iup-avatar-btn"
              onClick={onTogglePhotoActions}
              title={messages.iup.changeProfilePhoto}
              aria-label={messages.iup.changeProfilePhoto}
            >
              {playerInfo?.photoUrl ? (
                <img src={playerInfo.photoUrl} alt={playerInfo.name} />
              ) : (
                <span>{(playerInfo?.name ?? "P").slice(0, 1).toUpperCase()}</span>
              )}
            </button>
          ) : (
            <div className="iup-avatar">
              {playerInfo?.photoUrl ? (
                <img src={playerInfo.photoUrl} alt={playerInfo.name} />
              ) : (
                <span>{(playerInfo?.name ?? "P").slice(0, 1).toUpperCase()}</span>
              )}
            </div>
          )}
          {canEditPlan ? (
            <>
              <input
                ref={filePickerRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onSelectPhotoFile}
              />
              <input
                ref={cameraPickerRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={onSelectPhotoFile}
              />
              <span className="muted-sm iup-avatar-help">{messages.iup.clickToChangePhoto}</span>
              {showPhotoActions ? (
                <div className="card iup-photo-menu">
                  <button type="button" onClick={() => filePickerRef.current?.click()}>
                    {messages.iup.chooseFromDevice}
                  </button>
                  <button type="button" onClick={() => cameraPickerRef.current?.click()}>
                    {messages.iup.imagesOrCamera}
                  </button>
                  <button type="button" onClick={onTogglePhotoLinkInput}>
                    {messages.iup.useLink}
                  </button>
                  {playerInfo?.photoUrl ? (
                    <button type="button" onClick={onRemovePhoto}>
                      {messages.iup.removeImage}
                    </button>
                  ) : null}
                  {showPhotoLinkInput ? (
                    <div className="iup-photo-link">
                      <input
                        value={photoLinkDraft}
                        onChange={(event) => onPhotoLinkDraftChange(event.target.value)}
                        placeholder="https://..."
                      />
                      <button type="button" onClick={onApplyPhotoLink}>
                        {messages.iup.saveLink}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
        <div className="iup-profile-content">
          <div className="iup-profile-main">
            <strong className="iup-player-name">{playerInfo?.name ?? messages.iup.playerFallback}</strong>
            <div className="iup-profile-groups">
              <div className="iup-profile-group">
                <span className="iup-profile-group-title">{messages.iup.baseData}</span>
                <div className="cluster">
                  <span className="pill">{playerInfo?.teamName ?? messages.iup.teamMissing}</span>
                  {playerInfo?.positionLabel ? (
                    <span className="pill">{playerInfo.positionLabel}</span>
                  ) : null}
                  {typeof playerInfo?.number === "number" ? (
                    <span className="pill">#{playerInfo.number}</span>
                  ) : null}
                  {playerInfo?.birthDate ? (
                    <span className="pill">{messages.iup.born}: {playerInfo.birthDate}</span>
                  ) : null}
                  {playerInfo?.birthDate ? (
                    <span className="pill">{messages.iup.age}: {getAge(playerInfo.birthDate)}</span>
                  ) : null}
                </div>
              </div>
              <div className="iup-profile-group">
                <span className="iup-profile-group-title">{messages.iup.physics}</span>
                <div className="cluster">
                  {playerInfo?.dominantFoot ? (
                    <span className="pill">{messages.iup.foot}: {playerInfo.dominantFoot}</span>
                  ) : null}
                  {playerInfo?.heightCm ? <span className="pill">{playerInfo.heightCm} cm</span> : null}
                  {playerInfo?.weightKg ? <span className="pill">{playerInfo.weightKg} kg</span> : null}
                  {playerInfo?.heightCm && playerInfo?.weightKg ? (
                    <span className="pill">BMI: {getBmi(playerInfo.heightCm, playerInfo.weightKg)}</span>
                  ) : null}
                </div>
              </div>
              <div className="iup-profile-group">
                <span className="iup-profile-group-title">{messages.iup.background}</span>
                <div className="cluster">
                  {playerInfo?.birthDate ? (
                    <span className="pill">{messages.iup.birthYear}: {getBirthYear(playerInfo.birthDate)}</span>
                  ) : null}
                  {playerInfo?.nationality ? (
                    <span className="pill">{messages.squad.nationality}: {playerInfo.nationality}</span>
                  ) : null}
                  {playerInfo?.birthPlace ? (
                    <span className="pill">{messages.squad.birthPlace}: {playerInfo.birthPlace}</span>
                  ) : null}
                </div>
              </div>
            </div>
            {playerInfo?.injuryNotes ? (
              <p className="iup-note">
                <strong>{messages.iup.medicalNote}:</strong> {playerInfo.injuryNotes}
              </p>
            ) : null}
          </div>

          <div className="iup-profile-aside">
            {canManagePlan ? (
              <div className="iup-actions">
                {canEditPlan && activeReviewPoint && !activeReviewPoint.completedAt ? (
                  <button
                    type="button"
                    onClick={onCompleteReviewPoint}
                    disabled={saving}
                    title={messages.iup.markReviewDone}
                    aria-label={messages.iup.markReviewDone}
                    className="icon-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M7.5 12.5 10.5 15.5 16.5 9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onArchive}
                  disabled={saving || planStatus === "archived"}
                  title={messages.iup.archive}
                  aria-label={messages.iup.archive}
                  className="icon-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 7h16v3H4V7Zm2 3h12v9a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-9Zm4-6h4l1 2H9l1-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={saving}
                  title={messages.iup.delete}
                  aria-label={messages.iup.delete}
                  className="icon-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </button>
              </div>
            ) : null}
            <div className="iup-title-row">
              <select
                value={selectedReviewPointId}
                onChange={(event) => onSelectReviewPoint(event.target.value)}
                className="input-medium"
              >
                {reviewPoints.map((point, index) => (
                  <option key={point.id} value={point.id}>
                    {(getReviewPointLabel(
                      point,
                      index,
                      reviewCadenceKind,
                      reviewCadenceConfig,
                      messages.iup.sessionPrefix
                    ) || `${messages.iup.sessionPrefix} ${index + 1}`) +
                      (point.dueDate ? ` • ${point.dueDate}` : "") +
                      (point.skipped ? ` • ${messages.iup.reviewSkipped}` : "") +
                      (point.completedAt ? ` • ${messages.iup.reviewDone}` : "")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {((canEditPlan && activeReviewPoint?.completedAt && !activeReviewPointEditable) ||
        !activeReviewPointEditable) ? (
        <div className="iup-header-form">
          {canEditPlan && activeReviewPoint?.completedAt && !activeReviewPointEditable ? (
            <div className="toolbar">
              <button type="button" onClick={onUnlockReviewPoint}>
                {messages.iup.unlockForEditing}
              </button>
            </div>
          ) : null}
          {!activeReviewPointEditable ? (
            <p className="alert-warning">
              {activeReviewPoint?.skipped
                ? messages.iup.skippedReadOnly
                : messages.iup.completedReadOnly}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
