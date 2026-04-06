import { supabase } from "./supabaseClient";

export type AppProfile = {
  id: string;
  plan: string;
  stripeCustomerId?: string;
  betaUser: boolean;
  isAdmin: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Club = {
  id: string;
  name: string;
  slug?: string;
  logoUrl?: string;
  kitShirt?: string;
  kitShirtSecondary?: string;
  kitShorts?: string;
  kitSocks?: string;
  kitVest?: string;
  kitJerseyType?: string;
  createdByUserId?: string;
  primaryAdminUserId?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ClubMember = {
  id: string;
  clubId: string;
  userId: string;
  clubRole?: string;
  isClubAdmin: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Team = {
  id: string;
  ownerId?: string;
  clubId?: string;
  name: string;
  slug?: string;
  teamType?: string;
  ageGroup?: string;
  seasonLabel?: string;
  status?: string;
  clubLogo?: string;
  kitShirt?: string;
  kitShirtSecondary?: string;
  kitShorts?: string;
  kitSocks?: string;
  kitVest?: string;
  kitJerseyType?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TeamMember = {
  id: string;
  teamId: string;
  userId?: string;
  clubMemberId?: string;
  role?: string;
  displayName?: string;
  teamRole?: string;
  teamPosition?: string;
  isTeamAdmin: boolean;
  isGuest: boolean;
  isActive: boolean;
  shirtNumber?: number;
  photoUrl?: string;
  email?: string;
  phone?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type ClubWithMembers = {
  club: Club;
  members: ClubMember[];
};

export type TeamWithMembers = {
  team: Team;
  members: TeamMember[];
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const isActiveMembershipStatus = (value?: string | null) => {
  const normalized = (value ?? "").trim().toLowerCase();
  return !normalized || ["active", "accepted", "member"].includes(normalized);
};

const mapProfile = (row: {
  id: string;
  plan?: string | null;
  stripe_customer_id?: string | null;
  beta_user?: boolean | null;
  is_admin?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
}): AppProfile => ({
  id: row.id,
  plan: row.plan ?? "AUTH",
  stripeCustomerId: row.stripe_customer_id ?? undefined,
  betaUser: row.beta_user === true,
  isAdmin: row.is_admin === true,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined,
});

const mapClub = (row: {
  id: string;
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  kit_shirt?: string | null;
  kit_shirt_secondary?: string | null;
  kit_shorts?: string | null;
  kit_socks?: string | null;
  kit_vest?: string | null;
  kit_jersey_type?: string | null;
  created_by_user_id?: string | null;
  primary_admin_user_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}): Club => ({
  id: row.id,
  name: row.name,
  slug: row.slug ?? undefined,
  logoUrl: row.logo_url ?? undefined,
  kitShirt: row.kit_shirt ?? undefined,
  kitShirtSecondary: row.kit_shirt_secondary ?? undefined,
  kitShorts: row.kit_shorts ?? undefined,
  kitSocks: row.kit_socks ?? undefined,
  kitVest: row.kit_vest ?? undefined,
  kitJerseyType: row.kit_jersey_type ?? undefined,
  createdByUserId: row.created_by_user_id ?? undefined,
  primaryAdminUserId: row.primary_admin_user_id ?? undefined,
  status: row.status ?? undefined,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined,
});

const mapClubMember = (row: {
  id: string;
  club_id: string;
  user_id: string;
  club_role?: string | null;
  is_club_admin?: boolean | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}): ClubMember => ({
  id: row.id,
  clubId: row.club_id,
  userId: row.user_id,
  clubRole: row.club_role ?? undefined,
  isClubAdmin: row.is_club_admin === true,
  status: row.status ?? undefined,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined,
});

const mapTeam = (row: {
  id: string;
  owner_id?: string | null;
  club_id?: string | null;
  name: string;
  slug?: string | null;
  team_type?: string | null;
  age_group?: string | null;
  season_label?: string | null;
  status?: string | null;
  club_logo?: string | null;
  kit_shirt?: string | null;
  kit_shirt_secondary?: string | null;
  kit_shorts?: string | null;
  kit_socks?: string | null;
  kit_vest?: string | null;
  kit_jersey_type?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}): Team => ({
  id: row.id,
  ownerId: row.owner_id ?? undefined,
  clubId: row.club_id ?? undefined,
  name: row.name,
  slug: row.slug ?? undefined,
  teamType: row.team_type ?? undefined,
  ageGroup: row.age_group ?? undefined,
  seasonLabel: row.season_label ?? undefined,
  status: row.status ?? undefined,
  clubLogo: row.club_logo ?? undefined,
  kitShirt: row.kit_shirt ?? undefined,
  kitShirtSecondary: row.kit_shirt_secondary ?? undefined,
  kitShorts: row.kit_shorts ?? undefined,
  kitSocks: row.kit_socks ?? undefined,
  kitVest: row.kit_vest ?? undefined,
  kitJerseyType: row.kit_jersey_type ?? undefined,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined,
});

const mapTeamMember = (row: {
  id: string;
  team_id: string;
  user_id?: string | null;
  club_member_id?: string | null;
  role?: string | null;
  display_name?: string | null;
  team_role?: string | null;
  team_position?: string | null;
  is_team_admin?: boolean | null;
  is_guest?: boolean | null;
  is_active?: boolean | null;
  shirt_number?: number | null;
  photo_url?: string | null;
  email?: string | null;
  phone?: string | null;
  sort_order?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}): TeamMember => ({
  id: row.id,
  teamId: row.team_id,
  userId: row.user_id ?? undefined,
  clubMemberId: row.club_member_id ?? undefined,
  role: row.role ?? undefined,
  displayName: row.display_name ?? undefined,
  teamRole: row.team_role ?? undefined,
  teamPosition: row.team_position ?? undefined,
  isTeamAdmin: row.is_team_admin === true,
  isGuest: row.is_guest === true,
  isActive: row.is_active !== false,
  shirtNumber: row.shirt_number ?? undefined,
  photoUrl: row.photo_url ?? undefined,
  email: row.email ?? undefined,
  phone: row.phone ?? undefined,
  sortOrder: row.sort_order ?? undefined,
  metadata: row.metadata ?? undefined,
  createdAt: row.created_at ?? undefined,
  updatedAt: row.updated_at ?? undefined,
});

const requireUser = async () => {
  if (!supabase) {
    return { ok: false as const, error: "Supabase missing." };
  }
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return { ok: false as const, error: "Not signed in." };
  }
  return { ok: true as const, user: data.user };
};

const dedupeById = <T extends { id: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
};

export const fetchMyProfile = async (): Promise<Result<AppProfile>> => {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth;
  }
  const { data, error } = await supabase!
    .from("profiles")
    .select("id,plan,stripe_customer_id,beta_user,is_admin,created_at,updated_at")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Profile not found." };
  }
  return { ok: true, data: mapProfile(data as Parameters<typeof mapProfile>[0]) };
};

export const fetchMyClubs = async (): Promise<Result<Club[]>> => {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth;
  }

  const [memberResult, adminResult] = await Promise.all([
    supabase!
      .from("club_members")
      .select(
        "club:clubs(id,name,slug,logo_url,kit_shirt,kit_shirt_secondary,kit_shorts,kit_socks,kit_vest,kit_jersey_type,created_by_user_id,primary_admin_user_id,status,created_at,updated_at)"
      )
      .eq("user_id", auth.user.id),
    supabase!
      .from("clubs")
      .select(
        "id,name,slug,logo_url,kit_shirt,kit_shirt_secondary,kit_shorts,kit_socks,kit_vest,kit_jersey_type,created_by_user_id,primary_admin_user_id,status,created_at,updated_at"
      )
      .or(`created_by_user_id.eq.${auth.user.id},primary_admin_user_id.eq.${auth.user.id}`),
  ]);

  if (memberResult.error) {
    return { ok: false, error: memberResult.error.message };
  }
  if (adminResult.error) {
    return { ok: false, error: adminResult.error.message };
  }

  const memberClubs = ((memberResult.data ?? []) as Array<{ club?: unknown }>).flatMap((row) =>
    row.club && typeof row.club === "object"
      ? [mapClub(row.club as Parameters<typeof mapClub>[0])]
      : []
  );
  const adminClubs = ((adminResult.data ?? []) as Parameters<typeof mapClub>[0][]).map(mapClub);

  return {
    ok: true,
    data: dedupeById([...memberClubs, ...adminClubs]).sort((a, b) =>
      a.name.localeCompare(b.name, "sv")
    ),
  };
};

export const fetchClubWithMembers = async (clubId: string): Promise<Result<ClubWithMembers>> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const [clubResult, membersResult] = await Promise.all([
    supabase
      .from("clubs")
      .select(
        "id,name,slug,logo_url,kit_shirt,kit_shirt_secondary,kit_shorts,kit_socks,kit_vest,kit_jersey_type,created_by_user_id,primary_admin_user_id,status,created_at,updated_at"
      )
      .eq("id", clubId)
      .maybeSingle(),
    supabase
      .from("club_members")
      .select("id,club_id,user_id,club_role,is_club_admin,status,created_at,updated_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: true }),
  ]);

  if (clubResult.error || !clubResult.data) {
    return { ok: false, error: clubResult.error?.message ?? "Club not found." };
  }
  if (membersResult.error) {
    return { ok: false, error: membersResult.error.message };
  }

  return {
    ok: true,
    data: {
      club: mapClub(clubResult.data as Parameters<typeof mapClub>[0]),
      members: ((membersResult.data ?? []) as Parameters<typeof mapClubMember>[0][]).map(
        mapClubMember
      ),
    },
  };
};

export const fetchMyTeams = async (): Promise<Result<Team[]>> => {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth;
  }

  const [memberResult, ownerResult] = await Promise.all([
    supabase!
      .from("team_members")
      .select(
        "team:teams(id,owner_id,club_id,name,slug,team_type,age_group,season_label,status,club_logo,kit_shirt,kit_shirt_secondary,kit_shorts,kit_socks,kit_vest,kit_jersey_type,created_at,updated_at)"
      )
      .eq("user_id", auth.user.id)
      .eq("is_active", true),
    supabase!
      .from("teams")
      .select(
        "id,owner_id,club_id,name,slug,team_type,age_group,season_label,status,club_logo,kit_shirt,kit_shirt_secondary,kit_shorts,kit_socks,kit_vest,kit_jersey_type,created_at,updated_at"
      )
      .eq("owner_id", auth.user.id),
  ]);

  if (memberResult.error) {
    return { ok: false, error: memberResult.error.message };
  }
  if (ownerResult.error) {
    return { ok: false, error: ownerResult.error.message };
  }

  const memberTeams = ((memberResult.data ?? []) as Array<{ team?: unknown }>).flatMap((row) =>
    row.team && typeof row.team === "object"
      ? [mapTeam(row.team as Parameters<typeof mapTeam>[0])]
      : []
  );
  const ownerTeams = ((ownerResult.data ?? []) as Parameters<typeof mapTeam>[0][]).map(mapTeam);

  return {
    ok: true,
    data: dedupeById([...memberTeams, ...ownerTeams]).sort((a, b) =>
      a.name.localeCompare(b.name, "sv")
    ),
  };
};

export const fetchMyAdminTeams = async (): Promise<Result<Team[]>> => {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth;
  }

  const [teamAdminResult, clubAdminResult, ownerResult] = await Promise.all([
    supabase!
      .from("team_members")
      .select(
        "team:teams(id,owner_id,club_id,name,slug,team_type,age_group,season_label,status,club_logo,kit_shirt,kit_shirt_secondary,kit_shorts,kit_socks,kit_vest,kit_jersey_type,created_at,updated_at)"
      )
      .eq("user_id", auth.user.id)
      .eq("is_team_admin", true)
      .eq("is_active", true),
    supabase!
      .from("club_members")
      .select("club_id,status,is_club_admin")
      .eq("user_id", auth.user.id)
      .eq("is_club_admin", true),
    supabase!
      .from("teams")
      .select(
        "id,owner_id,club_id,name,slug,team_type,age_group,season_label,status,club_logo,kit_shirt,kit_shirt_secondary,kit_shorts,kit_socks,kit_vest,kit_jersey_type,created_at,updated_at"
      )
      .eq("owner_id", auth.user.id),
  ]);

  if (teamAdminResult.error) {
    return { ok: false, error: teamAdminResult.error.message };
  }
  if (clubAdminResult.error) {
    return { ok: false, error: clubAdminResult.error.message };
  }
  if (ownerResult.error) {
    return { ok: false, error: ownerResult.error.message };
  }

  const teamAdminTeams = ((teamAdminResult.data ?? []) as Array<{ team?: unknown }>).flatMap(
    (row) =>
      row.team && typeof row.team === "object"
        ? [mapTeam(row.team as Parameters<typeof mapTeam>[0])]
        : []
  );

  const activeClubIds = ((clubAdminResult.data ?? []) as Array<{
    club_id?: string | null;
    status?: string | null;
  }>)
    .filter((row) => row.club_id && isActiveMembershipStatus(row.status))
    .map((row) => String(row.club_id));

  let clubAdminTeams: Team[] = [];
  if (activeClubIds.length > 0) {
    const clubTeamsResult = await supabase!
      .from("teams")
      .select(
        "id,owner_id,club_id,name,slug,team_type,age_group,season_label,status,club_logo,kit_shirt,kit_shirt_secondary,kit_shorts,kit_socks,kit_vest,kit_jersey_type,created_at,updated_at"
      )
      .in("club_id", activeClubIds);

    if (clubTeamsResult.error) {
      return { ok: false, error: clubTeamsResult.error.message };
    }

    clubAdminTeams = ((clubTeamsResult.data ?? []) as Parameters<typeof mapTeam>[0][]).map(mapTeam);
  }

  const ownerTeams = ((ownerResult.data ?? []) as Parameters<typeof mapTeam>[0][]).map(mapTeam);

  return {
    ok: true,
    data: dedupeById([...teamAdminTeams, ...clubAdminTeams, ...ownerTeams]).sort((a, b) =>
      a.name.localeCompare(b.name, "sv")
    ),
  };
};

