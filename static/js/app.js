/**
 * F3 Status Report Generator – Frontend App
 * PM Co-pilot | ISAN 5365 | Sneha Nitnaware
 *
 * Implements:
 *  - Structured form input (Iteration 1)
 *  - CSV upload + preview (Iteration 3)
 *  - THOUGHT PROCESS display (Iteration 5)
 *  - GO/NO-GO Approval Gate (Iteration 6)
 *  - Hard guardrail check (Iteration 7)
 *  - CONFIRM item extraction (all iterations)
 */

'use strict';

// ── State ─────────────────────────────────────────────────────────────────
const state = {
  currentStep: 1,
  csvContent: '',
  lastReport: '',
  lastAudience: '',
  lastProject: '',
};

// ── DOM Helpers ───────────────────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showStep(n) {
  $$('.step-section').forEach(el => el.style.display = 'none');
  $(`#step-${n}`).style.display = 'block';

  // Update step indicators
  $$('.step').forEach((el, i) => {
    el.classList.remove('active', 'done');
    const stepNum = i === 0 ? 1 : i === 2 ? 2 : 3; // steps 1,2,3 at indices 0,2,4
  });

  const indicators = $$('.step');
  indicators.forEach((el, i) => {
    const num = el.id?.replace('step-', '').replace('-indicator', '');
    const stepN = parseInt(num);
    if (isNaN(stepN)) return;
    if (stepN === n) el.classList.add('active');
    else if (stepN < n) el.classList.add('done');
  });

  // Update step-lines
  $$('.step-line').forEach((line, i) => {
    line.classList.toggle('active', i < n - 1);
  });

  state.currentStep = n;
}

function toast(msg, duration = 2500) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), duration);
}

function setLoading(btn, loading) {
  const text = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loading');
  btn.disabled = loading;
  if (text) text.style.display = loading ? 'none' : '';
  if (loader) loader.style.display = loading ? 'inline-flex' : 'none';
}

// ── Markdown-ish renderer ─────────────────────────────────────────────────
function renderMarkdown(text) {
  // Highlight [CONFIRM] tags
  text = text.replace(/\[CONFIRM[^\]]*\]/g, (m) =>
    `<span class="confirm-tag">${m}</span>`
  );

  const lines = text.split('\n');
  let html = '';
  let inList = false;

  for (let line of lines) {
    // Headers
    if (line.startsWith('## ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h2>${line.slice(3)}</h2>`;
    } else if (line.startsWith('### ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h3>${line.slice(4)}</h3>`;
    } else if (line.startsWith('# ')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<h1>${line.slice(2)}</h1>`;
    // Bullet
    } else if (line.match(/^[-•]\s/)) {
      if (!inList) { html += '<ul>'; inList = true; }
      const content = line.replace(/^[-•]\s/, '');
      html += `<li>${formatInline(content)}</li>`;
    // Numbered list
    } else if (line.match(/^\d+\.\s/)) {
      if (inList) { html += '</ul>'; inList = false; }
      html += `<p>${formatInline(line)}</p>`;
    // Table row
    } else if (line.includes('|')) {
      if (inList) { html += '</ul>'; inList = false; }
      html += renderTableRow(line);
    // Blank line
    } else if (line.trim() === '') {
      if (inList) { html += '</ul>'; inList = false; }
      html += '<br/>';
    // Code block marker
    } else if (line.startsWith('```')) {
      // skip
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      if (line.trim()) html += `<p>${formatInline(line)}</p>`;
    }
  }

  if (inList) html += '</ul>';
  return html;
}

let inTable = false;
let tableHtml = '';

function renderTableRow(line) {
  const cells = line.split('|').map(c => c.trim()).filter(c => c);
  if (!cells.length) return '';
  // Detect separator row
  if (cells.every(c => /^[-:]+$/.test(c))) {
    return ''; // skip separator
  }
  const tag = !inTable ? 'th' : 'td';
  if (!inTable) {
    inTable = true;
    tableHtml = '<table><thead><tr>';
    tableHtml += cells.map(c => `<th>${formatInline(c)}</th>`).join('');
    tableHtml += '</tr></thead><tbody>';
    return tableHtml;
  } else {
    return '<tr>' + cells.map(c => `<td>${formatInline(c)}</td>`).join('') + '</tr>';
  }
}

function formatInline(text) {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Code
  text = text.replace(/`(.+?)`/g, '<code>$1</code>');
  // Already handled: [CONFIRM] tags
  return text;
}

// ── CSV Handling ──────────────────────────────────────────────────────────
async function previewCSV(content) {
  if (!content.trim()) return;

  try {
    const res = await fetch('/api/schedule-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv_content: content }),
    });
    const data = await res.json();
    if (data.error) {
      showCSVError(data.error);
      return;
    }
    showCSVPreview(data);
  } catch (e) {
    showCSVError('Could not parse CSV file.');
  }
}

