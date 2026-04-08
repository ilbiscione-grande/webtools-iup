import { useEffect, useState } from "react";
import { claimMyPlayerLinks } from "@/lib/iupApi";
import { supabase } from "@/lib/supabaseClient";

export function useIupAuthInit() {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [signedInEmail, setSignedInEmail] = useState("");
  const [signedInUserId, setSignedInUserId] = useState<string | null>(null);
  const [showCoachAssessment, setShowCoachAssessment] = useState(false);

  useEffect(() => {
    const readCoachVisibility = () => {
      if (typeof window === "undefined") {
        return;
      }
      const saved = window.localStorage.getItem("iup:showCoachAssessment");
      setShowCoachAssessment(saved === "1");
    };

    const loadAuth = async () => {
      if (!supabase) {
        setIsSignedIn(false);
        setSignedInEmail("");
        setSignedInUserId(null);
        return;
      }
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await claimMyPlayerLinks();
        setIsSignedIn(true);
        setSignedInEmail(data.user.email ?? "");
        setSignedInUserId(data.user.id);
      } else {
        setIsSignedIn(false);
        setSignedInEmail("");
        setSignedInUserId(null);
      }
    };

    readCoachVisibility();
    loadAuth();
  }, []);

  return {
    isSignedIn,
    signedInEmail,
    signedInUserId,
    showCoachAssessment,
  };
}
