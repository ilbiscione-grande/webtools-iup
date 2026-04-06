"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanLevel>("FREE");
  const [teams, setTeams] = useState<TeamLite[]>([]);
  const [players, setPlayers] = useState<SquadPlayer[]>([]);
  const [playerSearch, setPlayerSearch] = useState("");
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

  const teamNames = useMemo(() => teams, [teams]);

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
  }, [deferredPlayerSearch, includeArchived, plan, positionFilter, statusFilter, teamFilter]);

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
      setStatus("Välj lag.");
      return;
    }
    if (!createForm.name.trim()) {
      setStatus("Namn krävs.");
      return;
    }
    setBusy(true);
    const result = await createSquadPlayer({
      teamId: createForm.teamId,
      name: createForm.name,
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
    setStatus("Spelare skapad.");
    setCreateForm((current) => ({ ...emptyForm, teamId: current.teamId }));
    await loadPlayers(includeArchived);
    setSelectedPlayerId(result.playerId);
  };

  const onSavePlayer = async () => {
    if (!selectedPlayer) {
      return;
    }
    if (!editForm.name.trim()) {
      setStatus("Namn krävs.");
      return;
    }
    setBusy(true);
    const result = await updateSquadPlayer(selectedPlayer.id, {
      name: editForm.name,
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
    setStatus("Spelare uppdaterad.");
    await loadPlayers(includeArchived);
  };

  const onArchivePlayer = async () => {
    if (!selectedPlayer) {
      return;
    }
    const ok = window.confirm("Arkivera spelaren?");
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
    setStatus("Spelare arkiverad.");
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
    setStatus("Spelare återaktiverad.");
    await loadPlayers(includeArchived);
  };

  return (
    <main className="app-shell">
      <section className="page-hero">
        <div className="page-title">
          <h1>Squad-hantering</h1>
          <p className="page-subtitle">Redigera spelarprofiler och tillgänglighet.</p>
        </div>
        <div className="toolbar">
          <Link href="/">← Tillbaka</Link>
        </div>
      </section>

      {loading ? <p>Laddar...</p> : null}

      {!loading && plan !== "PAID" ? (
        <section className="card">
          <p className="muted-line">
            Squad-hantering kräver PAID-plan.
          </p>
        </section>
      ) : null}

      {!loading && plan === "PAID" ? (
        <>
          <section className="card card-strong">
            <h3 className="section-h3">Ny spelare</h3>
            <div className="form-stack">
              <div className="row wrap">
                <select
                  value={createForm.teamId}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, teamId: event.target.value }))
                  }
                >
                  <option value="">Välj lag</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="Namn"
                  value={createForm.name}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
                <input
                  placeholder="Nummer"
                  value={createForm.number}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, number: event.target.value }))
                  }
                  className="input-short"
                />
                <input
                  placeholder="Position"
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
                Lägg till spelare
              </button>
            </div>
          </section>

          <section className="card card-strong">
            <div className="row row-between mb-10">
              <h3 className="section-h3">Spelarlista</h3>
              <label className="row gap-8">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(event) => setIncludeArchived(event.target.checked)}
                />
                Visa arkiverade
              </label>
            </div>

            <div className="row wrap mb-10">
              <input
                placeholder="Sök namn, lag, position, nummer"
                value={playerSearch}
                onChange={(event) => setPlayerSearch(event.target.value)}
                className="input-wide"
              />
              <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
                <option value="all">Alla lag</option>
                {teamNames.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
              <select
                value={positionFilter}
                onChange={(event) => setPositionFilter(event.target.value)}
              >
                <option value="all">Alla positioner</option>
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
                <option value="all">Alla statusar</option>
                <option value="active">Aktiva</option>
                <option value="inactive">Arkiverade</option>
              </select>
            </div>

            {players.length === 0 ? (
              <p className="muted-line">Inga spelare hittades.</p>
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
                        {player.teamName} · {player.positionLabel || "-"} ·{" "}
                        {player.isActive ? "Aktiv" : "Arkiverad"}
                      </div>
                    </button>
                  ))}
                </div>

                <div className="card">
                  {!selectedPlayer ? (
                    <p className="muted-line">Välj en spelare i listan.</p>
                  ) : (
                    <div className="content-stack">
                      <h4 className="section-h3">
                        {selectedPlayer.name} {selectedPlayer.isActive ? "" : "(Arkiverad)"}
                      </h4>
                      <div className="row wrap">
                        <input value={selectedPlayer.teamName} disabled className="input-medium" />
                        <input
                          placeholder="Namn"
                          value={editForm.name}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, name: event.target.value }))
                          }
                        />
                        <input
                          placeholder="Nummer"
                          value={editForm.number}
                          onChange={(event) =>
                            setEditForm((current) => ({ ...current, number: event.target.value }))
                          }
                          className="input-short"
                        />
                        <input
                          placeholder="Position"
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
                          placeholder="Ålder"
                          className="input-short"
                        />
                        <input
                          placeholder="Dominant foot"
                          value={editForm.dominantFoot}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              dominantFoot: event.target.value,
                            }))
                          }
                        />
                        <input
                          placeholder="Längd cm"
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
                          placeholder="Vikt kg"
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
                          placeholder="Nationalitet"
                          value={editForm.nationality}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              nationality: event.target.value,
                            }))
                          }
                        />
                        <input
                          placeholder="Födelseort"
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
                        placeholder="Skade-/medicinsk notering"
                        className="text-area-md"
                      />
                      <div className="row">
                        <button type="button" className="primary" onClick={onSavePlayer} disabled={busy}>
                          Spara spelare
                        </button>
                        {selectedPlayer.isActive ? (
                          <button type="button" onClick={onArchivePlayer} disabled={busy}>
                            Arkivera
                          </button>
                        ) : (
                          <button type="button" onClick={onRestorePlayer} disabled={busy}>
                            Återaktivera
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
