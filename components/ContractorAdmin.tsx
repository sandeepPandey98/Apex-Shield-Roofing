"use client";
import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useContractorSession } from "@/lib/use-contractor-session";
import { ContractorDemoPanel } from "./ContractorDemoPanel";

type Kind = "tracking" | "leads" | "invoices";
type Row = {id: string; time: string; event?: string; page?: string; value?: number | null; currency?: string; name?: string; email?: string; phone?: string; address?: string; service?: string; notes?: string; source?: string; number?: string; status?: string; amount?: string; link?: string | null};
const titles = {tracking: "Event activity", leads: "Estimate requests", invoices: "Project billing"};
function money(value: number | string | null | undefined, currency = "usd") {
  if (value == null || value === "") return "—";
  try { return new Intl.NumberFormat("en-US", {style: "currency", currency}).format(Number(value)); } catch { return String(value); }
}
function time(value: string) { const d = new Date(value); return Number.isFinite(d.getTime()) ? d.toLocaleString() : "—"; }
export function ContractorAdmin({kind, embed: embedRoute = false}: {kind: Kind; embed?: boolean}) {
  const [framed, setFramed] = useState(false);
  useEffect(() => {setFramed(window.self !== window.top);}, []);
  const embed = embedRoute || framed;
  const session = useContractorSession(true, embed);
  const [signingIn, setSigningIn] = useState(false);
  const [token, setToken] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [environment, setEnvironment] = useState("");
  const [captureMode,setCaptureMode] = useState("");
  const [next, setNext] = useState<string | null>(null);
  const [windowTo, setWindowTo] = useState<string | null>(null);
  const [updated, setUpdated] = useState("");
  const [activityView,setActivityView] = useState("actions");
  const generation = useRef(0);
  async function load(append = false) {
    const current = ++generation.current;
    setBusy(true); setError("");
    if (!append) {setRows([]); setLoaded(false); setNext(null);}
    try {
      const params = new URLSearchParams();
      if (kind === "tracking") params.set("view",activityView);
      if (append && next) params.set("after", next);
      if (append && windowTo) params.set("to", windowTo);
      const response = await fetch(`/api/${kind}?${params}`, {credentials: "same-origin", cache: "no-store"});
      const data = await response.json();
      if (generation.current !== current) return;
      if (response.status === 401) {session.invalidate(); reset(); setError("Your session has expired. Enter your contractor token to sign in again."); return;}
      if (!response.ok) throw new Error(data.error || "Could not load account records.");
      if (generation.current !== current) return;
      setRows((old) => append ? [...old, ...data.data.filter((r: Row) => !old.some((x) => x.id === r.id))] : data.data);
      setNext(data.nextCursor); setWindowTo(data.to || null); setEnvironment(data.environment);
      setCaptureMode(data.captureMode || ""); setLoaded(true); setUpdated(new Date().toLocaleTimeString());
    } catch (e) {if (generation.current === current) setError(e instanceof Error ? e.message : "Could not load records.");}
    finally {if (generation.current === current) setBusy(false);}
  }
  function reset() {generation.current++; setToken(""); setRows([]); setLoaded(false); setNext(null); setError(""); setBusy(false); setEnvironment(""); setCaptureMode(""); setUpdated("");}
  useEffect(() => {
    if (session.authenticated) void load();
    return () => {generation.current++;};
  }, [session.authenticated, kind, activityView]);
  async function signIn(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault(); setSigningIn(true); setError("");
    try {await session.login(token); setToken("");}
    catch (e) {setError(e instanceof Error ? e.message : "Sign-in failed.");}
    finally {setSigningIn(false);}
  }
  async function lock() {
    setError("");
    try {await session.logout(); reset();}
    catch (e) {setError(e instanceof Error ? e.message : "Could not lock workspace.");}
  }
  return <main className={`contractor-page${embed ? " contractor-embed" : ""}`}>
    {!embed && <><header className="contractor-header"><a href="/">← Back to website</a><span>CONTRACTOR WORKSPACE</span></header>
    <nav className="contractor-nav" aria-label="Contractor pages">
      {(Object.keys(titles) as Kind[]).map((k) => <a key={k} href={`/admin/${k}`} aria-current={k === kind ? "page" : undefined}>{titles[k]}</a>)}
    </nav></>}
    <section className="contractor-card">
      <div className="contractor-title"><div><p className="eyebrow">ACCOUNT RECORDS {environment && `· ${environment.toUpperCase()}`}</p><h1>{titles[kind]}</h1></div>{session.authenticated && <div className="contractor-actions"><button className="button primary" disabled={busy} onClick={() => void load()}><RefreshCw size={15} aria-hidden="true" className={busy ? "contractor-refreshing" : undefined} />{busy ? "Refreshing…" : "Refresh"}</button><button className="button secondary" onClick={() => void lock()}>Lock workspace</button></div>}</div>
      <p>{kind === "tracking" ? activityView === "payments" ? "Actual payment records from the checkout account in the last 24 hours. Status comes from Whop; these are not pixel events. Sandbox transactions do not move real money." : activityView === "all" ? "All hosting-account events in the last 24 hours, including page views and dashboard visits. Use Website actions to find estimate and deposit activity." : "Your website’s estimate_requested, service_viewed and deposit_started events from the last 24 hours. Whop may take about a minute to report them; refresh after taking an action. Payments are listed separately because this demo uses sandbox checkout." : kind === "leads" ? captureMode === "leads_api" ? "Native Whop Leads API test mode. This view shows Lead records; Members estimate capture is disabled." : "Latest website estimate per customer, saved in Whop Members. Full request history is preserved in each customer’s notes." : "Create a final balance invoice, then review the invoices returned by Whop for this business."}</p>
      {kind === "tracking" && session.authenticated && <label className="contractor-activity-filter">Show activity<select aria-label="Activity type" value={activityView} onChange={(e)=>setActivityView(e.target.value)}><option value="actions">Website actions</option><option value="payments">Payment records</option><option value="all">All hosting activity</option></select></label>}
      {session.checking ? <p role="status">Checking contractor session…</p> : session.authenticated ? <div className="contractor-session-status"><span>Signed in across all three contractor tabs.</span>{updated && <span className="contractor-refreshed">Last refreshed {updated}</span>}</div> : <form className="contractor-access" onSubmit={signIn}>
        <label>Contractor access token<input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" required minLength={24} /></label>
        <button className="button primary" disabled={signingIn || token.length < 24}>{signingIn ? "Signing in…" : "Unlock workspace"}</button>
      </form>}
      <p className="contractor-meta">{embed ? "Unlock once for all three apps in this Whop community for up to 4 hours. Your browser must allow partitioned cookies. Open the page directly if embedded sign-in is blocked." : "One sign-in works across all contractor tabs for up to 4 hours. Lock workspace to sign out."}</p>
      {error && <p role="alert" className="form-error">{error}</p>}
      {loaded && <>
        {rows.length === 0 ? <div className="contractor-empty">{kind === "tracking" ? activityView === "payments" ? "No payment records returned for this window. Check Project billing for invoices, and confirm that checkout used the configured account." : "No matching events returned on this page. Take an action on the live website, wait about a minute, then refresh. Use Load more if available; localhost actions do not prove pixel delivery." : kind === "leads" ? "No website estimates on this page of customers. Use Load more if available." : `No ${kind} returned by Whop.`}</div> :
          kind === "leads" ? <div className="contractor-leads">{rows.map((r) => <article key={r.id}><div className="contractor-title"><h2>{r.name}</h2><span className="contractor-badge">{r.service}</span></div><p>{r.email}<br/>{r.phone}</p><p>{r.address}</p>{r.notes && <p>{r.notes}</p>}<small>{time(r.time)} · {r.source}</small></article>)}</div> :
          <div className="contractor-table"><table><thead><tr>{(kind === "tracking" ? activityView === "payments" ? ["Created", "Payment status", "Source", "Amount"] : ["Time", "Event", "Page", "Value"] : ["Created", "Invoice", "Customer", "Status", "Balance due", "Payment link"]).map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.id}>{kind === "tracking" ? <><td>{time(r.time)}</td><td><span className="contractor-badge">{r.event}</span></td><td>{r.page}</td><td>{money(r.value, r.currency)}</td></> : <><td>{time(r.time)}</td><td>{r.number || "Invoice"}</td><td>{r.email}</td><td>{r.status}</td><td>{money(r.amount, r.currency)}</td><td>{r.link ? <a href={r.link} target="_blank" rel="noopener noreferrer">Open invoice ↗</a> : "—"}</td></>}</tr>)}</tbody></table></div>}
        {next && <button className="button secondary" disabled={busy} onClick={() => void load(true)}>Load more records</button>}
      </>}
    </section>
    {kind === "invoices" && session.authenticated && <section className="contractor-card contractor-invoice"><h2>Create a final balance invoice</h2><ContractorDemoPanel embedded authenticatedSession onInvoiceUpdated={() => void load()} onSessionExpired={() => {session.invalidate(); reset(); setError("Your session has expired. Enter your contractor token to sign in again.");}} /></section>}
  </main>;
}
