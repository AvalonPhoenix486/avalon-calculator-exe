# Avalon Calculator

Calculadora simples, tematizada com a identidade visual do cristal fornecido.
Projeto **independente** — não usa, referencia nem depende do código-fonte do
Avalon Toolkit. O cristal foi usado apenas como referência visual/conceitual.

---

## Tecnologia escolhida: **Tauri 2.0**

Pesquisei as alternativas pedidas (Flutter, .NET MAUI, Kotlin Multiplatform,
React Native, Tauri) na documentação atual. Tauri 2.0 está estável desde
outubro/2024 (versão mais recente confirmada: v2.10.1, março/2026) e é o
único item da lista pensado desde a origem para **um único frontend web
gerando desktop (Windows/macOS/Linux) e mobile (Android/iOS)** a partir da
mesma base de HTML/CSS/JS, com binários muito menores que Electron/MAUI.

Por que Tauri e não os outros:
- **Flutter / KMP / React Native**: exigem escrever a UI em Dart/Kotlin/JSX
  com um motor de renderização próprio — mais pesado para um app tão simples
  e menos natural para reaproveitar a lógica como um único arquivo JS puro.
- **.NET MAUI**: gera Windows nativamente bem, mas Android exige toda a
  cadeia .NET+Java/Kotlin e o resultado tende a ser maior; a proposta pedia
  "engenharia proporcional" a uma calculadora simples.
- **Tauri**: o app inteiro é HTML/CSS/JS (o que já é ideal para uma
  calculadora), empacotado por um shell Rust fino. Gera `.exe`/`.msi` no
  Windows e `.apk`/`.aab` no Android a partir do **mesmo** `src/`.

## Estrutura

```
avalon-calculator/
├── package.json          # scripts (tauri dev/build/android)
├── src/                  # ← lógica e interface, compartilhadas entre plataformas
│   ├── index.html
│   ├── style.css          # identidade visual (tokens extraídos do cristal)
│   ├── calculator.js       # motor de cálculo puro (sem DOM), decimal via BigInt
│   ├── app.js              # liga o motor ao DOM + teclado físico
│   └── assets/crystal.png  # imagem de referência original, preservada
└── src-tauri/             # shell nativo
    ├── tauri.conf.json     # janela, identidade do app, alvos de build
    ├── Cargo.toml
    ├── src/main.rs         # ponto de entrada — só hospeda a WebView
    └── icons/icon.png      # ícone-mestre (crop "contain", sem distorção)
```

## Identidade visual (o que foi extraído do cristal)

- **Forma**: losango facetado de 4 planos → virou o motivo estrutural
  repetido (emblema do cabeçalho e recorte da tecla "=").
- **Cor**: esmeralda translúcido (`#17b464` / brilho `#4dffa0`) sobre fundo
  quase negro (`#05080a`), com moldura metálica gravada em dourado
  (`#c9a227` / `#f0d989`).
- **Luz**: o brilho interno do cristal virou um glow radial sutil atrás do
  app e um pulso de luz de 700 ms ao pressionar "=" — nunca contínuo, para
  não distrair da leitura dos números.
- **Textura**: gradientes e sombras internas simulam vidro/gema nos botões,
  sem imagens pesadas — mantém o app leve.
- A imagem original **não** foi usada como plano de fundo esticado; ela fica
  preservada em `assets/` como referência e como fonte do ícone (recorte
  "contain" em canvas quadrado, sem deformar proporções).

## Execução (modo desenvolvimento)

Pré-requisitos: Node.js 20+, Rust estável (`rustup`), e as dependências
nativas do Tauri para o seu SO (WebView2 no Windows já vem com Windows 11).

```bash
npm install
npm run dev          # abre a janela desktop com hot-reload
```

## Build Windows (.exe / .msi)

```bash
npm run build
```
Gera os instaladores em `src-tauri/target/release/bundle/` (`nsis/*.exe` e
`msi/*.msi`).

## Build Android (.apk)

```bash
npm run android:init   # primeira vez: cria o projeto Android em src-tauri/gen/android
npm run android:build  # gera o APK/AAB
```
O APK final fica em
`src-tauri/gen/android/app/build/outputs/apk/universal/release/`.
Requer Android Studio + SDK/NDK instalados (o `tauri android init` avisa se
faltar algo).

## Ícone

Depois de instalar o CLI, rode uma vez para gerar automaticamente todos os
tamanhos exigidos por Windows e Android a partir do ícone-mestre:

```bash
npx tauri icon src-tauri/icons/icon.png
```

---

## Resultado

- **APK gerado?** NÃO
- **EXE gerado?** NÃO
- **Motivo do bloqueio**: este ambiente de execução não tem acesso à rede
  (proxy de saída bloqueado) e não tem `cargo`/`rustc`, Android SDK/NDK nem
  as ferramentas de build do Windows (MSVC) instalados — e não há como
  instalá-los sem internet. Não é possível baixar o toolchain do Rust, o
  Android Studio/SDK, nem as dependências do `npm install` (registry do npm
  também bloqueado — testado). Por isso os comandos de build acima **não
  foram executados aqui**; são as instruções exatas para você rodá-los na
  sua máquina.
- **O que foi testado de fato (TESTADO REALMENTE)**: o motor de cálculo
  (`calculator.js`) — adição, subtração, multiplicação, divisão, divisão por
  zero, negativos, decimais tipo `0.1 + 0.2`, porcentagem sobre operando
  anterior, backspace — via `node --check` (sintaxe) e uma bateria de
  asserções executadas com `node` neste ambiente. Todas passaram.
