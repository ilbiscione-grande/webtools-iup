import { supabase } from "./supabaseClient";
import {
  fetchMyClubs,
  fetchMyProfile,
  fetchMyAdminTeams,
} from "./sharedOrgApi";

export type TeamLite = {
  id: string;
  name: string;
  clubId?: string;
  clubName?: string;
  label: string;
};

export type PlanLevel = "FREE" | "AUTH" | "PAID";

export type TeamPlayerLite = {
  id: string;
  name: string;
  positionLabel: string;
};

type SquadMetadata = {
  birthDate?: string;
  dominantFoot?: string;
  heightCm?: number;
  weightKg?: number;
  nationality?: string;
  birthPlace?: string;
  injuryNotes?: string;
};

export type PaidPlayer = {
  id: string;
  teamId: string;
  teamName: string;
  clubId?: string;
  clubName?: string;
  name: string;
  number: number;
  positionLabel: string;
  isActive: boolean;
};

export type SquadPlayer = PaidPlayer & {
  userId?: string;
  birthDate?: string;
  dominantFoot?: string;
  heightCm?: number;
  weightKg?: number;
  nationality?: string;
  birthPlace?: string;
  injuryNotes?: string;
  photoUrl?: string;
};

export type PlayerListFilters = {
  search?: string;
  clubId?: string;
  teamId?: string;
  positionLabel?: string;
  status?: "all" | "active" | "inactive";
};

export type SquadPlayerInput = {
  teamId: string;
  name: string;
  number?: number;
  positionLabel?: string;
  birthDate?: string;
  dominantFoot?: string;
  heightCm?: number;
  weightKg?: number;
  nationality?: string;
  birthPlace?: string;
  injuryNotes?: string;
};

export type IupPlanLite = {
  id: string;
  title: string;
  status: "active" | "completed" | "archived";
  playerId: string;
  periodStart?: string;
  periodEnd?: string;
  createdAt: string;
};

export type IupPlanDetail = IupPlanLite & {
  teamId: string;
  createdBy: string;
  nowState?: string;
  otherNotes?: string;
  reviewCount?: number;
  cycleType?: "year" | "season";
  cycleLabel?: string;
  selfAssessment?: Array<{
    area: string;
    score: number;
    note: string;
    coachScore?: number;
  }>;
  reviewPoints?: Array<{
    id: string;
    label: string;
    dueDate?: string;
    note: string;
    nowState?: string;
    completedAt?: string;
    unlockedForEdit?: boolean;
    skipped?: boolean;
    selfAssessment?: Array<{
      area: string;
      score: number;
      note: string;
      coachScore?: number;
    }>;
  }>;
};

export type IupGoalDraft = {
  id?: string;
  horizon: "short" | "long";
  orderIndex: number;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
};

export type UserGoalSuggestion = {
  horizon: "short" | "long";
  title: string;
  description: string;
  groups: Array<"all" | "gk" | "def" | "mid" | "fwd">;
};

export type IupPlanEditor = {
  plan: IupPlanDetail;
  goals: IupGoalDraft[];
  player: {
    id: string;
    name: string;
    number?: number;
    positionLabel?: string;
    teamName?: string;
    photoUrl?: string;
    birthDate?: string;
    dominantFoot?: string;
    heightCm?: number;
    weightKg?: number;
    nationality?: string;
    birthPlace?: string;
    injuryNotes?: string;
  } | null;
};

export type IupPlayerProfileInput = {
  name: string;
  number?: number;
  positionLabel?: string;
  birthDate?: string;
  dominantFoot?: string;
  heightCm?: number;
  weightKg?: number;
  nationality?: string;
  birthPlace?: string;
  injuryNotes?: string;
  photoUrl?: string;
};

const normalizePlanStatus = (value: string | null | undefined): IupPlanLite["status"] => {
  if (value === "archived") {
    return "archived";
  }
  if (value === "completed") {
    return "completed";
  }
  return "active";
};

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeOptionalText = (value: unknown) => {
  const next = normalizeText(value);
  return next || undefined;
};

const normalizeOptionalNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const parseSquadMetadata = (value: unknown): SquadMetadata => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const metadata = value as Record<string, unknown>;
  return {
    birthDate: normalizeOptionalText(metadata.birthDate),
    dominantFoot: normalizeOptionalText(metadata.dominantFoot),
    heightCm: normalizeOptionalNumber(metadata.heightCm),
    weightKg: normalizeOptionalNumber(metadata.weightKg),
    nationality: normalizeOptionalText(metadata.nationality),
    birthPlace: normalizeOptionalText(metadata.birthPlace),
    injuryNotes: normalizeOptionalText(metadata.injuryNotes),
  };
};

