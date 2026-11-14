"use client";
import { useEffect, useState } from "react";
export function useContractorSession(enabled = true, embed = false) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(enabled);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetch("/api/admin/session", {credentials: "same-origin", cache: "no-store"})
      .then((r) => {if (active) setAuthenticated(r.ok);})
      .catch(() => {if (active) setAuthenticated(false);})
      .finally(() => {if (active) setChecking(false);});
    return () => {active = false;};
  }, [enabled]);
  async function login(token: string) {
    const response = await fetch("/api/admin/session", {method: "POST", credentials: "same-origin", headers: {Authorization: `Bearer ${token}`, ...(embed ? {"X-Contractor-Embed":"1"} : {})}});
    if (!response.ok) {const data = await response.json(); throw new Error(data.error || "Contractor sign-in failed.");}
    const check = await fetch("/api/admin/session", {credentials:"same-origin",cache:"no-store"});
    if (!check.ok) throw new Error("Your browser blocked the sign-in cookie. Open this page directly to unlock the workspace.");
    setAuthenticated(true);
  }
  async function logout() {
    const response = await fetch("/api/admin/session", {method: "DELETE", credentials: "same-origin", headers:embed ? {"X-Contractor-Embed":"1"} : {}});
    if (!response.ok) throw new Error("Could not lock the workspace. Please try again.");
    setAuthenticated(false);
  }
  return {authenticated, checking, login, logout, invalidate: () => setAuthenticated(false)};
}
