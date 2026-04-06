"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  archiveIupPlan,
  deleteIupPlan,
  fetchIupPlanEditor,
  saveIupPlanEditor,
  updateIupPlayerProfile,
} from "../../../lib/iupApi";
import { supabase } from "../../../lib/supabaseClient";
import {
  longGoalSuggestions,
  shortGoalSuggestions,
  type GoalSuggestion,
  type PositionGroup,
} from "../../../lib/goalSuggestions";

type GoalRow = {
  title: string;
  description: string;
};

type AssessmentRow = {
  area: string;
  score: number;
  note: string;
  coachScore?: number;
};

type ReviewPoint = {
  id: string;
  label: string;
  dueDate: string;
  note: string;
  nowState?: string;
  selfAssessment?: AssessmentRow[];
  completedAt?: string;
  unlockedForEdit?: boolean;
  skipped?: boolean;
};

const assessmentAreas = ["Teknik", "Taktik", "Fysik", "Mentalitet"] as const;

const clampScore = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 3;
  }
  return Math.min(5, Math.max(1, Math.round(numeric)));
};

const normalizeAssessment = (rows?: Partial<AssessmentRow>[]): AssessmentRow[] =>
  assessmentAreas.map((area, index) => {
    const source =
      rows?.find((entry) => (entry.area ?? "").toLowerCase() === area.toLowerCase()) ??
      rows?.[index];
    return {
      area,
      score: clampScore(source?.score),
      note: source?.note?.trim() ?? "",
      coachScore: clampScore(source?.coachScore),
    };
  });

const defaultAssessment = (): AssessmentRow[] => normalizeAssessment();

const stepLabels = [
  "Profil",
  "Nu-läge",
  "Kortsiktiga mål (1-3 mån)",
  "Långsiktiga mål (6-12 mån)",
  "Övrigt & återkoppling",
] as const;
const stepDescriptions = [
  "Fyll i och uppdatera spelarens profiluppgifter innan IUP-arbetet börjar.",
  "Kartlägg spelarens nuläge med självskattning och kort nulägesbild.",
  "Sätt konkreta mål som går att följa upp inom 1-3 månader.",
  "Definiera utvecklingsmål för 6-12 månader och önskat utfall.",
  "Planera period, återkopplingspunkter och kompletterande anteckningar.",
] as const;

const AUTH_LOCAL_DRAFTS_KEY_PREFIX = "iup:auth:local-drafts:";
const FREE_SESSION_DRAFTS_KEY = "iup:free:session-drafts";
const GOAL_COMMENTS_META_PREFIX = "__IUP_GOAL_META__:";

const pad2 = (value: number) => String(value).padStart(2, "0");

type ReviewCadenceKind =
  | "spring_fall"
  | "spring_summer_fall"
  | "quarterly"
  | "bi_monthly"
  | "monthly"
  | "bi_weekly"
  | "weekly"
  | "custom";

const reviewWindowDaysByCadence: Record<ReviewCadenceKind, number> = {
  spring_fall: 30,
  spring_summer_fall: 30,
  quarterly: 30,
  bi_monthly: 14,
  monthly: 10,
  bi_weekly: 5,
  weekly: 3,
  custom: 7,
};

const formatIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const decodeOtherNotesMeta = (raw?: string) => {
  const text = (raw ?? "").trim();
  if (!text.startsWith(GOAL_COMMENTS_META_PREFIX)) {
    return {
      otherNotes: raw ?? "",
      shortGoalsComment: "",
      longGoalsComment: "",
    };
  }
  try {
    const parsed = JSON.parse(text.slice(GOAL_COMMENTS_META_PREFIX.length)) as {
      otherNotes?: string;
      shortGoalsComment?: string;
      longGoalsComment?: string;
    };
    return {
      otherNotes: parsed.otherNotes ?? "",
      shortGoalsComment: parsed.shortGoalsComment ?? "",
      longGoalsComment: parsed.longGoalsComment ?? "",
    };
  } catch {
    return {
      otherNotes: raw ?? "",
      shortGoalsComment: "",
      longGoalsComment: "",
    };
  }
};

const encodeOtherNotesMeta = (
  otherNotes: string,
  shortGoalsComment: string,
  longGoalsComment: string
) => {
  const short = shortGoalsComment.trim();
  const long = longGoalsComment.trim();
  const base = otherNotes.trim();
  if (!short && !long) {
    return base;
  }
  return (
    GOAL_COMMENTS_META_PREFIX +
    JSON.stringify({
      otherNotes: base,
      shortGoalsComment: short,
      longGoalsComment: long,
    })
  );
};

const suggestedReviewPeriod = (
  index: number,
  count: number,
  periodStart?: string,
  periodEnd?: string,
  cadence: ReviewCadenceKind = "custom"
) => {
  if (!periodStart || !periodEnd) {
    return "";
  }
  const startDate = new Date(`${periodStart}T00:00:00`);
  const endDate = new Date(`${periodEnd}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "";
  }
  if (count <= 0) {
    return "";
  }
  const totalMs = endDate.getTime() - startDate.getTime();
  if (totalMs <= 0) {
    return formatIsoDate(startDate);
  }
  const centerRatio = Math.min(1, Math.max(0, (index + 0.5) / count));
  const anchor = new Date(startDate.getTime() + totalMs * centerRatio);
  const windowDays = reviewWindowDaysByCadence[cadence] ?? reviewWindowDaysByCadence.custom;
  const half = Math.floor(windowDays / 2);
  const rangeStart = new Date(anchor);
  rangeStart.setDate(rangeStart.getDate() - half);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + (windowDays - 1));

  if (rangeStart < startDate) {
    rangeStart.setTime(startDate.getTime());
  }
  if (rangeEnd > endDate) {
    rangeEnd.setTime(endDate.getTime());
  }
  return `${formatIsoDate(rangeStart)} - ${formatIsoDate(rangeEnd)}`;
};

const defaultReviewLabel = (index: number) => `Tillfälle ${index + 1}`;

const buildReviewPoints = (
  count: number,
  periodStart?: string,
  periodEnd?: string,
  current?: ReviewPoint[]
): ReviewPoint[] => {
  const safeCount = Math.max(1, count || 3);
  const points: ReviewPoint[] = [];

  for (let i = 0; i < safeCount; i += 1) {
    const existing = current?.[i];
    const dueDate = existing?.dueDate ?? "";
    points.push({
      id: existing?.id ?? `rp-${i + 1}`,
      label: existing?.label ?? defaultReviewLabel(i),
      dueDate,
      note: existing?.note ?? "",
      nowState: existing?.nowState ?? "",
      selfAssessment: existing?.selfAssessment ?? undefined,
      completedAt: existing?.completedAt,
      unlockedForEdit: existing?.unlockedForEdit ?? false,
      skipped: existing?.skipped ?? false,
    });
  }
  return points;
};

const getSeasonDefaults = (baseYear: number) => ({
  cycleLabel: `${baseYear}/${baseYear + 1}`,
  periodStart: `${baseYear}-08-01`,
  periodEnd: `${baseYear + 1}-06-30`,
});

const getYearDefaults = (year: number) => ({
  cycleLabel: String(year),
  periodStart: `${year}-01-01`,
  periodEnd: `${year}-12-31`,
});

const inferPositionGroup = (positionLabel?: string): PositionGroup => {
  const p = (positionLabel ?? "").toUpperCase();
  if (p.includes("GK") || p.includes("GOALKEEPER")) {
    return "gk";
  }
  if (
    p.includes("MITTBACK") ||
    p.includes("BACK") ||
    p.includes("FÖRSVAR") ||
    p.includes("FORSVAR") ||
    p.includes("CB") ||
    p.includes("LB") ||
    p.includes("RB") ||
    p.includes("WB") ||
    p.includes("DEF")
  ) {
    return "def";
  }
  if (
    p.includes("CM") ||
    p.includes("DM") ||
    p.includes("AM") ||
    p.includes("MID")
  ) {
    return "mid";
  }
  if (
    p.includes("ST") ||
    p.includes("CF") ||
    p.includes("FW") ||
    p.includes("RW") ||
    p.includes("LW") ||
    p.includes("ATT")
  ) {
    return "fwd";
  }
  return "all";
};

const customSuggestionsKey = (horizon: "short" | "long") =>
  `iup:customGoalSuggestions:${horizon}`;

const normalizeSuggestion = (
  entry: Partial<GoalSuggestion>
): GoalSuggestion | null => {
  if (!entry.title?.trim() || !entry.description?.trim()) {
    return null;
  }
  const rawGroups = Array.isArray(entry.groups) ? entry.groups : ["all"];
  const validGroups = rawGroups.filter((group): group is PositionGroup =>
    ["all", "gk", "def", "mid", "fwd"].includes(group)
  );
  return {
    title: entry.title.trim(),
    description: entry.description.trim(),
    groups: validGroups.length > 0 ? validGroups : ["all"],
  };
};

const mergeUniqueSuggestions = (...groups: GoalSuggestion[][]): GoalSuggestion[] => {
  const seen = new Set<string>();
  const merged: GoalSuggestion[] = [];
  for (const list of groups) {
    for (const entry of list) {
      const key = `${entry.title.toLowerCase()}::${entry.description.toLowerCase()}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(entry);
    }
  }
  return merged;
};