function showCSVPreview(data) {
  const preview = $('#csv-preview');
  const { summary, tasks, at_risk } = data;

  const ragColor = { GREEN: 'stat-green', YELLOW: 'stat-yellow', RED: 'stat-red' };
  const ragClass = ragColor[summary.suggested_rag] || 'stat-gray';

  let html = `
    <div class="sched-stats">
      <span class="stat-chip ${ragClass}">📊 ${summary.suggested_rag}</span>
      <span class="stat-chip stat-green">✅ ${summary.complete} Complete</span>
      <span class="stat-chip stat-blue">🔄 ${summary.on_track} On Track</span>
      <span class="stat-chip stat-yellow">⚠️ ${summary.at_risk} At Risk</span>
      <span class="stat-chip stat-red">🔴 ${summary.delayed} Delayed</span>
      <span class="stat-chip stat-gray">${summary.total_tasks} tasks total</span>
    </div>
  `;

  if (at_risk.length > 0) {
    html += `<div style="font-size:12px;color:#8892b0;margin-top:8px;">
      <strong style="color:#f59e0b;">⚠️ At Risk / Delayed:</strong>
      ${at_risk.map(t => `<span style="margin-right:8px;">${t.task_name} (${t.pct_complete}%)</span>`).join('')}
    </div>`;
  }

  preview.innerHTML = html;
  preview.style.display = 'block';
  $('#clear-csv').style.display = 'inline-flex';
}

function showCSVError(msg) {
  const preview = $('#csv-preview');
  preview.innerHTML = `<span style="color:#ef4444;">❌ ${msg}</span>`;
  preview.style.display = 'block';
}

function clearCSV() {
  state.csvContent = '';
  $('#csv-content').value = '';
  $('#csv-preview').style.display = 'none';
  $('#csv-preview').innerHTML = '';
  $('#clear-csv').style.display = 'none';
  $('#csv-upload').value = '';
}

// ── Collect Form Inputs ───────────────────────────────────────────────────
function collectInputs() {
  const audience = document.querySelector('input[name="audience"]:checked')?.value || 'executive';
  return {
    project_name: $('#project_name').value.trim(),
    reporting_period: $('#reporting_period').value.trim(),
    prepared_by: $('#prepared_by').value.trim(),
    audience,
    milestones: $('#milestones').value.trim(),
    blockers_risks: $('#blockers_risks').value.trim(),
    budget_status: $('#budget_status').value.trim(),
    key_decisions: $('#key_decisions').value.trim(),
    notes: $('#notes').value.trim(),
  };
}

function validateInputs(inputs) {
  const errors = [];
  if (!inputs.project_name) errors.push('Project Name is required');
  if (!inputs.reporting_period) errors.push('Reporting Period is required');
  if (!inputs.milestones) errors.push('Milestones / Progress is required');
  return errors;
}

// ── Render Thought Process ────────────────────────────────────────────────
function renderThoughtProcess(tp) {
  $('#tp-intent').textContent = tp.user_intent;

  const retEl = $('#tp-retrieval');
  retEl.innerHTML = tp.retrieval_strategy.map(s => `<li>${s}</li>`).join('');

  const confBadge = $('#tp-confidence-badge');
  const confClass = { High: 'conf-high', Medium: 'conf-medium', Low: 'conf-low' };
  confBadge.textContent = tp.confidence;
  confBadge.className = `confidence-badge ${confClass[tp.confidence] || 'conf-medium'}`;
  $('#tp-confidence-reason').textContent = `— ${tp.confidence_reason}`;

  const scopeEl = $('#tp-scope');
  scopeEl.innerHTML = tp.scope_boundaries.map(s => `<li>${s}</li>`).join('');
}

