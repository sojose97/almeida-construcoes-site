# Auditoria do site Almeida Construções — 1º de outubro de 2026

## Resultado executivo

As rotinas transacionais do Supabase e os testes de permissão passaram nos cenários exercitados. Foram corrigidos a duplicação de pedidos em tentativas repetidas, a contabilização do cashback, a leitura pública do catálogo e a exposição de tabelas de dados pessoais. As operações administrativas de produto e variação foram testadas sem deixar dados de teste.

**O backend corrigido passou a servir o catálogo público, mas a publicação Cloudflare ainda precisa receber estes arquivos de frontend.** Antes dos ajustes, as chamadas REST falhavam porque uma policy pública consultava `profiles` depois que o acesso anônimo a essa tabela havia sido revogado; a chave publicável também era enviada indevidamente como JWT `Bearer`. O endpoint REST corrigido responde HTTP 200 com 59 produtos e 102 variações. O preview local atualizado também mostra 59 produtos; a página da Fita Crepe 765 exibe a faixa e, com 12 unidades selecionadas, calcula cartão R$ 6,10 e PIX/dinheiro R$ 5,60. O endereço `https://almeida-construcoes-catalogo.sojose97.chatgpt.site/` continua sendo uma publicação distinta e restrita ao proprietário. A publicação Cloudflare precisa receber o frontend integrado antes de considerar o teste público concluído.

Não é tecnicamente possível garantir “100% sem falhas”. A auditoria é uma fotografia das verificações feitas em 1º de outubro, e ainda existem limites operacionais listados abaixo.

## Estado observado no Supabase

- 59 produtos ativos e 102 variações ativas.
- Nenhuma das 102 variações ativas tem quantidade de estoque cadastrada. O site não impede venda por estoque real; disponibilidade continua sujeita à confirmação da loja.
- 11 pedidos existentes estavam cancelados; não havia pedido pendente ou confirmado. Nenhum pedido existente foi modificado durante os testes.
- Foram observados 4 lançamentos existentes na carteira.

## Testes concluídos

| Área | Verificações | Resultado |
|---|---|---|
| Catálogo | Página inicial, categorias, busca, produto, fetch REST e preço múltiplo na página do produto | API pública HTTP 200: 59 produtos e 102 variações. Preview local mostra o produto e a faixa; 12 unidades resultam nos dois preços configurados. A publicação Cloudflare ainda não usa o frontend corrigido. |
| Cadastro e autenticação | Senha correta, senha incorreta, e-mail ainda não confirmado, retorno de confirmação, token inválido/expirado, reenvio, cadastro sem sessão falsa e cabeçalho da chave publicável | 12 testes automatizados passaram. |
| Carrinho/checkout | Exige usuário autenticado, valida itens, opção PIX/dinheiro/cartão, entrega/retirada, cashback e repetição idempotente | As regras transacionais foram exercitadas em transação revertida; não foi enviado WhatsApp nem efetuada cobrança. |
| Preço | Preço à vista, promoção proporcional no cartão, preço por faixa e repetição da mesma variação | Valores recalculados pelo banco; para a Fita Crepe 765, a faixa cadastrada é cartão R$ 6,10 e PIX/dinheiro R$ 5,60 a partir de 12 unidades. |
| Pedidos/cashback | Reserva, cancelamento pendente, confirmação, crédito de 2%, cancelamento posterior e chamadas repetidas | Operações idempotentes; saldo de teste voltou ao valor inicial após rollback. |
| Administração de catálogo | Criar, editar preços/descrição/categoria, faixa de quantidade, desativar e excluir produto e variação | Passou com papel administrativo dentro de transação revertida; nenhum produto ou variação de teste permaneceu. |
| Acesso administrativo | Cliente não pode elevar papel, invocar ação de administrador nem ler perfil/pedido/carteira alheios | As verificações de banco passaram. A consulta administrativa de clientes depende do papel admin. |
| Acesso sem sessão | Área administrativa e minha conta | Admin mostra somente o login e mantém o painel oculto; Minha Conta mostra o formulário de acesso; sem erros de console na área admin. |
| Smoke test visual local | Catálogo, preços por faixa, cashback zerado, checkout sem login e tela inicial do admin | 59 produtos carregaram. Com 12 fitas crepe 765, o detalhe mostrou cartão R$ 6,10 e PIX/dinheiro R$ 5,60; no carrinho, cashback zerado ficou desativado; tentar finalizar sem sessão abriu o login sem criar pedido; o painel mostrou só o formulário de acesso. Não houve erro ou aviso no console do painel. |
| Qualidade do código | 12 testes de autenticação, 2 contratos do editor de produto, 3 contratos da API pública Supabase, 2 contratos do checkout sem fallback e telas de conta, sintaxe JavaScript, diff whitespace | Passou (19 testes automatizados). |

Os testes com dados de pedido e produto ocorreram dentro de transações terminadas em `ROLLBACK`. O contador sequencial do número público do pedido pode avançar mesmo com rollback; nenhum pedido de teste ficou gravado.

## Correções aplicadas

