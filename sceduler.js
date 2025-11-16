// scheduler.js
// CPU Scheduling algorithms (browser-friendly)

// Utility: deep clone processes array (so original isn't mutated)
function cloneProcesses(processes) {
  return processes.map(p => ({ pid: p.pid, arrival: +p.arrival, burst: +p.burst, priority: +p.priority }));
}

// FCFS
function fcfs(processes) {
  const procs = cloneProcesses(processes).sort((a, b) => a.arrival - b.arrival || a.pid - b.pid);
  let t = 0;
  const schedule = [];
  for (const p of procs) {
    if (t < p.arrival) t = p.arrival;
    const start = t;
    const end = start + p.burst;
    schedule.push({ pid: p.pid, start, end });
    t = end;
  }
  return schedule;
}

// SJF Non-preemptive
function sjfNonPreemptive(processes) {
  const remaining = cloneProcesses(processes).sort((a, b) => a.arrival - b.arrival || a.pid - b.pid);
  let t = 0;
  const ready = [];
  const schedule = [];
  while (remaining.length || ready.length) {
    while (remaining.length && remaining[0].arrival <= t) ready.push(remaining.shift());
    if (!ready.length) {
      t = remaining[0].arrival;
      continue;
    }
    ready.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival || a.pid - b.pid);
    const p = ready.shift();
    const start = t;
    const end = start + p.burst;
    schedule.push({ pid: p.pid, start, end });
    t = end;
  }
  return schedule;
}

// SRTF (preemptive SJF)
function srtf(processes) {
  const remainingList = cloneProcesses(processes).sort((a,b)=>a.arrival-b.arrival||a.pid-b.pid);
  const rem = {};
  processes.forEach(p => rem[p.pid] = p.burst);
  let t = 0;
  const ready = [];
  const schedule = [];
  let current = null;
  let currentStart = 0;

  while (remainingList.length || ready.length || current) {
    while (remainingList.length && remainingList[0].arrival <= t) ready.push(remainingList.shift());
    const candidates = ready.slice();
    if (current) candidates.push(current);
    if (!candidates.length) {
      if (remainingList.length) { t = remainingList[0].arrival; continue; }
      else break;
    }
    candidates.sort((a,b)=> rem[a.pid]-rem[b.pid] || a.arrival - b.arrival || a.pid - b.pid);
    const chosen = candidates[0];
    if (current && chosen.pid !== current.pid) {
      schedule.push({ pid: current.pid, start: currentStart, end: t });
      // remove chosen from ready if needed:
      const idx = ready.findIndex(x=>x.pid===chosen.pid);
      if (idx>=0) ready.splice(idx,1);
      current = chosen; currentStart = t;
    } else if (!current) {
      const idx = ready.findIndex(x=>x.pid===chosen.pid);
      if (idx>=0) ready.splice(idx,1);
      current = chosen; currentStart = t;
    }
    // run 1 unit
    rem[current.pid] -= 1;
    t += 1;
    if (rem[current.pid] === 0) {
      schedule.push({ pid: current.pid, start: currentStart, end: t });
      current = null;
    }
  }
  return schedule;
}

// Priority Non-preemptive (lower number = higher priority)
function priorityNonPreemptive(processes) {
  const remaining = cloneProcesses(processes).sort((a, b) => a.arrival - b.arrival || a.pid - b.pid);
  let t = 0;
  const ready = [];
  const schedule = [];
  while (remaining.length || ready.length) {
    while (remaining.length && remaining[0].arrival <= t) ready.push(remaining.shift());
    if (!ready.length) { t = remaining[0].arrival; continue; }
    ready.sort((a,b)=> a.priority - b.priority || a.arrival - b.arrival || a.pid - b.pid);
    const p = ready.shift();
    const start = t;
    const end = start + p.burst;
    schedule.push({ pid: p.pid, start, end });
    t = end;
  }
  return schedule;
}