type SuggestionCategory =
  | "Teknik"
  | "Mentalt"
  | "Fysik"
  | "Anfall"
  | "Försvar"
  | "Taktik"
  | "Målvakt"
  | "Återhämtning"
  | "Övrigt";

const suggestionCategoryOrder: SuggestionCategory[] = [
  "Teknik",
  "Taktik",
  "Anfall",
  "Försvar",
  "Målvakt",
  "Fysik",
  "Mentalt",
  "Återhämtning",
  "Övrigt",
];

const inferSuggestionCategory = (suggestion: GoalSuggestion): SuggestionCategory => {
  const text = `${suggestion.title} ${suggestion.description}`.toLowerCase();

  if (suggestion.groups.includes("gk")) {
    return "Målvakt";
  }
  if (
    text.includes("återhämt") ||
    text.includes("sömn") ||
    text.includes("kost") ||
    text.includes("skade")
  ) {
    return "Återhämtning";
  }
  if (
    text.includes("mental") ||
    text.includes("fokus") ||
    text.includes("självständig") ||
    text.includes("tålamod") ||
    text.includes("ledarskap")
  ) {
    return "Mentalt";
  }
  if (
    text.includes("fys") ||
    text.includes("snabb") ||
    text.includes("uthåll") ||
    text.includes("styrk") ||
    text.includes("bmi")
  ) {
    return "Fysik";
  }
  if (
    text.includes("avslut") ||
    text.includes("box") ||
    text.includes("djupled") ||
    text.includes("inlägg") ||
    text.includes("målpoäng") ||
    text.includes("1v1 offensivt")
  ) {
    return "Anfall";
  }
  if (
    text.includes("försvar") ||
    text.includes("återerövr") ||
    text.includes("duell") ||
    text.includes("backlinje") ||
    text.includes("markering") ||
    text.includes("press")
  ) {
    return "Försvar";
  }
  if (
    text.includes("spelbar") ||
    text.includes("pass") ||
    text.includes("position") ||
    text.includes("taktik") ||
    text.includes("linje") ||
    text.includes("tempo")
  ) {
    return "Taktik";
  }
  if (
    text.includes("touch") ||
    text.includes("teknik") ||
    text.includes("mottag") ||
    text.includes("dribbling") ||
    text.includes("skott")
  ) {
    return "Teknik";
  }
  return "Övrigt";
};

const groupSuggestionsByCategory = (suggestions: GoalSuggestion[]) => {
  const groups = new Map<SuggestionCategory, GoalSuggestion[]>();
  for (const suggestion of suggestions) {
    const category = inferSuggestionCategory(suggestion);
    const list = groups.get(category) ?? [];
    list.push(suggestion);
    groups.set(category, list);
  }
  return suggestionCategoryOrder
    .map((category) => ({
      category,
      suggestions: (groups.get(category) ?? []).sort((a, b) =>
        a.title.localeCompare(b.title, "sv")
      ),
    }))
    .filter((entry) => entry.suggestions.length > 0);
};

const preferredCategoryByPositionGroup = (
  group: PositionGroup
): SuggestionCategory | null => {
  if (group === "def") return "Försvar";
  if (group === "fwd") return "Anfall";
  if (group === "mid") return "Teknik";
  if (group === "gk") return "Målvakt";
  return null;
};

const prioritizeCategoryGroup = (
  groups: Array<{ category: SuggestionCategory; suggestions: GoalSuggestion[] }>,
  preferred: SuggestionCategory | null
) => {
  if (!preferred) {
    return groups;
  }
  const match = groups.find((entry) => entry.category === preferred);
  if (!match) {
    return groups;
  }
  return [match, ...groups.filter((entry) => entry.category !== preferred)];
};

const getBirthYear = (birthDate?: string) => {
  if (!birthDate) {
    return "";
  }
  const year = new Date(`${birthDate}T00:00:00`).getFullYear();
  return Number.isNaN(year) ? "" : String(year);
};

const getAge = (birthDate?: string) => {
  if (!birthDate) {
    return "";
  }
  const dob = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(dob.getTime())) {
    return "";
  }
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate());
  if (beforeBirthday) {
    age -= 1;
  }
  return age > 0 ? String(age) : "";
};

const getBmi = (heightCm?: number, weightKg?: number) => {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return "";
  }
  const meters = heightCm / 100;
  const bmi = weightKg / (meters * meters);
  return bmi.toFixed(1);
};