export const fetchTeamWithMembers = async (teamId: string): Promise<Result<TeamWithMembers>> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const [teamResult, membersResult] = await Promise.all([
    supabase
      .from("teams")
      .select(
        "id,owner_id,club_id,name,slug,team_type,age_group,season_label,status,club_logo,kit_shirt,kit_shirt_secondary,kit_shorts,kit_socks,kit_vest,kit_jersey_type,created_at,updated_at"
      )
      .eq("id", teamId)
      .maybeSingle(),
    supabase
      .from("team_members")
      .select(
        "id,team_id,user_id,club_member_id,role,display_name,team_role,team_position,is_team_admin,is_guest,is_active,shirt_number,photo_url,email,phone,sort_order,metadata,created_at,updated_at"
      )
      .eq("team_id", teamId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  if (teamResult.error || !teamResult.data) {
    return { ok: false, error: teamResult.error?.message ?? "Team not found." };
  }
  if (membersResult.error) {
    return { ok: false, error: membersResult.error.message };
  }

  return {
    ok: true,
    data: {
      team: mapTeam(teamResult.data as Parameters<typeof mapTeam>[0]),
      members: ((membersResult.data ?? []) as Parameters<typeof mapTeamMember>[0][]).map(
        mapTeamMember
      ),
    },
  };
};

export const createClub = async (payload: {
  name: string;
  slug?: string;
  logoUrl?: string;
  kitShirt?: string;
  kitShirtSecondary?: string;
  kitShorts?: string;
  kitSocks?: string;
  kitVest?: string;
  kitJerseyType?: string;
  primaryAdminUserId?: string;
  status?: string;
}): Promise<Result<Club>> => {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth;
  }

  const { data, error } = await supabase!
    .from("clubs")
    .insert({
      name: payload.name.trim(),
      slug: payload.slug?.trim() || null,
      logo_url: payload.logoUrl?.trim() || null,
      kit_shirt: payload.kitShirt?.trim() || null,
      kit_shirt_secondary: payload.kitShirtSecondary?.trim() || null,
      kit_shorts: payload.kitShorts?.trim() || null,
      kit_socks: payload.kitSocks?.trim() || null,
      kit_vest: payload.kitVest?.trim() || null,
      kit_jersey_type: payload.kitJerseyType?.trim() || null,
      created_by_user_id: auth.user.id,
      primary_admin_user_id: payload.primaryAdminUserId ?? auth.user.id,
      status: payload.status?.trim() || null,
    })
    .select(
      "id,name,slug,logo_url,kit_shirt,kit_shirt_secondary,kit_shorts,kit_socks,kit_vest,kit_jersey_type,created_by_user_id,primary_admin_user_id,status,created_at,updated_at"
    )
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: mapClub(data as Parameters<typeof mapClub>[0]) };
};

