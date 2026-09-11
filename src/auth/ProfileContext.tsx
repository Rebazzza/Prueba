import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type ProfileId = "M" | "R";

export const PROFILE_NAMES: Record<ProfileId, string> = {
  M: "Mauricio",
  R: "Rubí",
};

const PROFILE_KEY = "ohana_profile";

export function getDisplayName(author: string): string {
  if (author === "M" || author === "R") return PROFILE_NAMES[author];
  return author;
}

interface ProfileContextValue {
  profile: ProfileId | null;
  saveProfile: (id: ProfileId) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

function getStoredProfile(): ProfileId | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw === "M" || raw === "R") return raw;
    if (raw === "Mauricio") return "M";
    if (raw === "Rubí") return "R";
    return null;
  } catch {
    return null;
  }
}

function storeProfile(id: ProfileId) {
  try {
    localStorage.setItem(PROFILE_KEY, id);
  } catch {
    // storage unavailable
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileId | null>(getStoredProfile());

  function saveProfile(id: ProfileId) {
    storeProfile(id);
    setProfile(id);
  }

  return (
    <ProfileContext.Provider value={{ profile, saveProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile debe usarse dentro de ProfileProvider");
  return ctx;
}