- **O que foi apenas ANALISADO (não executado visualmente)**: a interface
  HTML/CSS/JS, o layout responsivo, o comportamento no WebView real do
  Windows/Android, e o teclado físico — não há navegador nem WebView neste
  ambiente para renderizar e capturar tela. Recomendo abrir `src/index.html`
  direto no navegador para uma primeira conferência visual antes de partir
  para `npm run dev`.
- **NÃO FOI POSSÍVEL TESTAR**: o build real do `.exe` e do `.apk`, o ícone
  aplicado nas duas plataformas, e o comportamento em tela de dispositivo
  físico.

## Auditoria pós-entrega (correções aplicadas)

Uma revisão da estrutura Tauri encontrou 5 problemas que impediriam
`npm run build` e `npm run android:build` de funcionar numa máquina com o
toolchain instalado, mesmo com tudo corretamente configurado do lado de
quem for compilar. Nenhuma dependência foi instalada e nada foi
redesenhado — só o que estava objetivamente quebrado:

1. **`src-tauri/build.rs` não existia.** `Cargo.toml` já declarava
   `tauri-build` como build-dependency, mas sem esse arquivo chamando
   `tauri_build::build()` o macro `tauri::generate_context!()` não tem como
   compilar. Criado.
2. **`src-tauri/src/lib.rs` não existia.** `Cargo.toml` já declarava um alvo
   `[lib] name = "avalon_calculator_lib"`, mas sem o arquivo o `cargo build`
   falha. Criado com `#[cfg_attr(mobile, tauri::mobile_entry_point)]`, que é
   o ponto de entrada que o runner Android do Tauri exige.
3. **`main.rs` chamava `tauri::Builder` direto**, sem ponto de entrada
   mobile — o Android não teria como inicializar o app. Corrigido para
   delegar a `avalon_calculator_lib::run()`.
4. **`tauri.conf.json` referenciava 5 arquivos de ícone; só existia 1.**
   `32x32.png`, `128x128.png`, `128x128@2x.png` e `icon.ico` foram gerados
   de verdade a partir do ícone-mestre (recorte "contain", sem esticar) e
   validados (PNG/ICO íntegros, tamanhos corretos). `icon.icns` foi
   removido da lista — é exclusivo de macOS e o projeto não compila para
   essa plataforma.
5. **`src-tauri/capabilities/` não existia.** No Tauri 2, a janela `main`
   precisa de ao menos uma capability para passar na validação do build.
   Criado `capabilities/default.json` com o permission-set padrão
   (`core:default`).

Depois dessas correções, a estrutura está alinhada ao scaffold padrão do
Tauri 2 (`create-tauri-app`) e os comandos abaixo devem funcionar sem
ajustes adicionais numa máquina com o toolchain instalado.

## Responsividade e adaptação visual para desktop (implementado)

Nenhuma lógica de negócio foi tocada — só estrutura visual (HTML) e CSS, mais o tamanho da janela no Tauri. Análise feita antes de qualquer alteração, como pedido.

### Causa raiz do "Avalo" — não era corte de texto, era sobreposição

Os três botões do cabeçalho (`goalToggle`, `cashToggle`, `historyToggle`) usavam `position: absolute`, ancorados à borda direita da **janela inteira**, com offsets fixos em pixels (`right: 16px`, `+44px`, `+88px`) — enquanto "AVALON" ficava centralizado num `<header>` flexível separado, sem nenhuma relação entre os dois. Em janelas estreitas, o cluster de botões literalmente cobria o "N" do título — daí "Avalo".

**Correção estrutural:** reagrupei o cabeçalho em dois blocos flexíveis de verdade — `.crest-brand` (cristal + título) e `.crest-actions` (os três botões) — dentro de `.crest`, agora com `justify-content: space-between`. Isso elimina a sobreposição *por construção*: flexbox nunca deixa dois irmãos ocuparem o mesmo espaço, ao contrário de `position: absolute`. Se algum dia o espaço for insuficiente, o título trunca sozinho (`overflow: hidden` + `white-space: nowrap`) em vez de colidir com os botões. Também tornei o `letter-spacing` do título responsivo (`clamp(0.12em, 1vw, 0.42em)`) — o espaçamento de 0.42em era parte do que fazia o título precisar de mais largura do que uma janela estreita tinha para oferecer.

### Corte silencioso ao reduzir a janela

`body { overflow: hidden; }`, sozinho, sem nenhum `overflow-y: auto` em lugar nenhum da tela principal. Se o conteúdo (cabeçalho + visor + teclado) precisasse de mais altura do que a janela oferecia, o excedente ficava simplesmente inacessível — sem scroll, sem indicação, corte mudo. Troquei para `overflow-x: hidden; overflow-y: auto;` — agora, se a janela for reduzida além do confortável, a página rola em vez de esconder conteúdo. Também endureci o piso mínimo das linhas do teclado (`grid-template-rows: repeat(5, minmax(38px, 1fr))`, antes `minmax(0, 1fr)`) para que as teclas nunca encolham a ponto de sumir visualmente — preferem crescer além do espaço disponível (acionando o scroll) a virarem inutilizáveis.

Os painéis secundários (Fechamento, Caixa, Histórico) já usavam `position: fixed; inset: 0` com `flex` + `overflow-y: auto` corretamente vinculado ao viewport — não precisaram de correção; só a tela principal da calculadora tinha esse problema.

### Janela maximizada com espaço ocioso

