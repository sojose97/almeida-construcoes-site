const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('dist/auth-storefront.js','utf8');
function setup({hash='',search='',response={}}={}){
  const nodes=new Map(),storage=new Map(),requests=[];
  function node(id){if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',innerHTML:'',classList:{add(){},remove(){},toggle(){}},setAttribute(){},close(){this.closed=true},showModal(){this.open=true}});return nodes.get(id)}
  for(const id of ['#account','#orders','#account-dialog','#account-view','#orders-dialog','#customer-message','#customer-email','#customer-password','#account-name','#account-phone','#account-address','#account-balance','#save-account','#signout'])node(id);
  node('#customer-email').value='test@example.com';node('#customer-password').value='test-password';
  const location={hash,search,pathname:'/',origin:'https://almeida-construcoes.pages.dev'};
  const context={URLSearchParams,Date,JSON,Number,Math,Error,Object,console,location,
    ALMEIDA_SUPABASE_URL:'https://test.supabase.co',ALMEIDA_SUPABASE_KEY:'test-public',
    localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    history:{replaceState(a,b,url){location.hash='';location.search=url.includes('?')?'?'+url.split('?')[1]:''}},
    document:{title:'Test',querySelector:id=>nodes.get(id)||null,querySelectorAll:()=>[],createElement:()=>node('#auth-notice'),body:{prepend(){},insertAdjacentHTML(){}}},
    setTimeout(){},money:()=>'',
    fetch:async(url,options={})=>{requests.push({url,options});const result=typeof response==='function'?response(url,options):response;return{ok:result.ok!==false,status:result.status||200,text:async()=>JSON.stringify(result.body||{}),json:async()=>result.body||{}}}
  };
  // Expose the real functions only inside the test VM, without changing production exports.
  vm.runInNewContext(source.replace(/\}\)\(\);\s*$/,'globalThis.testAuth={auth,account,authReady};})();'),context);
  return{context,node,nodes,storage,requests,ready:context.testAuth.authReady};
}
const tokens={access_token:'fixture-access',refresh_token:'fixture-refresh',expires_in:3600,user:{id:'fixture-user',email_confirmed_at:'2026-09-18T01:00:00Z'}};
test('REST password success saves top-level tokens instead of showing false confirmation error',async()=>{
 const h=setup({response:{body:tokens}});await h.ready;await h.context.testAuth.auth({preventDefault(){}},false);
 assert.equal(JSON.parse(h.storage.get('almeida-customer-session')).access_token,tokens.access_token);
 assert.equal(h.node('#account').textContent,'Minha conta ✓');assert.equal(h.node('#account-dialog').closed,true);
});
test('backend email_not_confirmed error does not create a session',async()=>{
 const h=setup({response:{ok:false,status:400,body:{error_code:'email_not_confirmed',msg:'Email not confirmed'}}});await h.ready;
 await h.context.testAuth.auth({preventDefault(){}},false);assert.equal(h.storage.size,0);assert.match(h.node('#customer-message').textContent,/Confirme seu e-mail/);
});
test('wrong password retains the correct backend error',async()=>{
 const h=setup({response:{ok:false,status:400,body:{error_code:'invalid_credentials'}}});await h.ready;await h.context.testAuth.auth({preventDefault(){}},false);
 assert.match(h.node('#customer-message').textContent,/senha incorretos/);assert.equal(h.storage.size,0);
});
test('confirmation callback validates token with server then opens connected account',async()=>{
 const h=setup({hash:'#access_token=fixture-access&refresh_token=fixture-refresh&type=signup',response:url=>({body:url.includes('/auth/v1/user')?tokens.user:[]})});await h.ready;
 assert.ok(h.storage.has('almeida-customer-session'));assert.equal(h.context.location.hash,'');assert.match(h.node('#account-view').innerHTML,/Você está conectado/);
 assert.match(h.node('#auth-notice').textContent,/E-mail confirmado/);
});
test('expired email link reports expiry without persisting tokens',async()=>{
 const h=setup({hash:'#error=access_denied&error_code=otp_expired&error_description=Expired'});await h.ready;
 assert.equal(h.storage.size,0);assert.match(h.node('#auth-notice').textContent,/expirou/);assert.equal(h.requests.length,0);
});
test('untrusted or expired callback token is not saved as logged in',async()=>{
 const h=setup({hash:'#access_token=bad&refresh_token=bad',response:{ok:false,status:401,body:{msg:'Invalid JWT'}}});await h.ready;
 assert.equal(h.storage.size,0);assert.match(h.node('#auth-notice').textContent,/Invalid JWT/);
});
test('resend uses REST redirect query and does not claim confirmed delivery',async()=>{
 const h=setup();await h.ready;
 for(const id of ['#customer-login','#resend-confirmation','#customer-signup','#show-signup','#show-customer-password','#show-signup-password','#customer-phone'])h.node(id);
 h.context.testAuth.account();await h.node('#resend-confirmation').onclick();
 const request=h.requests[0];assert.equal(new URL(request.url).searchParams.get('redirect_to'),'https://almeida-construcoes.pages.dev/');
 assert.deepEqual(JSON.parse(request.options.body),{type:'signup',email:'test@example.com'});assert.match(h.node('#customer-message').textContent,/Se o cadastro/);
});
test('token hash confirmation is exchanged once and removed from URL',async()=>{
 const h=setup({search:'?token_hash=fixture-hash&type=email',response:url=>({body:url.endsWith('/verify')?tokens:url.includes('/auth/v1/user')?tokens.user:[]})});await h.ready;
 assert.equal(h.requests.filter(r=>r.url.endsWith('/verify')).length,1);assert.equal(h.context.location.search,'');assert.ok(h.storage.has('almeida-customer-session'));
});
test('query string callback errors survive URL cleanup',async()=>{
 const h=setup({search:'?error=access_denied&error_code=otp_expired'});await h.ready;assert.match(h.node('#auth-notice').textContent,/expirou/);
});
test('signup awaiting confirmation does not create a fake session',async()=>{
 const h=setup({response:{body:{id:'new-user',email:'test@example.com'}}});await h.ready;
 for(const id of ['#customer-signup-email','#customer-signup-password','#customer-name','#customer-phone','#customer-birth-date','#customer-street','#customer-neighborhood','#customer-number','#customer-reference'])h.node(id).value='test';
 await h.context.testAuth.auth({preventDefault(){}},true);assert.equal(h.storage.size,0);assert.match(h.node('#customer-message').textContent,/Confira seu e-mail/);
 assert.equal(new URL(h.requests[0].url).searchParams.get('redirect_to'),'https://almeida-construcoes.pages.dev/');
});