export const updateClub = async (
  clubId: string,
  payload: Partial<{
    name: string;
    slug: string;
    logoUrl: string;
    kitShirt: string;
    kitShirtSecondary: string;
    kitShorts: string;
    kitSocks: string;
    kitVest: string;
    kitJerseyType: string;
    primaryAdminUserId: string;
    status: string;
  }>
): Promise<Result<Club>> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }

  const updatePayload = {
    ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
    ...(payload.slug !== undefined ? { slug: payload.slug.trim() || null } : {}),
    ...(payload.logoUrl !== undefined ? { logo_url: payload.logoUrl.trim() || null } : {}),
    ...(payload.kitShirt !== undefined ? { kit_shirt: payload.kitShirt.trim() || null } : {}),
    ...(payload.kitShirtSecondary !== undefined
      ? { kit_shirt_secondary: payload.kitShirtSecondary.trim() || null }
      : {}),
    ...(payload.kitShorts !== undefined ? { kit_shorts: payload.kitShorts.trim() || null } : {}),
    ...(payload.kitSocks !== undefined ? { kit_socks: payload.kitSocks.trim() || null } : {}),
    ...(payload.kitVest !== undefined ? { kit_vest: payload.kitVest.trim() || null } : {}),
    ...(payload.kitJerseyType !== undefined
      ? { kit_jersey_type: payload.kitJerseyType.trim() || null }
      : {}),
    ...(payload.primaryAdminUserId !== undefined
      ? { primary_admin_user_id: payload.primaryAdminUserId || null }
      : {}),
    ...(payload.status !== undefined ? { status: payload.status.trim() || null } : {}),
  };

  const { data, error } = await supabase
    .from("clubs")
    .update(updatePayload)
    .eq("id", clubId)
    .select(
      "id,name,slug,logo_url,kit_shirt,kit_shirt_secondary,kit_shorts,kit_socks,kit_vest,kit_jersey_type,created_by_user_id,primary_admin_user_id,status,created_at,updated_at"
    )
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: mapClub(data as Parameters<typeof mapClub>[0]) };
};

