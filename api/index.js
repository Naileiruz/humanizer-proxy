export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Humanizador de texto</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', system-ui, sans-serif; background: #0f0f0f; color: #e8e8e8; min-height: 100vh; padding: 2rem; }
header { max-width: 1000px; margin: 0 auto 2rem; display: flex; align-items: baseline; gap: 12px; border-bottom: 1px solid #2a2a2a; padding-bottom: 1rem; }
header h1 { font-size: 20px; font-weight: 500; color: #fff; }
header span { font-size: 13px; color: #555; }
.container { max-width: 1000px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
.cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.col-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin-bottom: 6px; }
textarea { width: 100%; height: 260px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; color: #e8e8e8; font-family: inherit; font-size: 14px; line-height: 1.7; padding: 12px 14px; resize: vertical; outline: none; }
textarea:focus { border-color: #444; }
textarea::placeholder { color: #3a3a3a; }
.output-box { height: 260px; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; font-size: 14px; line-height: 1.7; padding: 12px 14px; overflow-y: auto; color: #3a3a3a; font-style: italic; white-space: pre-wrap; word-break: break-word; }
.output-box.has-content { color: #e8e8e8; font-style: normal; }
.output-box.has-error { color: #e05c5c; font-style: normal; }
.output-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
.options { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 14px 16px; display: flex; gap: 28px; flex-wrap: wrap; align-items: center; }
.options-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #555; }
label.opt { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #aaa; cursor: pointer; }
label.opt input { width: 15px; height: 15px; accent-color: #e8e8e8; cursor: pointer; }
.audit-panel { display: none; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 14px 16px; }
.audit-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #555; margin-bottom: 8px; }
.audit-panel p { font-size: 13px; line-height: 1.7; color: #aaa; }
.actions { display: flex; gap: 10px; }
button { background: transparent; border: 1px solid #2a2a2a; border-radius: 8px; color: #e8e8e8; font-family: inherit; font-size: 14px; padding: 10px 20px; cursor: pointer; transition: background 0.15s; }
button:hover { background: #1a1a1a; border-color: #444; }
button:active { transform: scale(0.98); }
button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
#humanize-btn { flex: 1; font-weight: 500; font-size: 15px; border-color: #333; }
.copy-btn { font-size: 12px; padding: 3px 10px; display: none; }
#status { font-size: 13px; color: #555; text-align: center; min-height: 18px; }
</style>
</head>
<body>
<header>
  <h1>Humanizador de texto</h1>
  <span>powered by groq</span>
</header>
<div class="container">
  <div class="cols">
    <div>
      <p class="col-label">Texto original</p>
      <textarea id="input" placeholder="Pega aquí el texto con olor a IA..."></textarea>
    </div>
    <div>
      <div class="output-header">
        <p class="col-label">Resultado humanizado</p>
        <button class="copy-btn" id="copy-btn" onclick="copyResult()">Copiar</button>
      </div>
      <div class="output-box" id="output">El texto humanizado aparecerá aquí...</div>
    </div>
  </div>
  <div class="options">
    <span class="options-label">Opciones</span>
    <label class="opt"><input type="checkbox" id="opt-personality" checked> Añadir voz y personalidad</label>
    <label class="opt"><input type="checkbox" id="opt-audit" checked> Mostrar diagnóstico de patrones IA</label>
  </div>
  <div class="audit-panel" id="audit-panel">
    <p class="audit-label">Patrones de IA detectados</p>
    <p id="audit-content"></p>
  </div>
  <div class="actions">
    <button id="humanize-btn" onclick="humanize()">Humanizar texto</button>
    <button onclick="clearAll()">Limpiar</button>
  </div>
  <p id="status"></p>
</div>
<script>
const PROXY = '/api/humanize';
let lastResult = '';
async function humanize() {
  const input = document.getElementById('input').value.trim();
  if (!input) { setStatus('Pega algún texto primero.'); return; }
  const btn = document.getElementById('humanize-btn');
  btn.disabled = true; btn.textContent = 'Procesando...'; setStatus('');
  const out = document.getElementById('output');
  out.className = 'output-box'; out.textContent = 'Procesando...';
  document.getElementById('audit-panel').style.display = 'none';
  document.getElementById('copy-btn').style.display = 'none';
  const personality = document.getElementById('opt-personality').checked;
  const audit = document.getElementById('opt-audit').checked;
  try {
    const response = await fetch(PROXY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input, personality, audit })
    });
    if (!response.ok) { const err = await response.text(); throw new Error('HTTP ' + response.status + ': ' + err.slice(0,200)); }
    const data = await response.json();
    const text = data.result || '';
    if (audit) {
      try {
        const clean = text.replace(/^\`\`\`json\\s*/, '').replace(/\`\`\`\\s*$/, '').trim();
        const parsed = JSON.parse(clean);
        document.getElementById('audit-content').textContent = parsed.audit;
        document.getElementById('audit-panel').style.display = 'block';
        lastResult = parsed.rewrite;
      } catch { lastResult = text; }
    } else { lastResult = text; }
    out.className = 'output-box has-content'; out.textContent = lastResult;
    document.getElementById('copy-btn').style.display = ''; setStatus('Listo.');
  } catch(err) { out.className = 'output-box has-error'; out.textContent = 'Error: ' + err.message; }
  btn.disabled = false; btn.textContent = 'Humanizar texto';
}
function copyResult() {
  if (!lastResult) return;
  navigator.clipboard.writeText(lastResult).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copiado';
    setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
  });
}
function clearAll() {
  document.getElementById('input').value = '';
  const out = document.getElementById('output');
  out.className = 'output-box'; out.textContent = 'El texto humanizado aparecerá aquí...';
  document.getElementById('audit-panel').style.display = 'none';
  document.getElementById('copy-btn').style.display = 'none';
  lastResult = ''; setStatus('');
}
function setStatus(msg) { document.getElementById('status').textContent = msg; }
</script>
</body>
</html>`);
}
