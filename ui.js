
// ui.js
// UI glue: handles adding processes, running the selected algorithm, and drawing the Gantt chart.

let processes = []; // array of {pid, arrival, burst, priority}
let nextPid = 1;

const processTable = () => document.getElementById('processTable');
const resultTable = () => document.getElementById('resultTable');
const canvas = () => document.getElementById('ganttCanvas');
const algorithmSelect = () => document.getElementById('algorithm');
const quantumBox = () => document.getElementById('quantumBox');

function addProcess() {
  const arrival = document.getElementById('arrival').value;
  const burst = document.getElementById('burst').value;
  const priority = document.getElementById('priority').value || 0;

  if (arrival === '' || burst === '') {
    alert('Enter arrival and burst times.');
    return;
  }
  if (+burst <= 0) { alert('Burst must be positive.'); return; }

  const p = { pid: nextPid++, arrival: +arrival, burst: +burst, priority: +priority };
  processes.push(p);
  refreshProcessTable();
  // clear inputs
  document.getElementById('arrival').value = '';
  document.getElementById('burst').value = '';
  document.getElementById('priority').value = '';
}

function refreshProcessTable() {
  const table = processTable();
  // remove all rows except header
  while (table.rows.length > 1) table.deleteRow(1);
  for (const p of processes) {
    const row = table.insertRow();
    row.insertCell().innerText = 'P' + p.pid;
    row.insertCell().innerText = p.arrival;
    row.insertCell().innerText = p.burst;
    row.insertCell().innerText = p.priority;
  }
}

function clearResults() {
  const table = resultTable();
  while (table.rows.length > 1) table.deleteRow(1);
  const ctx = canvas().getContext('2d');
  ctx.clearRect(0,0,canvas().width, canvas().height);
}

function runSimulation() {
  if (!processes.length) { alert('Add at least one process.'); return; }
  clearResults();

  const alg = algorithmSelect().value;
  const procs = processes.map(p=> ({ pid: p.pid, arrival: p.arrival, burst: p.burst, priority: p.priority }));
  let schedule = [];
  try {
    switch (alg) {
      case 'fcfs':
        schedule = scheduler.fcfs(procs);
        break;
      case 'sjf_np':
        schedule = scheduler.sjfNonPreemptive(procs);
        break;
      case 'srtf':
        schedule = scheduler.srtf(procs);
        break;
      case 'priority_np':
        schedule = scheduler.priorityNonPreemptive(procs);
        break;
      case 'priority_p':
        schedule = scheduler.priorityPreemptive(procs);
        break;
      case 'rr':
        const q = parseInt(document.getElementById('quantum').value) || 2;
        schedule = scheduler.roundRobin(procs, q);
        break;
      default:
        alert('Unknown algorithm');
        return;
    }
  } catch (e) {
    console.error(e);
    alert('Error while running algorithm: ' + e.message);
    return;
  }

  const metrics = scheduler.computeMetrics(schedule, procs);
  populateResults(metrics);
  drawGantt(schedule);
}

function populateResults(metrics) {
  const table = resultTable();
  let totTAT = 0, totWT = 0;
  for (const m of metrics.sort((a,b)=>a.pid-b.pid)) {
    const row = table.insertRow();
    row.insertCell().innerText = 'P' + m.pid;
    row.insertCell().innerText = m.completion;
    row.insertCell().innerText = m.turnaround;
    row.insertCell().innerText = m.waiting;
    totTAT += m.turnaround;
    totWT += m.waiting;
  }
  const n = metrics.length;
  const avgRow = table.insertRow();
  avgRow.insertCell().innerText = 'Average';
  avgRow.insertCell().innerText = '-';
  avgRow.insertCell().innerText = (totTAT / n).toFixed(2);
  avgRow.insertCell().innerText = (totWT / n).toFixed(2);
}

// draw a nice gantt chart on canvas
function drawGantt(rawSchedule) {
  if (!rawSchedule || !rawSchedule.length) return;
  const schedule = scheduler.mergeSchedule(rawSchedule);
  // find min time and max time
  let minT = Infinity, maxT = -Infinity;
  for (const seg of schedule) { if (seg.start < minT) minT = seg.start; if (seg.end > maxT) maxT = seg.end; }
  if (!isFinite(minT)) minT = 0;

  const cnv = canvas();
  const ctx = cnv.getContext('2d');
  ctx.clearRect(0,0,cnv.width, cnv.height);

  const width = cnv.width - 40;
  const height = cnv.height;
  const timeRange = Math.max(1, maxT - minT);
  const pxPerUnit = width / timeRange;
  const top = 30;
  const barHeight = 30;
  const gap = 10;

  // colors
  const colors = [
    '#2b8a3e', '#1f6feb', '#7b2cbf', '#d9480f', '#0f766e', '#e11d48', '#f59e0b', '#0ea5e9'
  ];

  // draw baseline
  ctx.fillStyle = '#c9d1d9';
  ctx.font = '14px Arial';

  // draw boxes
  let i = 0;
  for (const seg of schedule) {
    const x = 20 + (seg.start - minT) * pxPerUnit;
    const w = Math.max(2, (seg.end - seg.start) * pxPerUnit);
    const y = top;
    const color = colors[(seg.pid-1) % colors.length];
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, barHeight, 6, true, false);

    // label
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.fillText('P' + seg.pid, x + 6, y + barHeight/2 + 4);
    i++;
  }

  // draw time marks
  ctx.fillStyle = '#c9d1d9';
  ctx.font = '12px Arial';
  for (let t = minT; t <= maxT; t++) {
    const x = 20 + (t - minT) * pxPerUnit;
    ctx.fillText(t.toString(), x - 6, top + barHeight + 20);
    // small vertical tick
    ctx.beginPath();
    ctx.moveTo(x, top+barHeight);
    ctx.lineTo(x, top+barHeight+6);
    ctx.strokeStyle = '#6b7280';
    ctx.stroke();
  }
}

// helper for rounded rect
function roundRect(ctx, x, y, w, h, r, fill, stroke) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
  if (fill) { ctx.fill(); }
  if (stroke) { ctx.stroke(); }
}

// show/hide quantum input for RR
document.addEventListener('DOMContentLoaded', function() {
  const alg = algorithmSelect();
  alg.addEventListener('change', function() {
    if (alg.value === 'rr') quantumBox().style.display = 'block';
    else quantumBox().style.display = 'none';
  });
});
