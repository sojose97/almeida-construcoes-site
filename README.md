# Almeida Construções — projeto consolidado

Site mobile-first/PWA para Almeida Construções, Av. Hermes de Almeida, 89, Muriaé/MG. WhatsApp: (32) 2020-1300.

## O que está funcionando nesta versão

- Catálogo com **52 produtos** e preços/variações informados no histórico; lista Lincoln mais recente substitui a anterior.
- Tema escuro padrão, identidade amarela e preta, logo e foto da fachada originais.
- Busca, subcategorias, página de detalhes por produto, carrinho e escolha PIX, dinheiro ou cartão.
- Cálculo de 10% de desconto no PIX/dinheiro; cartão a preço normal, até 4x sem juros.
- Retirada ou entrega (endereço obrigatório para entrega), mensagem formatada ao WhatsApp e aviso de disponibilidade; frete a confirmar.
- Manifesto e cache PWA básicos. Arquivos estáticos em `dist/` podem ser hospedados com HTTPS.

## O que ainda não está funcionando

O histórico confirmou que o site anterior era um protótipo. Esta versão agora está vinculada ao projeto Supabase Almeida Construções e lê o catálogo público do banco. O banco já contém 52 produtos e 89 variações. Cadastro/login, criação de pedidos, painel administrativo protegido e carteira de cashback ainda serão ligados ao checkout; os botões de conta/pedidos permanecem informativos até essa etapa. A mensagem de WhatsApp ainda não cria reserva de saldo nem confirma uma venda.

As imagens individuais e as fichas técnicas verificadas ainda não foram recuperadas; só a logo e a fachada estavam disponíveis como anexos. Por isso a página de produto mostra os dados comerciais informados e não inventa especificações. Os ZIPs mencionados no histórico aparecem apenas como referências de conteúdo e não vieram como arquivos acessíveis nesta sessão.

## Próxima etapa de implementação real

Implementar as funções transacionais descritas em `docs/BACKEND.md`, trocar o checkout local por criação de pedido validada no servidor e concluir autenticação, administração e cashback. Só então habilitar as áreas de conta e pedidos.

## Uso local

Abra `dist/index.html` para ver o catálogo. A instalação PWA requer hospedagem HTTPS (ou localhost), pois navegadores não instalam aplicativos a partir de arquivo local.
