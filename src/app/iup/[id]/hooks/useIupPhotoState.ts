import { useState } from "react";
import { readFileAsDataUrl, type Messages, type PlayerInfo } from "@/lib/iup/editorUtils";

type UseIupPhotoStateArgs = {
  messages: Messages;
  setPlayerInfo: React.Dispatch<React.SetStateAction<PlayerInfo>>;
  setStatus: (value: string | null) => void;
};

export function useIupPhotoState(args: UseIupPhotoStateArgs) {
  const { messages, setPlayerInfo, setStatus } = args;

  const [showPhotoActions, setShowPhotoActions] = useState(false);
  const [showPhotoLinkInput, setShowPhotoLinkInput] = useState(false);
  const [photoLinkDraft, setPhotoLinkDraft] = useState("");

  const applyPlayerPhotoUrl = (photoUrl?: string) => {
    const nextUrl = photoUrl?.trim() || undefined;
    setPlayerInfo((current) =>
      current
        ? {
            ...current,
            photoUrl: nextUrl,
          }
        : current
    );
    setPhotoLinkDraft(nextUrl ?? "");
  };

  const onSelectPhotoFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setStatus(messages.iup.selectImageFile);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setStatus(messages.iup.imageTooLarge);
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      applyPlayerPhotoUrl(dataUrl);
      setShowPhotoActions(false);
      setShowPhotoLinkInput(false);
      setStatus(messages.iup.profilePhotoUpdated);
    } catch {
      setStatus(messages.iup.couldNotReadImage);
    }
  };

  const onApplyPhotoLink = () => {
    applyPlayerPhotoUrl(photoLinkDraft);
    setShowPhotoActions(false);
    setShowPhotoLinkInput(false);
    setStatus(
      photoLinkDraft.trim()
        ? messages.iup.profilePhotoLinkUpdated
        : messages.iup.profilePhotoRemoved
    );
  };

  const onRemovePhoto = () => {
    applyPlayerPhotoUrl("");
    setShowPhotoActions(false);
    setShowPhotoLinkInput(false);
  };

  return {
    showPhotoActions,
    showPhotoLinkInput,
    photoLinkDraft,
    setShowPhotoActions,
    setShowPhotoLinkInput,
    setPhotoLinkDraft,
    onSelectPhotoFile,
    onApplyPhotoLink,
    onRemovePhoto,
  };
}