A calculadora continua propositalmente compacta em qualquer tamanho — uma grade de botões esticada até 1900px de largura ficaria ruim, e isso está explicitamente fora do que foi pedido. O que mudou: adicionei um segundo ponto de corte para janelas bem largas (`min-width: 900px`) em que a calculadora ganha um pouco mais de respiro (420px → até 480px, escalando com `46vw`) e o cabeçalho passa a se alinhar à mesma largura da calculadora abaixo dele — a janela grande passa a parecer uma composição deliberada (uma coluna central bem dimensionada sobre o fundo do cristal, que já preenchia toda a janela) em vez de "uma caixinha perdida numa área preta enorme".

### Configuração da janela Tauri

`tauri.conf.json`: tamanho inicial `360×640` → `420×720`; `minWidth` `300` → `380`; `minHeight` `480` → `600`. A janela continua `"resizable": true` — não virou tamanho fixo. Escolhi esses mínimos calculando o espaço que cabeçalho + visor + teclado realmente precisam nos pisos mínimos de cada elemento (~410px de altura, ~225px de largura no pior caso) — os novos mínimos deixam folga confortável para os elementos fluidos (`clamp()`) crescerem, em vez de operar sempre no limite.

### Validação

Sem navegador aqui — validei via leitura estrutural de CSS/HTML e aritmética de caixa (box model), não visualmente:
- **Balanceamento de tags/chaves**: HTML e CSS revalidados após a reestruturação do cabeçalho — sem tags órfãs.
- **Janela mínima (380×600, novo mínimo)**: cabeçalho (~34px) + gap + visor (piso 88px) + gap + teclado (5×38px + 4 gaps ≈ 222px) + padding da `.stage` ≈ 410px de altura necessária — cabe com folga de ~190px dentro do novo `minHeight: 600`, sem precisar de scroll na prática.
- **Largura mínima (380px)**: cristal (~22px) + gap + título com `letter-spacing` reduzido (~75px) + gap + os 3 botões de ação (3×34px + 2×8px de gap ≈ 118px) ≈ 225px — cabe com ~155px de sobra dentro de 380px, sem overlap algum (garantido pela semântica do flexbox, não por cálculo aproximado).
- **Tamanho inicial (420×720)**: acima do mínimo, mais folga ainda.
- **Janela média/grande**: o `.calc` cresce fluidamente via `clamp()`/`min()` até os limites de 420px (≥620px de largura) e depois 480px (≥900px de largura).
- **Maximizada**: mesma lógica do breakpoint de 900px+, mais a correção de `--app-height` já existente de uma rodada anterior (unidades de viewport que não recalculavam bem dentro do WebView).
- **Reduzir de novo depois de maximizar**: nenhuma media query ou variável depende de estado anterior — tudo recalcula puramente a partir do tamanho atual da janela a cada resize.

**O que não pude confirmar de fato**: a aparência real dentro do WebView2 no Windows — em particular, se o `letter-spacing` responsivo do título fica com boa aparência tipográfica na prática (a matemática de encaixe eu confirmei; o julgamento estético fica pendente do seu olhar). Recomendo abrir o preview consolidado e depois testar na build real do Windows nos 6 cenários pedidos.

## Backup automático, proteção e encerramento mensal (implementado)

Três recursos pontuais, sem tocar em nada fora do escopo — identidade visual, cristal, Conferência do Caixa (cálculo de cédulas/moedas), cálculo de meta diária, dias restantes e calendário permanecem exatamente como estavam.

### 1. Estrutura de estado do mês

Cada mês em `monthly-goal-store.js` ganhou dois campos novos: `status` (`'OPEN'` | `'CLOSED'`, seção 13 do pedido) e `backupMetadata` (`{ count, lastAt, lastFilename }`). Meses criados antes desse recurso existir são normalizados como `OPEN` na leitura, sem precisar de migração. Nenhuma informação derivada (acumulado, percentual, dias restantes) é duplicada nesse estado — continuam 100% calculadas a partir dos registros, como já era.

### 2. Proteção contra exclusões acidentais

- `addSale`, `updateSale`~~(não bloqueada — corrigir um valor não é exclusão)~~, `deleteSale`, `setMeta` e `clearSales` agora recusam a operação quando o mês está `CLOSED`, retornando `{ok:false, reason:'closed'}` — a proteção vive no **store**, não só na UI, então nenhum bug de interface consegue burlar isso.
- Texto de "Limpar registros" já estava exatamente como pedido; mantido.
- Texto de "Restaurar backup" ajustado para bater exatamente: *"Este mês já possui dados. Deseja substituir os dados atuais pelos dados deste backup?"*
- Editar/excluir uma venda individual continuam sem confirmação (como já era o padrão da aplicação) — só ficam desabilitados quando o mês está encerrado, por serem operações de edição, não por precisarem de confirmação extra.
- **Não implementei "Excluir um mês".** O pedido lista o texto de confirmação para essa ação na seção 4, mas ela não está entre os "3 recursos a implementar" nem é mencionada em nenhum outro lugar como algo a criar — entendi como uma confirmação documentada preventivamente, não um pedido de nova funcionalidade. Se for necessário, é só avisar.

### 3. Encerramento e reabertura mensal

Botão "Encerrar Mês" no Fechamento, com o fluxo exato pedido:
1. Confirmação: *"Encerrar Agosto/2026? Um backup deste mês será criado automaticamente..."*
2. Se o mês já tiver sido encerrado antes (`backupMetadata.count > 0`), pergunta substituir ou criar nova cópia (`fechamento_2026-08_v2.json`, `_v3`, etc.) — nunca sobrescreve nem duplica silenciosamente.
3. Executa o backup **de verdade** e só depois chama `closeMonth()`.
4. Se o backup falhar, mostra exatamente *"Não foi possível criar o backup de Agosto/2026. O mês não foi encerrado."* e o mês continua `OPEN`.

