# Almeida Construções

Catálogo mobile-first com identidade preta e amarela, página individual por produto e suporte a instalação como PWA. A pasta publicada é `dist/`; o projeto usa HTML/CSS/JavaScript estático e Supabase para autenticação, catálogo, pedidos, clientes e carteira.

## Funcionalidades

- Catálogo conectado ao Supabase. No banco consultado em 1º de outubro de 2026 há 59 produtos ativos e 102 variações ativas.
- Busca, categorias, promoções, fotos e páginas individuais com descrição, benefícios, aplicação, modo de uso e durabilidade quando informada.
- Preços por produto e variação: preço cheio/cartão, PIX/dinheiro, promoção e faixas de venda múltipla com preços separados para cartão e PIX/dinheiro.
- Carrinho com edição de quantidades, seleção de pagamento e entrega/retirada, confirmação de revisão e saldo de cashback.
- Checkout exige conta autenticada e cria o pedido no banco antes de abrir a conversa do WhatsApp. A loja confirma ou cancela pelo painel; o pagamento em si é combinado fora do site.
- Conta de cliente com cadastro, dados e endereço, pedidos, favoritos e carteira.
- Painel administrativo protegido com edição e criação de produtos, variações e fotos, além de áreas separadas de produtos, pedidos e clientes.
- Cashback de 2% sobre o valor final efetivamente pago, creditado após confirmação. Cashback usado fica reservado em pedido pendente; é debitado na confirmação e liberado no cancelamento. Ao cancelar uma venda confirmada, os lançamentos da carteira são estornados.
- PWA com nome Almeida Construções, tema escuro e arquivos estáticos prontos para hospedagem HTTPS.

## Regras de preço e carteira

Não há desconto geral automático de 10%. O preço no PIX/dinheiro é informado por variação; promoções usam esse preço como base e o preço no cartão é recalculado proporcionalmente. As faixas de venda múltipla têm preço unitário próprio para cada meio de pagamento. O backend valida e recalcula o total usando os preços atuais do banco.

O cashback é calculado sobre o valor efetivamente pago depois do preço do meio de pagamento e do cashback resgatado. A operação transacional é idempotente. Cancelamento de um pedido pago fora do site ainda exige que a loja faça separadamente qualquer reembolso no meio de pagamento.

## Estrutura e execução

- `dist/`: arquivos estáticos servidos ao público.
- `docs/migrations/`: migrações SQL versionadas para as funções e estruturas do Supabase.
- `docs/BACKEND.md`: regras atuais de autenticação, pedidos e carteira.
- `docs/AUDITORIA_2026-10-01.md`: escopo, verificações, achados e limitações da auditoria.
- `tests/`: testes de autenticação, contrato do editor de produtos e uso correto das chaves do Supabase.

Abra `dist/index.html` por um servidor local para testar. A instalação PWA requer HTTPS ou `localhost`. As configurações de projeto usam apenas a chave publicável do Supabase; nunca coloque uma chave `service_role` no frontend.

## Segurança e operação

RLS está habilitada nas tabelas expostas. Clientes podem consultar os próprios dados, pedidos e lançamentos; funções administrativas verificam o papel no servidor. O estoque não está sendo controlado: as 102 variações ativas estão sem quantidade informada, e o site deve continuar comunicando disponibilidade sujeita à confirmação da loja até o preenchimento dos estoques. Leia a auditoria antes de iniciar as vendas.