// ── Render Approval Gate ──────────────────────────────────────────────────
function renderApprovalGate(gate, confidence) {
  $('#gate-type').textContent = gate.report_type;
  $('#gate-project').textContent = gate.project;
  $('#gate-period').textContent = gate.reporting_period;
  $('#gate-will-generate').textContent = gate.will_generate;
  $('#gate-confidence').innerHTML =
    `<span class="confidence-badge ${
      { High: 'conf-high', Medium: 'conf-medium', Low: 'conf-low' }[gate.confidence] || 'conf-medium'
    }">${gate.confidence}</span> — ${gate.confidence_reason}`;

  if (gate.key_gaps && gate.key_gaps.length > 0) {
    $('#gaps-row').style.display = 'flex';
    $('#gate-gaps').textContent = gate.key_gaps.join(', ') + ' → will appear as [CONFIRM]';
  } else {
    $('#gaps-row').style.display = 'none';
  }
}

// ── Render Schedule Summary ───────────────────────────────────────────────
function renderScheduleSummary(summary) {
  if (!summary) {
    $('#schedule-summary-block').style.display = 'none';
    return;
  }

  const ragEmoji = { GREEN: '🟢', YELLOW: '🟡', RED: '🔴' };
  const grid = $('#sched-grid');
  grid.innerHTML = `
    <div class="sched-stat">
      <div class="sched-stat-num" style="color:${
        summary.suggested_rag === 'GREEN' ? '#10b981' :
        summary.suggested_rag === 'YELLOW' ? '#f59e0b' : '#ef4444'
      }">${ragEmoji[summary.suggested_rag] || '🟡'}</div>
      <div class="sched-stat-label">Overall RAG</div>
    </div>
    <div class="sched-stat">
      <div class="sched-stat-num" style="color:#10b981">${summary.complete}</div>
      <div class="sched-stat-label">Complete</div>
    </div>
    <div class="sched-stat">
      <div class="sched-stat-num" style="color:#3b82f6">${summary.on_track}</div>
      <div class="sched-stat-label">On Track</div>
    </div>
    <div class="sched-stat">
      <div class="sched-stat-num" style="color:#f59e0b">${summary.at_risk}</div>
      <div class="sched-stat-label">At Risk</div>
    </div>
    <div class="sched-stat">
      <div class="sched-stat-num" style="color:#ef4444">${summary.delayed}</div>
      <div class="sched-stat-label">Delayed</div>
    </div>
    <div class="sched-stat">
      <div class="sched-stat-num" style="color:#8892b0">${summary.total_tasks}</div>
      <div class="sched-stat-label">Total Tasks</div>
    </div>
  `;
  $('#schedule-summary-block').style.display = 'block';
}

// ── Extract CONFIRM items from report ────────────────────────────────────
function extractConfirmItems(reportText) {
  const matches = reportText.match(/\[CONFIRM[^\]]*\]/g) || [];
  // Also find sentences containing [CONFIRM]
  const lines = reportText.split('\n');
  const items = [];
  for (const line of lines) {
    if (line.includes('[CONFIRM')) {
      const clean = line.trim().replace(/^[-•*]\s*/, '').replace(/\*\*/g, '');
      if (clean && !items.includes(clean)) items.push(clean);
    }
  }
  return items;
}

// ── Render Report ─────────────────────────────────────────────────────────
function renderReport(data) {
  state.lastReport = data.report;
  state.lastAudience = data.audience;
  state.lastProject = data.project;

  inTable = false; // Reset table state

  const audienceLabel = {
    executive: '👔 Executive',
    client: '🤝 Client',
    site_team: '🏗️ Site Team',
  }[data.audience] || data.audience;

  $('#report-meta-desc').textContent =
    `${audienceLabel} · ${data.project || 'Project'} · ${data.period || ''} · Generated ${data.generated_at}`;

  // Render markdown
  const bodyHtml = renderMarkdown(data.report);
  $('#report-body').innerHTML = bodyHtml;

  // Check for CONFIRM items
  const confirmItems = extractConfirmItems(data.report);
  if (confirmItems.length > 0) {
    $('#confirm-checker').style.display = 'block';
    $('#confirm-list').innerHTML = confirmItems
      .slice(0, 8)
      .map(item => `<li>${item.substring(0, 120)}${item.length > 120 ? '…' : ''}</li>`)
      .join('');
  } else {
    $('#confirm-checker').style.display = 'none';
  }

  showStep(3);
}