export const createTeam = async (payload: {
  name: string;
  clubId?: string;
  slug?: string;
  teamType?: string;
  ageGroup?: string;
  seasonLabel?: string;
  status?: string;
  clubLogo?: string;
  kitShirt?: string;
  kitShirtSecondary?: string;
  kitShorts?: string;
  kitSocks?: string;
  kitVest?: string;
  kitJerseyType?: string;
}): Promise<Result<Team>> => {
  const auth = await requireUser();
  if (!auth.ok) {
    return auth;
  }

  const { data, error } = await supabase!
    .from("teams")
    .insert({
      owner_id: auth.user.id,
      club_id: payload.clubId ?? null,
      name: payload.name.trim(),
      slug: payload.slug?.trim() || null,
      team_type: payload.teamType?.trim() || null,
      age_group: payload.ageGroup?.trim() || null,
      season_label: payload.seasonLabel?.trim() || null,
      status: payload.status?.trim() || null,
      club_logo: payload.clubLogo?.trim() || null,
      kit_shirt: payload.kitShirt?.trim() || null,
      kit_shirt_secondary: payload.kitShirtSecondary?.trim() || null,
      kit_shorts: payload.kitShorts?.trim() || null,
      kit_socks: payload.kitSocks?.trim() || null,
      kit_vest: payload.kitVest?.trim() || null,
      kit_jersey_type: payload.kitJerseyType?.trim() || null,
    })
    .select(
      "id,owner_id,club_id,name,slug,team_type,age_group,season_label,status,club_logo,kit_shirt,kit_shirt_secondary,kit_shorts,kit_socks,kit_vest,kit_jersey_type,created_at,updated_at"
    )
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: mapTeam(data as Parameters<typeof mapTeam>[0]) };
};