const buildSquadMetadata = (
  payload: Omit<SquadPlayerInput, "teamId">
): Record<string, unknown> => {
  const metadata: Record<string, unknown> = {};
  if (payload.birthDate) metadata.birthDate = payload.birthDate;
  if (payload.dominantFoot?.trim()) metadata.dominantFoot = payload.dominantFoot.trim();
  if (typeof payload.heightCm === "number") metadata.heightCm = payload.heightCm;
  if (typeof payload.weightKg === "number") metadata.weightKg = payload.weightKg;
  if (payload.nationality?.trim()) metadata.nationality = payload.nationality.trim();
  if (payload.birthPlace?.trim()) metadata.birthPlace = payload.birthPlace.trim();
  if (payload.injuryNotes?.trim()) metadata.injuryNotes = payload.injuryNotes.trim();
  return metadata;
};

const isPlayerMember = (row: {
  role?: string | null;
  team_role?: string | null;
  team_position?: string | null;
  shirt_number?: number | null;
  metadata?: unknown;
}) => {
  const role = normalizeText(row.role).toLowerCase();
  const teamRole = normalizeText(row.team_role).toLowerCase();
  const staffKeywords = ["coach", "assistant", "trainer", "manager", "admin"];
  const isStaff =
    staffKeywords.some((keyword) => role.includes(keyword)) ||
    staffKeywords.some((keyword) => teamRole.includes(keyword));
  if (isStaff) {
    return false;
  }
  if (role === "player" || teamRole === "player") {
    return true;
  }
  if (normalizeText(row.team_position)) {
    return true;
  }
  if (typeof row.shirt_number === "number") {
    return true;
  }
  const metadata = parseSquadMetadata(row.metadata);
  return Boolean(
    metadata.birthDate ||
      metadata.dominantFoot ||
      metadata.heightCm ||
      metadata.weightKg ||
      metadata.nationality ||
      metadata.birthPlace ||
      metadata.injuryNotes
  );
};

const normalizePlayerSearch = (value?: string) => value?.trim().replaceAll(",", " ") ?? "";

export const getSessionUser = async () => {
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return null;
  }
  return data.user;
};

export const fetchProfilePlan = async (): Promise<
  { ok: true; plan: PlanLevel } | { ok: false; error: string }
> => {
  const user = await getSessionUser();
  if (!user) {
    return { ok: true, plan: "FREE" };
  }
  const profileResult = await fetchMyProfile();
  if (!profileResult.ok) {
    return { ok: false, error: profileResult.error };
  }
  const rawPlan = String(profileResult.data.plan ?? "AUTH").toUpperCase();
  if (rawPlan === "PAID") {
    return { ok: true, plan: "PAID" };
  }
  if (rawPlan === "FREE") {
    return { ok: true, plan: "FREE" };
  }
  return { ok: true, plan: "AUTH" };
};

export const signInPassword = async (email: string, password: string) => {
  if (!supabase) {
    return { ok: false as const, error: "Supabase missing." };
  }
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
};

export const signUpPassword = async (email: string, password: string) => {
  if (!supabase) {
    return { ok: false as const, error: "Supabase missing." };
  }
  const { error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
};

export const signOut = async () => {
  if (!supabase) {
    return;
  }
  await supabase.auth.signOut();
};

export const fetchTeams = async (): Promise<{
  ok: true;
  teams: TeamLite[];
} | {
  ok: false;
  error: string;
}> => {
  const [teamResult, clubResult] = await Promise.all([fetchMyAdminTeams(), fetchMyClubs()]);
  if (!teamResult.ok) {
    return { ok: false, error: teamResult.error };
  }
  if (!clubResult.ok) {
    return { ok: false, error: clubResult.error };
  }

  const clubNameById = new Map(clubResult.data.map((club) => [club.id, club.name] as const));

  return {
    ok: true,
    teams: teamResult.data.map((team) => {
      const clubName = team.clubId ? clubNameById.get(team.clubId) : undefined;
      return {
      id: team.id,
      name: team.name,
        clubId: team.clubId,
        clubName,
        label: clubName ? `${clubName} / ${team.name}` : team.name,
      };
    }),
  };
};

export const fetchTeamPlayers = async (teamId: string): Promise<{
  ok: true;
  players: TeamPlayerLite[];
} | {
  ok: false;
  error: string;
}> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const { data, error } = await supabase
    .from("team_members")
    .select("id,display_name,team_position,role,team_role,shirt_number,metadata,is_active")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("shirt_number", { ascending: true });
  if (error) {
    return { ok: false, error: error.message };
  }
  const players = ((data ?? []) as Array<{
    id: string;
    display_name: string | null;
    team_position: string | null;
    role?: string | null;
    team_role?: string | null;
    shirt_number?: number | null;
    metadata?: unknown;
  }>)
    .filter(isPlayerMember)
    .map((row) => ({
      id: row.id,
      name: row.display_name ?? "Spelare",
      positionLabel: row.team_position ?? "",
    }));
  return { ok: true, players };
};

