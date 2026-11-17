// Gera apresentacao/index.html a partir dos ficheiros Markdown em ../curso/
// Uso: npm install && npm run build
//
// Regras de divisão em slides:
//  - Cada título (#, ##, ###) começa um slide novo, exceto se o slide atual
//    ainda só tiver títulos (ex.: "## Aula 1.1" seguido de "### Conceito").
//  - "## ❓ Mini quiz" vira um quiz interativo.
//  - Links para os ficheiros .md passam a apontar para a capa da disciplina.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const here = dirname(fileURLToPath(import.meta.url));
const cursoDir = join(here, '..', 'curso');

marked.setOptions({ breaks: true, gfm: true });

const files = ['README.md', ...readdirSync(cursoDir).filter(f => /^\d\d-.*\.md$/.test(f)).sort()];

// Fontes que aparecem nas tabelas de tipografia: mostradas com a própria letra.
const SPECIMEN_FONTS = [
  'Playfair Display', 'Lora', 'Merriweather', 'Inter', 'Montserrat', 'Poppins',
  'Caveat', 'Pacifico', 'Dancing Script', 'Bebas Neue', 'Abril Fatface',
  'Space Mono', 'IBM Plex Mono', 'Source Sans 3', 'Nunito',
];

const stripEmoji = s => s.replace(/^[\p{Extended_Pictographic}️\s]+/u, '').trim();
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = s => marked.parseInline(s);

const slides = [];
const nav = []; // { disc, title, lessons: [{title, slide}] , slide }

for (const file of files) {
  const md = readFileSync(join(cursoDir, file), 'utf8');
  const disc = file === 'README.md' ? 0 : Number(file.slice(0, 2));
  const tokens = marked.lexer(md);

  let discTitle = '';
  let lesson = null; // { id, title }
  let cur = null;

  const push = () => { if (cur && (cur.headings.length || cur.body.length)) slides.push(cur); };
  const fresh = () => ({ disc, discTitle, lesson, headings: [], body: [] });

  for (const t of tokens) {
    if (t.type === 'space' || t.type === 'hr') continue;
    if (t.type === 'heading' && t.depth <= 3) {
      if (t.depth === 1) {
        discTitle = stripEmoji(t.text.replace(/^Disciplina \d+ · /, ''));
        lesson = null;
      } else if (t.depth === 2) {
        const m = t.text.match(/^Aula (\d+\.\d+) · (.*)$/);
        lesson = m ? { id: m[1], title: m[2] } : null;
      }
      if (!cur || cur.body.length) { push(); cur = fresh(); }
      cur.discTitle = discTitle;
      cur.lesson = lesson;
      cur.headings.push(t);
      continue;
    }
    if (!cur) cur = fresh();
    cur.body.push(t);
  }
  push();
}

// ---------- Renderização ----------

function enhance(html) {
  // Amostras de cor ao lado dos códigos HEX
  html = html.replace(/<code>(#[0-9A-Fa-f]{6})<\/code>/g,
    (_, hex) => `<span class="swatch-wrap"><span class="swatch" style="--c:${hex}"></span><code>${hex}</code></span>`);
  // Nomes de fontes dentro de tabelas mostrados na própria fonte
  html = html.replace(/<td>([\s\S]*?)<\/td>/g, (cell, inner) => {
    let out = inner;
    for (const f of SPECIMEN_FONTS) {
      const re = new RegExp(`(^|[\\s,>(])(${f.replace(/ /g, '\\s')}(?: (?:Bold|Regular))?)(?=$|[\\s,<).])`, 'g');
      out = out.replace(re, (m, pre, name) => {
        const weight = /Bold/.test(name) ? 700 : 400;
        return `${pre}<span class="specimen" style="font-family:'${f}';font-weight:${weight}">${name}</span>`;
      });
    }
    return `<td>${out}</td>`;
  });
  // Checklists clicáveis
  html = html.replace(/<input disabled="" type="checkbox">/g, '<input type="checkbox">');
  // Links internos para as disciplinas
  html = html.replace(/href="(\d\d)-[^"]*\.md"/g, (_, n) => `href="#d${Number(n)}"`);
  // Blocos de código (fichas para preencher) com botão de copiar
  html = html.replace(/<pre><code>/g, '<div class="ficha"><button class="copy" type="button">Copiar</button><pre><code>')
             .replace(/<\/code><\/pre>/g, '</code></pre></div>');
  // Respostas em <details> fora dos quizzes
  return html;
}

function renderQuiz(body) {
  const list = body.find(t => t.type === 'list');
  const answersRaw = body.filter(t => t.type === 'html').map(t => t.raw).join(' ');
  const answers = {};
  for (const m of answersRaw.matchAll(/(\d+)\s*→\s*([a-z])/g)) answers[m[1]] = m[2];
  if (!list) return enhance(marked.parser(body));
  const qs = list.items.map((item, i) => {
    const [qLine, ...rest] = item.text.split('\n');
    const question = qLine.replace(/\*\*/g, '').trim();
    const opts = rest.join(' ').split(' · ').map(o => o.trim()).filter(Boolean).map(o => {
      const m = o.match(/^([a-z])\)\s*(.*)$/);
      return m ? { key: m[1], text: m[2] } : { key: '?', text: o };
    });
    const correct = answers[String(i + 1)];
    return `<fieldset class="q" data-correct="${correct}">
      <legend><span class="qn">${i + 1}</span>${inline(question)}</legend>
      <div class="opts">${opts.map(o => `<button type="button" class="opt" data-key="${o.key}"><span class="ok">${o.key}</span>${inline(o.text)}</button>`).join('')}</div>
      <p class="feedback" aria-live="polite"></p>
    </fieldset>`;
  }).join('');
  return `<div class="quiz">${qs}<p class="score" aria-live="polite"></p></div>`;
}

