# Componentes de terceiros

O site usa os componentes abaixo, todos hospedados no próprio site (pasta `lib/`, `ocr/`, `fontes/` e arquivos `.ttf`).
Os textos completos das licenças estão na pasta `licencas/`.

| Componente | Versão | Uso | Licença | Arquivo |
|---|---|---|---|---|
| SheetJS (xlsx) | 0.20.3 | ler e gerar planilhas Excel | Apache-2.0 | `licencas/sheetjs.txt` |
| jsPDF | 3.0.3 | gerar PDFs | MIT | `licencas/jspdf.txt` |
| JSZip | 3.10.1 | abrir e montar arquivos .xlsx | MIT (ou GPLv3, à escolha) | `licencas/jszip.txt` |
| pdf.js (pdfjs-dist) | 3.11.174 | ler PDFs (com `isEvalSupported:false`) | Apache-2.0 | `licencas/pdfjs.txt` |
| Tesseract.js e tesseract-core | 6.0.1 | OCR de fotos e PDFs escaneados | Apache-2.0 | `licencas/tesseract-js.txt` |
| Dados de idioma português (tessdata) | — | OCR | Apache-2.0 | `licencas/tesseract-js.txt` |
| Carlito | — | fonte do histórico (métrica do Calibri) | SIL OFL 1.1 | `licencas/fonte-carlito.txt` |
| Liberation Sans | 2.x | fonte das fichas (métrica do Arial) | SIL OFL 1.1 | `licencas/fonte-liberation.txt` |
| Public Sans | 5.3.0 (Fontsource) | fonte da interface | SIL OFL 1.1 | `licencas/fonte-public-sans.txt` |
| IBM Plex Mono | 5.3.0 (Fontsource) | números da interface | SIL OFL 1.1 | `licencas/fonte-ibm-plex-mono.txt` |

Testes automáticos (não vão para o site): Playwright (Apache-2.0) e axe-core (MPL-2.0).
