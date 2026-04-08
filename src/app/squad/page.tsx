"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import {
  archiveSquadPlayer,
  createSquadPlayer,
  fetchProfilePlan,
  fetchSquadPlayers,
  fetchTeams,
  restoreSquadPlayer,
  updateSquadPlayer,
  type PlanLevel,
  type SquadPlayer,
  type TeamLite,
} from "../../lib/iupApi";

type PlayerStatusFilter = "all" | "active" | "inactive";

type PlayerForm = {
  teamId: string;
  name: string;
  email: string;
  number: string;
  positionLabel: string;
  birthDate: string;
  dominantFoot: string;
  heightCm: string;
  weightKg: string;
  nationality: string;
  birthPlace: string;
  injuryNotes: string;
};

const emptyForm: PlayerForm = {
  teamId: "",
  name: "",
  email: "",
  number: "",
  positionLabel: "",
  birthDate: "",
  dominantFoot: "",
  heightCm: "",
  weightKg: "",
  nationality: "",
  birthPlace: "",
  injuryNotes: "",
};

const toForm = (player: SquadPlayer): PlayerForm => ({
  teamId: player.teamId,
  name: player.name ?? "",
  email: player.email ?? "",
  number: player.number > 0 ? String(player.number) : "",
  positionLabel: player.positionLabel ?? "",
  birthDate: player.birthDate ?? "",
  dominantFoot: player.dominantFoot ?? "",
  heightCm: player.heightCm ? String(player.heightCm) : "",
  weightKg: player.weightKg ? String(player.weightKg) : "",
  nationality: player.nationality ?? "",
  birthPlace: player.birthPlace ?? "",
  injuryNotes: player.injuryNotes ?? "",
});

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
  return age >= 0 ? String(age) : "";
};