export const updateTeam = async (
  teamId: string,
  payload: Partial<{
    name: string;
    clubId: string;
    slug: string;
    teamType: string;
    ageGroup: string;
    seasonLabel: string;
    status: string;
    clubLogo: string;
    kitShirt: string;
    kitShirtSecondary: string;
    kitShorts: string;
    kitSocks: string;
    kitVest: string;
    kitJerseyType: string;
  }>
): Promise<Result<Team>> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }

  const updatePayload = {
    ...(payload.name !== undefined ? { name: payload.name.trim() } : {}),
    ...(payload.clubId !== undefined ? { club_id: payload.clubId || null } : {}),
    ...(payload.slug !== undefined ? { slug: payload.slug.trim() || null } : {}),
    ...(payload.teamType !== undefined ? { team_type: payload.teamType.trim() || null } : {}),
    ...(payload.ageGroup !== undefined ? { age_group: payload.ageGroup.trim() || null } : {}),
    ...(payload.seasonLabel !== undefined
      ? { season_label: payload.seasonLabel.trim() || null }
      : {}),
    ...(payload.status !== undefined ? { status: payload.status.trim() || null } : {}),
    ...(payload.clubLogo !== undefined ? { club_logo: payload.clubLogo.trim() || null } : {}),
    ...(payload.kitShirt !== undefined ? { kit_shirt: payload.kitShirt.trim() || null } : {}),
    ...(payload.kitShirtSecondary !== undefined
      ? { kit_shirt_secondary: payload.kitShirtSecondary.trim() || null }
      : {}),
    ...(payload.kitShorts !== undefined ? { kit_shorts: payload.kitShorts.trim() || null } : {}),
    ...(payload.kitSocks !== undefined ? { kit_socks: payload.kitSocks.trim() || null } : {}),
    ...(payload.kitVest !== undefined ? { kit_vest: payload.kitVest.trim() || null } : {}),
    ...(payload.kitJerseyType !== undefined
      ? { kit_jersey_type: payload.kitJerseyType.trim() || null }
      : {}),
  };

  const { data, error } = await supabase
    .from("teams")
    .update(updatePayload)
    .eq("id", teamId)
    .select(
      "id,owner_id,club_id,name,slug,team_type,age_group,season_label,status,club_logo,kit_shirt,kit_shirt_secondary,kit_shorts,kit_socks,kit_vest,kit_jersey_type,created_at,updated_at"
    )
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: mapTeam(data as Parameters<typeof mapTeam>[0]) };
};