export const fetchIupPlans = async (teamId: string): Promise<{
  ok: true;
  plans: IupPlanLite[];
} | {
  ok: false;
  error: string;
}> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const { data, error } = await supabase
    .from("iup_plans")
    .select("id,title,status,player_id,period_start,period_end,created_at")
    .eq("team_id", teamId)
    .order("updated_at", { ascending: false });
  if (error) {
    return { ok: false, error: error.message };
  }
  const plans = ((data ?? []) as Array<{
    id: string;
    title: string;
    status: IupPlanLite["status"];
    player_id: string;
    period_start: string | null;
    period_end: string | null;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    title: row.title,
    status: normalizePlanStatus(row.status),
    playerId: row.player_id,
    periodStart: row.period_start ?? undefined,
    periodEnd: row.period_end ?? undefined,
    createdAt: row.created_at,
  }));
  return { ok: true, plans };
};

export const fetchIupPlansForPlayer = async (
  playerId: string
): Promise<
  { ok: true; plans: IupPlanLite[] } | { ok: false; error: string }
> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const { data, error } = await supabase
    .from("iup_plans")
    .select("id,title,status,player_id,period_start,period_end,created_at")
    .eq("player_id", playerId)
    .order("updated_at", { ascending: false });
  if (error) {
    return { ok: false, error: error.message };
  }
  const plans = ((data ?? []) as Array<{
    id: string;
    title: string;
    status: IupPlanLite["status"];
    player_id: string;
    period_start: string | null;
    period_end: string | null;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    title: row.title,
    status: normalizePlanStatus(row.status),
    playerId: row.player_id,
    periodStart: row.period_start ?? undefined,
    periodEnd: row.period_end ?? undefined,
    createdAt: row.created_at,
  }));
  return { ok: true, plans };
};

const svMonthMap: Record<string, number> = {
  jan: 0,
  februari: 1,
  feb: 1,
  mar: 2,
  mars: 2,
  apr: 3,
  april: 3,
  maj: 4,
  jun: 5,
  juni: 5,
  jul: 6,
  juli: 6,
  aug: 7,
  augusti: 7,
  sep: 8,
  september: 8,
  okt: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const parseMonthYear = (value: string): { year: number; month: number } | null => {
  const match = value.trim().toLowerCase().match(/^([a-zåäö]+)\s+(\d{4})$/);
  if (!match) {
    return null;
  }
  const month = svMonthMap[match[1]];
  const year = Number(match[2]);
  if (!Number.isInteger(month) || !Number.isInteger(year)) {
    return null;
  }
  return { year, month };
};

const parseReviewPeriodRange = (value?: string) => {
  const raw = (value ?? "").trim();
  if (!raw) {
    return null;
  }
  const isoDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const dt = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(dt.getTime())) {
      return null;
    }
    return { start: dt, end: dt };
  }

  const parts = raw.split(/\s+-\s+/).map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0 || parts.length > 2) {
    return null;
  }
  const isoStart = parts[0]?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const isoEnd = (parts[1] ?? parts[0])?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoStart && isoEnd) {
    const start = new Date(`${parts[0]}T00:00:00`);
    const end = new Date(`${parts[1] ?? parts[0]}T23:59:59`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }
    return { start, end };
  }
  const startParsed = parseMonthYear(parts[0]);
  if (!startParsed) {
    return null;
  }
  const endParsed = parseMonthYear(parts[1] ?? parts[0]);
  if (!endParsed) {
    return null;
  }
  const start = new Date(startParsed.year, startParsed.month, 1, 0, 0, 0, 0);
  const end = new Date(endParsed.year, endParsed.month + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

export const fetchPlayersInReviewPeriod = async (
  playerIds: string[]
): Promise<{ ok: true; byPlayerId: Record<string, boolean> } | { ok: false; error: string }> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  if (!playerIds.length) {
    return { ok: true, byPlayerId: {} };
  }
  const { data, error } = await supabase
    .from("iup_plans")
    .select("player_id,status,review_points")
    .in("player_id", playerIds)
    .eq("status", "active");

  if (error) {
    return { ok: false, error: error.message };
  }

  const now = new Date();
  const byPlayerId: Record<string, boolean> = {};
  for (const id of playerIds) {
    byPlayerId[id] = false;
  }

  for (const row of (data ?? []) as Array<{
    player_id?: string | null;
    review_points?: unknown;
  }>) {
    const playerId = String(row.player_id ?? "");
    if (!playerId || byPlayerId[playerId]) {
      continue;
    }
    const reviewPoints = Array.isArray(row.review_points) ? row.review_points : [];
    const isNow = reviewPoints.some((entry) => {
      if (!entry || typeof entry !== "object") {
        return false;
      }
      const point = entry as { dueDate?: string; completedAt?: string; skipped?: boolean };
      if (point.completedAt || point.skipped) {
        return false;
      }
      const range = parseReviewPeriodRange(point.dueDate);
      if (!range) {
        return false;
      }
      return now >= range.start && now <= range.end;
    });
    if (isNow) {
      byPlayerId[playerId] = true;
    }
  }
  return { ok: true, byPlayerId };
};