// Priority Preemptive
function priorityPreemptive(processes) {
  const remainingList = cloneProcesses(processes).sort((a,b)=>a.arrival-b.arrival||a.pid-b.pid);
  const rem = {}; processes.forEach(p=> rem[p.pid] = p.burst);
  let t = 0;
  const ready = [];
  const schedule = [];
  let current = null;
  let currentStart = 0;
  while (remainingList.length || ready.length || current) {
    while (remainingList.length && remainingList[0].arrival <= t) ready.push(remainingList.shift());
    const candidates = ready.slice();
    if (current) candidates.push(current);
    if (!candidates.length) { if (remainingList.length) { t = remainingList[0].arrival; continue; } else break; }
    candidates.sort((a,b)=> a.priority - b.priority || a.arrival - b.arrival || a.pid - b.pid);
    const chosen = candidates[0];
    if (current && chosen.pid !== current.pid) {
      schedule.push({ pid: current.pid, start: currentStart, end: t });
      const idx = ready.findIndex(x=>x.pid===chosen.pid);
      if (idx>=0) ready.splice(idx,1);
      current = chosen; currentStart = t;
    } else if (!current) {
      const idx = ready.findIndex(x=>x.pid===chosen.pid);
      if (idx>=0) ready.splice(idx,1);
      current = chosen; currentStart = t;
    }
    rem[current.pid] -= 1;
    t += 1;
    if (rem[current.pid] === 0) {
      schedule.push({ pid: current.pid, start: currentStart, end: t });
      current = null;
    }
  }
  return schedule;
}

// Round Robin
function roundRobin(processes, quantum) {
  const remainingList = cloneProcesses(processes).sort((a,b)=>a.arrival-b.arrival||a.pid-b.pid);
  const rem = {}; processes.forEach(p=> rem[p.pid] = p.burst);
  const ready = [];
  let t = 0;
  const schedule = [];
  while (remainingList.length || ready.length) {
    while (remainingList.length && remainingList[0].arrival <= t) ready.push(remainingList.shift());
    if (!ready.length) {
      if (remainingList.length) { t = remainingList[0].arrival; continue; } else break;
    }
    const p = ready.shift();
    const start = t;
    const run = Math.min(quantum, rem[p.pid]);
    t += run;
    rem[p.pid] -= run;
    schedule.push({ pid: p.pid, start, end: t });
    while (remainingList.length && remainingList[0].arrival <= t) ready.push(remainingList.shift());
    if (rem[p.pid] > 0) ready.push(p);
  }
  return schedule;
}

// Compute metrics given schedule and original processes
function computeMetrics(schedule, processes) {
  // completion time = last end for pid
  const completion = {};
  for (const seg of schedule) {
    completion[seg.pid] = Math.max(completion[seg.pid] || 0, seg.end);
  }
  const metrics = processes.map(p => {
    const comp = completion[p.pid] !== undefined ? completion[p.pid] : 0;
    const tat = comp - p.arrival;
    const wt = tat - p.burst;
    return { pid: p.pid, arrival: p.arrival, burst: p.burst, priority: p.priority, completion: comp, turnaround: tat, waiting: wt };
  });
  return metrics;
}

// Merge contiguous segments of same pid (for nicer Gantt)
function mergeSchedule(schedule) {
  if (!schedule || !schedule.length) return [];
  const s = schedule.slice().sort((a,b)=>a.start-b.start || a.pid - b.pid);
  const merged = [];
  for (const seg of s) {
    if (merged.length && merged[merged.length-1].pid === seg.pid && merged[merged.length-1].end === seg.start) {
      merged[merged.length-1].end = seg.end;
    } else {
      merged.push({ pid: seg.pid, start: seg.start, end: seg.end });
    }
  }
  return merged;
}

// Export functions to window for UI usage
window.scheduler = {
  fcfs, sjfNonPreemptive, srtf, priorityNonPreemptive, priorityPreemptive, roundRobin,
  computeMetrics, mergeSchedule
};


