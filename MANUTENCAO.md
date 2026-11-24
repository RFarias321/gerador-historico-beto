# Manutenção do Gerador de Histórico do Beto

Guia para quem for cuidar do site: como ele é organizado, como mudar com segurança,
como voltar uma versão e como passar o projeto para a escola.

## 1. Como o site é organizado
| Pasta / arquivo | O que é |
|---|---|
| `index.html` | estrutura da página (sem código) |
| `css/app.css`, `css/fontes.css` | aparência |
| `js/01-nucleo.js` | leitura dos documentos, regras de notas, histórico, Excel e PDF |
| `js/02-impressao.js` | documentos para assinatura (FIAs, atas, dependências) |
| `js/03-matricula.js` | ficha de matrícula refeita e editável |
| `js/04-telas.js` | painéis, conferência, ajuda, prévia ampliada, registro de emissões, PWA |
| `js/05-arquivos.js` | prévia da impressão, salvar/abrir aluno com senha |
| `js/06-sessao.js` | trabalho em andamento guardado no navegador (12 h) |
| `js/07-turma.js` | modo turma guiado |
| `lib/`, `ocr/`, `fontes/`, `*.ttf` | bibliotecas e fontes, hospedadas no próprio site |
| `modelo_*.txt`, `spec_*.json` | planilhas-modelo do histórico e da ficha de dependência (sem dados de alunos) |
| `sw.js`, `manifest.webmanifest`, `icones/` | funcionamento sem internet (PWA) |
| `tests/` | testes automáticos e documentos **fictícios** |
| `licencas/`, `LICENSE`, `TERCEIROS.md` | licenças |

Os arquivos `js/` são carregados nesta ordem (está no fim do `index.html`); cada um pode usar o que os anteriores definem.

## 2. Mudar com segurança
1. Faça a mudança.
2. Rode os testes (`cd tests && npm ci && npx playwright install chromium && node run.js`).
3. Se a mudança alterar um resultado de propósito, rode `node run.js --atualizar` e **confira** em `tests/esperado.json` o que mudou.
4. Ao incluir um arquivo novo no site, acrescente-o à lista `ARQUIVOS` em `sw.js` e mude `VERSAO` (senão quem usa sem internet fica com a versão antiga).
5. Mude `APP_VERSION` em `js/04-telas.js` e escreva o que mudou em `tutorial.html#novidades`.
6. Envie para `main`. O GitHub roda os testes (Chrome, Firefox e Safari) e **só publica se todos passarem**.

**Nunca** coloque documentos reais de alunos no repositório nem em mensagens públicas (issues). Para criar novos documentos de teste, use `tests/anonimizar.py`.

## 3. Voltar para uma versão anterior
- A versão 2.0 (antes das melhorias da avaliação de 24/11/2026) está guardada no ramo **`versao-2.0-backup`**.
- Para voltar o site inteiro para ela:
  ```
  git checkout main
  git reset --hard versao-2.0-backup
  git push --force-with-lease origin main
  ```
  (ou peça a quem mantém o site). O GitHub testa e publica de novo.
- Para voltar só um arquivo: `git checkout versao-2.0-backup -- caminho/do/arquivo`.

## 4. Bibliotecas: como atualizar
As versões estão em `TERCEIROS.md`. A cada 6 meses, verifique se há alertas de segurança
(GitHub → aba *Security*, ou o site de cada biblioteca). Para trocar uma biblioteca, substitua o arquivo em `lib/`,
rode os testes e atualize `TERCEIROS.md` e `sw.js`.
- pdf.js deve continuar sendo chamado com `isEvalSupported:false` (proteção contra PDFs maliciosos).
- A SheetJS vem do site oficial (`cdn.sheetjs.com`); as versões do npm pararam na 0.18.5, que tem falhas.

## 5. Passar o projeto para a escola (recomendado)
Hoje o repositório está numa conta pessoal. Para não depender de uma pessoa só:
1. Crie uma **organização** gratuita no GitHub em nome da escola (github.com → foto → *Your organizations* → *New organization* → plano Free).
2. Adicione pelo menos **dois administradores** da escola.
3. No repositório: *Settings* → *General* → *Danger Zone* → **Transfer ownership** → escolha a organização.
4. Na organização, *Settings* → *Pages*: confira que o site continua publicado por **GitHub Actions**.
5. O endereço muda para `https://NOME-DA-ORGANIZACAO.github.io/gerador-historico-beto/`. Avise as secretarias e atualize favoritos.
6. Registre o site no inventário de tratamento de dados da escola/SEEDUC (ver `tutorial.html#privacidade`).

## 6. Proteção de dados (resumo técnico)
- Nenhum dado sai do navegador: a política de segurança (CSP, no `<head>` do `index.html`) só permite conexões com o próprio site.
- A leitura com IA está desligada (`IA_PERMITIDA=false` em `js/01-nucleo.js`). Só ligue com autorização formal da SEEDUC e ajustando a CSP.
- Arquivos salvos usam AES-GCM 256 com chave PBKDF2-SHA256 (310 mil iterações), criados no navegador.
- Nomes e matrículas de quem assina ficam só no navegador de cada escola (`localStorage`), nunca no código.