// ── Step 1 → Step 2: Analyze ──────────────────────────────────────────────
$('#input-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const inputs = collectInputs();
  const errors = validateInputs(inputs);

  if (errors.length > 0) {
    toast('⚠️ ' + errors[0]);
    return;
  }

  const btn = $('#analyze-btn');
  setLoading(btn, true);

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs,
        audience: inputs.audience,
        csv_content: state.csvContent,
      }),
    });

    const data = await res.json();

    if (data.blocked) {
      toast('🚫 ' + data.message, 5000);
      setLoading(btn, false);
      return;
    }

    // Render step 2
    renderThoughtProcess(data.thought_process);
    renderApprovalGate(data.approval_gate, data.thought_process.confidence);
    renderScheduleSummary(data.schedule_summary);

    showStep(2);
  } catch (err) {
    toast('❌ Error analyzing inputs. Please try again.');
    console.error(err);
  } finally {
    setLoading(btn, false);
  }
});

// ── Step 2 → Step 3: GO ───────────────────────────────────────────────────
$('#btn-go').addEventListener('click', async () => {
  const btn = $('#btn-go');
  btn.disabled = true;
  btn.textContent = '⏳ Generating report…';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision: 'go' }),
    });

    const data = await res.json();

    if (data.status === 'error') {
      toast('❌ ' + data.message);
      btn.disabled = false;
      btn.textContent = '✅ GO – Generate Report';
      return;
    }

    renderReport(data);
    toast('✅ Report generated!');
  } catch (err) {
    toast('❌ Error generating report. Please try again.');
    console.error(err);
    btn.disabled = false;
    btn.textContent = '✅ GO – Generate Report';
  }
});

// ── Step 2: NO-GO → back to Step 1 ───────────────────────────────────────
$('#btn-nogo').addEventListener('click', () => {
  toast('↩️ Returning to input form. Revise your inputs and try again.');
  showStep(1);
});

// ── Copy Report ───────────────────────────────────────────────────────────
$('#btn-copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(state.lastReport);
    toast('📋 Report copied to clipboard!');
  } catch {
    toast('❌ Could not copy. Please select and copy manually.');
  }
});

// ── Download Report ───────────────────────────────────────────────────────
$('#btn-download').addEventListener('click', () => {
  if (!state.lastReport) return;
  const filename = `${state.lastProject || 'project'}_${state.lastAudience}_report.md`
    .replace(/\s+/g, '_').toLowerCase();
  const blob = new Blob([state.lastReport], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  toast('⬇️ Report downloaded!');
});

// ── New Report ────────────────────────────────────────────────────────────
$('#btn-new').addEventListener('click', resetToStep1);
$('#btn-generate-another').addEventListener('click', resetToStep1);

function resetToStep1() {
  showStep(1);
  state.lastReport = '';
}

// ── CSV Upload ────────────────────────────────────────────────────────────
$('#csv-upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async (ev) => {
    state.csvContent = ev.target.result;
    $('#csv-content').value = state.csvContent;
    await previewCSV(state.csvContent);
    toast('📊 CSV loaded!');
  };
  reader.readAsText(file);
});

// ── Load Sample CSV ───────────────────────────────────────────────────────
$('#load-sample-csv').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/sample-csv');
    const csv = await res.text();
    state.csvContent = csv;
    $('#csv-content').value = csv;
    await previewCSV(csv);
    toast('📊 Sample schedule loaded!');
  } catch {
    toast('❌ Could not load sample CSV.');
  }
});

// ── Clear CSV ─────────────────────────────────────────────────────────────
$('#clear-csv').addEventListener('click', () => {
  clearCSV();
  toast('🗑️ CSV cleared.');
});

// ── Audience selector ─────────────────────────────────────────────────────
$$('.audience-card').forEach(card => {
  card.addEventListener('click', () => {
    $$('.audience-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
  });
});

// ── Initialize ────────────────────────────────────────────────────────────
showStep(1);
