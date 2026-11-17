# Apresentação do curso

Apresentação HTML com fundo 3D em Three.js, gerada a partir dos ficheiros em `../curso/`.

## Abrir
Abre `index.html` no browser (funciona com duplo clique, sem servidor). As fontes vêm do Google Fonts, por isso é preciso internet para ver a tipografia final.

**Navegação:** setas ← → (ou espaço), deslizar no telemóvel, `M` para o índice, `Home`/`End` para o início/fim. A apresentação lembra-se do último slide visto.

## Alterar o conteúdo
O texto **não se edita aqui**. Edita os ficheiros Markdown em `../curso/` e volta a gerar:

```
npm install      # só da primeira vez
npm run build
```

Como o Markdown vira slides:
- Cada `###` (Conceito, Exemplo, Dica prática) é um slide.
- `## ✏️ Exercício`, `## ❓ Mini quiz` e `## 📌 Resumo` têm slides próprios. O quiz fica interativo.
- Códigos de cor como `` `#D9A55B` `` ganham uma amostra de cor.
- Nomes de fontes do Google Fonts nas tabelas aparecem escritos na própria fonte.
- Checklists `- [ ]` ficam clicáveis.

## Ficheiros
| Ficheiro | O quê |
|---|---|
| `build.mjs` | Gerador: Markdown → slides |
| `src/template.html` | Estrutura da página |
| `styles.css` | Identidade visual (cores por disciplina, tipografia Fraunces + DM Sans) |
| `app.js` | Navegação, quiz e cena 3D |
| `vendor/three.min.js` | Three.js r149 (local, funciona sem servidor) |
| `index.html` | Resultado gerado. Não editar à mão. |
