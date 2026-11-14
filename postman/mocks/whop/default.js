// Behavioral stand-in built from docs/whop-api-contract.json (2026-11-12).
// Deliberately covers only the paths this template calls. It is not Whop.
const http = require('http');
http.createServer(async (req,res) => {
 const path = new URL(req.url,'http://mock').pathname;
 const body = req.body || {};
 const send = (status,data) => { res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data)); };
 if (path === '/__health') return send(200,{ok:true});
 if (path === '/__control' && req.method === 'POST') { await pm.state.set('whop.mode',body.mode || 'ok');await pm.state.set('whop.calls',[]);if(body.reset){await pm.state.set('whop.payment',null);await pm.state.set('whop.setup',null);await pm.state.set('whop.setupKeys',{});await pm.state.set('whop.setupCount',0);await pm.state.set('whop.member',null);await pm.state.set('whop.noteKeys',{});await pm.state.set('whop.noteCount',0);}return send(200,{ok:true}); }
 if(path==='/__note_count')return send(200,{count:(await pm.state.get('whop.noteCount'))||0});
 if (path === '/__setup_count') return send(200,{count:(await pm.state.get('whop.setupCount')) || 0});
 if (path === '/__calls') return send(200,(await pm.state.get('whop.calls')) || []);
 const calls = (await pm.state.get('whop.calls')) || [];calls.push({method:req.method,path,body,key:req.headers['idempotency-key'],injectKey:req.headers['x-whop-inject-key'],hasAuthorization:Boolean(req.headers.authorization)});await pm.state.set('whop.calls',calls);
 const mode = (await pm.state.get('whop.mode'));
 if (mode === 'html') {res.writeHead(502,{'Content-Type':'text/html'});return res.end('<h1>Bad gateway</h1>');}
 if (mode === 'busy') return send(429,{error:{message:'Too many requests'}});
 if (mode === 'unavailable') return send(503,{error:{message:'Unavailable'}});
 if (req.method === 'GET' && ['/api/v1/events','/api/v1/members','/api/v1/invoices'].includes(path)) {
  if(mode==='read-forbidden')return send(403,{error:{message:'Missing read permission'}});
  const query=new URL(req.url,'http://mock').searchParams;
  if(query.get('account_id')!=='biz_demo')return send(400,{error:{message:'Account required'}});
  if(path==='/api/v1/events' && (!query.get('from') || !query.get('to')))return send(400,{error:{message:'Time range required'}});
  const data=path==='/api/v1/events' ? [{id:'evt_test',event_time:'2026-11-13T00:00:00Z',event_name:'pixel.custom',custom_name:'service_viewed',path:'/services',value:149,currency:'usd',user:{email:'private@example.com'},person_id:'private_person'}] : path==='/api/v1/members' ? [{id:'mber_test',created_at:'2026-11-13T00:00:00Z',metadata:{roofing_source:'whop_roofing_website',roofing_full_name:'Test homeowner',roofing_service:'Inspection',roofing_address:'Sample address'}},{id:'mber_unrelated',metadata:{},display_name:'Not an estimate'}] : [{id:'invoice_test',number:'INV-001',status:'open',amount_due:{amount:'500.00',currency:'usd'},checkout_link:'javascript:alert(1)'}];
  return send(200,{data:mode==='empty'?[]:data,page_info:{has_next_page:mode==='page',end_cursor:'next_page'}});
 }
 if (req.method === 'POST' && path === '/api/v1/members') {
  if(mode==='member-forbidden')return send(403,{error:{message:'Missing member:manage permission'}});
  if(!body.account_id || !body.email)return send(400,{error:{message:'Invalid member'}});
  const member={id:'mber_lead01',metadata:{crm_owner:'preserve_me'},account_id:mode==='member-wrong-account'?'biz_other':body.account_id,user:mode==='member-no-user'?null:{id:'user_lead01'}};await pm.state.set('whop.member',member);return send(201,member);
 }
 if (req.method === 'POST' && path === '/api/v1/leads') return send(410,{error:{type:'gone',message:'Creating leads is no longer available. Use members.'}});
 if(req.method==='POST' && path==='/api/v1/members/mber_lead01/notes') {
  if(mode==='lead-forbidden')return send(403,{error:{message:'Missing member:manage'}});
  const keys=(await pm.state.get('whop.noteKeys'))||{};
  if(keys[req.headers['idempotency-key']])return send(200,keys[req.headers['idempotency-key']]);
  const note={id:'note_demo01',member_id:'mber_lead01',content:body.content,created_at:'2026-11-14T06:00:00Z'};
  keys[req.headers['idempotency-key']]=note;await pm.state.set('whop.noteKeys',keys);await pm.state.set('whop.noteCount',((await pm.state.get('whop.noteCount'))||0)+1);return send(201,note);
 }
 if(req.method==='GET' && path==='/api/v1/members/mber_lead01')return send(200,(await pm.state.get('whop.member')));
 if(req.method==='PATCH' && path==='/api/v1/members/mber_lead01') {
  if(mode==='index-unavailable')return send(503,{error:{message:'Unavailable'}});
  if(Object.values(body.metadata||{}).some(v=>typeof v==='string' && v.length>500))return send(400,{error:{message:'Metadata value too long'}});
  const member={...(await pm.state.get('whop.member')),metadata:body.metadata};await pm.state.set('whop.member',member);return send(200,member);
 }
 if (req.method === 'POST' && path === '/api/v1/payments') { if (!body.variant_id || !body.confirmation_token) return send(400,{error:{message:'Missing payment fields'}});const payment={id:'pay_demo01',account_id:body.account_id,variant_id:body.variant_id,line_items:[{variant_id:body.variant_id}],member_id:'mber_sample',payment_method_id:'payt_sample',metadata:body.metadata,status:'paid',client_secret:'pay_demo01_secret_test'};await pm.state.set('whop.payment',payment);return send(200,payment); }
 if (req.method === 'GET' && path === '/api/v1/payments/pay_demo01') {const payment = (await pm.state.get('whop.payment'));return payment ? send(200,{...payment,...(mode==='wrong-account'?{account_id:'biz_wrong'}:{}),...(mode==='pending'?{status:'pending'}:{}),...(mode==='refunded'?{substatus:'refunded'}:{}),...(mode==='billing-mismatch'?{status:'open',substatus:'failed',failure_message:'ZIP code 95014 is in CA, but the state entered is PA. Update the ZIP code or state so they match.'}:{}),...(mode==='missing-method'?{payment_method_id:null}:{}),...(mode==='no-consent'?{metadata:{...payment.metadata,card_save_consent:'false'}}:{})}) : send(404,{error:{message:'Not found'}});}
 if (req.method === 'POST' && path === '/api/v1/setup_intents') {
  if (!body.account_id || !body.payment_method_id || body.confirmation_token) return send(400,{error:{message:'Invalid existing-method setup'}});
  const keys=(await pm.state.get('whop.setupKeys')) || {};
  if(keys[req.headers['idempotency-key']])return send(200,keys[req.headers['idempotency-key']]);
  const setup={id:'sint_demo01',account_id:body.account_id,member_id:'mber_sample',payment_method_id:body.payment_method_id,metadata:body.metadata,status:mode==='setup-pending'?'processing':mode==='setup-action'?'requires_action':mode==='setup-canceled'?'canceled':'succeeded',client_secret:'sint_demo01_secret_test'};
  keys[req.headers['idempotency-key']]=setup;await pm.state.set('whop.setupKeys',keys);await pm.state.set('whop.setup',setup);await pm.state.set('whop.setupCount',((await pm.state.get('whop.setupCount'))||0)+1);return send(200,setup);
 }
 if(req.method==='GET' && path==='/api/v1/setup_intents/sint_demo01') {
  const setup=await pm.state.get('whop.setup');if(!setup)return send(404,{error:{message:'Unknown setup'}});
  return send(200,{...setup,...(mode==='setup-pending'?{status:'processing',payment_method_id:null}:{}),...(mode==='setup-action'?{status:'requires_action',payment_method_id:null}:{}),...(mode==='setup-canceled'?{status:'canceled',payment_method_id:null}:{}),...(mode==='setup-wrong-account'?{account_id:'biz_wrong'}:{}),...(mode==='setup-wrong-member'?{member_id:'mber_wrong'}:{}),...(mode==='setup-wrong-method'?{payment_method_id:'payt_wrong'}:{}),...(mode==='setup-wrong-payment'?{metadata:{...setup.metadata,deposit_payment_id:'pay_wrong'}}:{})});
 }
 if (req.method === 'POST' && path === '/api/v1/invoices') { if (!body.account_id || !body.items?.[0]?.variant?.initial_price) return send(400,{error:{message:'Invalid invoice'}});await pm.state.set('whop.invoice',{id:'pay_invoice01',status:'draft',...body});return send(200,{id:'pay_invoice01',status:'draft'}); }
 if (req.method === 'POST' && /^\/api\/v1\/invoices\/pay_invoice01\/(send|issue)$/.test(path)) { const invoice=(await pm.state.get('whop.invoice')); if(!invoice)return send(404,{error:{message:'Not found'}});return send(200,{id:invoice.id,status:'open',checkout_link:'https://sandbox.whop.com/checkout/example'}); }
 return send(501,{error:{message:'Path is outside this simulation contract'}});
}).listen(process.env.PORT || 4500);
