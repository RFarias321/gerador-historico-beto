# Gerador de Histórico do Beto

[![Testes](https://github.com/RFarias321/gerador-historico-beto/actions/workflows/testar-e-publicar.yml/badge.svg)](https://github.com/RFarias321/gerador-historico-beto/actions/workflows/testar-e-publicar.yml)


Gera o histórico escolar do Ensino Médio (Regular, 3 séries, e EJA, 4 módulos) no modelo oficial do
Colégio Estadual Oswaldo Teixeira, em **Excel** e **PDF**, a partir dos documentos do Conexão Educação.

**Usar:** abra o site publicado pelo GitHub Pages deste repositório. O passo a passo está em `tutorial.html` (link "Como usar" no topo do gerador).

## Documentos que o gerador lê
- **FIA** – Ficha Individual do Aluno (Histórico), um por ano: notas, C/H, frequência, escola e resultado.
- **ARF** – Ata de Resultados Finais da turma: matrícula, notas, frequência e situação (o aluno é achado pelo nome ou matrícula).
- **Ficha de Matrícula** (PDF do Conexão): dados pessoais e documento (RG, órgão, data de expedição).
- **Ficha de dependência**: a nota vai para as observações.
- Um histórico antigo (do modelo da escola ou gerado aqui), em Excel ou PDF.
- **Fotos (JPG/PNG) e PDFs escaneados**: lidos por OCR no próprio navegador (Tesseract.js, idioma português),
  ou, se o usuário ligar a opção, pela IA Claude (com uma chave da API Anthropic do próprio usuário, guardada só no navegador).

## Privacidade
O site é estático e **não envia dados de alunos para lugar nenhum**: os arquivos são lidos no navegador de quem usa,
e a política de segurança da página bloqueia qualquer conexão fora do próprio site. A leitura com IA está desligada
(exigiria autorização da SEEDUC, LGPD art. 33). Arquivos salvos são protegidos por senha. Detalhes em
[tutorial.html#privacidade](tutorial.html#privacidade). Não coloque arquivos de alunos neste repositório.

## Estrutura e manutenção
Veja **[MANUTENCAO.md](MANUTENCAO.md)**: organização dos arquivos, como mudar com segurança, como voltar uma versão
e como passar o projeto para uma organização da escola. Licenças em `LICENSE` e `TERCEIROS.md`.
Problemas: use a aba *Issues* do GitHub (sem dados de alunos).

## Para mexer no site (desenvolvimento)
- O site é dividido em `index.html`, `css/` e `js/` (sem etapa de compilação): edite direto nos arquivos. Veja `MANUTENCAO.md`.
- `modelo_dep.txt` (ficha de dependência em branco) e `libsans-*.ttf` (fonte compatível com Arial) são usados na impressão para assinatura.
- **Testes automáticos** em `tests/`: abrem o site num navegador sem tela, anexam documentos de exemplo e conferem o resultado com `tests/esperado.json`.
  ```
  cd tests
  npm ci
  npx playwright install chromium
  node run.js
  ```
  No GitHub os testes também rodam no Firefox e no Safari (WebKit), e incluem leitura de PDF, OCR, impressão,
  comparação visual do histórico, acessibilidade (axe), celular, senha dos arquivos e modo turma.
  Se uma mudança for intencional e alterar o resultado, rode `node run.js --atualizar` e confira o que mudou em `esperado.json` antes de enviar.
- `tests/fixtures/` tem **somente documentos fictícios**: cópias de documentos do Conexão com nomes, matrículas e datas de nascimento trocados por `tests/anonimizar.py`. Nunca coloque documentos reais de alunos no repositório.
- **Publicação:** a cada envio para `main`, o GitHub roda os testes (`.github/workflows/testar-e-publicar.yml`) e só publica o site se todos passarem.
- A versão aparece no rodapé do site (`APP_VERSION`); a lista do que mudou fica em `tutorial.html#novidades`.
