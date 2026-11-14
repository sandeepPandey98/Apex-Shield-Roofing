import React, {act} from "react";
import {createRoot} from "react-dom/client";
import {expect,it,vi} from "vitest";
import {ContractorDemoPanel} from "../components/ContractorDemoPanel";
it("verification errors preserve the draft reference for a retry and refresh the invoice list",async()=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
 const host=document.createElement("div");document.body.append(host);const root=createRoot(host);const updated=vi.fn();
 const mock=vi.fn().mockResolvedValueOnce(Response.json({error:"Whop requires business verification. Your draft is saved.",code:"invoice_account_verification_required",invoiceId:"pay_savedDraft"},{status:409})).mockResolvedValueOnce(Response.json({success:true,invoice:{id:"pay_savedDraft",status:"open",total:{amount:"12990.00",currency:"usd"}}}));
 vi.stubGlobal("fetch",mock);
 try{
  await act(async()=>root.render(<ContractorDemoPanel embedded authenticatedSession onInvoiceUpdated={updated}/>));
  (host.querySelector('input[name="email"]') as HTMLInputElement).value="demo@example.com";
  const submit=async()=>act(async()=>{host.querySelector("form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});
  await submit();
  expect(host.textContent).toContain("Retry sending saved draft");expect(host.textContent).toContain("Complete Whop verification");expect(updated).toHaveBeenCalledTimes(1);
  const street=host.querySelector('input[name="billingLine1"]') as HTMLInputElement;
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!.call(street,"456 Oak Street");street.dispatchEvent(new Event("input",{bubbles:true}));});
  await submit();
  expect(JSON.parse(mock.mock.calls[1][1].body).billingAddress.line1).toBe("456 Oak Street");
  expect(JSON.parse(mock.mock.calls[1][1].body).invoiceId).toBe("pay_savedDraft");
  expect(host.querySelector('[role="alert"]')).toBeNull();expect(host.querySelector('[role="status"]')?.textContent).toContain("open");expect(updated).toHaveBeenCalledTimes(2);expect(host.textContent).toContain("Total including tax: $12,990.00");
 }finally{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();}
});
