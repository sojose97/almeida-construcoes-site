# Implementação do backend e cashback

## Estado atual e fonte

O histórico original está no ChatGPT, tarefa `6aa9c43b-6ef8-83e9-8988-8c5b1f863100` (Criar catálogo via WhatsApp). O catálogo está transcrito em `dist/catalogo.js`. Foram recuperados logo e fachada; arquivos ZIP e imagens individuais referenciados no histórico não estavam disponíveis como anexos.

## Modelo a implementar no Supabase

`products`: id, marca, nome, subcategoria, descrição/fonte técnica, ativo. `variants`: id, product_id, nome, preço_centavos, estoque. `profiles`: user_id, nome, telefone, endereço. `orders`: id, user_id, status (pendente, confirmada, cancelada), pagamento, recebimento, endereço, subtotal_centavos, desconto_centavos, cashback_reservado_centavos, valor_a_pagar_centavos, valor_final_confirmado_centavos, data. `order_items`: order_id, variant_id, nome/preço/quantidade congelados no momento do pedido. `wallet_entries`: user_id, order_id, tipo (crédito, débito, reserva, liberação), centavos, data. `admins`: user_id, papel. O saldo disponível deve ser calculado dos lançamentos, com reservas subtraídas.

Ative RLS em todas as tabelas expostas. Clientes só leem seu perfil, pedidos e extrato. O papel administrativo deve residir em tabela protegida ou `app_metadata` controlado pelo servidor, nunca em `user_metadata`. O navegador usa chave publicável; jamais `service_role`.

## Fluxo transacional obrigatório

1. `create_order` exige sessão autenticada, recebe IDs de variações/quantidades, forma de pagamento, recebimento e valor de cashback desejado. Dentro da transação, busca preços atuais e bloqueia a carteira do usuário para evitar reserva simultânea. Calcula subtotal; desconto = arredondamento do subtotal × 10% só para PIX/dinheiro; máximo resgatável = menor entre saldo disponível e subtotal após desconto. Reserva o valor usado, grava itens e pedido pendente. Retorna o número e os totais oficiais para montar a mensagem WhatsApp.
2. `confirm_order` só pode ser chamado por administrador autorizado. Confirma o valor final efetivamente pago, compatível com os itens e eventuais ajustes realizados na venda. Debita a reserva uma vez, grava a confirmação e credita arredondamento de **1% do valor final efetivamente pago** uma vez. Repetição da operação deve ser idempotente.
3. `cancel_order` só pode ser chamado por administrador autorizado (ou cliente, se a regra de cancelamento permitir). Libera a reserva uma vez, sem gerar crédito. Operações concorrentes de confirmar/cancelar devem bloquear a linha do pedido e não executar dois resultados.

Exemplo: R$ 200,00 no PIX → desconto R$ 20,00 → usa R$ 30,00 de cashback → paga R$ 150,00 → após confirmação recebe R$ 1,50. No cartão, R$ 200,00 com R$ 50,00 de cashback → paga R$ 150,00 → recebe R$ 1,50. Se o pedido for cancelado, a reserva volta ao saldo disponível.

Antes de habilitar o frontend conectado, testar criação concorrente com saldo limitado, alteração de preço no cliente, confirmação repetida, cancelamento repetido, confirmação versus cancelamento simultâneos e acesso indevido a pedidos/carteiras de outros usuários.
