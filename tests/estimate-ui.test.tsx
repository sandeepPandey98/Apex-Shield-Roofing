import React, {act} from "react";
import {createRoot} from "react-dom/client";
import {expect,it,vi} from "vitest";
import {EstimateForm} from "../components/EstimateForm";
import {trackCustomEvent} from "../lib/tracking";
vi.mock("../lib/tracking",()=>({trackCustomEvent:vi.fn()}));
it("estimate success and its pixel event require a successful save; a later failure clears the old success",async()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 const host=document.createElement("div");document.body.append(host);const root=createRoot(host);
 const fetchMock=vi.fn().mockResolvedValueOnce(Response.json({error:"Could not save estimate"},{status:502})).mockResolvedValueOnce(Response.json({success:true,demo:false,storage:"whop_members"})).mockResolvedValueOnce(Response.json({error:"Could not save estimate"},{status:502}));
 vi.stubGlobal("fetch",fetchMock);
 try {
  await act(async()=>root.render(<EstimateForm/>));
  const form=host.querySelector("form")!;
  const submit=async()=>act(async()=>{form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});
  await submit();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Could not save estimate");
  expect(trackCustomEvent).not.toHaveBeenCalled();
  await submit();
  expect(host.querySelector('[role="status"]')?.textContent).toContain("Request received");
  expect(trackCustomEvent).toHaveBeenCalledTimes(1);
  await submit();
  expect(host.querySelector('[role="status"]')).toBeNull();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Could not save estimate");
  expect(trackCustomEvent).toHaveBeenCalledTimes(1);
 }finally{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();}
});
