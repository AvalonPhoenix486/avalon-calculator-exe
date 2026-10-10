# Avalon Calculadora Comercial

**Mais agilidade nos cálculos. Mais controle na rotina de vendas.**

O **Avalon Calculadora Comercial** reúne ferramentas práticas para o dia a dia comercial: desde cálculos rápidos até a conferência física do caixa e o acompanhamento das metas mensais de vendas.

O projeto tem identidade visual inspirada em um cristal, com tons de esmeralda e detalhes dourados. É um projeto independente: a referência ao cristal é visual e conceitual, e o aplicativo não usa nem depende do código-fonte do Avalon Toolkit.

## 📥 Baixar o aplicativo

**[Acessar a versão mais recente em Releases](https://github.com/AvalonPhoenix486/avalon-calculadora-comercial/releases)**

Na página de lançamentos, escolha o arquivo adequado ao seu dispositivo:

- **Windows (.exe):** instalador para Windows.
- **Windows (.msi):** pacote alternativo de instalação para Windows.
- **Android (.apk):** pacote para instalação em dispositivo Android.

Consulte as notas do lançamento escolhido para ver os arquivos e as informações daquela versão.

## ✨ Recursos

### 🧮 Calculadora
Operações do dia a dia em uma interface com identidade visual própria. O histórico permite consultar cálculos anteriores e reutilizar um resultado.

### 🎯 Metas mensais
Defina a meta do mês e registre as vendas por dia. Acompanhe o total acumulado, o progresso em relação à meta e o ritmo necessário para alcançá-la. Nas configurações, selecione os dias de funcionamento considerados no cálculo.

### 💵 Conferência de caixa
Registre a quantidade física de cédulas e moedas e compare o total contado com o valor esperado informado. A ferramenta ajuda a identificar se os valores conferem ou se existe uma diferença, sem presumir a causa de uma divergência.

### 📅 Calculadora de datas
Ferramenta auxiliar para cálculos relacionados a datas.

### 🗂️ Histórico e fechamento mensal
Consulte registros anteriores e organize o encerramento do mês. O fluxo de fechamento inclui a criação de backup e a possibilidade de reabrir um mês quando necessário.

## 🖥️ Plataformas

O projeto utiliza uma base compartilhada para oferecer versões para **Windows** e **Android**. A disponibilidade de cada instalador depende dos arquivos publicados na página de Releases.

## 🛠️ Tecnologias

- **Tauri 2** para integrar a interface web ao aplicativo nativo.
- **HTML, CSS e JavaScript** para a interface e a lógica da aplicação.
- **Rust** na camada nativa do Tauri.
- **Node.js e npm** para os comandos de desenvolvimento e build.

## 👩‍💻 Desenvolvimento

### Pré-requisitos

Instale o Node.js, o Rust e as dependências necessárias para a plataforma desejada. Para compilar no Android, também é necessário configurar o ambiente Android, incluindo o SDK e o NDK compatíveis com o Tauri.

### Instalar dependências e executar no desktop

Na pasta do projeto que contém o `package.json`:

```bash
npm install
npm run dev
```

### Gerar instaladores para Windows

```bash
npm run build
```

Os artefatos de build do Tauri são gerados dentro de `src-tauri/target/release/bundle/`, conforme os formatos configurados no projeto.

### Preparar e compilar para Android

Na primeira configuração do projeto Android:

```bash
npm run android:init
```

Para compilar:

```bash
npm run android:build
```

O caminho exato do APK gerado depende do alvo e da configuração do build Android.

### Gerar os ícones

Para regenerar os tamanhos de ícone a partir do arquivo-mestre configurado:

```bash
npx tauri icon src-tauri/icons/icon.png
```

## 📁 Estrutura do projeto

- `src/`: interface, estilos e módulos JavaScript da aplicação.
- `src-tauri/`: configuração e código nativo do Tauri, permissões e recursos de build.
- `package.json`: scripts de desenvolvimento e compilação.

## ℹ️ Sobre o projeto

O Avalon Calculadora Comercial é uma ferramenta de apoio à rotina de vendas, com foco em cálculos, metas e conferência de caixa. **Não é um sistema completo de gestão comercial ou contabilidade.**

A identidade visual inspirada no cristal é uma referência estética independente e não indica vínculo técnico com o Avalon Toolkit.

---

**Versões e instaladores:** [GitHub Releases](https://github.com/AvalonPhoenix486/avalon-calculadora-comercial/releases)
