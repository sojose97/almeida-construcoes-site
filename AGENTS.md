# Instruções para continuidade

Preserve o catálogo ativo do Supabase (59 produtos na última auditoria) e seus preços; qualquer alteração comercial deve vir da loja. `dist/catalogo.js` é apenas fallback local e pode estar desatualizado. A Almeida é loja de materiais de construção em geral, embora o catálogo atual inclua estética automotiva. Preserve tema escuro e identidade amarela/preta.

Nunca apresente o protótipo estático como sistema com backend. Não use `localStorage` como fonte de verdade para pedidos ou cashback. No backend, calcule dinheiro em centavos; valide preço e disponibilidade pelo banco, nunca pelo navegador. Não exponha chaves secretas do Supabase.

Cashback padrão: 2% do valor final **efetivamente pago**, conforme alteração mais recente aprovada pela loja. Os preços PIX/dinheiro e cartão são definidos por produto; promoções e venda por quantidade seguem os preços salvos no banco. O saldo usado é reservado quando o pedido é criado, debitado apenas na confirmação da venda e devolvido no cancelamento; o novo crédito só surge após confirmação e é estornado se uma venda confirmada for cancelada. Faça tudo em transações no servidor, com autenticação e autorização administrativa verificadas pelo banco. Não crie pedidos duplicados quando a mesma tentativa for repetida.

Leia `docs/BACKEND.md` antes de iniciar a integração.
