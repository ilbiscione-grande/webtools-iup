import {
  getReviewPointLabel,
  suggestedReviewPeriod,
  type Messages,
  type ReviewCadenceKind,
  type ReviewPoint,
} from "@/lib/iup/editorUtils";

type SummaryStepProps = {
  messages: Messages;
  cycleType: "year" | "season";
  cycleLabel: string;
  periodStart: string;
  periodEnd: string;
  reviewCadenceLabel: string;
  otherNotes: string;
  shortGoalsComment: string;
  longGoalsComment: string;
  reviewPoints: ReviewPoint[];
  reviewCadenceKind: ReviewCadenceKind;
  reviewCadenceConfig: Partial<Record<ReviewCadenceKind, { label: string; points: string[] }>>;
  canEditPlan: boolean;
  onChangeReviewPointPeriod: (pointId: string, value: string) => void;
  onApplySuggestedReviewDate: (pointId: string, index: number) => void;
  onToggleSkipReviewPoint: (pointId: string) => void;
};

export function SummaryStep(props: SummaryStepProps) {
  const {
    messages,
    cycleType,
    cycleLabel,
    periodStart,
    periodEnd,
    reviewCadenceLabel,
    otherNotes,
    shortGoalsComment,
    longGoalsComment,
    reviewPoints,
    reviewCadenceKind,
    reviewCadenceConfig,
    canEditPlan,
    onChangeReviewPointPeriod,
    onApplySuggestedReviewDate,
    onToggleSkipReviewPoint,
  } = props;

  return (
    <>
      <h3 className="section-h3">{messages.iup.summary}</h3>
      <div className="card form-stack">
        <span>
          <strong>{messages.iup.periodType}:</strong>{" "}
          {cycleType === "season" ? messages.iup.season : messages.iup.calendarYear}
        </span>
        <span>
          <strong>{cycleType === "season" ? messages.iup.season : messages.iup.year}:</strong>{" "}
          {cycleLabel || "-"}
        </span>
        <span>
          <strong>{messages.iup.start}:</strong> {periodStart || "-"}
        </span>
        <span>
          <strong>{messages.iup.end}:</strong> {periodEnd || "-"}
        </span>
        <span>
          <strong>{messages.iup.reviews}:</strong> {reviewCadenceLabel}
        </span>
        <span>
          <strong>{messages.iup.other}:</strong> {otherNotes || "-"}
        </span>
        <span>
          <strong>{messages.iup.shortGoalsCommentLabel}:</strong> {shortGoalsComment || "-"}
        </span>
        <span>
          <strong>{messages.iup.longGoalsCommentLabel}:</strong> {longGoalsComment || "-"}
        </span>
      </div>
      <p className="muted-line">{messages.iup.summaryInfo}</p>
      <div className="card form-stack">
        <strong>{messages.iup.reviewPlan}</strong>
        {reviewPoints.map((point, index) => {
          const suggestion = suggestedReviewPeriod(
            index,
            reviewPoints.length,
            periodStart,
            periodEnd,
            reviewCadenceKind
          );
          return (
            <div key={point.id} className="row row-between wrap">
              <span>
                <strong>
                  {getReviewPointLabel(
                    point,
                    index,
                    reviewCadenceKind,
                    reviewCadenceConfig,
                    messages.iup.sessionPrefix
                  )}
                </strong>
                {point.skipped ? ` • ${messages.iup.reviewSkipped}` : ""}
                {point.completedAt ? ` • ${messages.iup.reviewDone}` : ""}
              </span>
              <div className="toolbar">
                <input
                  value={point.dueDate || ""}
                  onChange={(event) => onChangeReviewPointPeriod(point.id, event.target.value)}
                  disabled={!canEditPlan || !!point.completedAt || !!point.skipped}
                  placeholder={suggestion || messages.iup.customPeriod}
                  className="input-medium"
                />
                {canEditPlan &&
                !point.completedAt &&
                !point.skipped &&
                suggestion &&
                point.dueDate !== suggestion ? (
                  <button
                    type="button"
                    onClick={() => onApplySuggestedReviewDate(point.id, index)}
                  >
                    {messages.iup.useSuggestionAction}
                  </button>
                ) : null}
                {canEditPlan ? (
                  <button type="button" onClick={() => onToggleSkipReviewPoint(point.id)}>
                    {point.skipped ? messages.iup.reset : messages.iup.skip}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