- O checkout recebe uma chave idempotente por tentativa e o mesmo pedido não é criado duas vezes se o navegador repetir a requisição.
- A reserva de cashback é serializada por cliente para reduzir risco de dois pedidos gastarem o mesmo saldo.
- Ao confirmar, cashback reservado é encerrado sem subtrair o saldo duas vezes; o crédito é calculado como 2% do valor que restou efetivamente pago.
- Ao cancelar pedido pendente, a reserva é liberada. Ao cancelar venda confirmada, o cashback usado é devolvido e o cashback ganho é estornado.
- `anon` perdeu `SELECT` em perfis, pedidos, itens e carteira, além de `EXECUTE` nas funções de checkout/admin. As tabelas têm RLS.
- As policies de leitura do catálogo foram separadas por papel: `anon` lê somente produtos/variações ativos e não precisa de privilégio em `profiles`; leitura administrativa continua condicionada à role do usuário. O teste REST comprovou leitura pública sem acesso anônimo a perfis, pedidos ou carteira (HTTP 401 nessas três tabelas).
- Foram adicionados cabeçalhos básicos de segurança para a publicação Cloudflare Pages.
- O bucket público de fotos agora impõe no servidor o limite de 6 MB e os tipos JPG/JPEG, PNG e WebP, alinhados ao formulário do painel.
- Removi o caminho legado que abria o WhatsApp diretamente sem registrar o pedido autenticado e as telas provisórias de conta/pedidos que diziam que o backend não existia. Se o módulo autenticado não carregar, o checkout fica bloqueado em vez de ignorar login e registro no banco.
- A venda múltipla ficou com os dois preços e com a frase curta solicitada; o card, carrinho e detalhe usam as faixas por quantidade.
- A criação de produto no painel e o editor de preços estavam usando identificadores diferentes para um produto novo. Corrigi o identificador; agora o handler de preços recebe também o produto recém-criado e salva os preços à vista e as faixas.

## Achados de segurança e limites pendentes

1. **Proteção contra senhas vazadas desativada.** O Security Advisor da Supabase relata isso como alerta. A documentação atual informa que a consulta a senhas comprometidas está disponível no plano Pro ou superior; a conta já havia informado que não tem Pro. Aumentar o mínimo de senha ajuda, mas não substitui essa proteção. [Documentação oficial de segurança de senha](https://supabase.com/docs/guides/auth/password-security).
2. **Quatro avisos sobre funções `SECURITY DEFINER` executáveis por usuários autenticados.** São funções de checkout/estado de pedido necessárias ao fluxo. Elas usam `search_path = ''`, não estão concedidas ao papel anônimo, exigem identidade autenticada e verificam a role administrativa antes de confirmar/cancelar. O alerta é mantido visível porque esses endpoints privilegiados exigem revisão contínua. [Boas práticas oficiais para funções](https://supabase.com/docs/guides/database/functions).
3. **Estoque não está configurado.** Variações sem `stock_quantity` não podem ser validadas contra inventário. A loja precisa cadastrar quantidades e manter o estoque atualizado para impedir pedidos acima do disponível.
4. **O site não cobra nem devolve pagamento.** O pedido abre WhatsApp e o pagamento é combinado fora do site. Ao cancelar uma venda confirmada, a carteira é estornada, mas a devolução efetiva de PIX/cartão/dinheiro deve ser feita pela loja no meio em que recebeu.
5. **Avisos de desempenho do Advisor:** quatro pares de policies permissivas de leitura (admin e proprietário) em tabelas de conta/pedido, além de um índice ainda não usado. Não indicam acesso anônimo: RLS continua ativa e o acesso observado é filtrado por usuário/admin. Podem ser reavaliados com mais tráfego.
6. `private.admin_email_allowlist` aparece como RLS habilitada sem policy. Ela está no schema privado e não tem acesso do cliente; o aviso é informativo e intencional.
7. O bucket `product-images` é público para leitura das fotos do catálogo e só permite gravação por administradores. O servidor agora restringe cada upload a 6 MB e JPG/PNG/WebP.

## Próximo passo operacional

Antes de receber clientes, publique esta versão integrada na Cloudflare e repita no endereço público o teste de detalhe do produto, venda múltipla, carrinho e checkout autenticado. A API Supabase e o preview local já passaram na leitura do catálogo; a versão pública segue pendente da atualização do código. O endereço do Sites com final `chatgpt.site` não substitui a publicação pública porque está restrito ao proprietário. Depois, cadastre estoque real e avalie o alerta de proteção de senhas conforme o plano Supabase.

## Auditoria funcional complementar

Em 1º de outubro, a versão pública foi percorrida novamente. Os 59 produtos abriram com foto, variação, quantidade, preço e botão de compra; as 15 categorias retornaram produtos; a aba Promoção iniciou selecionada; e o carrinho foi testado com alteração de quantidade, PIX, dinheiro, cartão, retirada, entrega, cashback zerado e bloqueio de checkout sem sessão. A tentativa sem login abriu o acesso da conta e não criou pedido nem abriu um pedido direto no WhatsApp. As 59 páginas individuais foram verificadas sem página de produto ausente.

Foram encontradas e corrigidas localmente três inconsistências de apresentação: o título do catálogo não acompanhava a aba Promoção; a política da página de um item promocional não reconhecia o campo calculado de promoção; e o painel administrativo mostrava estados, pagamento e recebimento em identificadores internos em inglês. O cache do PWA foi renovado para incluir os arquivos corrigidos. Os 31 testes funcionais/contratuais locais e a checagem de sintaxe JavaScript passaram após as correções.

A revisão de segurança confirmou RLS ativa, leitura anônima somente do catálogo ativo, ausência de leitura anônima de perfis, pedidos e carteira, ausência de execução anônima das RPCs transacionais e `search_path` vazio nas funções `SECURITY DEFINER`. Permanecem os avisos já documentados: proteção contra senhas vazadas indisponível no plano atual, funções transacionais `SECURITY DEFINER` intencionalmente executáveis por usuários autenticados e estoque ainda sem quantidades cadastradas.

O envio dos commits desta rodada ao GitHub/Cloudflare ficou pendente porque o ambiente bloqueou a conexão HTTPS e a revisão automática recusou a tentativa escalada por limite de uso. Portanto, as correções estão prontas e testadas na pasta local; o endereço público continua aguardando a publicação pelo fluxo autorizado.
