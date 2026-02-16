import { supabase } from "./supabaseClient";

export type TeamLite = {
  id: string;
  name: string;
};

export type TeamPlayerLite = {
  id: string;
  name: string;
  positionLabel: string;
};

export type IupPlanLite = {
  id: string;
  title: string;
  status: "draft" | "active" | "completed" | "archived";
  playerId: string;
  periodStart?: string;
  periodEnd?: string;
  createdAt: string;
};

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

export const signInMagicLink = async (email: string, redirectTo: string) => {
  if (!supabase) {
    return { ok: false as const, error: "Supabase missing." };
  }
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
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
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }
  const { data, error } = await supabase
    .from("teams")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, teams: (data ?? []) as TeamLite[] };
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
    .from("team_players")
    .select("id,name,position_label")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("number", { ascending: true });
  if (error) {
    return { ok: false, error: error.message };
  }
  const players = ((data ?? []) as Array<{ id: string; name: string; position_label: string }>).map(
    (row) => ({
      id: row.id,
      name: row.name,
      positionLabel: row.position_label,
    })
  );
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
    status: row.status,
    playerId: row.player_id,
    periodStart: row.period_start ?? undefined,
    periodEnd: row.period_end ?? undefined,
    createdAt: row.created_at,
  }));
  return { ok: true, plans };
};

export const createIupPlan = async (payload: {
  teamId: string;
  playerId: string;
  title: string;
  periodStart?: string;
  periodEnd?: string;
}) => {
  if (!supabase) {
    return { ok: false as const, error: "Supabase missing." };
  }
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: "Not signed in." };
  }
  const { error } = await supabase.from("iup_plans").insert({
    team_id: payload.teamId,
    player_id: payload.playerId,
    title: payload.title,
    status: "draft",
    period_start: payload.periodStart ?? null,
    period_end: payload.periodEnd ?? null,
    created_by: user.id,
  });
  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
};
