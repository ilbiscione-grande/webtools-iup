"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createIupPlan,
  fetchIupPlans,
  fetchTeamPlayers,
  fetchTeams,
  getSessionUser,
  signInMagicLink,
  signOut,
  type IupPlanLite,
  type TeamLite,
  type TeamPlayerLite,
} from "../lib/iupApi";

export default function Page() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [teams, setTeams] = useState<TeamLite[]>([]);
  const [teamId, setTeamId] = useState("");
  const [players, setPlayers] = useState<TeamPlayerLite[]>([]);
  const [plans, setPlans] = useState<IupPlanLite[]>([]);
  const [playerId, setPlayerId] = useState("");
  const [title, setTitle] = useState("IUP Plan");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === playerId),
    [players, playerId]
  );

  const loadTeams = async () => {
    const result = await fetchTeams();
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setTeams(result.teams);
    setTeamId((current) => current || result.teams[0]?.id || "");
  };

  const loadPlans = async (nextTeamId: string) => {
    if (!nextTeamId) {
      setPlans([]);
      return;
    }
    const result = await fetchIupPlans(nextTeamId);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setPlans(result.plans);
  };

  const loadPlayers = async (nextTeamId: string) => {
    if (!nextTeamId) {
      setPlayers([]);
      return;
    }
    const result = await fetchTeamPlayers(nextTeamId);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setPlayers(result.players);
    setPlayerId((current) => current || result.players[0]?.id || "");
  };

  useEffect(() => {
    getSessionUser().then((user) => setSignedIn(Boolean(user)));
  }, []);

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    loadTeams();
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) {
      return;
    }
    loadPlayers(teamId);
    loadPlans(teamId);
  }, [signedIn, teamId]);

  const onSendMagicLink = async () => {
    if (!email.trim()) {
      setStatus("Enter email.");
      return;
    }
    const redirectTo = window.location.origin;
    const result = await signInMagicLink(email.trim(), redirectTo);
    setStatus(result.ok ? "Magic link sent." : result.error);
  };

  const onSignOut = async () => {
    await signOut();
    setSignedIn(false);
    setTeams([]);
    setPlayers([]);
    setPlans([]);
    setStatus("Signed out.");
  };

  const onCreatePlan = async () => {
    if (!teamId || !playerId || !title.trim()) {
      setStatus("Select team, player and title.");
      return;
    }
    setBusy(true);
    const result = await createIupPlan({
      teamId,
      playerId,
      title: title.trim(),
      periodStart: periodStart || undefined,
      periodEnd: periodEnd || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setStatus(result.error);
      return;
    }
    setStatus("Plan created.");
    await loadPlans(teamId);
  };

  return (
    <main>
      <h1 style={{ marginTop: 0 }}>Teamzone IUP</h1>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Separate app using same Supabase users and team/player data.
      </p>

      {!signedIn ? (
        <section className="card" style={{ marginBottom: 14 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Sign in</h2>
          <div className="row">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={{ minWidth: 280 }}
            />
            <button className="primary" onClick={onSendMagicLink}>
              Send magic link
            </button>
          </div>
        </section>
      ) : (
        <section className="card" style={{ marginBottom: 14 }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Coach workspace</h2>
            <button onClick={onSignOut}>Sign out</button>
          </div>
        </section>
      )}

      {signedIn ? (
        <>
          <section className="card" style={{ marginBottom: 14 }}>
            <h3 style={{ marginTop: 0 }}>Create plan</h3>
            <div className="row" style={{ flexWrap: "wrap" }}>
              <select
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
              >
                {teams.length === 0 ? (
                  <option value="">No teams</option>
                ) : null}
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>

              <select
                value={playerId}
                onChange={(event) => setPlayerId(event.target.value)}
              >
                {players.length === 0 ? (
                  <option value="">No active players</option>
                ) : null}
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name} ({player.positionLabel})
                  </option>
                ))}
              </select>

              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Plan title"
              />
              <input
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
              />
              <input
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
              />
              <button className="primary" disabled={busy} onClick={onCreatePlan}>
                {busy ? "Saving..." : "Create"}
              </button>
            </div>
            <p style={{ marginBottom: 0, opacity: 0.75, fontSize: 13 }}>
              Player: {selectedPlayer ? selectedPlayer.name : "-"}
            </p>
          </section>

          <section className="card">
            <h3 style={{ marginTop: 0 }}>Plans ({plans.length})</h3>
            {plans.length === 0 ? (
              <p style={{ opacity: 0.8 }}>No plans yet.</p>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    style={{
                      border: "1px solid rgba(120,160,150,0.35)",
                      borderRadius: 10,
                      padding: 10,
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    <strong>{plan.title}</strong>
                    <span style={{ opacity: 0.8, fontSize: 13 }}>
                      Status: {plan.status}
                    </span>
                    <span style={{ opacity: 0.8, fontSize: 13 }}>
                      Period: {plan.periodStart ?? "-"} to {plan.periodEnd ?? "-"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {status ? (
        <p style={{ marginTop: 14, color: "#f2c45a", fontSize: 14 }}>{status}</p>
      ) : null}
    </main>
  );
}