export const fetchPaidPlayers = async (
  filters: PlayerListFilters = {}
): Promise<{ ok: true; players: PaidPlayer[] } | { ok: false; error: string }> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  const teamResult = await fetchMyAdminTeams();
  if (!teamResult.ok) {
    return { ok: false, error: teamResult.error };
  }
  const normalizedTeams = teamResult.data;
  if (normalizedTeams.length === 0) {
    return { ok: true, players: [] };
  }

  const teamNameById = new Map(normalizedTeams.map((team) => [team.id, team.name] as const));
  const teamClubById = new Map(normalizedTeams.map((team) => [team.id, team.clubId] as const));
  const clubNameResult = await fetchMyClubs();
  if (!clubNameResult.ok) {
    return { ok: false, error: clubNameResult.error };
  }
  const clubNameById = new Map(clubNameResult.data.map((club) => [club.id, club.name] as const));
  const baseTeamIds = normalizedTeams
    .filter((team) => !filters.clubId || team.clubId === filters.clubId)
    .map((team) => team.id);
  const teamIds =
    filters.teamId && baseTeamIds.includes(filters.teamId) ? [filters.teamId] : baseTeamIds;
  if (teamIds.length === 0) {
    return { ok: true, players: [] };
  }

  let query = supabase
    .from("team_members")
    .select(
      "id,team_id,user_id,display_name,shirt_number,team_position,is_active,photo_url,role,team_role,metadata"
    )
    .in("team_id", teamIds)
    .order("team_id", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("shirt_number", { ascending: true });

  if (filters.positionLabel?.trim()) {
    query = query.eq("team_position", filters.positionLabel.trim());
  }
  if (filters.status === "active") {
    query = query.eq("is_active", true);
  } else if (filters.status === "inactive") {
    query = query.eq("is_active", false);
  }

  const searchTerm = normalizePlayerSearch(filters.search).toLowerCase();
  if (searchTerm) {
    const orParts = [
      `display_name.ilike.%${searchTerm}%`,
      `team_position.ilike.%${searchTerm}%`,
    ];
    const parsedNumber = Number(searchTerm);
    if (Number.isInteger(parsedNumber)) {
      orParts.push(`shirt_number.eq.${parsedNumber}`);
    }
    query = query.or(orParts.join(","));
  }

  const { data: players, error: playerError } = await query;
  if (playerError) {
    return { ok: false, error: playerError.message };
  }

  const normalizedPlayers = ((players ?? []) as Array<{
    id: string;
    team_id: string;
    user_id?: string | null;
    display_name: string | null;
    shirt_number: number | null;
    team_position: string | null;
    is_active: boolean | null;
    photo_url?: string | null;
    role?: string | null;
    team_role?: string | null;
    metadata?: unknown;
  }>)
    .filter(isPlayerMember)
    .map((player) => ({
      id: player.id,
      teamId: player.team_id,
      teamName: teamNameById.get(player.team_id) ?? "Team",
      clubId: teamClubById.get(player.team_id) ?? undefined,
      clubName: (() => {
        const clubId = teamClubById.get(player.team_id);
        return clubId ? clubNameById.get(clubId) : undefined;
      })(),
      name: player.display_name ?? "Spelare",
      number: player.shirt_number ?? 0,
      positionLabel: player.team_position ?? "",
      isActive: Boolean(player.is_active),
      userId: player.user_id ?? undefined,
      photoUrl: player.photo_url ?? undefined,
    }))
    .filter((player) => {
      if (!searchTerm) {
        return true;
      }
      return (
        player.name.toLowerCase().includes(searchTerm) ||
        player.teamName.toLowerCase().includes(searchTerm) ||
        player.positionLabel.toLowerCase().includes(searchTerm) ||
        String(player.number).includes(searchTerm)
      );
    });

  return { ok: true, players: normalizedPlayers };
};

export const fetchSquadPlayers = async (
  includeArchived = true,
  filters: PlayerListFilters = {}
): Promise<
  { ok: true; players: SquadPlayer[] } | { ok: false; error: string }
> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const teamResult = await fetchMyAdminTeams();
  if (!teamResult.ok) {
    return { ok: false, error: teamResult.error };
  }
  const normalizedTeams = teamResult.data;
  if (normalizedTeams.length === 0) {
    return { ok: true, players: [] };
  }

  const clubResult = await fetchMyClubs();
  if (!clubResult.ok) {
    return { ok: false, error: clubResult.error };
  }
  const clubNameById = new Map(clubResult.data.map((club) => [club.id, club.name] as const));
  const teamClubById = new Map(normalizedTeams.map((team) => [team.id, team.clubId] as const));
  const baseTeamIds = normalizedTeams
    .filter((team) => !filters.clubId || team.clubId === filters.clubId)
    .map((team) => team.id);
  const teamIds =
    filters.teamId && baseTeamIds.includes(filters.teamId) ? [filters.teamId] : baseTeamIds;
  if (teamIds.length === 0) {
    return { ok: true, players: [] };
  }
  const teamNameById = new Map(normalizedTeams.map((team) => [team.id, team.name] as const));

  let query = supabase
    .from("team_members")
    .select(
      "id,team_id,user_id,display_name,shirt_number,team_position,is_active,photo_url,role,team_role,metadata"
    )
    .in("team_id", teamIds)
    .order("team_id", { ascending: true })
    .order("is_active", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("shirt_number", { ascending: true });

  if (!includeArchived) {
    query = query.eq("is_active", true);
  }

  if (filters.positionLabel?.trim()) {
    query = query.eq("team_position", filters.positionLabel.trim());
  }
  if (filters.status === "active") {
    query = query.eq("is_active", true);
  } else if (filters.status === "inactive") {
    query = query.eq("is_active", false);
  }

  const searchTerm = normalizePlayerSearch(filters.search).toLowerCase();
  if (searchTerm) {
    const orParts = [
      `display_name.ilike.%${searchTerm}%`,
      `team_position.ilike.%${searchTerm}%`,
    ];
    const parsedNumber = Number(searchTerm);
    if (Number.isInteger(parsedNumber)) {
      orParts.push(`shirt_number.eq.${parsedNumber}`);
    }
    query = query.or(orParts.join(","));
  }

  let { data: players, error: playerError } = await query;
  if (playerError) {
    return { ok: false, error: playerError.message };
  }

  const normalizedPlayers = ((players ?? []) as Array<{
    id: string;
    team_id: string;
    user_id?: string | null;
    display_name: string | null;
    shirt_number: number | null;
    team_position: string | null;
    is_active: boolean | null;
    photo_url?: string | null;
    role?: string | null;
    team_role?: string | null;
    metadata?: unknown;
  }>)
    .filter(isPlayerMember)
    .map((player) => {
      const metadata = parseSquadMetadata(player.metadata);
      return {
        id: player.id,
        teamId: player.team_id,
        teamName: teamNameById.get(player.team_id) ?? "Team",
        clubId: teamClubById.get(player.team_id) ?? undefined,
        clubName: (() => {
          const clubId = teamClubById.get(player.team_id);
          return clubId ? clubNameById.get(clubId) : undefined;
        })(),
        name: player.display_name ?? "Spelare",
        number: player.shirt_number ?? 0,
        positionLabel: player.team_position ?? "",
        isActive: Boolean(player.is_active),
        userId: player.user_id ?? undefined,
        photoUrl: player.photo_url ?? undefined,
        birthDate: metadata.birthDate,
        dominantFoot: metadata.dominantFoot,
        heightCm: metadata.heightCm,
        weightKg: metadata.weightKg,
        nationality: metadata.nationality,
        birthPlace: metadata.birthPlace,
        injuryNotes: metadata.injuryNotes,
      };
    })
    .filter((player) => {
      if (!searchTerm) {
        return true;
      }
      return (
        player.name.toLowerCase().includes(searchTerm) ||
        player.teamName.toLowerCase().includes(searchTerm) ||
        player.positionLabel.toLowerCase().includes(searchTerm) ||
        String(player.number).includes(searchTerm) ||
        (player.nationality ?? "").toLowerCase().includes(searchTerm)
      );
    });

  return { ok: true, players: normalizedPlayers };
};