export const addClubMember = async (payload: {
  clubId: string;
  userId: string;
  clubRole?: string;
  isClubAdmin?: boolean;
  status?: string;
}): Promise<Result<ClubMember>> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const { data, error } = await supabase
    .from("club_members")
    .insert({
      club_id: payload.clubId,
      user_id: payload.userId,
      club_role: payload.clubRole?.trim() || null,
      is_club_admin: payload.isClubAdmin === true,
      status: payload.status?.trim() || null,
    })
    .select("id,club_id,user_id,club_role,is_club_admin,status,created_at,updated_at")
    .single();
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: mapClubMember(data as Parameters<typeof mapClubMember>[0]) };
};

export const updateClubMember = async (
  clubMemberId: string,
  payload: Partial<{
    clubRole: string;
    isClubAdmin: boolean;
    status: string;
  }>
): Promise<Result<ClubMember>> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const { data, error } = await supabase
    .from("club_members")
    .update({
      ...(payload.clubRole !== undefined ? { club_role: payload.clubRole.trim() || null } : {}),
      ...(payload.isClubAdmin !== undefined ? { is_club_admin: payload.isClubAdmin } : {}),
      ...(payload.status !== undefined ? { status: payload.status.trim() || null } : {}),
    })
    .eq("id", clubMemberId)
    .select("id,club_id,user_id,club_role,is_club_admin,status,created_at,updated_at")
    .single();
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: mapClubMember(data as Parameters<typeof mapClubMember>[0]) };
};

export const removeClubMember = async (clubMemberId: string): Promise<Result<null>> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const { error } = await supabase.from("club_members").delete().eq("id", clubMemberId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: null };
};

