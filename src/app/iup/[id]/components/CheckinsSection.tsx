import { type IupCheckin } from "@/lib/iupApi";
import { type GoalRow, type Messages, type ReviewPoint } from "@/lib/iup/editorUtils";

type CheckinsSectionProps = {
  messages: Messages;
  checkins: IupCheckin[];
  loading: boolean;
  canCreate: boolean;
  goalOptions: GoalRow[];
  reviewPoints: ReviewPoint[];
  draftNote: string;
  draftRating: string;
  draftGoalId: string;
  draftReviewPointId: string;
  currentUserId: string | null;
  onDraftNoteChange: (value: string) => void;
  onDraftRatingChange: (value: string) => void;
  onDraftGoalIdChange: (value: string) => void;
  onDraftReviewPointIdChange: (value: string) => void;
  onCreate: () => void;
  onDelete: (checkinId: string) => void;
};

const getAuthorLabel = (authorRole: IupCheckin["authorRole"], messages: Messages) => {
  if (authorRole === "player") {
    return messages.iup.checkinAuthorPlayer;
  }
  if (authorRole === "other") {
    return messages.iup.checkinAuthorOther;
  }
  return messages.iup.checkinAuthorCoach;
};

export function CheckinsSection(props: CheckinsSectionProps) {
  const {
    messages,
    checkins,
    loading,
    canCreate,
    goalOptions,
    reviewPoints,
    draftNote,
    draftRating,
    draftGoalId,
    draftReviewPointId,
    currentUserId,
    onDraftNoteChange,
    onDraftRatingChange,
    onDraftGoalIdChange,
    onDraftReviewPointIdChange,
    onCreate,
    onDelete,
  } = props;

  return (
    <section className="card form-stack">
      <h3 className="section-h3">{messages.iup.checkins}</h3>
      <p className="muted-line">{messages.iup.checkinsSubtitle}</p>

      {canCreate ? (
        <div className="card form-stack">
          <label className="muted">{messages.iup.checkinNote}</label>
          <textarea
            value={draftNote}
            onChange={(event) => onDraftNoteChange(event.target.value)}
            placeholder={messages.iup.checkinNotePlaceholder}
            className="text-area-sm"
          />
          <div className="toolbar">
            <label className="muted">{messages.iup.checkinGoal}</label>
            <select
              value={draftGoalId}
              onChange={(event) => onDraftGoalIdChange(event.target.value)}
              className="input-short"
            >
              <option value="">{messages.iup.checkinNoGoal}</option>
              {goalOptions.map((goal, index) => (
                <option key={goal.id ?? `${goal.title}-${index}`} value={goal.id}>
                  {goal.title || `${messages.iup.goalFallback} ${index + 1}`}
                </option>
              ))}
            </select>
            <label className="muted">{messages.iup.checkinReviewPoint}</label>
            <select
              value={draftReviewPointId}
              onChange={(event) => onDraftReviewPointIdChange(event.target.value)}
              className="input-short"
            >
              <option value="">{messages.iup.checkinNoReviewPoint}</option>
              {reviewPoints.map((point, index) => (
                <option key={point.id} value={point.id}>
                  {point.label || `${messages.iup.sessionPrefix} ${index + 1}`}
                </option>
              ))}
            </select>
          </div>
          <div className="toolbar">
            <label className="muted">{messages.iup.checkinRating}</label>
            <select
              value={draftRating}
              onChange={(event) => onDraftRatingChange(event.target.value)}
              className="input-short"
            >
              <option value="">{messages.iup.checkinNoRating}</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
            <button type="button" onClick={onCreate}>
              {messages.iup.addCheckin}
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="muted-line">{messages.common.loading}</p>
      ) : checkins.length === 0 ? (
        <p className="muted-line">{messages.iup.noCheckins}</p>
      ) : (
        <div className="goal-groups">
          {checkins.map((checkin) => {
            const canDelete = !!currentUserId && currentUserId === checkin.authorId;
            const linkedGoal = goalOptions.find((goal) => goal.id === checkin.goalId);
            const linkedReviewPoint = reviewPoints.find(
              (point) => point.id === checkin.reviewPointId
            );
            return (
              <div key={checkin.id} className="card form-stack">
                <div className="row row-between wrap">
                  <strong>{getAuthorLabel(checkin.authorRole, messages)}</strong>
                  <span className="muted-sm">
                    {new Date(checkin.createdAt).toLocaleString()}
                  </span>
                </div>
                {typeof checkin.rating === "number" ? (
                  <span className="muted-sm">
                    {messages.iup.checkinRating}: {checkin.rating}
                  </span>
                ) : null}
                {linkedGoal ? (
                  <span className="muted-sm">
                    {messages.iup.checkinGoal}: {linkedGoal.title}
                  </span>
                ) : null}
                {linkedReviewPoint ? (
                  <span className="muted-sm">
                    {messages.iup.checkinReviewPoint}: {linkedReviewPoint.label}
                  </span>
                ) : null}
                <div>{checkin.note || "-"}</div>
                {canDelete ? (
                  <div className="toolbar">
                    <button type="button" onClick={() => onDelete(checkin.id)}>
                      {messages.iup.deleteCheckin}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
