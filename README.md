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

O histórico confirmou que o site anterior era um protótipo. Esta versão **não** possui projeto Supabase vinculado, cadastro/login, banco de produtos, pedidos registrados, painel administrativo protegido ou carteira de cashback. Os botões de conta/pedidos informam isso claramente. A mensagem de WhatsApp não cria reserva de saldo nem confirma uma venda.

As imagens individuais e as fichas técnicas verificadas ainda não foram recuperadas; só a logo e a fachada estavam disponíveis como anexos. Por isso a página de produto mostra os dados comerciais informados e não inventa especificações. Os ZIPs mencionados no histórico aparecem apenas como referências de conteúdo e não vieram como arquivos acessíveis nesta sessão.

## Próxima etapa de implementação real

Criar/obter acesso a um projeto Supabase, implementar as tabelas e funções transacionais descritas em `docs/BACKEND.md`, carregar o catálogo e trocar o checkout local por criação de pedido validada no servidor. Só então habilitar login, pedidos, administração e cashback. Em 15/09/2026, a conexão Supabase listou zero projetos acessíveis nesta sessão.

## Uso local

Abra `dist/index.html` para ver o catálogo. A instalação PWA requer hospedagem HTTPS (ou localhost), pois navegadores não instalam aplicativos a partir de arquivo local.