export const createSquadPlayer = async (
  payload: SquadPlayerInput
): Promise<{ ok: true; playerId: string } | { ok: false; error: string }> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      team_id: payload.teamId,
      display_name: payload.name.trim(),
      role: "player",
      team_role: "player",
      team_position: payload.positionLabel?.trim() || null,
      shirt_number: payload.number ?? null,
      metadata: buildSquadMetadata({
        name: payload.name,
        number: payload.number,
        positionLabel: payload.positionLabel,
        birthDate: payload.birthDate,
        dominantFoot: payload.dominantFoot,
        heightCm: payload.heightCm,
        weightKg: payload.weightKg,
        nationality: payload.nationality,
        birthPlace: payload.birthPlace,
        injuryNotes: payload.injuryNotes,
      }),
      is_active: true,
      is_guest: false,
      is_team_admin: false,
    })
    .select("id")
    .single();
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, playerId: String(data.id) };
};

export const updateSquadPlayer = async (
  playerId: string,
  payload: Omit<SquadPlayerInput, "teamId">
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("team_members")
    .update({
      display_name: payload.name.trim(),
      team_position: payload.positionLabel?.trim() || null,
      shirt_number: payload.number ?? null,
      metadata: buildSquadMetadata(payload),
    })
    .eq("id", playerId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

export const updateIupPlayerProfile = async (
  playerId: string,
  payload: IupPlayerProfileInput
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("team_members")
    .update({
      display_name: payload.name.trim(),
      team_position: payload.positionLabel?.trim() || null,
      shirt_number: payload.number ?? null,
      photo_url: payload.photoUrl?.trim() || null,
      metadata: buildSquadMetadata({
        name: payload.name,
        number: payload.number,
        positionLabel: payload.positionLabel,
        birthDate: payload.birthDate,
        dominantFoot: payload.dominantFoot,
        heightCm: payload.heightCm,
        weightKg: payload.weightKg,
        nationality: payload.nationality,
        birthPlace: payload.birthPlace,
        injuryNotes: payload.injuryNotes,
      }),
    })
    .eq("id", playerId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

export const archiveSquadPlayer = async (
  playerId: string
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("team_members")
    .update({ is_active: false })
    .eq("id", playerId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

export const restoreSquadPlayer = async (
  playerId: string
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { error } = await supabase
    .from("team_members")
    .update({ is_active: true })
    .eq("id", playerId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

export const createIupPlan = async (payload: {
  teamId: string;
  playerId: string;
  title: string;
  periodStart?: string;
  periodEnd?: string;
  otherNotes?: string;
  reviewCount?: number;
  cycleType?: "year" | "season";
  cycleLabel?: string;
  reviewPoints?: Array<{
    id: string;
    label: string;
    dueDate?: string;
    note?: string;
    completedAt?: string;
    unlockedForEdit?: boolean;
    skipped?: boolean;
  }>;
}) => {
  if (!supabase) {
    return { ok: false as const, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: "Not signed in." };
  }
  const { data, error } = await supabase
    .from("iup_plans")
    .insert({
      team_id: payload.teamId,
      player_id: payload.playerId,
      title: payload.title,
      status: "active",
      period_start: payload.periodStart ?? null,
      period_end: payload.periodEnd ?? null,
      other_notes: payload.otherNotes ?? "",
      cycle_type: payload.cycleType ?? "season",
      cycle_label: payload.cycleLabel ?? "",
      review_count: Math.max(1, payload.reviewCount ?? 3),
      review_points: payload.reviewPoints ?? [],
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const, planId: data.id as string };
};

export const fetchIupPlanById = async (
  planId: string
): Promise<
  { ok: true; plan: IupPlanDetail } | { ok: false; error: string }
> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const { data, error } = await supabase
    .from("iup_plans")
    .select(
      "id,team_id,title,status,player_id,period_start,period_end,created_at,now_state,other_notes,review_count,cycle_type,cycle_label,review_points,self_assessment,created_by"
    )
    .eq("id", planId)
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "IUP not found." };
  }
  return {
    ok: true,
    plan: {
      id: data.id as string,
      teamId: data.team_id as string,
      createdBy: data.created_by as string,
      title: data.title as string,
      status: normalizePlanStatus(data.status as string | null | undefined),
      playerId: data.player_id as string,
      periodStart: (data.period_start as string | null) ?? undefined,
      periodEnd: (data.period_end as string | null) ?? undefined,
      createdAt: data.created_at as string,
      nowState: (data.now_state as string | null) ?? undefined,
      otherNotes: (data.other_notes as string | null) ?? undefined,
      reviewCount: (data.review_count as number | null) ?? 3,
      cycleType:
        (data.cycle_type as string | null) === "year" ? "year" : "season",
      cycleLabel: (data.cycle_label as string | null) ?? "",
      reviewPoints: Array.isArray(data.review_points)
        ? (data.review_points as Array<{
            id?: string;
            label?: string;
            dueDate?: string;
            note?: string;
            nowState?: string;
            completedAt?: string;
            unlockedForEdit?: boolean;
            skipped?: boolean;
            selfAssessment?: Array<{
              area?: string;
              score?: number;
              note?: string;
              coachScore?: number;
            }>;
          }>).map((entry, idx) => ({
            id: entry.id ?? `rp-${idx + 1}`,
            label: entry.label ?? `Tillfälle ${idx + 1}`,
            dueDate: entry.dueDate ?? undefined,
            note: entry.note ?? "",
            nowState: entry.nowState ?? "",
            completedAt: entry.completedAt ?? undefined,
            unlockedForEdit: entry.unlockedForEdit === true,
            skipped: entry.skipped === true,
            selfAssessment: Array.isArray(entry.selfAssessment)
              ? entry.selfAssessment.map((assessment, aIdx) => ({
                  area: assessment.area ?? `Area ${aIdx + 1}`,
                  score:
                    typeof assessment.score === "number"
                      ? Math.min(5, Math.max(1, assessment.score))
                      : 3,
                  note: assessment.note ?? "",
                  coachScore:
                    typeof assessment.coachScore === "number"
                      ? Math.min(5, Math.max(1, assessment.coachScore))
                      : undefined,
                }))
              : undefined,
          }))
        : [],
      selfAssessment: Array.isArray(data.self_assessment)
        ? (data.self_assessment as Array<{
            area?: string;
            score?: number;
            note?: string;
            coachScore?: number;
          }>).map((entry, idx) => ({
            area: entry.area ?? `Area ${idx + 1}`,
            score:
              typeof entry.score === "number"
                ? Math.min(5, Math.max(1, entry.score))
                : 3,
            note: entry.note ?? "",
            coachScore:
              typeof entry.coachScore === "number"
                ? Math.min(5, Math.max(1, entry.coachScore))
                : undefined,
          }))
        : [],
    },
  };
};

export const fetchIupPlanEditor = async (
  planId: string
): Promise<
  { ok: true; data: IupPlanEditor } | { ok: false; error: string }
> => {
  const planResult = await fetchIupPlanById(planId);
  if (!planResult.ok) {
    return planResult;
  }
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const { data, error } = await supabase
    .from("iup_goals")
    .select("id,order_index,title,description,status,horizon")
    .eq("plan_id", planId)
    .order("horizon", { ascending: true })
    .order("order_index", { ascending: true });
  if (error) {
    return { ok: false, error: error.message };
  }
  const goals = ((data ?? []) as Array<{
    id: string;
    order_index: number;
    title: string;
    description: string | null;
    status: IupGoalDraft["status"];
    horizon: "short" | "long" | null;
  }>).map((row): IupGoalDraft => ({
    id: row.id,
    horizon: row.horizon === "long" ? "long" : "short",
    orderIndex: row.order_index ?? 0,
    title: row.title ?? "",
    description: row.description ?? "",
    status: row.status ?? "todo",
  }));

  const { data: playerRow } = await supabase
    .from("team_members")
    .select("id,user_id,display_name,shirt_number,team_position,photo_url,metadata,is_active")
    .eq("id", planResult.plan.playerId)
    .maybeSingle();

  const { data: teamRow } = await supabase
    .from("teams")
    .select("id,name")
    .eq("id", planResult.plan.teamId)
    .maybeSingle();

  const player =
    playerRow && typeof playerRow === "object"
      ? (() => {
          const member = playerRow as {
            id?: string;
            display_name?: string | null;
            shirt_number?: number | null;
            team_position?: string | null;
            photo_url?: string | null;
            metadata?: unknown;
          };
          const metadata = parseSquadMetadata(member.metadata);
          return {
            id: String(member.id ?? ""),
            name: String(member.display_name ?? "Player"),
            number:
              typeof member.shirt_number === "number" ? member.shirt_number : undefined,
            positionLabel: String(member.team_position ?? ""),
            teamName: String((teamRow as { name?: string })?.name ?? ""),
            photoUrl: String(member.photo_url ?? ""),
            birthDate: metadata.birthDate ?? "",
            dominantFoot: metadata.dominantFoot ?? "",
            heightCm: metadata.heightCm,
            weightKg: metadata.weightKg,
            nationality: metadata.nationality ?? "",
            birthPlace: metadata.birthPlace ?? "",
            injuryNotes: metadata.injuryNotes ?? "",
          };
        })()
      : null;

  return { ok: true, data: { plan: planResult.plan, goals, player } };
};

export const saveIupPlanEditor = async (payload: {
  planId: string;
  title: string;
  periodStart?: string;
  periodEnd?: string;
  nowState: string;
  otherNotes: string;
  reviewCount: number;
  cycleType: "year" | "season";
  cycleLabel: string;
  status: "active" | "completed" | "archived";
  reviewPoints: Array<{
    id: string;
    label: string;
    dueDate?: string;
    note: string;
    nowState?: string;
    completedAt?: string;
    unlockedForEdit?: boolean;
    skipped?: boolean;
    selfAssessment?: Array<{
      area: string;
      score: number;
      note: string;
      coachScore?: number;
    }>;
  }>;
  selfAssessment: Array<{
    area: string;
    score: number;
    note: string;
    coachScore?: number;
  }>;
  shortGoals: Array<{ title: string; description: string }>;
  longGoals: Array<{ title: string; description: string }>;
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const { error } = await supabase.rpc("save_iup_plan_editor", {
    p_plan_id: payload.planId,
    p_title: payload.title,
    p_period_start: payload.periodStart || null,
    p_period_end: payload.periodEnd || null,
    p_now_state: payload.nowState,
    p_other_notes: payload.otherNotes,
    p_review_count: Math.max(1, payload.reviewCount || 3),
    p_cycle_type: payload.cycleType,
    p_cycle_label: payload.cycleLabel,
    p_status: payload.status,
    p_review_points: payload.reviewPoints,
    p_self_assessment: payload.selfAssessment,
    p_short_goals: payload.shortGoals,
    p_long_goals: payload.longGoals,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

export const fetchUserGoalSuggestions = async (
  horizon: "short" | "long"
): Promise<
  { ok: true; suggestions: UserGoalSuggestion[] } | { ok: false; error: string }
> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  const { data, error } = await supabase
    .from("iup_goal_suggestions")
    .select("horizon,title,description,groups")
    .eq("owner_id", user.id)
    .eq("horizon", horizon)
    .order("updated_at", { ascending: false });
  if (error) {
    return { ok: false, error: error.message };
  }
  const suggestions = ((data ?? []) as Array<{
    horizon: "short" | "long";
    title: string;
    description: string | null;
    groups: unknown;
  }>)
    .map((entry): UserGoalSuggestion | null => {
      if (!entry.title?.trim()) {
        return null;
      }
      const rawGroups = Array.isArray(entry.groups) ? entry.groups : ["all"];
      const groups = rawGroups.filter(
        (group): group is "all" | "gk" | "def" | "mid" | "fwd" =>
          typeof group === "string" &&
          ["all", "gk", "def", "mid", "fwd"].includes(group)
      );
      return {
        horizon: entry.horizon,
        title: entry.title.trim(),
        description: String(entry.description ?? "").trim(),
        groups: groups.length > 0 ? groups : ["all"],
      };
    })
    .filter((entry): entry is UserGoalSuggestion => Boolean(entry));
  return { ok: true, suggestions };
};

export const saveUserGoalSuggestions = async (payload: {
  horizon: "short" | "long";
  suggestions: UserGoalSuggestion[];
}): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  const normalized = payload.suggestions
    .filter((entry) => entry.title.trim() && entry.description.trim())
    .map((entry) => ({
      owner_id: user.id,
      horizon: payload.horizon,
      title: entry.title.trim(),
      description: entry.description.trim(),
      groups: entry.groups.length > 0 ? entry.groups : ["all"],
    }));

  const { error: deleteError } = await supabase
    .from("iup_goal_suggestions")
    .delete()
    .eq("owner_id", user.id)
    .eq("horizon", payload.horizon);
  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  if (normalized.length === 0) {
    return { ok: true };
  }
  const { error: insertError } = await supabase
    .from("iup_goal_suggestions")
    .insert(normalized);
  if (insertError) {
    return { ok: false, error: insertError.message };
  }
  return { ok: true };
};


export const archiveIupPlan = async (
  planId: string
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { data: check, error: checkError } = await supabase
    .from("iup_plans")
    .select("id")
    .eq("id", planId)
    .eq("created_by", user.id)
    .maybeSingle();
  if (checkError) {
    return { ok: false, error: checkError.message };
  }
  if (!check) {
    return { ok: false, error: "Only the creator can archive this IUP." };
  }

  const { error } = await supabase
    .from("iup_plans")
    .update({ status: "archived" })
    .eq("id", planId)
    .eq("created_by", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
};

export const deleteIupPlan = async (
  planId: string
): Promise<{ ok: true } | { ok: false; error: string }> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const { data: check, error: checkError } = await supabase
    .from("iup_plans")
    .select("id")
    .eq("id", planId)
    .eq("created_by", user.id)
    .maybeSingle();
  if (checkError) {
    return { ok: false, error: checkError.message };
  }
  if (!check) {
    return { ok: false, error: "Only the creator can delete this IUP." };
  }

  const { error } = await supabase
    .from("iup_plans")
    .delete()
    .eq("id", planId)
    .eq("created_by", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
};