Botão "Reabrir Mês" aparece quando `CLOSED`, com a confirmação exata do pedido. Reabrir **nunca** apaga `backupMetadata` — o backup anterior continua registrado.

Enquanto um mês está `CLOSED`: os campos de meta, registrar venda, limpar registros e os botões Editar/Excluir de cada linha do histórico ficam desabilitados (visual + funcionalmente) — o usuário edita de novo só depois de reabrir. Isso não está escrito literalmente como regra no pedido, mas é a leitura mais direta da seção 9 ("depois de reaberto, o usuário pode **novamente** editar/excluir/adicionar") — o "novamente" implica que essas ações ficam indisponíveis enquanto encerrado. Não é bloqueio permanente (reabrir desfaz a qualquer momento), então continua alinhado com a seção 7.

O histórico de meses agora mostra o status de cada um (`ABERTO`/`ENCERRADO`), como pedido na seção 8.

### 4. Backup — o que há de novo

`exportMonth`/`importMonth` (já existentes da rodada anterior) passaram a incluir:
- `status` do mês (para que restaurar um backup de um mês encerrado o restaure já como encerrado);
- `cashReconciliations`: a contagem física da Conferência do Caixa de cada dia do mês que tiver dados, lida **só através da API pública já existente** `CashCounterStore.load()`/`.save()` — nenhum arquivo da Conferência do Caixa foi alterado para isso.

**Sobre "verificar se já existe um backup"** (seção 3): como a aplicação roda inteiramente no navegador/WebView, ela não tem acesso de leitura ao sistema de arquivos do usuário — não há como checar se já existe um arquivo `fechamento_2026-08.json` no disco. O que a aplicação sabe é se **ela mesma** já gerou um backup daquele mês antes (via `backupMetadata.count`, armazenado localmente). É essa informação que aciona o fluxo de substituir/nova cópia/cancelar — uma limitação técnica da plataforma, não uma escolha de design.

**Sobre confirmação real de sucesso do backup** (seção 14/15): usei a File System Access API (`showSaveFilePicker`) quando disponível — ela é awaitable e informa de verdade se o arquivo foi salvo ou se o usuário cancelou o diálogo, o que é exatamente o que a regra "não encerrar se o backup falhar" precisa. Quando essa API não está disponível no WebView (nem todo Chromium embarcado a suporta), caio para o download clássico via `Blob`+`<a>` — que **não** tem como informar ao JavaScript se o arquivo foi realmente salvo no disco (o navegador não expõe esse resultado por design/segurança). Deixei isso marcado explicitamente no código (`confirmed: true/false` no retorno de `performBackupDownload`) para que fique rastreável qual dos dois caminhos foi usado.

### Testes realizados

Os testes obrigatórios 1 a 7 e 12 do pedido, na parte testável sem navegador (toda a máquina de estados do store), via o mesmo método `vm` sandbox das rodadas anteriores:
- Mês criado com meta e registros começa `OPEN`;
- `closeMonth` marca `CLOSED`, registra `backupMetadata`, preserva todos os dados;
- Histórico mostra o status corretamente;
- Dados de um mês encerrado continuam acessíveis;
- As 4 operações de mutação são bloqueadas com o mês encerrado, e nenhuma delas alterou os dados mesmo tentando;
- Reabrir volta para `OPEN` **sem apagar** `backupMetadata`;
- Editar um registro funciona normalmente depois de reaberto;
- Encerrar de novo incrementa o contador de backup (não sobrescreve silenciosamente);
- Confirmei que o mês só muda de estado quando `closeMonth()` é chamado — nunca antes, nunca durante uma tentativa de backup que não se sabe se teve sucesso;
- Backup com dados de conferência do caixa: round-trip real via `JSON.stringify`/`JSON.parse` (simulando salvar e reabrir o arquivo), incluindo restaurar a contagem física de cédulas/moedas de um dia específico;
- Regressão final cruzando os 5 módulos (calculadora, histórico, fechamento, caixa, e as 3 features novas) juntos — nada quebrou.

**Não testado:** o diálogo nativo `showSaveFilePicker`/fallback de download, os botões reais na tela, e a aparência do estado desabilitado quando um mês está encerrado — sem navegador aqui. Abra o preview antes do próximo build para conferir visualmente.

## Correções finais + Backup + Histórico mensal (implementado)

Quatro mudanças pontuais, sem tocar em nada fora do escopo pedido — a Conferência do Caixa (`cash-*.js`) não foi alterada em nenhum arquivo.

### Correção 1 — janela maximizada

Encontrei um bug real por leitura de código, não um chute às cegas: `style.css` tinha `.calc { width: 400px; }` dentro do media query de desktop — um valor **fixo** em pixels, não um limite responsivo. Corrigido para `min(420px, 100%)`, igual ao resto do arquivo.

Além disso, reforcei contra a causa mais provável do sintoma "área preta": unidades `vh`/`dvh` puras podem não recalcular corretamente dentro de uma WebView incorporada quando a janela nativa é maximizada — é a mesma classe de bug conhecida como "o 100vh do mobile". Adicionei em `app.js` uma altura medida via JS (`--app-height`, em pixels reais, atualizada a cada evento `resize`) com prioridade sobre `vh`/`dvh` em `.stage`, `.history-panel`, `.goal-module` e `.cash-module`. **Não consigo confirmar 100% que isso resolve o sintoma exato sem testar numa janela Windows real** — é a correção mais bem fundamentada que consigo aplicar e validar estaticamente daqui; se a área preta persistir, é sinal de que o problema está um nível abaixo (o próprio WebView2 não redimensionando junto com a janela nativa), o que exigiria mexer no lado Rust do Tauri.