export const addTeamMember = async (payload: {
  teamId: string;
  userId?: string;
  clubMemberId?: string;
  role?: string;
  displayName?: string;
  teamRole?: string;
  teamPosition?: string;
  isTeamAdmin?: boolean;
  isGuest?: boolean;
  isActive?: boolean;
  shirtNumber?: number;
  photoUrl?: string;
  email?: string;
  phone?: string;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}): Promise<Result<TeamMember>> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const { data, error } = await supabase
    .from("team_members")
    .insert({
      team_id: payload.teamId,
      user_id: payload.userId ?? null,
      club_member_id: payload.clubMemberId ?? null,
      role: payload.role?.trim() || null,
      display_name: payload.displayName?.trim() || null,
      team_role: payload.teamRole?.trim() || null,
      team_position: payload.teamPosition?.trim() || null,
      is_team_admin: payload.isTeamAdmin === true,
      is_guest: payload.isGuest === true,
      is_active: payload.isActive !== false,
      shirt_number: payload.shirtNumber ?? null,
      photo_url: payload.photoUrl?.trim() || null,
      email: payload.email?.trim() || null,
      phone: payload.phone?.trim() || null,
      sort_order: payload.sortOrder ?? null,
      metadata: payload.metadata ?? null,
    })
    .select(
      "id,team_id,user_id,club_member_id,role,display_name,team_role,team_position,is_team_admin,is_guest,is_active,shirt_number,photo_url,email,phone,sort_order,metadata,created_at,updated_at"
    )
    .single();
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: mapTeamMember(data as Parameters<typeof mapTeamMember>[0]) };
};

export const updateTeamMember = async (
  teamMemberId: string,
  payload: Partial<{
    userId: string;
    clubMemberId: string;
    role: string;
    displayName: string;
    teamRole: string;
    teamPosition: string;
    isTeamAdmin: boolean;
    isGuest: boolean;
    isActive: boolean;
    shirtNumber: number;
    photoUrl: string;
    email: string;
    phone: string;
    sortOrder: number;
    metadata: Record<string, unknown>;
  }>
): Promise<Result<TeamMember>> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const { data, error } = await supabase
    .from("team_members")
    .update({
      ...(payload.userId !== undefined ? { user_id: payload.userId || null } : {}),
      ...(payload.clubMemberId !== undefined
        ? { club_member_id: payload.clubMemberId || null }
        : {}),
      ...(payload.role !== undefined ? { role: payload.role.trim() || null } : {}),
      ...(payload.displayName !== undefined
        ? { display_name: payload.displayName.trim() || null }
        : {}),
      ...(payload.teamRole !== undefined ? { team_role: payload.teamRole.trim() || null } : {}),
      ...(payload.teamPosition !== undefined
        ? { team_position: payload.teamPosition.trim() || null }
        : {}),
      ...(payload.isTeamAdmin !== undefined ? { is_team_admin: payload.isTeamAdmin } : {}),
      ...(payload.isGuest !== undefined ? { is_guest: payload.isGuest } : {}),
      ...(payload.isActive !== undefined ? { is_active: payload.isActive } : {}),
      ...(payload.shirtNumber !== undefined ? { shirt_number: payload.shirtNumber ?? null } : {}),
      ...(payload.photoUrl !== undefined ? { photo_url: payload.photoUrl.trim() || null } : {}),
      ...(payload.email !== undefined ? { email: payload.email.trim() || null } : {}),
      ...(payload.phone !== undefined ? { phone: payload.phone.trim() || null } : {}),
      ...(payload.sortOrder !== undefined ? { sort_order: payload.sortOrder ?? null } : {}),
      ...(payload.metadata !== undefined ? { metadata: payload.metadata ?? null } : {}),
    })
    .eq("id", teamMemberId)
    .select(
      "id,team_id,user_id,club_member_id,role,display_name,team_role,team_position,is_team_admin,is_guest,is_active,shirt_number,photo_url,email,phone,sort_order,metadata,created_at,updated_at"
    )
    .single();
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: mapTeamMember(data as Parameters<typeof mapTeamMember>[0]) };
};

export const removeTeamMember = async (teamMemberId: string): Promise<Result<null>> => {
  if (!supabase) {
    return { ok: false, error: "Supabase missing." };
  }
  const { error } = await supabase.from("team_members").delete().eq("id", teamMemberId);
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, data: null };
};
