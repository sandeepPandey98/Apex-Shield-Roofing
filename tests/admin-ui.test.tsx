import React, {act} from "react";
import {createRoot, type Root} from "react-dom/client";
import {afterEach, beforeEach, expect, it, vi} from "vitest";
import {ContractorAdmin} from "../components/ContractorAdmin";
let root: Root;
let host: HTMLDivElement;
let authenticated: boolean;
const fetchMock=vi.fn();
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
  authenticated=false;
  host=document.createElement("div");document.body.append(host);root=createRoot(host);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input:string,options?: RequestInit) => {
    if(input==="/api/admin/session") {
      if(options?.method==="POST")authenticated=true;
      if(options?.method==="DELETE")authenticated=false;
      return Response.json({authenticated},{status:authenticated || options?.method==="DELETE"?200:401});
    }
    return Response.json({data:[],nextCursor:null,environment:"sandbox"});
  });
  vi.stubGlobal("fetch",fetchMock);
});
afterEach(async () => {await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
async function render(kind:"tracking"|"leads"|"invoices") {await act(async()=>root.render(<ContractorAdmin key={kind} kind={kind}/>));}
it("one sign-in survives navigation and unlocks the invoice form; lock signs out the other pages",async()=>{
  await render("tracking");
  expect(host.textContent).toContain("Unlock workspace");
  const input=host.querySelector("input")!;
  await act(async()=>{
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,"test-admin-token-1234567890");
    input.dispatchEvent(new Event("input",{bubbles:true}));
  });
  await act(async()=>host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
  expect(host.textContent).toContain("Signed in across all three");
  expect(host.querySelector('input[type="password"]')).toBeNull();
  await render("leads");
  expect(host.textContent).toContain("Signed in across all three");
  await render("invoices");
  expect(host.textContent).toContain("Create a final balance invoice");
  expect(host.querySelector('input[type="password"]')).toBeNull();
  expect(fetchMock.mock.calls.filter(([,options])=>options?.method==="POST")).toHaveLength(1);
  const lock=Array.from(host.querySelectorAll("button")).find(b=>b.textContent==="Lock workspace")!;
  await act(async()=>lock.click());
  await render("tracking");
  expect(host.textContent).toContain("Unlock workspace");
  expect(host.textContent).not.toContain("Signed in across all three");
});
it("expired sessions clear the account data and return to the login form",async()=>{
  authenticated=true;
  fetchMock.mockImplementation(async(input:string)=>input==="/api/admin/session"?Response.json({authenticated:true}):Response.json({error:"Contractor authentication required."},{status:401}));
  await render("leads");
  expect(host.textContent).toContain("Your session has expired");
  expect(host.textContent).toContain("Unlock workspace");
});
it("embed pages show only their selected view and use shared embedded sign-in",async()=>{
 await act(async()=>root.render(<ContractorAdmin kind="tracking" embed/>));
 expect(host.querySelector('nav[aria-label="Contractor pages"]')).toBeNull();
 expect(host.textContent).not.toContain("Back to website");
 expect(host.querySelector("h1")?.textContent).toBe("Event activity");
 const input=host.querySelector("input")!;
 await act(async()=>{
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,"test-admin-token-1234567890");
  input.dispatchEvent(new Event("input",{bubbles:true}));
 });
 await act(async()=>host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
 expect(fetchMock.mock.calls.find(([,options])=>options?.method==="POST")?.[1]?.headers).toMatchObject({"X-Contractor-Embed":"1"});
 await act(async()=>root.render(<ContractorAdmin key="leads-embed" kind="leads" embed/>));
 expect(host.querySelector('input[type="password"]')).toBeNull();
 expect(host.querySelector("h1")?.textContent).toBe("Estimate requests");
 await act(async()=>root.render(<ContractorAdmin key="invoices-embed" kind="invoices" embed/>));
 expect(host.querySelector('input[type="password"]')).toBeNull();
 expect(host.querySelector("h1")?.textContent).toBe("Project billing");
 expect(fetchMock.mock.calls.filter(([,options])=>options?.method==="POST")).toHaveLength(1);
});
it("blocked cookies keep the login form visible instead of falsely unlocking",async()=>{
 fetchMock.mockImplementation(async()=>Response.json({authenticated:false},{status:401}));
 await act(async()=>root.render(<ContractorAdmin kind="tracking" embed/>));
 const input=host.querySelector("input")!;
 await act(async()=>{
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(input,"test-admin-token-1234567890");
  input.dispatchEvent(new Event("input",{bubbles:true}));
 });
 fetchMock.mockImplementation(async(_input:string,options?:RequestInit)=>Response.json({authenticated:options?.method==="POST"},{status:options?.method==="POST"?200:401}));
 await act(async()=>host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
 expect(host.textContent).toContain("browser blocked the sign-in cookie");
 expect(host.textContent).toContain("Unlock workspace");
});
it("activity selector requests website actions or payment records with separate explanations",async()=>{
 authenticated=true;
 await render("tracking");
 expect(fetchMock.mock.calls.some(([url])=>url==="/api/tracking?view=actions")).toBe(true);
 const select=host.querySelector('select[aria-label="Activity type"]')!;
 await act(async()=>{(select as HTMLSelectElement).value="payments";select.dispatchEvent(new Event("change",{bubbles:true}));});
 expect(fetchMock.mock.calls.some(([url])=>url==="/api/tracking?view=payments")).toBe(true);
 expect(host.textContent).toContain("these are not pixel events");
 expect(host.textContent).toContain("No payment records returned");
});