### Correção 2 — forma de pagamento removida do Fechamento Diário

Removido o `<select>` de Dinheiro/Pix/Cartão/Outro do formulário de "Registrar venda do dia" (`index.html`, `goal-module.js`). O valor registrado volta a ser simplesmente o total vendido no dia.

Ponto que exigiu atenção: como esse valor agora é um total misto (não mais só dinheiro), a integração com a Conferência do Caixa (`getCashSaleForDate`, em `monthly-goal-store.js`) não pode mais presumir "sem forma de pagamento = dinheiro" como fazia antes — isso passaria a inflar incorretamente o valor esperado no caixa físico com vendas de Pix/cartão disfarçadas de dinheiro. Corrigi para só retornar um valor quando `paymentMethod === 'dinheiro'` **explicitamente** gravado (o que só existe em registros da versão anterior, que ainda tinha o seletor) — registros novos, sem esse campo, nunca são tratados como dinheiro por padrão. Nenhum arquivo da Conferência do Caixa em si foi tocado.

### Implementação 1 — histórico e independência de meses

A persistência por mês (chave `YYYY-MM`) já existia desde que o módulo foi criado — cada mês já era armazenado separadamente, então não havia risco real de "agosto somar com setembro". O que faltava era uma forma de **navegar** entre meses já salvos sem perder o mês atual como padrão. Adicionei `MonthlyGoalStore.listMonths()` (varre as chaves do `localStorage`, sem precisar de um índice à parte — nunca fica dessincronizado) e um painel "Histórico de meses" na UI que lista todos os meses com dados e troca a visualização ao clicar, sem apagar nada. O mês atual continua sendo sempre o padrão ao abrir o módulo (já era assim).

### Implementação 2 — backup do mês

`MonthlyGoalStore.exportMonth`/`importMonth`, usando exatamente os nomes de campo do exemplo do pedido (`year`, `month`, `goal`, `sales: [{date, value}]`) — só os dados de origem são salvos, nada derivado (acumulado/percentual continuam sendo recalculados a partir dos registros na restauração, nunca guardados como fonte). Botão "Fazer backup" gera `fechamento_2026-08.json` via download do navegador (Blob + link, mecanismo padrão do WebView — não precisei tocar no lado Rust do Tauri para isso). "Restaurar backup" lê um arquivo `.json` selecionado, mostra confirmação com o texto exato do pedido quando o mês já tem dados, e restaura ano/mês/meta/registros a partir do arquivo. A persistência normal continua funcionando exatamente como antes — o backup é só uma cópia adicional, não o único mecanismo.

### Correção 3 — dias restantes contando o dia atual

Corrigido em `monthly-closing-engine.js`: além dos dias de funcionamento estritamente futuros (regra que já existia e continua certa), agora conta também o próprio dia de hoje quando ele é dia de funcionamento, está dentro do mês, e **ainda não tem registro de venda**. Assim que a venda do dia é lançada, ele deixa de contar automaticamente — não precisa de nenhuma lógica extra, é consequência direta de checar `sales` a cada recálculo.

### Testes realizados

Regressão completa dos 5 módulos (calculadora, histórico, fechamento, conferência do caixa, mais as 4 mudanças desta rodada) — tudo passando. Especificamente:
- **Dias restantes**: confirmei que 24/08/2026 é mesmo segunda-feira e 23/08 domingo (não assumi, calculei); sem registro do dia 24 → 7 dias restantes; com registro → 6; removendo o registro, volta a 7 — bate exatamente com os Testes 3 a 6 do pedido.
- **Histórico de meses**: setembro começa sem as vendas de agosto; agosto continua intacto e acessível; `listMonths` encontra os dois meses, mais recente primeiro.
- **Backup**: fiz um round-trip real via `JSON.stringify`/`JSON.parse` (não só objeto em memória) simulando salvar e reabrir o arquivo; confirmei os nomes de campo exatos (`goal`, `value`); restauração recupera meta e registros corretamente mesmo depois de alterar os dados atuais antes de restaurar; importação tolera nomes de campo alternativos por robustez e rejeita arquivo inválido sem quebrar.
- **Integração caixa**: confirmei que, sem forma de pagamento, a venda do Fechamento nunca é assumida como dinheiro na Conferência do Caixa.

**Não testado:** o comportamento visual real ao maximizar a janela (é justamente o único jeito de confirmar com certeza a Correção 1 — preciso que você teste numa janela Windows de verdade), a interação com o painel de histórico de meses, o clique real nos botões de backup/restaurar, e o diálogo de confirmação do navegador. Toda a lógica que sustenta essas telas foi testada exaustivamente; a camada de UI foi revisada por leitura e validação de sintaxe/ids.

## Conferência do Caixa (implementado)

**Nota:** esta seção entrou no projeto atual (web/Tauri). A migração para Android/React Native pedida em paralelo ficou pausada nesta rodada — só cheguei a confirmar o ambiente (sem rede, sem Android SDK/EAS aqui, mesma limitação já documentada para o Tauri) antes deste pedido chegar; retomo se for a prioridade.

