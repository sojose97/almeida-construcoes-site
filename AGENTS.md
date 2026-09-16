# Instruções para continuidade

Preserve o catálogo de 52 produtos e os preços de `dist/catalogo.js`; qualquer alteração comercial deve vir da loja. A Almeida é loja de materiais de construção em geral, embora o primeiro catálogo seja estética automotiva. Preserve tema escuro e identidade amarela/preta.

Nunca apresente o protótipo estático como sistema com backend. Não use `localStorage` como fonte de verdade para pedidos ou cashback. No backend, calcule dinheiro em centavos; valide preço e disponibilidade pelo banco, nunca pelo navegador. Não exponha chaves secretas do Supabase.

Cashback padrão: 1% do valor final **efetivamente pago**. PIX/dinheiro recebe 10% de desconto antes do cashback resgatado; cartão não recebe desconto. O saldo usado é reservado quando o pedido é criado, debitado apenas na confirmação da venda e liberado no cancelamento. O novo crédito só surge após confirmação. Faça tudo em transações no servidor, com autenticação e autorização administrativa verificadas pelo banco.

Leia `docs/BACKEND.md` antes de iniciar a integração.
