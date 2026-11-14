// Local stand-in based on Resend POST /emails and documented idempotency behavior.
// https://resend.com/docs/api-reference/emails/send-email
// https://resend.com/docs/dashboard/emails/idempotency-keys
const http=require('http');
http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://mock').pathname;
 const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 if(path==='/__control'){await pm.state.set('resend.calls',[]);await pm.state.set('resend.mode',req.body.mode||'ok');if(req.body.reset){await pm.state.set('resend.keys',{});await pm.state.set('resend.count',0);}return send(200,{ok:true});}
 if(path==='/__calls')return send(200,{calls:await pm.state.get('resend.calls')||[],count:await pm.state.get('resend.count')||0});
 if(path!=='/emails'||req.method!=='POST')return send(501,{message:'Not covered by this stand-in'});
 const body=req.body||{};const key=req.headers['idempotency-key'];const calls=await pm.state.get('resend.calls')||[];
 calls.push({body,key});await pm.state.set('resend.calls',calls);
 if(await pm.state.get('resend.mode')==='reject')return send(403,{message:'Sender domain is not verified'});
 if(await pm.state.get('resend.mode')==='html'){res.writeHead(502,{'Content-Type':'text/html'});return res.end('<h1>Unavailable</h1>');}
 if(!req.headers.authorization?.startsWith('Bearer re_test')||!body.from||!body.to?.[0]||!body.subject||!body.html||!body.text||!key)return send(422,{message:'Invalid request'});
 const keys=await pm.state.get('resend.keys')||{};
 if(keys[key]){if(keys[key].body!==JSON.stringify(body))return send(409,{message:'Different request for existing key'});return send(200,{id:keys[key].id});}
 const count=(await pm.state.get('resend.count')||0)+1;await pm.state.set('resend.count',count);
 const id=`email_test_${count}`;keys[key]={id,body:JSON.stringify(body)};await pm.state.set('resend.keys',keys);return send(200,{id});
}).listen(process.env.PORT);
