import {
  type GoalSuggestion,
  type PositionGroup,
} from "@/lib/goalSuggestions";
import {
  translations,
  type Language,
} from "@/lib/translations";

export type GoalRow = {
  id?: string;
  title: string;
  description: string;
};

export type AssessmentRow = {
  area: string;
  score: number;
  note: string;
  coachScore?: number;
};

export type ReviewPoint = {
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

export type PlayerInfo = {
  id?: string;
  userId?: string;
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
} | null;

export type ReviewCadenceKind =
  | "spring_fall"
  | "spring_summer_fall"
  | "quarterly"
  | "bi_monthly"
  | "monthly"
  | "bi_weekly"
  | "weekly"
  | "custom";

export type SuggestionCategory =
  | "Teknik"
  | "Mentalt"
  | "Fysik"
  | "Anfall"
  | "Försvar"
  | "Taktik"
  | "Målvakt"
  | "Återhämtning"
  | "Övrigt";

export type Messages = (typeof translations)[Language];

export const assessmentAreas = ["Teknik", "Taktik", "Fysik", "Mentalitet"] as const;
const GOAL_COMMENTS_META_PREFIX = "__IUP_GOAL_META__:";
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

const clampScore = (value: unknown) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 3;
  }
  return Math.min(5, Math.max(1, Math.round(numeric)));
};

const pad2 = (value: number) => String(value).padStart(2, "0");

const formatIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const defaultReviewLabel = (index: number, prefix = "Tillfälle") =>
  `${prefix} ${index + 1}`;

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

export const AUTH_LOCAL_DRAFTS_KEY_PREFIX = "iup:auth:local-drafts:";
export const FREE_SESSION_DRAFTS_KEY = "iup:free:session-drafts";

export const normalizeAssessment = (
  rows?: Partial<AssessmentRow>[]
): AssessmentRow[] =>
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

export const defaultAssessment = (): AssessmentRow[] => normalizeAssessment();

export const getReviewCadenceConfig = (
  messages: Messages
): Partial<Record<ReviewCadenceKind, { label: string; points: string[] }>> => ({
  spring_fall: {
    label: messages.iup.cadenceSpringFall,
    points: [messages.iup.reviewPointSpring, messages.iup.reviewPointFall],
  },
  spring_summer_fall: {
    label: messages.iup.cadenceSpringSummerFall,
    points: [
      messages.iup.reviewPointSpring,
      messages.iup.reviewPointSummer,
      messages.iup.reviewPointFall,
    ],
  },
  quarterly: {
    label: messages.iup.cadenceQuarterly,
    points: ["Q1", "Q2", "Q3", "Q4"],
  },
  bi_monthly: {
    label: messages.iup.cadenceBiMonthly,
    points: Array.from(
      { length: 6 },
      (_, idx) => `${messages.iup.reviewPrefixBiMonthly} ${idx + 1}`
    ),
  },
  monthly: {
    label: messages.iup.cadenceMonthly,
    points: Array.from(
      { length: 12 },
      (_, idx) => `${messages.iup.reviewPrefixMonth} ${idx + 1}`
    ),
  },
  bi_weekly: {
    label: messages.iup.cadenceBiWeekly,
    points: Array.from(
      { length: 26 },
      (_, idx) => `${messages.iup.reviewPrefixBiWeekly} ${idx + 1}`
    ),
  },
  weekly: {
    label: messages.iup.cadenceWeekly,
    points: Array.from(
      { length: 52 },
      (_, idx) => `${messages.iup.reviewPrefixWeek} ${idx + 1}`
    ),
  },
});

export const inferReviewCadenceKind = (
  reviewCount: number
): ReviewCadenceKind => {
  if (reviewCount === 2) return "spring_fall";
  if (reviewCount === 3) return "spring_summer_fall";
  if (reviewCount === 4) return "quarterly";
  if (reviewCount === 6) return "bi_monthly";
  if (reviewCount === 12) return "monthly";
  if (reviewCount === 26) return "bi_weekly";
  if (reviewCount === 52) return "weekly";
  return "custom";
};

