(function(){
const sessionKey='almeida-customer-session';
document.querySelector('#orders')?.remove();
const account=document.querySelector('#account');
if(!account)return;
const openLogin=account.onclick;
account.onclick=()=>{try{const session=JSON.parse(localStorage.getItem(sessionKey)||'null');if(session?.access_token){location.href='conta.html';return}}catch{}if(openLogin)openLogin.call(account)};
})();
