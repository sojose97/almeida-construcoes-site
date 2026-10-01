# Backend Supabase: estado e regras operacionais

## Estado conectado

O site usa o projeto Supabase Almeida Construções. O catálogo público lê produtos e variações ativas do banco; autenticação, perfis, pedidos, itens e carteira também ficam no banco. Todas as tabelas expostas têm RLS. O navegador usa a chave publicável e tokens de sessão; uma chave `service_role` nunca deve ser embutida no site.

Tabelas principais: `products`, `product_variants`, `profiles`, `orders`, `order_items` e `wallet_entries`. `private.admin_email_allowlist` é uma tabela interna sem policy de cliente; a role administrativa persistida em `profiles.role` só pode ser atribuída de forma controlada.

## Preço validado no servidor

O cliente envia IDs de variação, quantidade, meio de pagamento, recebimento, endereço e cashback solicitado. `place_order` lê preços e promoções do banco, normaliza IDs repetidos, valida produto/quantidade/estoque informado, serializa reservas por cliente e congela preço e nome em `order_items`. A chave de checkout evita duplicar um pedido se o navegador repetir a mesma solicitação.

Preços regulares de cartão e PIX/dinheiro são separados por variação. A promoção incide sobre o valor à vista e produz o preço proporcional no cartão. Uma faixa de venda múltipla substitui ambos os preços unitários quando a quantidade mínima é atingida. Não existe desconto geral de 10%.

## Fluxo de pedido e cashback

1. Checkout só prossegue com uma sessão autenticada. A função valida o carrinho e cria pedido `pending`; o navegador abre a conversa de WhatsApp depois da resposta do banco. O WhatsApp não processa pagamento.
2. O cashback pedido é reservado enquanto o pedido fica pendente. Se cancelado nesse estado, a reserva é liberada.
3. `admin_set_order_status` e seu endpoint compatível `admin_set_order_status_v2` exigem `profiles.role = 'admin'` dentro do banco. A confirmação grava o valor pago, encerra a reserva, debita o cashback utilizado e credita 2% do valor restante efetivamente pago, uma vez.
4. Se uma venda confirmada for cancelada, o cashback usado é devolvido e o cashback ganho é estornado. Reembolso de pagamento por PIX/dinheiro/cartão é uma ação externa da loja.

As funções privilegiadas usam `SECURITY DEFINER`, `search_path = ''`, nomes de schema explícitos, e verificam autenticação/papel antes de alterar dados. Isso é necessário para executar a transação sobre tabelas com RLS; as funções não são concedidas ao papel `anon`.

## Migrações

- `20260930_quantity_prices.sql`: colunas/faixas de preços unitários por quantidade.
- `20261001_checkout_security_idempotency_cashback.sql`: idempotência do checkout, reserva/cancelamento corretos do cashback e retirada de leitura anônima de dados pessoais.

Ambas refletem alterações aplicadas ao banco em produção. Execute uma migração antes de publicar frontend que dependa das novas colunas ou assinaturas RPC.