export const getReviewPointLabel = (
  point: ReviewPoint,
  index: number,
  cadenceKind: ReviewCadenceKind,
  config: Partial<Record<ReviewCadenceKind, { label: string; points: string[] }>>,
  sessionPrefix: string
) => config[cadenceKind]?.points[index] ?? point.label ?? `${sessionPrefix} ${index + 1}`;

export const decodeOtherNotesMeta = (raw?: string) => {
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

export const encodeOtherNotesMeta = (
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

export const suggestedReviewPeriod = (
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

export const buildReviewPoints = (
  count: number,
  _periodStart?: string,
  _periodEnd?: string,
  current?: ReviewPoint[],
  labelPrefix?: string
): ReviewPoint[] => {
  const safeCount = Math.max(1, count || 3);
  const points: ReviewPoint[] = [];

  for (let i = 0; i < safeCount; i += 1) {
    const existing = current?.[i];
    const dueDate = existing?.dueDate ?? "";
    points.push({
      id: existing?.id ?? `rp-${i + 1}`,
      label: existing?.label ?? defaultReviewLabel(i, labelPrefix),
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

export const getSeasonDefaults = (baseYear: number) => ({
  cycleLabel: `${baseYear}/${baseYear + 1}`,
  periodStart: `${baseYear}-08-01`,
  periodEnd: `${baseYear + 1}-06-30`,
});

export const getYearDefaults = (year: number) => ({
  cycleLabel: String(year),
  periodStart: `${year}-01-01`,
  periodEnd: `${year}-12-31`,
});

export const inferPositionGroup = (positionLabel?: string): PositionGroup => {
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
  if (p.includes("CM") || p.includes("DM") || p.includes("AM") || p.includes("MID")) {
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

export const customSuggestionsKey = (horizon: "short" | "long") =>
  `iup:customGoalSuggestions:${horizon}`;

export const normalizeSuggestion = (
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

export const mergeUniqueSuggestions = (...groups: GoalSuggestion[][]): GoalSuggestion[] => {
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

export const groupSuggestionsByCategory = (suggestions: GoalSuggestion[]) => {
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

export const preferredCategoryByPositionGroup = (
  group: PositionGroup
): SuggestionCategory | null => {
  if (group === "def") return "Försvar";
  if (group === "fwd") return "Anfall";
  if (group === "mid") return "Teknik";
  if (group === "gk") return "Målvakt";
  return null;
};

export const prioritizeCategoryGroup = (
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

export const getSuggestionCategoryLabel = (
  category: SuggestionCategory,
  messages: Messages
) => {
  switch (category) {
    case "Teknik":
      return messages.iup.categoryTechnique;
    case "Taktik":
      return messages.iup.categoryTactics;
    case "Anfall":
      return messages.iup.categoryAttack;
    case "Försvar":
      return messages.iup.categoryDefense;
    case "Målvakt":
      return messages.iup.categoryGoalkeeper;
    case "Fysik":
      return messages.iup.categoryPhysical;
    case "Mentalt":
      return messages.iup.categoryMental;
    case "Återhämtning":
      return messages.iup.categoryRecovery;
    default:
      return messages.iup.categoryOther;
  }
};

export const getBirthYear = (birthDate?: string) => {
  if (!birthDate) {
    return "";
  }
  const year = new Date(`${birthDate}T00:00:00`).getFullYear();
  return Number.isNaN(year) ? "" : String(year);
};

export const getAge = (birthDate?: string) => {
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

export const getBmi = (heightCm?: number, weightKg?: number) => {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    return "";
  }
  const meters = heightCm / 100;
  const bmi = weightKg / (meters * meters);
  return bmi.toFixed(1);
};

export const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Could not read file."));
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
