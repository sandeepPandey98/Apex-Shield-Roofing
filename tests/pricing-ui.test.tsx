import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import {RoofingSite} from '../components/RoofingSite';
import {trackCustomEvent} from '../lib/tracking';
vi.mock('../lib/tracking',()=>({trackCustomEvent:vi.fn()}));
vi.mock('../components/WhopCheckoutModal',()=>({WhopCheckoutModal:()=>null}));
it.each([['Book an inspection',149,false],['Book a repair',399,false],['Reserve my replacement',500,true]])('booking %s sends Whop monetary fields without reporting a purchase',async(label,value,deposit)=>{
 (globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;vi.clearAllMocks();
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 try {
  await act(async()=>root.render(<RoofingSite/>));
  const button=[...host.querySelectorAll('button')].find(b=>b.textContent?.trim()===label)!;
  expect(button).toBeDefined();await act(async()=>button.click());
  expect(trackCustomEvent).toHaveBeenCalledWith('service_viewed',expect.objectContaining({value,currency:'USD'}));
  if(deposit)expect(trackCustomEvent).toHaveBeenCalledWith('deposit_started',expect.objectContaining({value:500,currency:'USD'}));
  expect(vi.mocked(trackCustomEvent).mock.calls.some(([name])=>(name as string)==='purchase')).toBe(false);
  for(const [,payload] of vi.mocked(trackCustomEvent).mock.calls){expect(payload).not.toHaveProperty('price');expect(payload).not.toHaveProperty('amount');}
 }finally {await act(async()=>root.unmount());host.remove();}
});
