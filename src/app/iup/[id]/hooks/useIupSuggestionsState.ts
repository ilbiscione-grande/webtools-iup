import { useEffect, useMemo, useState } from "react";
import {
  customSuggestionsKey,
  groupSuggestionsByCategory,
  inferPositionGroup,
  mergeUniqueSuggestions,
  normalizeSuggestion,
  preferredCategoryByPositionGroup,
  prioritizeCategoryGroup,
  type GoalRow,
  type PlayerInfo,
} from "@/lib/iup/editorUtils";
import { fetchUserGoalSuggestions } from "@/lib/iupApi";
import {
  longGoalSuggestions,
  shortGoalSuggestions,
  type GoalSuggestion,
  type PositionGroup,
} from "@/lib/goalSuggestions";

type UseIupSuggestionsStateArgs = {
  playerInfo: PlayerInfo;
  isSignedIn: boolean;
};

export function useIupSuggestionsState(args: UseIupSuggestionsStateArgs) {
  const { playerInfo, isSignedIn } = args;

  const [shortSuggestionFilter, setShortSuggestionFilter] =
    useState<PositionGroup>("all");
  const [longSuggestionFilter, setLongSuggestionFilter] =
    useState<PositionGroup>("all");
  const [shortCustomGoal, setShortCustomGoal] = useState("");
  const [longCustomGoal, setLongCustomGoal] = useState("");
  const [expandedShortSuggestions, setExpandedShortSuggestions] = useState<string[]>([]);
  const [expandedLongSuggestions, setExpandedLongSuggestions] = useState<string[]>([]);
  const [customShortSuggestions, setCustomShortSuggestions] = useState<GoalSuggestion[]>([]);
  const [customLongSuggestions, setCustomLongSuggestions] = useState<GoalSuggestion[]>([]);

  useEffect(() => {
    const loadLocalSuggestions = () => {
      if (typeof window === "undefined") {
        return;
      }
      try {
        const shortRaw = window.localStorage.getItem(customSuggestionsKey("short"));
        const longRaw = window.localStorage.getItem(customSuggestionsKey("long"));
        const shortParsed = shortRaw ? (JSON.parse(shortRaw) as GoalSuggestion[]) : [];
        const longParsed = longRaw ? (JSON.parse(longRaw) as GoalSuggestion[]) : [];
        setCustomShortSuggestions(
          shortParsed.map((entry) => normalizeSuggestion(entry)).filter(Boolean) as GoalSuggestion[]
        );
        setCustomLongSuggestions(
          longParsed.map((entry) => normalizeSuggestion(entry)).filter(Boolean) as GoalSuggestion[]
        );
      } catch {
        setCustomShortSuggestions([]);
        setCustomLongSuggestions([]);
      }
    };

    const loadRemoteSuggestions = async () => {
      const [shortResult, longResult] = await Promise.all([
        fetchUserGoalSuggestions("short"),
        fetchUserGoalSuggestions("long"),
      ]);
      setCustomShortSuggestions(
        shortResult.ok
          ? shortResult.suggestions.map((entry) => normalizeSuggestion(entry)).filter(Boolean) as GoalSuggestion[]
          : []
      );
      setCustomLongSuggestions(
        longResult.ok
          ? longResult.suggestions.map((entry) => normalizeSuggestion(entry)).filter(Boolean) as GoalSuggestion[]
          : []
      );
    };

    if (isSignedIn) {
      void loadRemoteSuggestions();
      return;
    }

    loadLocalSuggestions();
  }, [isSignedIn]);

  const preferredSuggestionCategory = useMemo(
    () => preferredCategoryByPositionGroup(inferPositionGroup(playerInfo?.positionLabel)),
    [playerInfo?.positionLabel]
  );

  const filteredShortSuggestions = useMemo(
    () =>
      mergeUniqueSuggestions(shortGoalSuggestions, customShortSuggestions).filter(
        (suggestion) =>
          shortSuggestionFilter === "all" ||
          suggestion.groups.includes(shortSuggestionFilter)
      ),
    [customShortSuggestions, shortSuggestionFilter]
  );

  const filteredLongSuggestions = useMemo(
    () =>
      mergeUniqueSuggestions(longGoalSuggestions, customLongSuggestions).filter(
        (suggestion) =>
          longSuggestionFilter === "all" ||
          suggestion.groups.includes(longSuggestionFilter)
      ),
    [customLongSuggestions, longSuggestionFilter]
  );

  const groupedShortSuggestions = useMemo(
    () =>
      prioritizeCategoryGroup(
        groupSuggestionsByCategory(filteredShortSuggestions),
        preferredSuggestionCategory
      ),
    [filteredShortSuggestions, preferredSuggestionCategory]
  );

  const groupedLongSuggestions = useMemo(
    () =>
      prioritizeCategoryGroup(
        groupSuggestionsByCategory(filteredLongSuggestions),
        preferredSuggestionCategory
      ),
    [filteredLongSuggestions, preferredSuggestionCategory]
  );

  const applySuggestion = (
    setter: React.Dispatch<React.SetStateAction<GoalRow[]>>,
    suggestion: GoalSuggestion
  ) => {
    setter((current) => {
      const exists = current.some(
        (goal) =>
          goal.title.trim().toLowerCase() === suggestion.title.trim().toLowerCase() &&
          goal.description.trim().toLowerCase() ===
            suggestion.description.trim().toLowerCase()
      );
      if (exists) {
        return current;
      }
      return [...current, { title: suggestion.title, description: suggestion.description }];
    });
  };

  const isGoalSelected = (goals: GoalRow[], suggestion: GoalSuggestion) =>
    goals.some(
      (goal) =>
        goal.title.trim().toLowerCase() === suggestion.title.trim().toLowerCase() &&
        goal.description.trim().toLowerCase() === suggestion.description.trim().toLowerCase()
    );

  const toggleExpandedSuggestion = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    key: string
  ) => {
    setter((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key]
    );
  };

  const addCustomGoal = (
    setter: React.Dispatch<React.SetStateAction<GoalRow[]>>,
    value: string,
    clear: () => void
  ) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    setter((current) => [...current, { title: trimmed, description: "" }]);
    clear();
  };

  return {
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
  };
}
