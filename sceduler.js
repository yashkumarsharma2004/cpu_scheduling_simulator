// CPU Scheduling Simulator - JavaScript Version

function fcfs(processes) {
    processes.sort((a, b) => a.arrival - b.arrival);
    let time = 0;
    let schedule = [];

    for (let p of processes) {
        if (time < p.arrival) time = p.arrival;
        let start = time;
        let end = start + p.burst;
        schedule.push({ pid: p.pid, start, end });
        time = end;
    }

    return schedule;
}

function sjfNonPreemptive(processes) {
    let time = 0;
    let schedule = [];
    let ready = [];
    let remaining = [...processes].sort((a, b) => a.arrival - b.arrival);

    while (remaining.length > 0 || ready.length > 0) {
        while (remaining.length > 0 && remaining[0].arrival <= time) {
            ready.push(remaining.shift());
        }

        if (ready.length === 0) {
            time = remaining[0].arrival;
            continue;
        }

        ready.sort((a, b) => a.burst - b.burst);
        let p = ready.shift();

        let start = time;
        let end = start + p.burst;
        schedule.push({ pid: p.pid, start, end });
        time = end;
    }

    return schedule;
}

function srtf(processes) {
    let time = 0;
    let schedule = [];
    let ready = [];
    let rem = {};
    processes.forEach(p => rem[p.pid] = p.burst);

    let remaining = [...processes].sort((a, b) => a.arrival - b.arrival);
    let current = null;
    let currentStart = 0;

    while (remaining.length > 0 || ready.length > 0 || current !== null) {
        while (remaining.length > 0 && remaining[0].arrival <= time) {
            ready.push(remaining.shift());
        }

        let candidates = [...ready];
        if (current) candidates.push(current);

        if (candidates.length === 0) {
            time = remaining[0].arrival;
            continue;
        }

        candidates.sort((a, b) => rem[a.pid] - rem[b.pid]);
        let chosen = candidates[0];

        if (current && chosen.pid !== current.pid) {
            schedule.push({ pid: current.pid, start: currentStart, end: time });
            ready = ready.filter(p => p.pid !== chosen.pid);
            current = chosen;
            currentStart = time;
        } else if (!current) {
            ready = ready.filter(p => p.pid !== chosen.pid);
            current = chosen;
            currentStart = time;
        }

        rem[current.pid] -= 1;
        time++;

        if (rem[current.pid] === 0) {
            schedule.push({ pid: current.pid, start: currentStart, end: time });
            current = null;
        }
    }

    return schedule;
}

function priorityNonPreemptive(processes) {
    let time = 0;
    let schedule = [];
    let ready = [];
    let remaining = [...processes].sort((a, b) => a.arrival - b.arrival);

    while (remaining.length > 0 || ready.length > 0) {
        while (remaining.length > 0 && remaining[0].arrival <= time) {
            ready.push(remaining.shift());
        }

        if (ready.length === 0) {
            time = remaining[0].arrival;
            continue;
        }

        ready.sort((a, b) => a.priority - b.priority);
        let p = ready.shift();

        let start = time;
        let end = start + p.burst;
        schedule.push({ pid: p.pid, start, end });
        time = end;
    }
    return schedule;
}

function priorityPreemptive(processes) {
    let time = 0;
    let schedule = [];
    let ready = [];
    let rem = {};
    processes.forEach(p => rem[p.pid] = p.burst);

    let remaining = [...processes].sort((a, b) => a.arrival - b.arrival);
    let current = null;
    let currentStart = 0;

    while (remaining.length > 0 || ready.length > 0 || current) {
        while (remaining.length > 0 && remaining[0].arrival <= time) {
            ready.push(remaining.shift());
        }

        let candidates = [...ready];
        if (current) candidates.push(current);
        if (candidates.length === 0) {
            time = remaining[0].arrival;
            continue;
        }

        candidates.sort((a, b) => a.priority - b.priority);
        let chosen = candidates[0];

        if (current && chosen.pid !== current.pid) {
            schedule.push({ pid: current.pid, start: currentStart, end: time });
            ready = ready.filter(p => p.pid !== chosen.pid);
            current = chosen;
            currentStart = time;
        } else if (!current) {
            ready = ready.filter(p => p.pid !== chosen.pid);
            current = chosen;
            currentStart = time;
        }

        rem[current.pid]--;
        time++;

        if (rem[current.pid] === 0) {
            schedule.push({ pid: current.pid, start: currentStart, end: time });
            current = null;
        }
    }
    return schedule;
}

function roundRobin(processes, quantum) {
    let time = 0;
    let schedule = [];
    let ready = [];
    let rem = {};
    processes.forEach(p => rem[p.pid] = p.burst);

    let remaining = [...processes].sort((a, b) => a.arrival - b.arrival);

    while (remaining.length > 0 || ready.length > 0) {
        while (remaining.length > 0 && remaining[0].arrival <= time)
            ready.push(remaining.shift());

        if (ready.length === 0) {
            time = remaining[0].arrival;
            continue;
        }

        let p = ready.shift();
        let start = time;
        let runTime = Math.min(quantum, rem[p.pid]);
        time += runTime;
        rem[p.pid] -= runTime;

        schedule.push({ pid: p.pid, start, end: time });

        while (remaining.length > 0 && remaining[0].arrival <= time)
            ready.push(remaining.shift());

        if (rem[p.pid] > 0) ready.push(p);
    }

    return schedule;
}