**Arquivos novos** (arquitetura em camadas, exatamente como pedido na seção 25):
- `cash-denominations.js` — só dados: as 6 cédulas e 5 moedas, valores em **centavos inteiros** (nunca ponto flutuante para dinheiro).
- `cash-counter.js` — a contagem física. Distingue explicitamente vazio (`null`, "ainda não conferido") de zero (`0`, "conferido, nenhuma unidade") via `Map` — uma denominação só existe no mapa quando o usuário informou algo. Persiste por data em `localStorage`.
- `cash-reconciliation.js` — só compara físico × esperado e classifica (`UNVERIFIED`/`MISSING_FIELDS`/`BALANCED`/`SHORTAGE`/`OVERAGE`). Nunca afirma a causa da divergência.
- `cash-module.js` — só UI: renderiza as linhas de denominação, o cristal de status, o resultado. Reaproveita o mesmo padrão de input monetário já corrigido no Fechamento (formata só no blur, nunca durante a digitação) e a mesma lição da correção anterior — os campos de quantidade nunca têm teclas interceptadas, só validação do valor já digitado (filtra não-dígitos no blur, sem bloquear Backspace/Delete/Ctrl+A/colar).

**Arquivos alterados:**
- `monthly-goal-store.js` — `addSale`/`updateSale` ganharam um parâmetro opcional `paymentMethod` (default `'dinheiro'`, retrocompatível com registros antigos); novo `getCashSaleForDate(data)` é o ponto de integração da seção 10 — devolve a venda do dia **somente se for em dinheiro**, nunca conta Pix/cartão.
- `goal-module.js` / `index.html` — seletor de forma de pagamento (Dinheiro/Pix/Cartão/Outro) no formulário de registrar venda.

**Integração com o Fechamento (seção 10 e 27):** deliberadamente leve. A Conferência do Caixa mostra a venda em dinheiro do dia (quando existir) só como **informação de contexto** — não soma automaticamente ao valor esperado. Todos os exemplos numéricos do próprio pedido (seções 13-16, 19-20) comparam o físico contra o fundo fixo isoladamente, então segui exatamente isso em vez de inventar um cálculo de "antes/depois da retirada" que a especificação não chegou a exemplificar com números. Os dois módulos continuam conceitualmente separados, como pedido na seção 27.

**Cristal de status:** reaproveita a mesma geometria SVG do emblema do cabeçalho (facetas), só maior e com cor/brilho dirigidos por classe CSS conforme o status — apagado (cinza, sem glow) enquanto incompleto, verde-esmeralda quando bate, vermelho quando diverge. Nenhuma imagem nova foi processada; a identidade visual do cristal já estava vetorizada no projeto.

**Precisão:** tudo em centavos inteiros — nenhuma multiplicação/soma de dinheiro passa por `Number` fracionário em momento algum (conversão decimal→centavos é feita via split de string, não `× 100` direto em float).

**Testes realizados** (mesmo método `vm` sandbox): o exemplo completo da seção 16 de ponta a ponta (moedas R$9,00 + cédulas R$98,00 = R$107,00 físico, esperado R$100,00, diferença +R$7,00, status OVERAGE) — bateu exatamente; resultado correto (seção 13) e faltando (seção 15); a distinção vazio≠zero (`getQuantity` retorna `null` antes de preencher, `0` depois de informar explicitamente); rejeição de quantidade não-inteira e negativa; persistência por data sobrevivendo a releitura; `clear()` apagando só as quantidades (fundo fixo e data preservados); as funções de conversão reais↔centavos usadas pelo `cash-module.js`; e a integração com o Fechamento (venda em dinheiro retornada normalmente, venda em Pix **nunca** contada, data sem venda retorna `null`, registro antigo sem `paymentMethod` tratado como dinheiro). 25 asserções, todas passando, mais uma rodada de regressão cruzando os quatro módulos (calculadora, histórico, fechamento, caixa) juntos — nada quebrou.

**Não testado:** a parte visual (abrir/fechar o módulo, digitação real nos 11 campos, cores do cristal renderizadas, layout em tela pequena) — sem navegador aqui. A lógica que sustenta tudo isso foi testada exaustivamente; a camada de UI só foi revisada por leitura e validação de sintaxe/ids. Abra o preview antes do próximo build para conferir visualmente.

## Correção e reestruturação do módulo (implementado)

**Causa raiz identificada (explica os dois bugs reportados de uma vez):**
o listener global de teclado da calculadora (`app.js`) interceptava `Enter`, `Backspace`, `Delete`, `.` e `,` com `preventDefault()` **independente de onde estava o foco** — inclusive dentro dos campos de texto do módulo de meta. Isso explica por que só números pareciam funcionar (dígitos não tinham `preventDefault`) e por que `6.053,69` virava `605.369,00`: o `.` e a `,` digitados eram bloqueados de aparecer no campo, sobrando só os dígitos soltos (`605369`), que depois eram formatados como se fossem centavos inteiros. **Corrigido** com uma guarda no topo do handler: quando o foco está em `input`/`textarea`/`select`/`contenteditable`, o listener global da calculadora não intercepta nada — o campo se comporta 100% nativo.

**Mudança de modelo de dados:** trocado "informar o acumulado" por **registros diários independentes** (`sales: [{date, amount}]`). O acumulado nunca é armazenado — é sempre a soma dos registros do mês, calculada na hora (`monthly-closing-engine.js`). Isso elimina de vez a possibilidade de acumulado ficar dessincronizado dos registros, e permite editar/excluir qualquer dia sem tocar nos outros.