export default function SquadPage() {
  const { messages } = useI18n();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanLevel>("FREE");
  const [teams, setTeams] = useState<TeamLite[]>([]);
  const [players, setPlayers] = useState<SquadPlayer[]>([]);
  const [createClubFilter, setCreateClubFilter] = useState("all");
  const [playerSearch, setPlayerSearch] = useState("");
  const [clubFilter, setClubFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");
  const [positionFilter, setPositionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<PlayerStatusFilter>("all");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [includeArchived, setIncludeArchived] = useState(true);
  const [createForm, setCreateForm] = useState<PlayerForm>(emptyForm);
  const [editForm, setEditForm] = useState<PlayerForm>(emptyForm);
  const deferredPlayerSearch = useDeferredValue(playerSearch);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.id === selectedPlayerId) ?? null,
    [players, selectedPlayerId]
  );
  const clubOptions = useMemo(() => {
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
    () => (clubFilter === "all" ? teams : teams.filter((team) => team.clubId === clubFilter)),
    [clubFilter, teams]
  );
  const createClubOptions = useMemo(() => clubOptions, [clubOptions]);
  const createVisibleTeamOptions = useMemo(
    () =>
      createClubFilter === "all"
        ? teams
        : teams.filter((team) => team.clubId === createClubFilter),
    [createClubFilter, teams]
  );

  const positionNames = useMemo(
    () =>
      Array.from(
        new Set(players.map((player) => player.positionLabel.trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b, "sv")),
    [players]
  );

  const loadPlayers = async (nextIncludeArchived: boolean) => {
    const result = await fetchSquadPlayers(nextIncludeArchived, {
      search: deferredPlayerSearch,
      clubId: clubFilter !== "all" ? clubFilter : undefined,
      teamId: teamFilter !== "all" ? teamFilter : undefined,
      positionLabel: positionFilter !== "all" ? positionFilter : undefined,
      status: statusFilter,
    });
    if (!result.ok) {
      setStatus(result.error);
      setPlayers([]);
      setSelectedPlayerId("");
      return;
    }
    setPlayers(result.players);
    const fallbackId = result.players[0]?.id ?? "";
    setSelectedPlayerId((current) =>
      current && result.players.some((player) => player.id === current)
        ? current
        : fallbackId
    );
  };

  const load = async () => {
    setLoading(true);
    const planResult = await fetchProfilePlan();
    if (!planResult.ok) {
      setStatus(planResult.error);
      setLoading(false);
      return;
    }
    setPlan(planResult.plan);
    if (planResult.plan !== "PAID") {
      setLoading(false);
      return;
    }

    const [teamResult, playerResult] = await Promise.all([
      fetchTeams(),
      fetchSquadPlayers(includeArchived),
    ]);

    if (!teamResult.ok) {
      setStatus(teamResult.error);
      setTeams([]);
    } else {
      setTeams(teamResult.teams);
      setCreateForm((current) => ({
        ...current,
        teamId: current.teamId || teamResult.teams[0]?.id || "",
      }));
    }

    if (!playerResult.ok) {
      setStatus(playerResult.error);
      setPlayers([]);
      setSelectedPlayerId("");
    } else {
      setPlayers(playerResult.players);
      const firstId = playerResult.players[0]?.id ?? "";
      setSelectedPlayerId(firstId);
      if (firstId) {
        const selected = playerResult.players.find((player) => player.id === firstId);
        if (selected) {
          setEditForm(toForm(selected));
        }
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (plan !== "PAID") {
      return;
    }
    loadPlayers(includeArchived);
  }, [clubFilter, deferredPlayerSearch, includeArchived, plan, positionFilter, statusFilter, teamFilter]);

  useEffect(() => {
    if (teamFilter !== "all" && !visibleTeamOptions.some((team) => team.id === teamFilter)) {
      setTeamFilter("all");
    }
  }, [teamFilter, visibleTeamOptions]);

  useEffect(() => {
    if (
      createForm.teamId &&
      !createVisibleTeamOptions.some((team) => team.id === createForm.teamId)
    ) {
      setCreateForm((current) => ({
        ...current,
        teamId: createVisibleTeamOptions[0]?.id ?? "",
      }));
    }
  }, [createForm.teamId, createVisibleTeamOptions]);

  useEffect(() => {
    if (!selectedPlayer) {
      setEditForm(emptyForm);
      return;
    }
    setEditForm(toForm(selectedPlayer));
  }, [selectedPlayerId, selectedPlayer]);

  useEffect(() => {
    if (!players.some((player) => player.id === selectedPlayerId)) {
      setSelectedPlayerId(players[0]?.id ?? "");
    }
  }, [players, selectedPlayerId]);

  const onCreatePlayer = async () => {
    if (plan !== "PAID") {
      return;
    }
    if (!createForm.teamId) {
      setStatus(messages.squad.chooseTeam);
      return;
    }
    if (!createForm.name.trim()) {
      setStatus(messages.squad.nameRequired);
      return;
    }
    setBusy(true);
    const result = await createSquadPlayer({
      teamId: createForm.teamId,
      name: createForm.name,
      email: createForm.email || undefined,
      number: createForm.number ? Number(createForm.number) : undefined,
      positionLabel: createForm.positionLabel,
      birthDate: createForm.birthDate || undefined,
      dominantFoot: createForm.dominantFoot,
      heightCm: createForm.heightCm ? Number(createForm.heightCm) : undefined,
      weightKg: createForm.weightKg ? Number(createForm.weightKg) : undefined,
      nationality: createForm.nationality,
      birthPlace: createForm.birthPlace,
      injuryNotes: createForm.injuryNotes,
    });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus(messages.squad.playerCreated);
    setCreateForm((current) => ({ ...emptyForm, teamId: current.teamId }));
    await loadPlayers(includeArchived);
    setSelectedPlayerId(result.playerId);
  };

  const onSavePlayer = async () => {
    if (!selectedPlayer) {
      return;
    }
    if (!editForm.name.trim()) {
      setStatus(messages.squad.nameRequired);
      return;
    }
    setBusy(true);
    const result = await updateSquadPlayer(selectedPlayer.id, {
      name: editForm.name,
      email: editForm.email || undefined,
      number: editForm.number ? Number(editForm.number) : undefined,
      positionLabel: editForm.positionLabel,
      birthDate: editForm.birthDate || undefined,
      dominantFoot: editForm.dominantFoot,
      heightCm: editForm.heightCm ? Number(editForm.heightCm) : undefined,
      weightKg: editForm.weightKg ? Number(editForm.weightKg) : undefined,
      nationality: editForm.nationality,
      birthPlace: editForm.birthPlace,
      injuryNotes: editForm.injuryNotes,
    });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus(messages.squad.playerUpdated);
    await loadPlayers(includeArchived);
  };

  const onArchivePlayer = async () => {
    if (!selectedPlayer) {
      return;
    }
    const ok = window.confirm(messages.squad.confirmArchive);
    if (!ok) {
      return;
    }
    setBusy(true);
    const result = await archiveSquadPlayer(selectedPlayer.id);
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus(messages.squad.playerArchived);
    await loadPlayers(includeArchived);
  };

  const onRestorePlayer = async () => {
    if (!selectedPlayer) {
      return;
    }
    setBusy(true);
    const result = await restoreSquadPlayer(selectedPlayer.id);
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus(messages.squad.playerRestored);
    await loadPlayers(includeArchived);
  };

  return (
    <main className="app-shell">
      <div className="iup-top-actions">
        <Link
          href="/settings"
          className="iup-top-icon"
          title={messages.settings.pageTitle}
          aria-label={messages.settings.pageTitle}
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

      <section className="page-hero">
        <div className="page-title">
          <h1>{messages.squad.title}</h1>
          <p className="page-subtitle">{messages.squad.subtitle}</p>
        </div>
        <div className="toolbar">
          <Link href="/">← {messages.common.back}</Link>
        </div>
      </section>

      {loading ? <p>{messages.common.loading}</p> : null}

      {!loading && plan !== "PAID" ? (
        <section className="card">
          <p className="muted-line">
            {messages.squad.paidRequired}
          </p>
        </section>
      ) : null}

      {!loading && plan === "PAID" ? (
        <>
          <section className="card card-strong">
            <h3 className="section-h3">{messages.squad.newPlayer}</h3>
            <div className="form-stack">
              <div className="row wrap">
                <select
                  value={createClubFilter}
                  onChange={(event) => setCreateClubFilter(event.target.value)}
                >
                  <option value="all">{messages.common.allClubs}</option>
                  {createClubOptions.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
                <select
                  value={createForm.teamId}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, teamId: event.target.value }))
                  }
                >
                  <option value="">{messages.squad.selectTeam}</option>
                  {createVisibleTeamOptions.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.label}
                    </option>
                  ))}
                </select>
                <input
                  placeholder={messages.squad.name}
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
                <input
                  type="email"
                  placeholder={messages.squad.email}
                  value={createForm.email}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, email: event.target.value }))
                  }
                />
                <input
                  placeholder={messages.home.number}
                  value={createForm.number}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, number: event.target.value }))
                  }
                  className="input-short"
                />
                <input
                  placeholder={messages.home.position}
                  value={createForm.positionLabel}
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      positionLabel: event.target.value,
                    }))
                  }
                />
                <input
                  type="date"
                  value={createForm.birthDate}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, birthDate: event.target.value }))
                  }
                />
              </div>
              <button type="button" className="primary" onClick={onCreatePlayer} disabled={busy}>
                {messages.squad.addPlayer}
              </button>
            </div>
          </section>

          <section className="card card-strong">
            <div className="row row-between mb-10">
              <h3 className="section-h3">{messages.squad.playerList}</h3>
              <label className="row gap-8">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(event) => setIncludeArchived(event.target.checked)}
                />
                {messages.squad.showArchived}
              </label>
            </div>

            <div className="row wrap mb-10">
              <input
                placeholder={messages.common.searchPlaceholder}
                value={playerSearch}
                onChange={(event) => setPlayerSearch(event.target.value)}
                className="input-wide"
              />
              <select value={clubFilter} onChange={(event) => setClubFilter(event.target.value)}>
                <option value="all">{messages.common.allClubs}</option>
                {clubOptions.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.name}
                  </option>
                ))}
              </select>
              <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
                <option value="all">{messages.common.allTeams}</option>
                {visibleTeamOptions.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.label}
                  </option>
                ))}
              </select>
              <select
                value={positionFilter}
                onChange={(event) => setPositionFilter(event.target.value)}
              >
                <option value="all">{messages.common.allPositions}</option>
                {positionNames.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as PlayerStatusFilter)
                }
              >
                <option value="all">{messages.common.allStatuses}</option>
                <option value="active">{messages.common.active}</option>
                <option value="inactive">{messages.common.archived}</option>
              </select>
            </div>

            {players.length === 0 ? (
              <p className="muted-line">{messages.squad.noPlayersFound}</p>
            ) : (
              <div className="grid-2">
                <div className="list-panel list-panel-lg">
                  {players.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setSelectedPlayerId(player.id)}
                      className={`list-item ${selectedPlayerId === player.id ? "active" : ""}`}
                    >
                      <div className="text-strong">
                        {player.number > 0 ? `${player.number}. ` : ""}
                        {player.name}
                      </div>
                      <div className="muted-sm">
                        {player.clubName ? `${player.clubName} / ` : ""}{player.teamName} · {player.positionLabel || "-"} ·{" "}
                        {player.isActive ? messages.common.active : messages.common.archived}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="card">
                  {!selectedPlayer ? (
                    <p className="muted-line">{messages.common.selectPlayerFromList}</p>
                  ) : (
                    <div className="content-stack">
                      <h4 className="section-h3">
                        {selectedPlayer.name} {selectedPlayer.isActive ? "" : "(Arkiverad)"}
                      </h4>
                      <div className="row wrap">
                        <input
                          value={
                            selectedPlayer.clubName
                              ? `${selectedPlayer.clubName} / ${selectedPlayer.teamName}`
                              : selectedPlayer.teamName
                          }
                          disabled
                          className="input-medium"
                        />
                        <input
                          placeholder={messages.squad.name}
                          value={editForm.name}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, name: event.target.value }))
                          }
                        />
                        <input
                          type="email"
                          placeholder={messages.squad.email}
                          value={editForm.email}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, email: event.target.value }))
                          }
                        />
                        <input
                          placeholder={messages.home.number}
                          value={editForm.number}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, number: event.target.value }))
                          }
                          className="input-short"
                        />
                        <input
                          placeholder={messages.home.position}
                          value={editForm.positionLabel}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              positionLabel: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="row wrap">
                        <input
                          value={
                            selectedPlayer.userId
                              ? messages.squad.linkedAccount
                              : messages.squad.notLinked
                          }
                          disabled
                          className="input-medium"
                        />
                      </div>
                      <div className="row wrap">
                        <input
                          type="date"
                          value={editForm.birthDate}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              birthDate: event.target.value,
                            }))
                          }
                        />
                        <input
                          value={getAge(editForm.birthDate)}
                          disabled
                          placeholder={messages.squad.age}
                          className="input-short"
                        />
                        <input
                          placeholder={messages.squad.dominantFoot}
                          value={editForm.dominantFoot}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              dominantFoot: event.target.value,
                            }))
                          }
                        />
                        <input
                          placeholder={messages.squad.heightCm}
                          value={editForm.heightCm}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              heightCm: event.target.value,
                            }))
                          }
                          className="input-short"
                        />
                        <input
                          placeholder={messages.squad.weightKg}
                          value={editForm.weightKg}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              weightKg: event.target.value,
                            }))
                          }
                          className="input-short"
                        />
                      </div>
                      <div className="row wrap">
                        <input
                          placeholder={messages.squad.nationality}
                          value={editForm.nationality}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              nationality: event.target.value,
                            }))
                          }
                        />
                        <input
                          placeholder={messages.squad.birthPlace}
                          value={editForm.birthPlace}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              birthPlace: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <textarea
                        value={editForm.injuryNotes}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            injuryNotes: event.target.value,
                          }))
                        }
                        placeholder={messages.squad.injuryNotes}
                        className="text-area-md"
                      />
                      <div className="row">
                        <button type="button" className="primary" onClick={onSavePlayer} disabled={busy}>
                          {messages.squad.savePlayer}
                        </button>
                        {selectedPlayer.isActive ? (
                          <button type="button" onClick={onArchivePlayer} disabled={busy}>
                            {messages.squad.archive}
                          </button>
                        ) : (
                          <button type="button" onClick={onRestorePlayer} disabled={busy}>
                            {messages.squad.restore}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      ) : null}

      {status ? <p className="status-line">{status}</p> : null}
    </main>
  );
}
