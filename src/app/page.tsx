"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import {
  createIupPlan,
  fetchIupPlansForPlayer,
  fetchPlayersInReviewPeriod,
  fetchPaidPlayers,
  fetchProfilePlan,
  fetchTeams,
  getSessionUser,
  signInPassword,
  signOut,
  signUpPassword,
  type PaidPlayer,
  type PlanLevel,
  type TeamLite,
} from "../lib/iupApi";

type PlayerStatusFilter = "all" | "active" | "inactive";

type LocalIupDraft = {
  id: string;
  playerName: string;
  title: string;
  mainFocus: string;
  currentLevel: string;
  targetLevel: string;
  notes: string;
  createdAt: string;
};

const AUTH_LOCAL_DRAFTS_KEY_PREFIX = "iup:auth:local-drafts:";
const FREE_SESSION_DRAFTS_KEY = "iup:free:session-drafts";
const LOCAL_DRAFT_SOURCE_KEY_PREFIX = "iup:local:draft-source:";

const emptyDraft = {
  playerName: "",
  title: "",
  mainFocus: "",
  currentLevel: "",
  targetLevel: "",
  notes: "",
};

const seasonDefaults = (baseYear: number) => ({
  cycleType: "season" as const,
  cycleLabel: `${baseYear}/${baseYear + 1}`,
  periodStart: `${baseYear}-08-01`,
  periodEnd: `${baseYear + 1}-06-30`,
});
const yearDefaults = (year: number) => ({
  cycleType: "year" as const,
  cycleLabel: String(year),
  periodStart: `${year}-01-01`,
  periodEnd: `${year}-12-31`,
});

type ReviewCadence =
  | "spring_fall"
  | "spring_summer_fall"
  | "quarterly"
  | "bi_monthly"
  | "monthly"
  | "bi_weekly"
  | "weekly";

const reviewCadenceConfig: Record<
  ReviewCadence,
  { label: string; points: string[]; prefix?: string }
> = {
  spring_fall: {
    label: "Vår, Höst",
    points: ["Vår", "Höst"],
  },
  spring_summer_fall: {
    label: "Vår, Sommar, Höst",
    points: ["Vår", "Sommar", "Höst"],
  },
  quarterly: {
    label: "Kvartalsvis",
    points: ["Q1", "Q2", "Q3", "Q4"],
  },
  bi_monthly: {
    label: "Varannan månad",
    points: Array.from({ length: 6 }, (_, idx) => `Varannan månad ${idx + 1}`),
    prefix: "Varannan månad",
  },
  monthly: {
    label: "Varje månad",
    points: Array.from({ length: 12 }, (_, idx) => `Månad ${idx + 1}`),
    prefix: "Månad",
  },
  bi_weekly: {
    label: "Varannan vecka",
    points: Array.from({ length: 26 }, (_, idx) => `Varannan vecka ${idx + 1}`),
    prefix: "Varannan vecka",
  },
  weekly: {
    label: "Varje vecka",
    points: Array.from({ length: 52 }, (_, idx) => `Vecka ${idx + 1}`),
    prefix: "Vecka",
  },
};