function renderSlide(s, idx) {
  const top = s.headings[0];
  const h = top ? top.text : '';
  let kind = 'content';
  let kicker = '';
  let title = '';
  let chip = '';
  let bodyHtml = '';
  const discLabel = s.disc ? `Disciplina ${s.disc}` : '';

  if (top && top.depth === 1) {
    kind = 'cover';
    if (s.disc && /^Disciplina/.test(h)) {
      kicker = discLabel;
      title = s.discTitle;
    } else {
      title = stripEmoji(h);
      kicker = s.disc ? 'Fim do curso' : 'Curso prático · ~3 horas';
      if (s.disc) kind = 'cover end';
    }
    const sub = s.headings.find(x => x.depth === 3);
    if (sub) chip = sub.text;
    bodyHtml = enhance(marked.parser(s.body));
  } else if (s.lesson) {
    const part = s.headings.find(x => x.depth === 3);
    kicker = `${discLabel} · Aula ${s.lesson.id}`;
    title = s.lesson.title;
    chip = part ? part.text : '';
    bodyHtml = enhance(marked.parser(s.body));
  } else {
    const clean = stripEmoji(h);
    if (/Mini quiz/i.test(clean)) {
      kind = 'quiz'; kicker = `${discLabel} · Mini quiz`; title = 'Testa o que aprendeste';
      bodyHtml = renderQuiz(s.body);
    } else if (/^Exercício/.test(clean)) {
      kind = 'exercise'; kicker = `${discLabel} · Exercício`; title = clean.replace(/^Exercício( final)? · /, '');
      chip = /final/.test(clean) ? 'Exercício final' : 'Mãos à obra';
      bodyHtml = enhance(marked.parser(s.body));
    } else if (/^Resumo/.test(clean)) {
      kind = 'summary'; kicker = `${discLabel} · Resumo`; title = s.discTitle;
      bodyHtml = enhance(marked.parser(s.body));
    } else {
      kicker = s.disc ? discLabel : 'Sobre o curso';
      title = clean;
      bodyHtml = enhance(marked.parser(s.body));
    }
  }

  const anchor = kind === 'cover' && s.disc ? ` data-anchor="d${s.disc}"` : (idx === 0 ? ' data-anchor="inicio"' : '');
  const lessonAttr = s.lesson ? ` data-lesson="${s.lesson.id}"` : '';
  return `<section class="slide ${kind}" data-disc="${s.disc}"${lessonAttr}${anchor} aria-roledescription="slide" aria-label="${esc(title)}" hidden>
  <div class="slide-inner">
    ${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ''}
    <h2 class="title">${inline(title)}</h2>
    ${chip ? `<p class="chip">${inline(chip)}</p>` : ''}
    <div class="body">${bodyHtml}</div>
  </div>
</section>`;
}

const slideHtml = slides.map(renderSlide).join('\n');

// Índice para o menu
slides.forEach((s, i) => {
  const top = s.headings[0];
  if (top && top.depth === 1 && s.disc && /^Disciplina/.test(top.text)) {
    nav.push({ disc: s.disc, title: s.discTitle, slide: i, lessons: [] });
  } else if (i === 0) {
    nav.push({ disc: 0, title: 'Introdução', slide: 0, lessons: [] });
  }
  const last = nav[nav.length - 1];
  if (!last) return;
  if (s.lesson && !last.lessons.find(l => l.id === s.lesson.id)) {
    last.lessons.push({ id: s.lesson.id, title: s.lesson.title, slide: i });
  }
  const h = top ? stripEmoji(top.text) : '';
  if (/^Exercício/.test(h)) last.lessons.push({ id: '✎', title: 'Exercício', slide: i });
  if (/Mini quiz/.test(h)) last.lessons.push({ id: '?', title: 'Mini quiz', slide: i });
  if (top && top.depth === 1 && /Conclusão/.test(top.text)) nav.push({ disc: 7, title: 'Conclusão', slide: i, lessons: [] });
});

const navHtml = nav.map(d => `<li>
  <a href="#/${d.slide + 1}" class="nav-disc" data-disc="${d.disc}">${d.disc && d.disc < 7 ? `<span class="nav-num">${d.disc}</span>` : ''}${esc(d.title)}</a>
  ${d.lessons.length ? `<ol>${d.lessons.map(l => `<li><a href="#/${l.slide + 1}"><span class="nav-id">${esc(l.id)}</span>${esc(l.title)}</a></li>`).join('')}</ol>` : ''}
</li>`).join('');

const fontFamilies = ['Fraunces:opsz,wght@9..144,400;9..144,600;9..144,800', 'DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700',
  ...SPECIMEN_FONTS.filter(f => !['Inter'].includes(f)).map(f => f.replace(/ /g, '+') + (['Montserrat', 'Lora', 'Nunito'].includes(f) ? ':wght@400;700' : '')),
  'Inter:wght@400;700'];
const fontsUrl = `https://fonts.googleapis.com/css2?${fontFamilies.map(f => 'family=' + f).join('&')}&display=swap`;

const template = readFileSync(join(here, 'src', 'template.html'), 'utf8');
const out = template
  .replace('{{FONTS_URL}}', fontsUrl)
  .replace('{{NAV}}', navHtml)
  .replace('{{SLIDES}}', slideHtml)
  .replaceAll('{{TOTAL}}', String(slides.length));

writeFileSync(join(here, 'index.html'), out);
console.log(`index.html gerado: ${slides.length} slides, ${nav.length} secções.`);
