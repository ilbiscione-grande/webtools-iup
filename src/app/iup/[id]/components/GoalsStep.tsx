import {
  getSuggestionCategoryLabel,
  type GoalRow,
  type Messages,
  type SuggestionCategory,
} from "@/lib/iup/editorUtils";
import {
  type GoalSuggestion,
  type PositionGroup,
} from "@/lib/goalSuggestions";

type SuggestionGroup = {
  category: SuggestionCategory;
  suggestions: GoalSuggestion[];
};

type GoalsStepProps = {
  messages: Messages;
  title: string;
  commentLabel: string;
  commentPlaceholder: string;
  filterValue: PositionGroup;
  groupedSuggestions: SuggestionGroup[];
  goals: GoalRow[];
  customGoal: string;
  expandedSuggestions: string[];
  commentValue: string;
  onFilterChange: (value: PositionGroup) => void;
  onApplySuggestion: (suggestion: GoalSuggestion) => void;
  isGoalSelected: (suggestion: GoalSuggestion) => boolean;
  onToggleExpandedSuggestion: (key: string) => void;
  onCustomGoalChange: (value: string) => void;
  onAddCustomGoal: () => void;
  onRemoveGoal: (index: number) => void;
  onCommentChange: (value: string) => void;
  suggestionKeyPrefix: "short" | "long";
};

export function GoalsStep(props: GoalsStepProps) {
  const {
    messages,
    title,
    commentLabel,
    commentPlaceholder,
    filterValue,
    groupedSuggestions,
    goals,
    customGoal,
    expandedSuggestions,
    commentValue,
    onFilterChange,
    onApplySuggestion,
    isGoalSelected,
    onToggleExpandedSuggestion,
    onCustomGoalChange,
    onAddCustomGoal,
    onRemoveGoal,
    onCommentChange,
    suggestionKeyPrefix,
  } = props;

  return (
    <>
      <h3 className="section-h3">{title}</h3>
      <div className="card form-stack">
        <div className="toolbar">
          <label className="muted">{messages.iup.suggestionsByPosition}</label>
          <select
            value={filterValue}
            onChange={(event) => onFilterChange(event.target.value as PositionGroup)}
            className="input-medium"
          >
            <option value="all">{messages.iup.all}</option>
            <option value="gk">{messages.iup.goalkeeper}</option>
            <option value="def">{messages.iup.defender}</option>
            <option value="mid">{messages.iup.midfielder}</option>
            <option value="fwd">{messages.iup.forward}</option>
          </select>
        </div>
        <div className="goal-groups">
          {groupedSuggestions.map((group) => (
            <div key={`${suggestionKeyPrefix}-group-${group.category}`} className="goal-group">
              <strong className="goal-group-label">
                {getSuggestionCategoryLabel(group.category, messages)}
              </strong>
              <div className="toolbar">
                {group.suggestions.map((suggestion) => {
                  const suggestionKey = `${suggestionKeyPrefix}-${group.category}-${suggestion.title}`;
                  const isExpanded = expandedSuggestions.includes(suggestionKey);
                  return (
                    <div
                      key={suggestionKey}
                      className={`goal-suggestion-wrap${isExpanded ? " expanded" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => onApplySuggestion(suggestion)}
                        className={`goal-suggestion${isGoalSelected(suggestion) ? " selected" : ""}`}
                      >
                        <span className="goal-suggestion-text">{suggestion.title}</span>
                        <span
                          className={`goal-suggestion-chevron${isExpanded ? " expanded" : ""}`}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onToggleExpandedSuggestion(suggestionKey);
                          }}
                          role="button"
                          aria-label={
                            isExpanded
                              ? messages.iup.hideExplanation
                              : messages.iup.showExplanation
                          }
                          tabIndex={0}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              onToggleExpandedSuggestion(suggestionKey);
                            }
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            aria-hidden
                          >
                            <path
                              d="M4 2.5 7.5 6 4 9.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </button>
                      {isExpanded ? (
                        <div className="goal-suggestion-description">
                          {suggestion.description}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="goal-custom-add">
          <label className="goal-custom-label">{messages.iup.ownGoal}</label>
          <div className="toolbar">
            <input
              value={customGoal}
              onChange={(event) => onCustomGoalChange(event.target.value)}
              placeholder={messages.iup.addOwnGoal}
              className="input-wide"
            />
            <button type="button" onClick={onAddCustomGoal}>
              {messages.iup.add}
            </button>
          </div>
        </div>
      </div>
      <div className="goal-list">
        <strong className="goal-selected-title">{messages.iup.selectedGoals}</strong>
        {goals.length === 0 ? (
          <p className="muted-line">{messages.iup.noGoalsSelected}</p>
        ) : (
          goals.map((goal, index) => (
            <div key={`${suggestionKeyPrefix}-${index}`} className="goal-item">
              <span className="goal-selected-dot" aria-hidden>
                ✓
              </span>
              <span>{goal.title || messages.iup.goalFallback}</span>
              <button
                type="button"
                className="goal-remove"
                onClick={() => onRemoveGoal(index)}
                aria-label={`${messages.iup.removeGoal} ${index + 1}`}
                title={messages.iup.removeGoal}
              >
                x
              </button>
            </div>
          ))
        )}
      </div>
      <div className="form-stack">
        <label className="muted">{commentLabel}</label>
        <textarea
          value={commentValue}
          onChange={(event) => onCommentChange(event.target.value)}
          placeholder={commentPlaceholder}
          className="text-area-sm"
        />
      </div>
    </>
  );
}