**Arquivos reescritos:**
- `monthly-goal-store.js` — novo modelo (`sales` em vez de `records`/acumulado informado); `addSale` recusa duplicata de data (retorna `{ok:false, reason:'duplicate'}`, nunca sobrescreve silenciosamente); `updateSale` corrige um dia; `deleteSale` remove só um dia; `clearSales` apaga só os registros, preservando a meta (chave de storage separada em `:v2:` para não misturar com o modelo antigo).
- `monthly-closing-engine.js` — bem mais simples: o conceito de "venda ambígua" não existe mais (cada dia agora é registrado explicitamente pelo usuário, não inferido de uma diferença entre acumulados).
- `goal-module.js` — reescrito. Destaque para a entrada monetária: **nenhum listener mexe no campo enquanto o usuário digita**. Só duas transformações, e nenhuma delas durante a digitação: no foco, mostra o valor cru editável; no blur, normaliza e formata em R$. Isso segue exatamente a separação pedida (edição / normalizado / formatado). `normalizeMoneyInput()` foi reescrito com uma heurística que decide se um único ponto é milhar ou decimal pelo número de dígitos depois dele (3 dígitos = milhar, 1–2 = decimal) — cobre todos os exemplos do pedido.
- `index.html` / `style.css` — campo "Registrar acumulado" virou "Registrar venda do dia"; cada linha do histórico ganhou **Editar**/**Excluir**; botão **Limpar registros** com confirmação nativa (`window.confirm`, texto exato pedido); aviso inline de data duplicada com atalho para editar o registro existente; histórico agora em ordem cronológica (antes era "mais recente primeiro").
- `app.js` — só a guarda de teclado descrita acima.

**Testes realizados** (mesmo método `vm` sandbox das fases anteriores): `normalizeMoneyInput` contra **todos os 7 exemplos exatos da seção 9** do pedido (`400`, `400,00`, `1.250`, `1.250,50`, `6.053,69`, `10.500`, `10.500,00`) mais casos de robustez (`1.234.567`, `10.50`, `6.5`, prefixo `R$`, negativo) — 15/15 passando, incluindo uma checagem explícita de que `6.053,69` **nunca** mais vira `605369`. Store: duplicata recusada sem sobrescrever, correção de valor recalcula o acumulado, exclusão remove só o dia certo, ordenação cronológica mesmo cadastrando fora de ordem, `clearSales` preserva a meta. Fechamento: acumulado = soma dos registros, meta atingida/ultrapassada, período encerrado sem divisão por zero. E o **teste manual obrigatório completo da seção 28** (passos 1–25, na parte que é testável sem navegador): criar mês, definir meta, registrar dois dias, confirmar acumulado, editar um registro e confirmar recálculo, excluir outro e confirmar novo acumulado, persistência sobrevivendo a nova leitura, domingo não contando como dia restante, limpar registros preservando a meta. Tudo passando, incluindo uma rodada de regressão da calculadora e do histórico originais — nada quebrou.

**Não testado (sem navegador aqui):** o comportamento real de foco/blur do campo monetário, Ctrl+A/Ctrl+C/Ctrl+V, clique do mouse nos botões Editar/Excluir, e a confirmação nativa do navegador para "Limpar registros". A lógica que sustenta tudo isso (a guarda de teclado, os handlers de foco/blur, os event listeners dos botões) foi revisada por leitura cuidadosa e validação de sintaxe/ids, mas o teste visual fica pendente — abra o preview antes do próximo build para validar isso na prática.

**Observação sobre "Limpar registros":** o pedido sugeria botões nomeados "Cancelar" / "Apagar registros" na confirmação; usei `window.confirm()` nativo (OK/Cancelar do próprio navegador) em vez de um modal customizado, para não adicionar complexidade desproporcional a essa ação — o texto da pergunta é exatamente o pedido, só os rótulos dos botões seguem o padrão do sistema operacional/navegador em vez de texto customizado.

## Fechamento Geral da Meta Mensal (implementado)

**Arquivos novos:**
- `src/calendar-engine.js` — só datas. Único ponto que toca `new Date()` real é `getCurrentDate()`; todo o resto (dias do mês, dia da semana, domingos, dias de funcionamento, dias restantes) recebe a data como parâmetro. Nenhuma lista de calendário fixada — tudo derivado do `Date` nativo (cobre bissexto automaticamente).
- `src/monthly-closing-engine.js` — matemática do fechamento (meta, restante, progresso, dias restantes, média necessária, venda identificada/ambígua). Reaproveita `add/subtract/multiply/divide` do `calculator.js` — mesma precisão decimal, nenhum motor novo.
- `src/monthly-goal-store.js` — persistência em `localStorage`, um documento por mês (`avalon-calculator:monthly-goal:YYYY-MM`). Trocar de mês recupera meta e registros automaticamente; corrigir um registro existente recalcula os posteriores.
- `src/goal-module.js` — só UI (DOM, formatação BRL, navegação de mês). Nenhuma regra de negócio mora aqui.

**Arquivos alterados:** `src/index.html` (botão + módulo em tela cheia), `src/style.css` (estilo do módulo, mesmos tokens da calculadora). `calculator.js` não mudou.

**Regra central implementada (seção 3):** domingo nunca entra no denominador de dias restantes — `isWorkingDay()` filtra por dia da semana real (`getDay() !== 0`), não por lista.

**Venda identificada vs. ambígua (seção 10):** ao registrar um novo acumulado, o sistema conta quantos dias de funcionamento existem entre o registro anterior e o novo. Só atribui a diferença como "venda do dia" quando esse número é exatamente 1; caso contrário, mostra o mesmo valor como "vendas desde o último registro" e marca como ambíguo — nunca inventa uma venda diária quando não é possível determiná-la.

**Testes realizados** (mesmo método da Fase A — `vm` sandbox replicando o `window.X` real do navegador): agosto/2026 (31 dias, domingos 2/9/16/23/30 **derivados**, 26 dias úteis), fevereiro/2026 (28 dias), fevereiro/2028 (29, bissexto), mês começando num domingo (busca automática, sem data fixa no teste), último dia do mês (0 dias restantes), sábado→domingo→segunda = 1 dia útil na janela (não 2 — o exemplo crítico da seção 3), meta atingida sem valor negativo, meta ultrapassada com excedente correto, atualização pulando domingo (15→17/08 = 1 dia útil, não 2), gap de 1 dia útil → venda atribuída, gap de vários dias úteis → ambíguo mas total ainda calculado, sem dias restantes → "Período encerrado" sem divisão por zero, exemplo completo da seção 17 (falta R$4.860,37, progresso 53,71%), e o fluxo do store completo (meta salva, registros do exemplo da seção 8 com vendas 451.13/167.89/232.43/438.79, setembro independente de agosto, volta pra agosto recupera tudo, correção recalcula o registro seguinte). Todos passando, incluindo uma rodada final de regressão junto com a calculadora e o histórico — nada quebrou.

**Não testado:** abertura/fechamento visual do módulo, o seletor de mês na tela, os campos de input reais — sem navegador/WebView neste ambiente. Testei a lógica pura (as três camadas) exaustivamente; a camada de UI (`goal-module.js`) só foi revisada por leitura e validação de sintaxe/ids. Recomendo abrir o preview antes do próximo build.

## Fase A — Histórico de cálculos (implementado)

**Arquivos alterados:**
- `src/calculator.js` — `evaluate()` agora retorna o resultado (`null` se não havia operação pendente, ou a string do resultado/`"Erro"`). Nenhuma outra linha de lógica matemática mudou.
- `src/app.js` — passou a rastrear a expressão exibida ao usuário (não o estado interno do motor) e grava uma entrada no histórico só quando `evaluate()` retorna um resultado válido. Adicionado o painel (abrir/fechar/backdrop), a renderização da lista e a reutilização por clique.
- `src/index.html` — botão de histórico no cabeçalho + markup do painel lateral (drawer) e do backdrop.
- `src/style.css` — estilo do painel/lista/estado vazio, reaproveitando os tokens de cor já existentes (nada na calculadora em si mudou).

**Arquivo novo:** `src/history.js` — módulo isolado, só faz leitura/escrita em `localStorage`, sem tocar na engine.

**Como funciona:**
- Cada tecla pressionada atualiza um rastreador leve (`exprParts` + `liveLabel`) que espelha exatamente o que está na tela — por isso `200 + 10%` fica registrado como digitado, mesmo o motor já tendo convertido internamente para `20`.
- Uma entrada só é gravada em `equals` quando havia de fato uma operação pendente (`operator`/`previous` setados) **e** o resultado não é `"Erro"` — divisão por zero nunca chega a `HistoryStore.add()`.
- Clicar numa entrada carrega o `resultado` bruto como novo valor corrente (`overwrite = true`), pronto para continuar o cálculo — o mesmo estado que o motor deixa depois de um `=` normal.

**Decisão de UX (regra 4):** ao tocar num item do histórico, carrego o **resultado**, não a expressão original. É o que a Windows Calculator faz — clicar num item do histórico coloca o valor no visor pronto para a próxima operação; ela não reabre a expressão para edição. Isso mantém o fluxo consistente com o resto do app (mesmo comportamento de pressionar `=`).

**Persistência:** `localStorage`, chave `avalon-calculator:history:v1`, sem dependências novas — funciona igual em WebView2 (Windows) e WebView do sistema (Android).

**Limite:** 50 entradas, mais recente primeiro; ao ultrapassar, as mais antigas são descartadas automaticamente.

**Testes realizados** (via `node` + `vm`, executando o mesmo caminho `window.X` que roda no navegador/WebView — não o branch CommonJS, que é só para eventuais bundlers): cálculo simples, porcentagem preservando a expressão original, número negativo, divisão, divisão por zero **não** gerando entrada, múltiplos cálculos com ordenação correta, persistência simulando reload, limite de 50 respeitado (60 cálculos → 50 guardados), limpeza do histórico, e reutilização de resultado continuando o cálculo (`42 (reaproveitado) + 8 = 50`). 16 testes, todos passando. Também revalidei a suíte de aritmética original (0.1+0.2, divisão por zero) para confirmar que nada regrediu.

**Problema encontrado durante os testes:** o `package.json` do projeto tem `"type": "module"`; isso faz o Node 22 interpretar `calculator.js`/`history.js` como ES Module ao usar `require()` diretamente, quebrando o branch `module.exports` deles silenciosamente (sem erro, só retorna `{}`). **Isso não afeta o app em produção** — o WebView carrega os arquivos via `<script src>` clássico e nunca lê `package.json` — mas invalidava um teste ingênuo em Node. Resolvi rodando os testes num sandbox `vm` que replica o ambiente real do navegador (existe `window`, não existe `module`), exercitando exatamente o código que roda no Windows/Android. Não alterei nenhum arquivo do projeto por causa disso — é uma peculiaridade do meu harness de teste, não um bug do app.

**Não testado (sem navegador/WebView neste ambiente):** abrir/fechar o painel visualmente, a animação do drawer, o layout em diferentes tamanhos de tela, e o clique real no botão do histórico. Recomendo abrir `avalon-calculator-preview.html` para validar isso visualmente antes do próximo build.

## Limitações conhecidas

- O `icon.icns` (macOS) listado no `tauri.conf.json` só é necessário se você
  também compilar para macOS; rodar `tauri icon` resolve isso automaticamente.
- Feedback sonoro **não foi adicionado** (era opcional pelo pedido original).
  Se quiser, um clique discreto ao pressionar "=" reforçaria a sensação de
  "cristal ressoando" sem virar exagero — mas prefiro implementar só se você
  confirmar que quer esse som.