export default function Page() {
  const { messages } = useI18n();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanLevel>("FREE");
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState(emptyDraft);
  const [freeDrafts, setFreeDrafts] = useState<LocalIupDraft[]>([]);
  const [authDrafts, setAuthDrafts] = useState<LocalIupDraft[]>([]);

  const [teams, setTeams] = useState<TeamLite[]>([]);
  const [players, setPlayers] = useState<PaidPlayer[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");
  const [playerClubFilter, setPlayerClubFilter] = useState("all");
  const [playerTeamFilter, setPlayerTeamFilter] = useState("all");
  const [playerPositionFilter, setPlayerPositionFilter] = useState("all");
  const [playerStatusFilter, setPlayerStatusFilter] = useState<PlayerStatusFilter>("all");
  const [playersInReviewNow, setPlayersInReviewNow] = useState<Record<string, boolean>>({});
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [plansLoading, setPlansLoading] = useState(false);
  const [playerPlans, setPlayerPlans] = useState<
    Array<{
      id: string;
      title: string;
      status: "active" | "completed" | "archived";
      createdAt: string;
      periodStart?: string;
      periodEnd?: string;
    }>
  >([]);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [createDialogPlayer, setCreateDialogPlayer] = useState<PaidPlayer | null>(null);
  const [createCycleType, setCreateCycleType] = useState<"year" | "season">("season");
  const [createCycleLabel, setCreateCycleLabel] = useState("");
  const [createPeriodStart, setCreatePeriodStart] = useState("");
  const [createPeriodEnd, setCreatePeriodEnd] = useState("");
  const [createReviewCadence, setCreateReviewCadence] =
    useState<ReviewCadence>("spring_summer_fall");
  const [createOtherNotes, setCreateOtherNotes] = useState("");

  const isFree = plan === "FREE";
  const isAuth = plan === "AUTH";
  const isPaid = plan === "PAID";
  const deferredPlayerSearch = useDeferredValue(playerSearch);

  const selectedPlayer = useMemo(
    () => players.find((entry) => entry.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId]
  );

  const playerTeams = useMemo(() => teams, [teams]);
  const playerClubs = useMemo(() => {
    const seen = new Set<string>();
    return teams.flatMap((team) => {
      if (!team.clubId || !team.clubName || seen.has(team.clubId)) {
        return [];
      }
      seen.add(team.clubId);
      return [{ id: team.clubId, name: team.clubName }];
    });
  }, [teams]);
  const visibleTeamOptions = useMemo(
    () =>
      playerClubFilter === "all"
        ? teams
        : teams.filter((team) => team.clubId === playerClubFilter),
    [playerClubFilter, teams]
  );

  const playerPositions = useMemo(
    () =>
      Array.from(
        new Set(players.map((player) => player.positionLabel.trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "sv")),
    [players]
  );

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const entry of playerPlans) {
      years.add(String(new Date(entry.createdAt).getFullYear()));
    }
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [playerPlans]);

  const visiblePlayerPlans = useMemo(() => {
    if (selectedYear === "all") {
      return playerPlans;
    }
    return playerPlans.filter(
      (entry) => String(new Date(entry.createdAt).getFullYear()) === selectedYear
    );
  }, [playerPlans, selectedYear]);

  const visibleLocalDrafts = isAuth ? authDrafts : freeDrafts;

  const loadAuthState = async () => {
    const user = await getSessionUser();
    const nextSignedIn = Boolean(user);
    setSignedIn(nextSignedIn);
    setUserId(user?.id ?? null);

    if (!nextSignedIn) {
      setPlan("FREE");
      setPlayers([]);
      setSelectedPlayerId("");
      return;
    }

    const planResult = await fetchProfilePlan();
    if (!planResult.ok) {
      setStatus(planResult.error);
      setPlan("AUTH");
      return;
    }

    setPlan(planResult.plan === "PAID" ? "PAID" : "AUTH");
  };

  const loadPaidPlayers = async () => {
    const result = await fetchPaidPlayers({
      search: deferredPlayerSearch,
      clubId: playerClubFilter !== "all" ? playerClubFilter : undefined,
      teamId: playerTeamFilter !== "all" ? playerTeamFilter : undefined,
      positionLabel: playerPositionFilter !== "all" ? playerPositionFilter : undefined,
      status: playerStatusFilter,
    });
    if (!result.ok) {
      setStatus(result.error);
      setPlayers([]);
      setSelectedPlayerId("");
      return;
    }
    setPlayers(result.players);
    setSelectedPlayerId((current) => current || result.players[0]?.id || "");
  };

  useEffect(() => {
    loadAuthState();
  }, []);

  useEffect(() => {
    if (!signedIn || !isPaid) {
      return;
    }
    loadPaidPlayers();
  }, [deferredPlayerSearch, isPaid, playerPositionFilter, playerStatusFilter, playerTeamFilter, signedIn]);

  useEffect(() => {
    if (!signedIn || !isPaid) {
      return;
    }
    const loadTeamOptions = async () => {
      const result = await fetchTeams();
      if (!result.ok) {
        setStatus(result.error);
        setTeams([]);
        return;
      }
      setTeams(result.teams);
    };
    loadTeamOptions();
  }, [isPaid, signedIn]);

  useEffect(() => {
    if (
      playerTeamFilter !== "all" &&
      !visibleTeamOptions.some((team) => team.id === playerTeamFilter)
    ) {
      setPlayerTeamFilter("all");
    }
  }, [playerTeamFilter, visibleTeamOptions]);

  useEffect(() => {
    const loadReviewIndicators = async () => {
      if (!isPaid || players.length === 0) {
        setPlayersInReviewNow({});
        return;
      }
      const result = await fetchPlayersInReviewPeriod(players.map((player) => player.id));
      if (!result.ok) {
        return;
      }
      setPlayersInReviewNow(result.byPlayerId);
    };
    loadReviewIndicators();
  }, [isPaid, players]);

  useEffect(() => {
    const loadPlayerPlans = async () => {
      if (!isPaid || !selectedPlayerId) {
        setPlayerPlans([]);
        return;
      }
      setPlansLoading(true);
      const result = await fetchIupPlansForPlayer(selectedPlayerId);
      setPlansLoading(false);
      if (!result.ok) {
        setStatus(result.error);
        setPlayerPlans([]);
        return;
      }
      setPlayerPlans(result.plans);
      setSelectedYear("all");
    };
    loadPlayerPlans();
  }, [isPaid, selectedPlayerId]);

  useEffect(() => {
    if (!players.some((entry) => entry.id === selectedPlayerId)) {
      setSelectedPlayerId(players[0]?.id ?? "");
    }
  }, [players, selectedPlayerId]);

  useEffect(() => {
    if (!isFree || typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.sessionStorage.getItem(FREE_SESSION_DRAFTS_KEY);
      if (!raw) {
        setFreeDrafts([]);
        return;
      }
      const parsed = JSON.parse(raw) as LocalIupDraft[];
      setFreeDrafts(Array.isArray(parsed) ? parsed : []);
    } catch {
      setFreeDrafts([]);
      setStatus(messages.home.couldNotReadTemporaryDrafts);
    }
  }, [isFree, messages.home.couldNotReadTemporaryDrafts]);

  useEffect(() => {
    if (!isFree || typeof window === "undefined") {
      return;
    }
    try {
      window.sessionStorage.setItem(FREE_SESSION_DRAFTS_KEY, JSON.stringify(freeDrafts));
    } catch {
      setStatus(messages.home.couldNotSaveTemporaryDrafts);
    }
  }, [freeDrafts, isFree, messages.home.couldNotSaveTemporaryDrafts]);

  useEffect(() => {
    if (!isAuth || !userId || typeof window === "undefined") {
      setAuthDrafts([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(`${AUTH_LOCAL_DRAFTS_KEY_PREFIX}${userId}`);
      if (!raw) {
        setAuthDrafts([]);
        return;
      }
      const parsed = JSON.parse(raw) as LocalIupDraft[];
      setAuthDrafts(Array.isArray(parsed) ? parsed : []);
    } catch {
      setAuthDrafts([]);
      setStatus(messages.home.couldNotReadLocalDrafts);
    }
  }, [isAuth, messages.home.couldNotReadLocalDrafts, userId]);

  useEffect(() => {
    if (!isAuth || !userId || typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(
        `${AUTH_LOCAL_DRAFTS_KEY_PREFIX}${userId}`,
        JSON.stringify(authDrafts)
      );
    } catch {
      setStatus(messages.home.couldNotSaveLocalDrafts);
    }
  }, [authDrafts, isAuth, messages.home.couldNotSaveLocalDrafts, userId]);

  const onCreateLocalDraft = () => {
    if (!draft.title.trim()) {
      setStatus(messages.home.fillIupTitle);
      return;
    }

    const next: LocalIupDraft = {
      id: typeof globalThis !== "undefined" && globalThis.crypto && typeof globalThis.crypto.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      playerName: draft.playerName.trim() || messages.home.unnamedPlayer,
      title: draft.title.trim(),
      mainFocus: draft.mainFocus.trim(),
      currentLevel: draft.currentLevel.trim(),
      targetLevel: draft.targetLevel.trim(),
      notes: draft.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    if (isAuth) {
      const key = userId ? `${AUTH_LOCAL_DRAFTS_KEY_PREFIX}${userId}` : null;
      const nextAuth = [next, ...authDrafts];
      if (typeof window !== "undefined" && key) {
        try {
          window.localStorage.setItem(key, JSON.stringify(nextAuth));
        } catch {
          setStatus(messages.home.couldNotSaveLocalDrafts);
          return;
        }
        window.sessionStorage.setItem(
          `${LOCAL_DRAFT_SOURCE_KEY_PREFIX}${next.id}`,
          JSON.stringify({ mode: "AUTH", userId })
        );
      }
      setAuthDrafts(nextAuth);
      setStatus(messages.home.localDraftSavedAuth);
    } else {
      const nextFree = [next, ...freeDrafts];
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(
            FREE_SESSION_DRAFTS_KEY,
            JSON.stringify(nextFree)
          );
          window.sessionStorage.setItem(
            `${LOCAL_DRAFT_SOURCE_KEY_PREFIX}${next.id}`,
            JSON.stringify({ mode: "FREE" })
          );
        } catch {
          setStatus(messages.home.couldNotSaveTemporaryDrafts);
          return;
        }
      }
      setFreeDrafts(nextFree);
      setStatus(messages.home.localDraftSavedFree);
    }

    setDraft(emptyDraft);
    router.push(`/iup/local/${next.id}`);
  };

  const openCreateIupDialog = (player: PaidPlayer) => {
    const defaults = seasonDefaults(new Date().getFullYear());
    setCreateDialogPlayer(player);
    setCreateCycleType(defaults.cycleType);
    setCreateCycleLabel(defaults.cycleLabel);
    setCreatePeriodStart(defaults.periodStart);
    setCreatePeriodEnd(defaults.periodEnd);
    setCreateReviewCadence("spring_summer_fall");
    setCreateOtherNotes("");
    setStatus(null);
  };

  const closeCreateIupDialog = () => {
    setCreateDialogPlayer(null);
  };

  const onCreateIupForPlayer = async () => {
    if (!createDialogPlayer) {
      return;
    }
    const cadence = reviewCadenceConfig[createReviewCadence];
    const reviewPoints = cadence.points.map((label, index) => ({
      id: `rp-${index + 1}`,
      label,
      note: "",
    }));
    const titleLabel = createCycleLabel.trim() || new Date().toISOString().slice(0, 10);
    const result = await createIupPlan({
      teamId: createDialogPlayer.teamId,
      playerId: createDialogPlayer.id,
      title: `IUP ${createDialogPlayer.name} ${titleLabel}`,
      periodStart: createPeriodStart || undefined,
      periodEnd: createPeriodEnd || undefined,
      reviewCount: cadence.points.length,
      cycleType: createCycleType,
      cycleLabel: createCycleLabel.trim(),
      otherNotes: createOtherNotes.trim(),
      reviewPoints,
    });
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus(`${messages.home.iupCreatedFor} ${createDialogPlayer.name}.`);
    closeCreateIupDialog();
    router.push(`/iup/${result.planId}`);
  };

  const onSignInPassword = async () => {
    if (!email.trim() || !password) {
      setStatus(messages.home.enterEmailPassword);
      return;
    }
    setBusy(true);
    const result = await signInPassword(email.trim(), password);
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus(messages.home.signedInStatus);
    await loadAuthState();
  };

  const onSignUpPassword = async () => {
    if (!email.trim() || !password) {
      setStatus(messages.home.enterEmailPassword);
      return;
    }
    setBusy(true);
    const result = await signUpPassword(email.trim(), password);
    setBusy(false);
    setStatus(
      result.ok
        ? messages.home.accountCreated
        : result.error
    );
  };

  const onSignOut = async () => {
    await signOut();
    setStatus(messages.home.signedOutStatus);
    setAuthDrafts([]);
    setFreeDrafts([]);
    setDraft(emptyDraft);
    await loadAuthState();
  };

  return (
    <main className="app-shell">
      <section className="page-hero">
        <div className="page-title">
          <h1>Teamzone IUP</h1>
          <p className="page-subtitle">
            {messages.home.accessMode}: <strong>{plan}</strong>
          </p>
        </div>
      </section>

      {!signedIn ? (
        <section className="card card-strong">
          <h2 className="title-md">{messages.home.signInTitle}</h2>
          <div className="toolbar">
            <input
              type="email"
              placeholder={messages.home.emailPlaceholder}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input-wide"
            />
            <input
              type="password"
              placeholder={messages.home.passwordPlaceholder}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-medium"
            />
            <button type="button" className="primary" disabled={busy} onClick={onSignInPassword}>
              {messages.home.signIn}
            </button>
            <button type="button" disabled={busy} onClick={onSignUpPassword}>
              {messages.home.createAccount}
            </button>
          </div>
        </section>
      ) : (
        <section className="card">
          <div className="row row-between">
            <h2 className="title-md">{messages.home.signedIn}</h2>
            <button type="button" onClick={onSignOut}>{messages.home.signOut}</button>
          </div>
        </section>
      )}

      {!isPaid ? (
        <section className="card">
          <h3 className="section-h3">
            {isAuth ? messages.home.createLocalTitleAuth : messages.home.createLocalTitleFree}
          </h3>
          <p className="muted">
            {isAuth
              ? `${messages.home.authModeInfo} (${authDrafts.length}).`
              : `${messages.home.freeModeInfo} (${freeDrafts.length}).`}
          </p>
          <div className="content-stack">
            <input
              placeholder={messages.home.playerNamePlaceholder}
              value={draft.playerName}
              onChange={(event) =>
                setDraft((current) => ({ ...current, playerName: event.target.value }))
              }
            />
            <input
              placeholder={messages.home.iupTitlePlaceholder}
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
            />
            <input
              placeholder={messages.home.mainFocusPlaceholder}
              value={draft.mainFocus}
              onChange={(event) =>
                setDraft((current) => ({ ...current, mainFocus: event.target.value }))
              }
            />
            <div className="row wrap">
              <input
                placeholder={messages.home.currentLevelPlaceholder}
                value={draft.currentLevel}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, currentLevel: event.target.value }))
                }
              />
              <input
                placeholder={messages.home.targetLevelPlaceholder}
                value={draft.targetLevel}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, targetLevel: event.target.value }))
                }
              />
            </div>
            <textarea
              placeholder={messages.home.notesPlaceholder}
              value={draft.notes}
              onChange={(event) =>
                setDraft((current) => ({ ...current, notes: event.target.value }))
              }
              className="text-area-md"
            />
            <div className="toolbar">
              <button type="button" className="primary" onClick={onCreateLocalDraft}>
                {messages.home.createLocalDraft}
              </button>
              <button type="button" onClick={() => setDraft(emptyDraft)}>{messages.common.clear}</button>
            </div>
          </div>

          {visibleLocalDrafts.length > 0 ? (
            <div className="goal-groups mt-8">
              <strong>{isAuth ? messages.home.localDrafts : messages.home.temporaryDrafts}</strong>
              {visibleLocalDrafts.map((entry) => (
                <div key={entry.id} className="card">
                  <strong>{entry.title}</strong>
                  <span className="muted-sm">
                    {entry.playerName} · {messages.home.focus}: {entry.mainFocus || "-"}
                  </span>
                  <span className="muted-sm">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {isPaid ? (
        <section className="card card-strong">
          <div className="row row-between mb-8">
            <h3 className="section-h3">{messages.home.squadTitle}</h3>
            <button type="button" onClick={() => router.push("/squad")}>
              {messages.home.manageSquad}
            </button>
          </div>
          <p className="page-subtitle">
            {messages.home.clickPlayer}
          </p>

          <div className="row wrap mb-10">
            <input
              placeholder="Sök namn, lag, position, nummer"
              value={playerSearch}
              onChange={(event) => setPlayerSearch(event.target.value)}
              className="input-wide"
            />
            <select
              value={playerClubFilter}
              onChange={(event) => setPlayerClubFilter(event.target.value)}
            >
              <option value="all">{messages.common.allClubs}</option>
              {playerClubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
            <select
              value={playerTeamFilter}
              onChange={(event) => setPlayerTeamFilter(event.target.value)}
            >
              <option value="all">{messages.common.allTeams}</option>
              {visibleTeamOptions.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.label}
                </option>
              ))}
            </select>
            <select
              value={playerPositionFilter}
              onChange={(event) => setPlayerPositionFilter(event.target.value)}
            >
              <option value="all">{messages.common.allPositions}</option>
              {playerPositions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
            <select
              value={playerStatusFilter}
              onChange={(event) =>
                setPlayerStatusFilter(event.target.value as PlayerStatusFilter)
              }
            >
              <option value="all">{messages.common.allStatuses}</option>
              <option value="active">{messages.common.active}</option>
              <option value="inactive">{messages.common.inactive}</option>
            </select>
          </div>

          {players.length === 0 ? (
            <p className="muted-line">
              {messages.home.noPlayersForFilter}
            </p>
          ) : (
            <div className="grid-2">
              <div className="list-panel list-panel-md">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className={`list-item list-item-grid ${selectedPlayerId === player.id ? "active" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedPlayerId(player.id)}
                      className="click-reset"
                    >
                      <strong>
                        {player.number > 0 ? `${player.number}. ` : ""}
                        {player.name}
                      </strong>
                      {playersInReviewNow[player.id] ? (
                        <span className="review-now-badge">{messages.home.reviewNow}</span>
                      ) : null}
                      <div className="muted-sm">
                        {player.positionLabel || "-"} · {player.clubName ? `${player.clubName} / ` : ""}{player.teamName}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreateIupDialog(player)}
                      className="primary btn-compact"
                    >
                      {messages.home.newIup}
                    </button>
                  </div>
                ))}
              </div>

              <div className="card">
                {selectedPlayer ? (
                  <>
                    <h4 className="title-md mb-8">
                      {selectedPlayer.name}
                    </h4>
                    <div className="form-stack">
                      <span>
                        <strong>{messages.home.club}:</strong> {selectedPlayer.clubName || "-"}
                      </span>
                      <span>
                        <strong>{messages.home.team}:</strong> {selectedPlayer.clubName ? `${selectedPlayer.clubName} / ${selectedPlayer.teamName}` : selectedPlayer.teamName}
                      </span>
                      <span>
                        <strong>{messages.home.number}:</strong> {selectedPlayer.number > 0 ? selectedPlayer.number : "-"}
                      </span>
                      <span>
                        <strong>{messages.home.position}:</strong> {selectedPlayer.positionLabel || "-"}
                      </span>
                      <span>
                        <strong>{messages.home.status}:</strong> {selectedPlayer.isActive ? messages.common.active : messages.common.inactive}
                      </span>
                    </div>

                    <div className="mt-14">
                      <div className="row row-between mb-8">
                        <h5 className="title-sm">{messages.home.previousIup}</h5>
                        <select
                          value={selectedYear}
                          onChange={(event) => setSelectedYear(event.target.value)}
                          className="select-compact"
                        >
                          <option value="all">{messages.home.allYears}</option>
                          {availableYears.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </div>

                      {plansLoading ? (
                        <p className="muted-line">{messages.common.loading}</p>
                      ) : visiblePlayerPlans.length === 0 ? (
                        <p className="muted-line">{messages.home.noIupForYear}</p>
                      ) : (
                        <div className="list-panel list-panel-sm">
                          {visiblePlayerPlans.map((planEntry) => (
                            <div
                              key={planEntry.id}
                              className="list-row"
                              onClick={() => router.push(`/iup/${planEntry.id}`)}
                            >
                              <div className="text-strong">{planEntry.title}</div>
                              <div className="muted-sm">
                                {planEntry.status} · {new Date(planEntry.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="muted-line">{messages.home.selectPlayer}</p>
                )}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {createDialogPlayer ? (
        <div className="dialog-overlay" role="dialog" aria-modal="true" aria-label={messages.home.createDialogTitle}>
          <div className="card card-strong dialog-panel">
            <div className="row row-between">
              <h3 className="section-h3">{messages.home.createDialogTitle}: {createDialogPlayer.name}</h3>
              <button type="button" onClick={closeCreateIupDialog}>{messages.common.close}</button>
            </div>
            <div className="form-stack">
              <span>
                <strong>{messages.home.club}:</strong> {createDialogPlayer.clubName || "-"}
              </span>
              <span>
                <strong>{messages.home.team}:</strong> {createDialogPlayer.clubName ? `${createDialogPlayer.clubName} / ${createDialogPlayer.teamName}` : createDialogPlayer.teamName}
              </span>
              <span>
                <strong>{messages.home.position}:</strong> {createDialogPlayer.positionLabel || "-"}
              </span>
            </div>
            <div className="form-stack">
              <label className="muted">{messages.home.periodType}</label>
              <select
                value={createCycleType}
                onChange={(event) => {
                  const nextType = event.target.value as "year" | "season";
                  setCreateCycleType(nextType);
                  const year = new Date().getFullYear();
                  if (nextType === "year") {
                    const defaults = yearDefaults(year);
                    setCreateCycleLabel(defaults.cycleLabel);
                    setCreatePeriodStart(defaults.periodStart);
                    setCreatePeriodEnd(defaults.periodEnd);
                  } else {
                    const defaults = seasonDefaults(year);
                    setCreateCycleLabel(defaults.cycleLabel);
                    setCreatePeriodStart(defaults.periodStart);
                    setCreatePeriodEnd(defaults.periodEnd);
                  }
                }}
              >
                <option value="season">{messages.home.season}</option>
                <option value="year">{messages.home.calendarYear}</option>
              </select>

              <label className="muted">
                {createCycleType === "season" ? messages.home.seasonLabel : messages.home.yearLabel}
              </label>
              <input
                value={createCycleLabel}
                onChange={(event) => setCreateCycleLabel(event.target.value)}
                placeholder={createCycleType === "season" ? "2026/2027" : "2026"}
              />

              <div className="grid-2">
                <div className="form-stack">
                  <label className="muted">{messages.home.seasonStart}</label>
                  <input
                    type="date"
                    value={createPeriodStart}
                    onChange={(event) => setCreatePeriodStart(event.target.value)}
                  />
                </div>
                <div className="form-stack">
                  <label className="muted">{messages.home.seasonEnd}</label>
                  <input
                    type="date"
                    value={createPeriodEnd}
                    onChange={(event) => setCreatePeriodEnd(event.target.value)}
                  />
                </div>
              </div>

              <label className="muted">{messages.home.reviews}</label>
              <select
                value={createReviewCadence}
                onChange={(event) =>
                  setCreateReviewCadence(event.target.value as ReviewCadence)
                }
                className="input-medium"
              >
                <option value="spring_fall">Vår, Höst</option>
                <option value="spring_summer_fall">Vår, Sommar, Höst</option>
                <option value="quarterly">Kvartalsvis</option>
                <option value="bi_monthly">Varannan månad</option>
                <option value="monthly">Varje månad</option>
                <option value="bi_weekly">Varannan vecka</option>
                <option value="weekly">Varje vecka</option>
              </select>

              <label className="muted">{messages.home.other}</label>
              <textarea
                value={createOtherNotes}
                onChange={(event) => setCreateOtherNotes(event.target.value)}
                placeholder={messages.home.otherNotesPlaceholder}
                className="text-area-md"
              />
            </div>
            <div className="dialog-actions">
              <button type="button" onClick={closeCreateIupDialog}>{messages.common.cancel}</button>
              <button
                type="button"
                className="primary"
                onClick={onCreateIupForPlayer}
                disabled={!createCycleLabel.trim() || !createPeriodStart || !createPeriodEnd}
              >
                {messages.home.createIup}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {status ? <p className="status-line">{status}</p> : null}
    </main>
  );
}






