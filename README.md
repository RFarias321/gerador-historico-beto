# Gerador de Histórico do Beto

Gera o histórico escolar do Ensino Médio (Regular, 3 séries, e EJA, 4 módulos) no modelo oficial do
Colégio Estadual Oswaldo Teixeira, em **Excel** e **PDF**, a partir dos documentos do Conexão Educação.

**Usar:** abra o site publicado pelo GitHub Pages deste repositório.

## Documentos que o gerador lê
- **FIA** – Ficha Individual do Aluno (Histórico), um por ano: notas, C/H, frequência, escola e resultado.
- **ARF** – Ata de Resultados Finais da turma: matrícula, notas, frequência e situação (o aluno é achado pelo nome ou matrícula).
- **Ficha de Matrícula** (PDF do Conexão): dados pessoais e documento (RG, órgão, data de expedição).
- **Ficha de dependência**: a nota vai para as observações.
- Um histórico gerado por este site (Excel), para corrigir.

## Privacidade
O site é estático. Os arquivos são lidos **no navegador** de quem usa; nenhum dado de aluno é enviado
para servidor algum. Não coloque arquivos de alunos neste repositório.

## Estrutura
- `index.html` – o aplicativo inteiro (interface, leitura de PDF/Excel, geração do Excel e do PDF).
- `modelo_reg.txt`, `modelo_eja.txt` – planilhas-modelo (base64), sem dados de alunos.
- `spec_reg.json`, `spec_eja.json` – layout do modelo (larguras, alturas, estilos, mesclagens).
- `carlito-*.ttf` – fonte métrica-compatível com Calibri, usada no PDF.
- `pdf.worker.min.js` – leitor de PDF (pdf.js 3.11.174).
- `ferramentas/` – scripts Python que extraem o layout das planilhas-modelo originais.
