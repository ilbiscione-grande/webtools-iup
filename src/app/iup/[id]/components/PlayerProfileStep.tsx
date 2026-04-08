import { type Messages, type PlayerInfo } from "@/lib/iup/editorUtils";

type PlayerProfileStepProps = {
  messages: Messages;
  playerInfo: PlayerInfo;
  onPlayerInfoChange: (updater: (current: NonNullable<PlayerInfo>) => NonNullable<PlayerInfo>) => void;
};

export function PlayerProfileStep(props: PlayerProfileStepProps) {
  const {
    messages,
    playerInfo,
    onPlayerInfoChange,
  } = props;

  return (
    <>
      <h3 className="section-h3">{messages.iup.playerProfile}</h3>
      <div className="iup-profile-editor">
        <div className="card form-stack iup-profile-section">
          <strong className="iup-profile-group-title">{messages.iup.baseData}</strong>
          <div className="row wrap">
            <input
              value={playerInfo?.name ?? ""}
              onChange={(event) =>
                onPlayerInfoChange((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={messages.squad.name}
            />
            <input
              value={typeof playerInfo?.number === "number" ? String(playerInfo.number) : ""}
              onChange={(event) =>
                onPlayerInfoChange((current) => ({
                  ...current,
                  number: event.target.value.trim() ? Number(event.target.value) : undefined,
                }))
              }
              placeholder={messages.home.number}
              className="input-short"
            />
            <input
              value={playerInfo?.positionLabel ?? ""}
              onChange={(event) =>
                onPlayerInfoChange((current) => ({
                  ...current,
                  positionLabel: event.target.value,
                }))
              }
              placeholder={messages.iup.favoritePosition}
            />
            <input
              type="date"
              value={playerInfo?.birthDate ?? ""}
              onChange={(event) =>
                onPlayerInfoChange((current) => ({ ...current, birthDate: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="card form-stack iup-profile-section">
          <strong className="iup-profile-group-title">{messages.iup.physics}</strong>
          <div className="row wrap">
            <input
              value={playerInfo?.dominantFoot ?? ""}
              onChange={(event) =>
                onPlayerInfoChange((current) => ({
                  ...current,
                  dominantFoot: event.target.value,
                }))
              }
              placeholder={messages.squad.dominantFoot}
            />
            <input
              value={typeof playerInfo?.heightCm === "number" ? String(playerInfo.heightCm) : ""}
              onChange={(event) =>
                onPlayerInfoChange((current) => ({
                  ...current,
                  heightCm: event.target.value.trim() ? Number(event.target.value) : undefined,
                }))
              }
              placeholder={messages.squad.heightCm}
              className="input-short"
            />
            <input
              value={typeof playerInfo?.weightKg === "number" ? String(playerInfo.weightKg) : ""}
              onChange={(event) =>
                onPlayerInfoChange((current) => ({
                  ...current,
                  weightKg: event.target.value.trim() ? Number(event.target.value) : undefined,
                }))
              }
              placeholder={messages.squad.weightKg}
              className="input-short"
            />
          </div>
        </div>

        <div className="card form-stack iup-profile-section">
          <strong className="iup-profile-group-title">{messages.iup.background}</strong>
          <div className="row wrap">
            <input
              value={playerInfo?.nationality ?? ""}
              onChange={(event) =>
                onPlayerInfoChange((current) => ({
                  ...current,
                  nationality: event.target.value,
                }))
              }
              placeholder={messages.squad.nationality}
            />
            <input
              value={playerInfo?.birthPlace ?? ""}
              onChange={(event) =>
                onPlayerInfoChange((current) => ({
                  ...current,
                  birthPlace: event.target.value,
                }))
              }
              placeholder={messages.squad.birthPlace}
            />
          </div>
          <p className="iup-note">{messages.iup.photoHint}</p>
        </div>

        <div className="card form-stack iup-profile-section">
          <strong className="iup-profile-group-title">{messages.iup.medicalInfo}</strong>
          <textarea
            value={playerInfo?.injuryNotes ?? ""}
            onChange={(event) =>
              onPlayerInfoChange((current) => ({
                ...current,
                injuryNotes: event.target.value,
              }))
            }
            placeholder={messages.squad.injuryNotes}
            className="text-area-md"
          />
        </div>
      </div>
    </>
  );
}