export default function IupPlanPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const planId = params?.id ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  const [title, setTitle] = useState("IUP Plan");
  const [planStatus, setPlanStatus] = useState<
    "active" | "completed" | "archived"
  >("active");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [cycleType, setCycleType] = useState<"year" | "season">("season");
  const [cycleLabel, setCycleLabel] = useState("");
  const [nowState, setNowState] = useState("");
  const [shortGoals, setShortGoals] = useState<GoalRow[]>([]);
  const [longGoals, setLongGoals] = useState<GoalRow[]>([]);
  const [otherNotes, setOtherNotes] = useState("");
  const [shortGoalsComment, setShortGoalsComment] = useState("");
  const [longGoalsComment, setLongGoalsComment] = useState("");
  const [selfAssessment, setSelfAssessment] = useState<AssessmentRow[]>(
    defaultAssessment()
  );
  const [reviewCount, setReviewCount] = useState(3);
  const [reviewPoints, setReviewPoints] = useState<ReviewPoint[]>([]);
  const [selectedReviewPointId, setSelectedReviewPointId] = useState("");
  const [playerInfo, setPlayerInfo] = useState<{
    id?: string;
    name: string;
    teamName?: string;
    positionLabel?: string;
    number?: number;
    birthDate?: string;
    dominantFoot?: string;
    heightCm?: number;
    weightKg?: number;
    nationality?: string;
    birthPlace?: string;
    injuryNotes?: string;
    photoUrl?: string;
  } | null>(null);
  const [shortSuggestionFilter, setShortSuggestionFilter] =
    useState<PositionGroup>("all");
  const [longSuggestionFilter, setLongSuggestionFilter] =
    useState<PositionGroup>("all");
  const [shortCustomGoal, setShortCustomGoal] = useState("");
  const [longCustomGoal, setLongCustomGoal] = useState("");
  const [expandedShortSuggestions, setExpandedShortSuggestions] = useState<string[]>([]);
  const [expandedLongSuggestions, setExpandedLongSuggestions] = useState<string[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState("");
  const [signedInUserId, setSignedInUserId] = useState<string | null>(null);
  const [planCreatedBy, setPlanCreatedBy] = useState<string | null>(null);
  const [showCoachAssessment, setShowCoachAssessment] = useState(false);
  const [customShortSuggestions, setCustomShortSuggestions] = useState<
    GoalSuggestion[]
  >([]);
  const [customLongSuggestions, setCustomLongSuggestions] = useState<
    GoalSuggestion[]
  >([]);
  const [localDraftSource, setLocalDraftSource] = useState<{
    mode: "FREE" | "AUTH";
    userId?: string | null;
  } | null>(null);

  const canSave = useMemo(() => !!planId && !saving, [planId, saving]);
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
  const preferredSuggestionCategory = useMemo(
    () => preferredCategoryByPositionGroup(inferPositionGroup(playerInfo?.positionLabel)),
    [playerInfo?.positionLabel]
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
    const readCoachVisibility = () => {
      if (typeof window === "undefined") {
        return;
      }
      const saved = window.localStorage.getItem("iup:showCoachAssessment");
      setShowCoachAssessment(saved === "1");
    };
    readCoachVisibility();
    const loadCustomSuggestions = () => {
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
    loadCustomSuggestions();

    const loadAuth = async () => {
      if (!supabase) {
        setIsSignedIn(false);
        setSignedInEmail("");
        setSignedInUserId(null);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setIsSignedIn(true);
        setSignedInEmail(data.user.email ?? "");
        setSignedInUserId(data.user.id);
      } else {
        setIsSignedIn(false);
        setSignedInEmail("");
        setSignedInUserId(null);
      }
    };
    loadAuth();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!planId) {
        setError("Missing IUP id.");
        setLoading(false);
        return;
      }
      setLoading(true);
      const result = await fetchIupPlanEditor(planId);
      setLoading(false);
      if (!result.ok) {
        try {
          let localDraft: {
            id: string;
            playerName: string;
            title: string;
            mainFocus: string;
            currentLevel: string;
            targetLevel: string;
            notes: string;
            createdAt: string;
          } | null = null;
          let source: { mode: "FREE" | "AUTH"; userId?: string | null } | null = null;

          const freeRaw = window.sessionStorage.getItem(FREE_SESSION_DRAFTS_KEY);
          if (freeRaw) {
            const freeList = JSON.parse(freeRaw) as Array<typeof localDraft extends infer U ? U : never>;
            if (Array.isArray(freeList)) {
              localDraft = (freeList as any[]).find((entry) => entry?.id === planId) ?? null;
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
                const authList = JSON.parse(authRaw) as Array<typeof localDraft extends infer U ? U : never>;
                if (Array.isArray(authList)) {
                  localDraft = (authList as any[]).find((entry) => entry?.id === planId) ?? null;
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

          setLocalDraftSource(source);
          setPlanCreatedBy(null);
          setTitle(localDraft.title || "IUP Local Draft");
          setPlanStatus("active");
          setPeriodStart(defaults.periodStart);
          setPeriodEnd(defaults.periodEnd);
          setCycleType("season");
          setCycleLabel(defaults.cycleLabel);
          const decodedDraftNotes = decodeOtherNotesMeta(localDraft.notes || "");
          setOtherNotes(decodedDraftNotes.otherNotes);
          setShortGoalsComment(decodedDraftNotes.shortGoalsComment);
          setLongGoalsComment(decodedDraftNotes.longGoalsComment);
          const baseAssessment = defaultAssessment();
          setReviewCount(3);
          const draftPoints = buildReviewPoints(3, defaults.periodStart, defaults.periodEnd).map(
            (point, idx) => ({
              ...point,
              nowState: idx === 0 ? localDraft.currentLevel || "" : "",
              selfAssessment: baseAssessment.map((entry) => ({ ...entry })),
            })
          );
          setReviewPoints(draftPoints);
          setSelectedReviewPointId(draftPoints[0]?.id ?? "");
          setNowState(draftPoints[0]?.nowState ?? "");
          setSelfAssessment(
            draftPoints[0]?.selfAssessment?.map((entry) => ({ ...entry })) ??
              baseAssessment
          );
          setShortGoals(
            localDraft.mainFocus?.trim()
              ? [
                  {
                    title: localDraft.mainFocus.trim(),
                    description: "",
                  },
                ]
              : []
          );
          setLongGoals(
            localDraft.targetLevel?.trim()
              ? [{ title: localDraft.targetLevel.trim(), description: "" }]
              : []
          );
          setPlayerInfo({
            name: localDraft.playerName || "Unnamed player",
            teamName: source?.mode === "AUTH" ? "AUTH local" : "FREE temporary",
          });
          setShortSuggestionFilter("all");
          setLongSuggestionFilter("all");
          setError(null);
          setStatus("Local draft mode. Saved on this device.");
          return;
        } catch {
          setError(result.error);
          return;
        }
      }
      setLocalDraftSource(null);
      const { plan, goals, player } = result.data;
      setPlanCreatedBy(plan.createdBy ?? null);
      const start = plan.periodStart ?? "";
      const end = plan.periodEnd ?? "";
      const count = plan.reviewCount ?? 3;

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
      const decodedPlanNotes = decodeOtherNotesMeta(plan.otherNotes ?? "");
      setOtherNotes(decodedPlanNotes.otherNotes);
      setShortGoalsComment(decodedPlanNotes.shortGoalsComment);
      setLongGoalsComment(decodedPlanNotes.longGoalsComment);
      const baseAssessment = normalizeAssessment(plan.selfAssessment ?? []);
      setReviewCount(count);
      const loadedReviewPoints =
        buildReviewPoints(
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
          }))
        );
      const normalizedReviewPoints = loadedReviewPoints.map((point, idx) => ({
        ...point,
        nowState:
          point.nowState ??
          (idx === 0 ? plan.nowState ?? "" : ""),
        unlockedForEdit: point.unlockedForEdit ?? false,
        skipped: point.skipped ?? false,
        selfAssessment:
          normalizeAssessment(point.selfAssessment ?? baseAssessment).map((entry) => ({
            ...entry,
          })),
      }));
      setReviewPoints(normalizedReviewPoints);
      setSelectedReviewPointId(normalizedReviewPoints[0]?.id ?? "");
      setNowState(normalizedReviewPoints[0]?.nowState ?? "");
      setSelfAssessment(
        normalizeAssessment(normalizedReviewPoints[0]?.selfAssessment ?? baseAssessment)
      );

      const short = goals
        .filter((goal) => goal.horizon === "short")
        .map((goal) => ({ title: goal.title, description: goal.description }));
      const long = goals
        .filter((goal) => goal.horizon === "long")
        .map((goal) => ({ title: goal.title, description: goal.description }));

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

      const positionGroup = inferPositionGroup(player?.positionLabel);
      setShortSuggestionFilter(positionGroup);
      setLongSuggestionFilter(positionGroup);

      setError(null);
      setStatus(null);
    };
    load();
  }, [planId]);

  useEffect(() => {
    if (!selectedReviewPointId) {
      return;
    }
    const selected = reviewPoints.find((point) => point.id === selectedReviewPointId);
    if (!selected) {
      return;
    }
    setNowState(selected.nowState ?? "");
    setSelfAssessment(
      normalizeAssessment(selected.selfAssessment)
    );
  }, [reviewPoints, selectedReviewPointId]);

  const removeGoal = (
    setter: React.Dispatch<React.SetStateAction<GoalRow[]>>,
    index: number
  ) => {
    setter((current) => current.filter((_, i) => i !== index));
  };

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
      return [
        ...current,
        { title: suggestion.title, description: suggestion.description },
      ];
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
  const currentStepComplete = useMemo(() => stepCompletion[step], [step, stepCompletion]);
  const stepProgress = useMemo(
    () => ((step + 1) / stepLabels.length) * 100,
    [step]
  );
  const nextStepLabel = useMemo(
    () => (step < stepLabels.length - 1 ? stepLabels[step + 1] : ""),
    [step]
  );
  const reviewCadenceLabel = useMemo(() => {
    const labels = reviewPoints.map((point) => point.label.trim().toLowerCase());
    const hasSpring = labels.includes("vår");
    const hasSummer = labels.includes("sommar");
    const hasFall = labels.includes("höst");
    if (hasSpring && hasFall && labels.length === 2) {
      return "Vår, Höst";
    }
    if (hasSpring && hasSummer && hasFall && labels.length === 3) {
      return "Vår, Sommar, Höst";
    }
    if (
      labels.length === 4 &&
      labels.every((label) => label.startsWith("q") || label.startsWith("kvartal"))
    ) {
      return "Kvartalsvis";
    }
    if (labels.length === 6 && labels.every((label) => label.startsWith("varannan månad"))) {
      return "Varannan månad";
    }
    if (labels.length === 12 && labels.every((label) => label.startsWith("månad"))) {
      return "Varje månad";
    }
    if (labels.length === 26 && labels.every((label) => label.startsWith("varannan vecka"))) {
      return "Varannan vecka";
    }
    if (labels.length === 52 && labels.every((label) => label.startsWith("vecka"))) {
      return "Varje vecka";
    }
    if (reviewCount === 6) {
      return "Varannan månad";
    }
    if (reviewCount === 12) {
      return "Varje månad";
    }
    if (reviewCount === 26) {
      return "Varannan vecka";
    }
    if (reviewCount === 52) {
      return "Varje vecka";
    }
    return `${reviewCount} tillfällen`;
  }, [reviewCount, reviewPoints]);
  const reviewCadenceKind = useMemo<ReviewCadenceKind>(() => {
    const labels = reviewPoints.map((point) => point.label.trim().toLowerCase());
    const hasSpring = labels.includes("vår");
    const hasSummer = labels.includes("sommar");
    const hasFall = labels.includes("höst");
    if (hasSpring && hasFall && labels.length === 2) {
      return "spring_fall";
    }
    if (hasSpring && hasSummer && hasFall && labels.length === 3) {
      return "spring_summer_fall";
    }
    if (
      labels.length === 4 &&
      labels.every((label) => label.startsWith("q") || label.startsWith("kvartal"))
    ) {
      return "quarterly";
    }
    if (labels.length === 6 && labels.every((label) => label.startsWith("varannan månad"))) {
      return "bi_monthly";
    }
    if (labels.length === 12 && labels.every((label) => label.startsWith("månad"))) {
      return "monthly";
    }
    if (labels.length === 26 && labels.every((label) => label.startsWith("varannan vecka"))) {
      return "bi_weekly";
    }
    if (labels.length === 52 && labels.every((label) => label.startsWith("vecka"))) {
      return "weekly";
    }
    if (reviewCount === 2) return "spring_fall";
    if (reviewCount === 3) return "spring_summer_fall";
    if (reviewCount === 4) return "quarterly";
    if (reviewCount === 6) return "bi_monthly";
    if (reviewCount === 12) return "monthly";
    if (reviewCount === 26) return "bi_weekly";
    if (reviewCount === 52) return "weekly";
    return "custom";
  }, [reviewCount, reviewPoints]);
  const roleLabel = useMemo(() => {
    if (localDraftSource?.mode === "AUTH") {
      return "Roll: AUTH lokal redigering";
    }
    if (localDraftSource?.mode === "FREE") {
      return "Roll: FREE tillfällig redigering";
    }
    if (canManagePlan) {
      return "Roll: Planägare (redigering)";
    }
    return "Roll: Läsläge";
  }, [canManagePlan, localDraftSource]);

  const onSave = async () => {
    if (!planId) {
      return;
    }
    if (!canEditPlan) {
      setStatus("Du har inte behörighet att spara denna IUP.");
      return;
    }
    persistCurrentReviewAnswers();

    if (localDraftSource) {
      setSaving(true);
      try {
        const updated = {
          id: planId,
          playerName: playerInfo?.name?.trim() || "Unnamed player",
          title: title.trim() || "IUP Local Draft",
          mainFocus:
            shortGoals.find((goal) => goal.title.trim())?.title.trim() || "",
          currentLevel: nowState.trim(),
          targetLevel:
            longGoals.find((goal) => goal.title.trim())?.title.trim() || "",
          notes: encodeOtherNotesMeta(otherNotes, shortGoalsComment, longGoalsComment),
          createdAt: new Date().toISOString(),
        };

        if (localDraftSource.mode === "AUTH" && localDraftSource.userId) {
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

        setStatus("Local draft saved.");
      } catch {
        setStatus("Could not save local draft.");
      } finally {
        setSaving(false);
      }
      return;
    }

    setSaving(true);
    if (playerInfo?.id) {
      const profileResult = await updateIupPlayerProfile(playerInfo.id, {
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
      if (!profileResult.ok) {
        setSaving(false);
        setStatus(profileResult.error);
        return;
      }
    }
    const result = await saveIupPlanEditor({
      planId,
      title,
      periodStart: periodStart || undefined,
      periodEnd: periodEnd || undefined,
      nowState,
      otherNotes: encodeOtherNotesMeta(otherNotes, shortGoalsComment, longGoalsComment),
      reviewCount,
      cycleType,
      cycleLabel,
      status: "active",
      reviewPoints: reviewPoints.map((point, index) => ({
        id: point.id || `rp-${index + 1}`,
        label: point.label,
        dueDate: point.dueDate || undefined,
        note: point.note,
        completedAt: point.completedAt,
        unlockedForEdit: point.unlockedForEdit,
        skipped: point.skipped,
        nowState: point.id === selectedReviewPointId ? nowState : point.nowState ?? "",
        selfAssessment:
          point.id === selectedReviewPointId
            ? selfAssessment.map((entry) => ({ ...entry }))
            : point.selfAssessment?.map((entry) => ({ ...entry })) ??
              defaultAssessment(),
      })),
      selfAssessment: selfAssessment.map((entry) => ({
        area: entry.area,
        score: entry.score,
        note: entry.note,
        coachScore: entry.coachScore,
      })),
      shortGoals: shortGoals.filter(
        (goal) => goal.title.trim() || goal.description.trim()
      ),
      longGoals: longGoals.filter(
        (goal) => goal.title.trim() || goal.description.trim()
      ),
    });
    setSaving(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    if (typeof window !== "undefined") {
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
    }
    setStatus("IUP sparad.");
    setPlanStatus("active");
  };

  const onComplete = async () => {
    if (!planId || !canEditPlan) {
      return;
    }
    if (step !== 4) {
      setStatus("Slutför guiden till sista steget innan du markerar den som klar.");
      return;
    }
    persistCurrentReviewAnswers();
    setSaving(true);
    if (playerInfo?.id) {
      const profileResult = await updateIupPlayerProfile(playerInfo.id, {
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
      if (!profileResult.ok) {
        setSaving(false);
        setStatus(profileResult.error);
        return;
      }
    }
    const result = await saveIupPlanEditor({
      planId,
      title,
      periodStart: periodStart || undefined,
      periodEnd: periodEnd || undefined,
      nowState,
      otherNotes: encodeOtherNotesMeta(otherNotes, shortGoalsComment, longGoalsComment),
      reviewCount,
      cycleType,
      cycleLabel,
      status: "completed",
      reviewPoints: reviewPoints.map((point, index) => ({
        id: point.id || `rp-${index + 1}`,
        label: point.label,
        dueDate: point.dueDate || undefined,
        note: point.note,
        completedAt: point.completedAt,
        unlockedForEdit: point.unlockedForEdit,
        skipped: point.skipped,
        nowState: point.id === selectedReviewPointId ? nowState : point.nowState ?? "",
        selfAssessment:
          point.id === selectedReviewPointId
            ? selfAssessment.map((entry) => ({ ...entry }))
            : point.selfAssessment?.map((entry) => ({ ...entry })) ??
              defaultAssessment(),
      })),
      selfAssessment: selfAssessment.map((entry) => ({
        area: entry.area,
        score: entry.score,
        note: entry.note,
        coachScore: entry.coachScore,
      })),
      shortGoals: shortGoals.filter(
        (goal) => goal.title.trim() || goal.description.trim()
      ),
      longGoals: longGoals.filter(
        (goal) => goal.title.trim() || goal.description.trim()
      ),
    });
    setSaving(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setPlanStatus("completed");
    setStatus("IUP markerad som klar.");
  };
  const onArchive = async () => {
    if (!planId || !canManagePlan) {
      return;
    }
    const ok = window.confirm("Arkivera denna IUP? Den visas då som arkiverad.");
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
    setStatus("IUP arkiverad.");
  };

  const onDelete = async () => {
    if (!planId || !canManagePlan) {
      return;
    }
    const ok = window.confirm(
      "Ta bort denna IUP permanent? Detta kan inte ångras."
    );
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
    router.push("/");
  };
  const onSelectStep = (index: number) => {
    setStep(index);
    setStatus(null);
  };
  const onSelectReviewPoint = (nextId: string) => {
    if (!nextId || nextId === selectedReviewPointId) {
      return;
    }
    persistCurrentReviewAnswers();
    setSelectedReviewPointId(nextId);
    setStatus(null);
  };
  const onCompleteReviewPoint = () => {
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
          ? `Återkopplingen markerad som klar. Nästa föreslagna period: ${suggested}.`
          : "Återkopplingen markerad som klar."
      );
      return;
    }
    setStatus(
      "Sista återkopplingen markerad som klar. Lås upp den för att redigera igen."
    );
  };
  const onUnlockReviewPoint = () => {
    if (!canEditPlan || !activeReviewPoint) {
      return;
    }
    setReviewPoints((current) =>
      current.map((point) =>
        point.id === activeReviewPoint.id ? { ...point, unlockedForEdit: true } : point
      )
    );
    setStatus("Återkopplingen är upplåst för redigering.");
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
  return (
    <main className="app-shell iup-main">
      <div className="iup-top-actions">
        <Link
          href="/"
          className="iup-top-icon"
          title="Back"
          aria-label="Back"
        >
          ←
        </Link>
        <Link
          href="/settings"
          className="iup-top-icon"
          title="Settings"
          aria-label="Settings"
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

      {loading ? <p>Laddar IUP...</p> : null}
      {error ? <p className="alert-error">{error}</p> : null}
      {!loading && !error && !canEditPlan ? (
        <p className="alert-warning">
          Du har läsbehörighet till denna IUP. Endast planägaren kan redigera.
        </p>
      ) : null}

      {!loading && !error ? (
        <section className="card card-strong">
          <div className="card iup-profile">
            <div className="iup-avatar">
              {playerInfo?.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={playerInfo.photoUrl} alt={playerInfo.name} />
              ) : (
                <span>{(playerInfo?.name ?? "P").slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="iup-profile-content">
              <strong className="iup-player-name">{playerInfo?.name ?? "Spelare"}</strong>
              <div className="iup-profile-groups">
                <div className="iup-profile-group">
                  <span className="iup-profile-group-title">Basdata</span>
                  <div className="cluster">
                    <span className="pill">{playerInfo?.teamName ?? "Lag saknas"}</span>
                    {playerInfo?.positionLabel ? (
                      <span className="pill">{playerInfo.positionLabel}</span>
                    ) : null}
                    {typeof playerInfo?.number === "number" ? (
                      <span className="pill">#{playerInfo.number}</span>
                    ) : null}
                    {playerInfo?.birthDate ? (
                      <span className="pill">Född: {playerInfo.birthDate}</span>
                    ) : null}
                    {playerInfo?.birthDate ? (
                      <span className="pill">Ålder: {getAge(playerInfo.birthDate)}</span>
                    ) : null}
                  </div>
                </div>
                <div className="iup-profile-group">
                  <span className="iup-profile-group-title">Fysik</span>
                  <div className="cluster">
                    {playerInfo?.dominantFoot ? (
                      <span className="pill">Fot: {playerInfo.dominantFoot}</span>
                    ) : null}
                    {playerInfo?.heightCm ? (
                      <span className="pill">{playerInfo.heightCm} cm</span>
                    ) : null}
                    {playerInfo?.weightKg ? (
                      <span className="pill">{playerInfo.weightKg} kg</span>
                    ) : null}
                    {playerInfo?.heightCm && playerInfo?.weightKg ? (
                      <span className="pill">BMI: {getBmi(playerInfo.heightCm, playerInfo.weightKg)}</span>
                    ) : null}
                  </div>
                </div>
                <div className="iup-profile-group">
                  <span className="iup-profile-group-title">Bakgrund</span>
                  <div className="cluster">
                    {playerInfo?.birthDate ? (
                      <span className="pill">Födelseår: {getBirthYear(playerInfo.birthDate)}</span>
                    ) : null}
                    {playerInfo?.nationality ? (
                      <span className="pill">Nationalitet: {playerInfo.nationality}</span>
                    ) : null}
                    {playerInfo?.birthPlace ? (
                      <span className="pill">Födelseort: {playerInfo.birthPlace}</span>
                    ) : null}
                  </div>
                </div>
              </div>
              {playerInfo?.injuryNotes ? (
                <p className="iup-note">
                  <strong>Skade-/medicinsk notering:</strong> {playerInfo.injuryNotes}
                </p>
              ) : null}
            </div>
          </div>

          <div className="iup-header-form">
            <div className="iup-title-row">
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={!canEditPlan}
                placeholder="IUP title"
                className="iup-title-input"
              />
              <select
                value={selectedReviewPointId}
                onChange={(event) => onSelectReviewPoint(event.target.value)}
                className="input-medium"
              >
                {reviewPoints.map((point, index) => (
                  <option key={point.id} value={point.id}>
                    {(point.label || `Tillfälle ${index + 1}`) +
                      (point.dueDate ? ` • ${point.dueDate}` : "") +
                      (point.skipped ? " • Hoppad över" : "") +
                      (point.completedAt ? " • Klar" : "")}
                  </option>
                ))}
              </select>
              {canManagePlan ? (
                <>
                  {canEditPlan && activeReviewPoint && !activeReviewPoint.completedAt ? (
                    <button
                      type="button"
                      onClick={onCompleteReviewPoint}
                      disabled={saving}
                      title="Markera återkoppling klar"
                      aria-label="Markera återkoppling klar"
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
                    title="Arkivera"
                    aria-label="Arkivera"
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
                    title="Ta bort"
                    aria-label="Ta bort"
                    className="icon-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  </button>
                </>
              ) : null}
            </div>
            <div className="toolbar">
              <span className="muted-sm">
                Aktiv återkoppling:{" "}
                <strong>{activeReviewPoint?.label || "Tillfälle"}</strong>
                {activeReviewPoint?.dueDate ? ` (${activeReviewPoint.dueDate})` : ""}
                {activeReviewPoint?.skipped ? " • Hoppad över" : ""}
                {activeReviewPoint?.completedAt ? " • Klar" : ""}
              </span>
              {canEditPlan && activeReviewPoint?.completedAt && !activeReviewPointEditable ? (
                <button type="button" onClick={onUnlockReviewPoint}>
                  Lås upp för redigering
                </button>
              ) : null}
            </div>
            {!activeReviewPointEditable ? (
              <p className="alert-warning">
                {activeReviewPoint?.skipped
                  ? "Denna återkoppling är hoppad över och öppnas i läsläge."
                  : "Denna återkoppling är klar och öppnas i läsläge tills du låser upp den."}
              </p>
            ) : null}
          </div>

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
              <strong>Steg {step + 1}: {stepLabels[step]}</strong>
              <div className="step-help-text">
                {stepDescriptions[step]}
              </div>
            </div>
          </div>

          <fieldset
            disabled={!canEditPlan || saving || (step !== 4 && step !== 0 && !activeReviewPointEditable)}
            className="step-fieldset"
          >
            {step === 0 ? (
              <>
                <h3 className="section-h3">Spelarprofil</h3>
                <div className="iup-profile-editor">
                  <div className="card form-stack iup-profile-section">
                    <strong className="iup-profile-group-title">Basdata</strong>
                    <div className="row wrap">
                      <input
                        value={playerInfo?.name ?? ""}
                        onChange={(event) =>
                          setPlayerInfo((current) =>
                            current ? { ...current, name: event.target.value } : current
                          )
                        }
                        placeholder="Namn"
                      />
                      <input
                        value={typeof playerInfo?.number === "number" ? String(playerInfo.number) : ""}
                        onChange={(event) =>
                          setPlayerInfo((current) =>
                            current
                              ? {
                                  ...current,
                                  number: event.target.value.trim()
                                    ? Number(event.target.value)
                                    : undefined,
                                }
                              : current
                          )
                        }
                        placeholder="Nummer"
                        className="input-short"
                      />
                      <input
                        value={playerInfo?.positionLabel ?? ""}
                        onChange={(event) =>
                          setPlayerInfo((current) =>
                            current ? { ...current, positionLabel: event.target.value } : current
                          )
                        }
                        placeholder="Favoritposition"
                      />
                      <input
                        type="date"
                        value={playerInfo?.birthDate ?? ""}
                        onChange={(event) =>
                          setPlayerInfo((current) =>
                            current ? { ...current, birthDate: event.target.value } : current
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="card form-stack iup-profile-section">
                    <strong className="iup-profile-group-title">Fysik</strong>
                    <div className="row wrap">
                      <input
                        value={playerInfo?.dominantFoot ?? ""}
                        onChange={(event) =>
                          setPlayerInfo((current) =>
                            current ? { ...current, dominantFoot: event.target.value } : current
                          )
                        }
                        placeholder="Dominant foot"
                      />
                      <input
                        value={typeof playerInfo?.heightCm === "number" ? String(playerInfo.heightCm) : ""}
                        onChange={(event) =>
                          setPlayerInfo((current) =>
                            current
                              ? {
                                  ...current,
                                  heightCm: event.target.value.trim()
                                    ? Number(event.target.value)
                                    : undefined,
                                }
                              : current
                          )
                        }
                        placeholder="Längd cm"
                        className="input-short"
                      />
                      <input
                        value={typeof playerInfo?.weightKg === "number" ? String(playerInfo.weightKg) : ""}
                        onChange={(event) =>
                          setPlayerInfo((current) =>
                            current
                              ? {
                                  ...current,
                                  weightKg: event.target.value.trim()
                                    ? Number(event.target.value)
                                    : undefined,
                                }
                              : current
                          )
                        }
                        placeholder="Vikt kg"
                        className="input-short"
                      />
                    </div>
                  </div>

                  <div className="card form-stack iup-profile-section">
                    <strong className="iup-profile-group-title">Bakgrund</strong>
                    <div className="row wrap">
                      <input
                        value={playerInfo?.nationality ?? ""}
                        onChange={(event) =>
                          setPlayerInfo((current) =>
                            current ? { ...current, nationality: event.target.value } : current
                          )
                        }
                        placeholder="Nationalitet"
                      />
                      <input
                        value={playerInfo?.birthPlace ?? ""}
                        onChange={(event) =>
                          setPlayerInfo((current) =>
                            current ? { ...current, birthPlace: event.target.value } : current
                          )
                        }
                        placeholder="Födelseort"
                      />
                      <input
                        value={playerInfo?.photoUrl ?? ""}
                        onChange={(event) =>
                          setPlayerInfo((current) =>
                            current ? { ...current, photoUrl: event.target.value } : current
                          )
                        }
                        placeholder="Foto-URL"
                      />
                    </div>
                  </div>

                  <div className="card form-stack iup-profile-section">
                    <strong className="iup-profile-group-title">Medicinsk info</strong>
                    <textarea
                      value={playerInfo?.injuryNotes ?? ""}
                      onChange={(event) =>
                        setPlayerInfo((current) =>
                          current ? { ...current, injuryNotes: event.target.value } : current
                        )
                      }
                      placeholder="Skade-/medicinsk notering"
                      className="text-area-md"
                    />
                  </div>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <h3 className="section-h3">Nu-läge</h3>
                <div className="form-stack">
                  <strong>Självskattning (1-5)</strong>
                  <div className="assessment-grid">
                    {selfAssessment.map((item, index) => (
                      <div key={`${item.area}-${index}`} className="card assessment-card">
                        <div className="assessment-top">
                          <strong>{assessmentAreas[index] ?? item.area}</strong>
                          <div className="assessment-scores">
                            <label className="assessment-score-field">
                              <span className="assessment-score-label">Spelare</span>
                              <select
                                value={String(item.score)}
                                onChange={(event) =>
                                  updateAssessment(
                                    index,
                                    "score",
                                    Number(event.target.value) || 3
                                  )
                                }
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
                                <span className="assessment-score-label">Coach</span>
                                <select
                                  value={String(item.coachScore ?? 3)}
                                  onChange={(event) =>
                                    updateAssessment(
                                      index,
                                      "coachScore",
                                      Number(event.target.value) || 3
                                    )
                                  }
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
                          onChange={(event) =>
                            updateAssessment(index, "note", event.target.value)
                          }
                          placeholder="Kort kommentar"
                          className="text-area-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <textarea
                  value={nowState}
                  onChange={(event) => setNowState(event.target.value)}
                  placeholder="Beskriv spelarens nu-läge"
                  className="text-area-md"
                />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <h3 className="section-h3">Kortsiktiga mål (1-3 månader)</h3>
                <div className="card form-stack">
                  <div className="toolbar">
                    <label className="muted">Mål-förslag efter position</label>
                    <select
                      value={shortSuggestionFilter}
                      onChange={(event) =>
                        setShortSuggestionFilter(event.target.value as PositionGroup)
                      }
                      className="input-medium"
                    >
                      <option value="all">Alla</option>
                      <option value="gk">Målvakt</option>
                      <option value="def">Försvarare</option>
                      <option value="mid">Mittfältare</option>
                      <option value="fwd">Anfallare</option>
                    </select>
                  </div>
                  <div className="goal-groups">
                    {groupedShortSuggestions.map((group) => (
                      <div key={`short-group-${group.category}`} className="goal-group">
                        <strong className="goal-group-label">{group.category}</strong>
                        <div className="toolbar">
                          {group.suggestions.map((suggestion) => (
                            (() => {
                              const suggestionKey = `short-${group.category}-${suggestion.title}`;
                              const isExpanded = expandedShortSuggestions.includes(suggestionKey);
                              return (
                                <div
                                  key={suggestionKey}
                                  className={`goal-suggestion-wrap${isExpanded ? " expanded" : ""}`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => applySuggestion(setShortGoals, suggestion)}
                                    className={`goal-suggestion${isGoalSelected(shortGoals, suggestion) ? " selected" : ""}`}
                                  >
                                    <span className="goal-suggestion-text">{suggestion.title}</span>
                                    <span
                                      className="goal-suggestion-chevron"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        toggleExpandedSuggestion(
                                          setExpandedShortSuggestions,
                                          suggestionKey
                                        );
                                      }}
                                      role="button"
                                      aria-label={isExpanded ? "Dölj förklaring" : "Visa förklaring"}
                                      tabIndex={0}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          toggleExpandedSuggestion(
                                            setExpandedShortSuggestions,
                                            suggestionKey
                                          );
                                        }
                                      }}
                                    >
                                      {isExpanded ? "⌄" : "›"}
                                    </span>
                                  </button>
                                  {isExpanded ? (
                                    <div className="goal-suggestion-description">
                                      {suggestion.description}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })()
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="goal-custom-add">
                    <label className="goal-custom-label">Eget mål</label>
                    <div className="toolbar">
                      <input
                        value={shortCustomGoal}
                        onChange={(event) => setShortCustomGoal(event.target.value)}
                        placeholder="Lägg till eget mål"
                        className="input-wide"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          addCustomGoal(setShortGoals, shortCustomGoal, () =>
                            setShortCustomGoal("")
                          )
                        }
                      >
                        Lägg till
                      </button>
                    </div>
                  </div>
                </div>
                <div className="goal-list">
                  <strong className="goal-selected-title">Valda mål</strong>
                  {shortGoals.length === 0 ? (
                    <p className="muted-line">Inga mål valda ännu.</p>
                  ) : shortGoals.map((goal, index) => (
                    <div key={`short-${index}`} className="goal-item">
                      <span className="goal-selected-dot" aria-hidden>
                        ✓
                      </span>
                      <span>{goal.title || "Mål"}</span>
                      <button
                        type="button"
                        className="goal-remove"
                        onClick={() => removeGoal(setShortGoals, index)}
                        aria-label={`Ta bort mål ${index + 1}`}
                        title="Ta bort mål"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
                <div className="form-stack">
                  <label className="muted">Kommentar om kortsiktiga mål</label>
                  <textarea
                    value={shortGoalsComment}
                    onChange={(event) => setShortGoalsComment(event.target.value)}
                    placeholder="Tankar från spelare/ledare om kortsiktiga mål och utveckling"
                    className="text-area-sm"
                  />
                </div>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <h3 className="section-h3">Långsiktiga mål (6-12 månader)</h3>
                <div className="card form-stack">
                  <div className="toolbar">
                    <label className="muted">Mål-förslag efter position</label>
                    <select
                      value={longSuggestionFilter}
                      onChange={(event) =>
                        setLongSuggestionFilter(event.target.value as PositionGroup)
                      }
                      className="input-medium"
                    >
                      <option value="all">Alla</option>
                      <option value="gk">Målvakt</option>
                      <option value="def">Försvarare</option>
                      <option value="mid">Mittfältare</option>
                      <option value="fwd">Anfallare</option>
                    </select>
                  </div>
                  <div className="goal-groups">
                    {groupedLongSuggestions.map((group) => (
                      <div key={`long-group-${group.category}`} className="goal-group">
                        <strong className="goal-group-label">{group.category}</strong>
                        <div className="toolbar">
                          {group.suggestions.map((suggestion) => (
                            (() => {
                              const suggestionKey = `long-${group.category}-${suggestion.title}`;
                              const isExpanded = expandedLongSuggestions.includes(suggestionKey);
                              return (
                                <div
                                  key={suggestionKey}
                                  className={`goal-suggestion-wrap${isExpanded ? " expanded" : ""}`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => applySuggestion(setLongGoals, suggestion)}
                                    className={`goal-suggestion${isGoalSelected(longGoals, suggestion) ? " selected" : ""}`}
                                  >
                                    <span className="goal-suggestion-text">{suggestion.title}</span>
                                    <span
                                      className="goal-suggestion-chevron"
                                      onClick={(event) => {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        toggleExpandedSuggestion(
                                          setExpandedLongSuggestions,
                                          suggestionKey
                                        );
                                      }}
                                      role="button"
                                      aria-label={isExpanded ? "Dölj förklaring" : "Visa förklaring"}
                                      tabIndex={0}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                          event.preventDefault();
                                          event.stopPropagation();
                                          toggleExpandedSuggestion(
                                            setExpandedLongSuggestions,
                                            suggestionKey
                                          );
                                        }
                                      }}
                                    >
                                      {isExpanded ? "⌄" : "›"}
                                    </span>
                                  </button>
                                  {isExpanded ? (
                                    <div className="goal-suggestion-description">
                                      {suggestion.description}
                                    </div>
                                  ) : null}
                                </div>
                              );
                            })()
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="goal-custom-add">
                    <label className="goal-custom-label">Eget mål</label>
                    <div className="toolbar">
                      <input
                        value={longCustomGoal}
                        onChange={(event) => setLongCustomGoal(event.target.value)}
                        placeholder="Lägg till eget mål"
                        className="input-wide"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          addCustomGoal(setLongGoals, longCustomGoal, () =>
                            setLongCustomGoal("")
                          )
                        }
                      >
                        Lägg till
                      </button>
                    </div>
                  </div>
                </div>
                <div className="goal-list">
                  <strong className="goal-selected-title">Valda mål</strong>
                  {longGoals.length === 0 ? (
                    <p className="muted-line">Inga mål valda ännu.</p>
                  ) : longGoals.map((goal, index) => (
                    <div key={`long-${index}`} className="goal-item">
                      <span className="goal-selected-dot" aria-hidden>
                        ✓
                      </span>
                      <span>{goal.title || "Mål"}</span>
                      <button
                        type="button"
                        className="goal-remove"
                        onClick={() => removeGoal(setLongGoals, index)}
                        aria-label={`Ta bort mål ${index + 1}`}
                        title="Ta bort mål"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
                <div className="form-stack">
                  <label className="muted">Kommentar om långsiktiga mål</label>
                  <textarea
                    value={longGoalsComment}
                    onChange={(event) => setLongGoalsComment(event.target.value)}
                    placeholder="Tankar från spelare/ledare om långsiktiga mål och utveckling"
                    className="text-area-sm"
                  />
                </div>
              </>
            ) : null}

            {step === 4 ? (
              <>
                <h3 className="section-h3">Sammanfattning</h3>
                <div className="card form-stack">
                  <span>
                    <strong>Periodtyp:</strong> {cycleType === "season" ? "Säsong" : "Kalenderår"}
                  </span>
                  <span>
                    <strong>{cycleType === "season" ? "Säsong" : "År"}:</strong> {cycleLabel || "-"}
                  </span>
                  <span>
                    <strong>Start:</strong> {periodStart || "-"}
                  </span>
                  <span>
                    <strong>Slut:</strong> {periodEnd || "-"}
                  </span>
                  <span>
                    <strong>Återkopplingar:</strong> {reviewCadenceLabel}
                  </span>
                  <span>
                    <strong>Övrigt:</strong> {otherNotes || "-"}
                  </span>
                  <span>
                    <strong>Kommentar kortsiktiga mål:</strong> {shortGoalsComment || "-"}
                  </span>
                  <span>
                    <strong>Kommentar långsiktiga mål:</strong> {longGoalsComment || "-"}
                  </span>
                </div>
                <p className="muted-line">
                  Dessa uppgifter sätts när du skapar IUP:n.
                </p>
                <div className="card form-stack">
                  <strong>Återkopplingsplan</strong>
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
                          <strong>{point.label || `Tillfälle ${index + 1}`}</strong>
                          {point.skipped ? " • Hoppad över" : ""}
                          {point.completedAt ? " • Klar" : ""}
                        </span>
                        <div className="toolbar">
                          <input
                            value={point.dueDate || ""}
                            onChange={(event) =>
                              onChangeReviewPointPeriod(point.id, event.target.value)
                            }
                            disabled={!canEditPlan || !!point.completedAt || !!point.skipped}
                            placeholder={suggestion || "Egen period"}
                            className="input-medium"
                          />
                          {canEditPlan && !point.completedAt && !point.skipped && suggestion && point.dueDate !== suggestion ? (
                            <button
                              type="button"
                              onClick={() => onApplySuggestedReviewDate(point.id, index)}
                            >
                              Använd förslag
                            </button>
                          ) : null}
                          {canEditPlan ? (
                            <button
                              type="button"
                              onClick={() => onToggleSkipReviewPoint(point.id)}
                            >
                              {point.skipped ? "Återställ" : "Hoppa över"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </fieldset>
        </section>
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
              Föregående
            </button>
            <div className="row gap-8">
              <button
                onClick={() => {
                  if (error) {
                    return;
                  }
                  if (step === 4) {
                    onComplete();
                    return;
                  }
                  setStep((current) => Math.min(4, current + 1));
                  setStatus(null);
                }}
                disabled={saving || !!error}
              >
                {step === 4 ? "Klar" : `Nästa${nextStepLabel ? `: ${nextStepLabel}` : ""}`}
              </button>
              <button className="primary" onClick={onSave} disabled={!canSave || !canEditPlan || !!error}>
                {saving
                  ? "Sparar..."
                  : !canEditPlan
                    ? "Läsläge"
                    : localDraftSource
                      ? "Spara lokalt"
                      : "Spara IUP"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}





