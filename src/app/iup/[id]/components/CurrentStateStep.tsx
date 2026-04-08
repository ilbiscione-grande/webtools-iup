import {
  assessmentAreas,
  type AssessmentRow,
  type Messages,
} from "@/lib/iup/editorUtils";

type CurrentStateStepProps = {
  messages: Messages;
  selfAssessment: AssessmentRow[];
  nowState: string;
  isSignedIn: boolean;
  showCoachAssessment: boolean;
  canEdit: boolean;
  onUpdateAssessment: (
    index: number,
    field: "score" | "note" | "coachScore",
    value: string | number
  ) => void;
  onNowStateChange: (value: string) => void;
};

export function CurrentStateStep(props: CurrentStateStepProps) {
  const {
    messages,
    selfAssessment,
    nowState,
    isSignedIn,
    showCoachAssessment,
    canEdit,
    onUpdateAssessment,
    onNowStateChange,
  } = props;

  return (
    <>
      <h3 className="section-h3">{messages.iup.currentState}</h3>
      <div className="form-stack">
        <strong>{messages.iup.selfAssessment}</strong>
        <div className="assessment-grid">
          {selfAssessment.map((item, index) => (
            <div key={`${item.area}-${index}`} className="card assessment-card">
              <div className="assessment-top">
                <strong>{assessmentAreas[index] ?? item.area}</strong>
                <div className="assessment-scores">
                  <label className="assessment-score-field">
                    <span className="assessment-score-label">{messages.iup.player}</span>
                    <select
                      value={String(item.score)}
                      onChange={(event) =>
                        onUpdateAssessment(index, "score", Number(event.target.value) || 3)
                      }
                      disabled={!canEdit}
                      className="input-short assessment-score-select"
                    >
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </select>
                  </label>
                  {isSignedIn && showCoachAssessment ? (
                    <label className="assessment-score-field">
                      <span className="assessment-score-label">{messages.iup.coach}</span>
                      <select
                        value={String(item.coachScore ?? 3)}
                        onChange={(event) =>
                          onUpdateAssessment(index, "coachScore", Number(event.target.value) || 3)
                        }
                        disabled={!canEdit}
                        className="input-short assessment-score-select"
                      >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                      </select>
                    </label>
                  ) : null}
                </div>
              </div>
              <textarea
                value={item.note}
                onChange={(event) => onUpdateAssessment(index, "note", event.target.value)}
                disabled={!canEdit}
                placeholder={messages.home.notesPlaceholder}
                className="text-area-sm"
              />
            </div>
          ))}
        </div>
      </div>
      <textarea
        value={nowState}
        onChange={(event) => onNowStateChange(event.target.value)}
        disabled={!canEdit}
        placeholder={messages.iup.currentState}
        className="text-area-md"
      />
    </>
  );
}
