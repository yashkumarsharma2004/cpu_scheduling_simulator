#!/usr/bin/env python3
"""
CPU Scheduling Simulator
Supports:
 - FCFS
 - SJF (non-preemptive)
 - SJF (preemptive) a.k.a. Shortest Remaining Time First (SRTF)
 - Priority (non-preemptive)
 - Priority (preemptive)
 - Round Robin (RR)

Usage: run the script and follow prompts. You can also use the example processes provided in the script.
"""

from collections import deque, namedtuple
import math

Process = namedtuple("Process", ["pid", "arrival", "burst", "priority"])

def print_header(title):
    print("="*len(title))
    print(title)
    print("="*len(title))

def compute_metrics(schedule, processes):
    """
    schedule: list of tuples (pid, start, end)
    processes: list of Process(pid, arrival, burst, priority)
    Returns dict keyed by pid -> {arrival,burst,completion,turnaround,waiting}
    """
    proc_map = {p.pid: p for p in processes}
    completion = {}
    # completion time is the last end time for that pid
    for pid, start, end in schedule:
        completion[pid] = end

    metrics = {}
    for p in processes:
        comp = completion.get(p.pid, None)
        if comp is None:
            # process didn't run (shouldn't happen in normal usage)
            comp = 0
        tat = comp - p.arrival
        wt = tat - p.burst
        metrics[p.pid] = {
            "arrival": p.arrival,
            "burst": p.burst,
            "completion": comp,
            "turnaround": tat,
            "waiting": wt,
            "priority": p.priority,
        }
    return metrics

def print_metrics(metrics):
    print()
    print("{:<6} {:<8} {:<6} {:<10} {:<11} {:<8}".format("PID", "Arrival", "Burst", "Completion", "Turnaround", "Waiting"))
    print("-"*60)
    tots = {"turnaround":0, "waiting":0}
    n = len(metrics)
    for pid in sorted(metrics.keys()):
        m = metrics[pid]
        print("{:<6} {:<8} {:<6} {:<10} {:<11} {:<8}".format(
            pid, m["arrival"], m["burst"], m["completion"], m["turnaround"], m["waiting"]
        ))
        tots["turnaround"] += m["turnaround"]
        tots["waiting"] += m["waiting"]
    print("-"*60)
    print("Average Turnaround Time : {:.3f}".format(tots["turnaround"]/n))
    print("Average Waiting Time    : {:.3f}".format(tots["waiting"]/n))
    print()

def ascii_gantt(schedule):
    """
    Draw a simple ASCII Gantt chart from schedule list of (pid, start, end).
    Merges contiguous segments of same pid.
    """
    if not schedule:
        print("[No schedule]")
        return
    # Merge contiguous same-pid segments
    merged = []
    for pid, st, ed in schedule:
        if merged and merged[-1][0] == pid and merged[-1][2] == st:
            merged[-1] = (pid, merged[-1][1], ed)
        else:
            merged.append((pid, st, ed))
    # Build chart
    timeline = ""
    labels = ""
    for pid, st, ed in merged:
        length = max(1, ed - st)  # at least one char per time unit
        box = "[" + f"P{pid}" + "]"
        timeline += (" " * (st - (len(timeline) - timeline.count(" ")))) + box
    # Print times below boxes
    print("Gantt Chart (merged segments):")
    line = ""
    for pid, st, ed in merged:
        line += f"| P{pid} " 
    line += "|"
    print(line)
    time_marks = ""
    cur = merged[0][1]
    time_marks += f"{cur:>3}"
    for pid, st, ed in merged:
        # show end time
        time_marks += " " * (len(f"| P{pid} ") - 1) + f"{ed:>3}"
    print(time_marks)
    print()

# ---------------- Algorithms ----------------

def fcfs(processes):
    processes_sorted = sorted(processes, key=lambda p: (p.arrival, p.pid))
    t = 0
    schedule = []
    for p in processes_sorted:
        if t < p.arrival:
            t = p.arrival
        start = t
        end = start + p.burst
        schedule.append((p.pid, start, end))
        t = end
    return schedule

def sjf_nonpreemptive(processes):
    processes_left = sorted(processes, key=lambda p: (p.arrival, p.pid))
    t = 0
    schedule = []
    ready = []
    while processes_left or ready:
        while processes_left and processes_left[0].arrival <= t:
            ready.append(processes_left.pop(0))
        if not ready:
            t = processes_left[0].arrival
            continue
        # choose shortest burst
        ready.sort(key=lambda p: (p.burst, p.arrival, p.pid))
        p = ready.pop(0)
        start = t
        end = start + p.burst
        schedule.append((p.pid, start, end))
        t = end
    return schedule

def sjf_preemptive(processes):
    # SRTF
    proc_left = sorted(processes, key=lambda p: (p.arrival, p.pid))
    t = 0
    schedule = []
    ready = []
    remaining = {p.pid: p.burst for p in processes}
    current = None
    while proc_left or ready or current:
        while proc_left and proc_left[0].arrival <= t:
            ready.append(proc_left.pop(0))
        if not current and not ready:
            if proc_left:
                t = proc_left[0].arrival
                continue
            else:
                break
        # pick process with smallest remaining
        candidates = ready[:]
        if current:
            candidates.append(current)
        candidates.sort(key=lambda p: (remaining[p.pid], p.arrival, p.pid))
        chosen = candidates[0]
        if current and chosen.pid != current.pid:
            # switch
            # record end for current
            schedule.append((current.pid, current_start, t))
            # remove chosen from ready if was there
            if chosen in ready:
                ready.remove(chosen)
            current = chosen
            current_start = t
        elif not current:
            if chosen in ready:
                ready.remove(chosen)
            current = chosen
            current_start = t
        # Execute chosen for 1 unit (time quantum = 1)
        remaining[current.pid] -= 1
        t += 1
        # push newly arrived to ready will happen next loop's while
        if remaining[current.pid] == 0:
            schedule.append((current.pid, current_start, t))
            current = None
    return schedule

def priority_nonpreemptive(processes):
    processes_left = sorted(processes, key=lambda p: (p.arrival, p.pid))
    t = 0
    schedule = []
    ready = []
    while processes_left or ready:
        while processes_left and processes_left[0].arrival <= t:
            ready.append(processes_left.pop(0))
        if not ready:
            t = processes_left[0].arrival
            continue
        # lower number -> higher priority (assuming smaller number = higher priority)
        ready.sort(key=lambda p: (p.priority, p.arrival, p.pid))
        p = ready.pop(0)
        start = t
        end = start + p.burst
        schedule.append((p.pid, start, end))
        t = end
    return schedule

def priority_preemptive(processes):
    proc_left = sorted(processes, key=lambda p: (p.arrival, p.pid))
    t = 0
    schedule = []
    ready = []
    remaining = {p.pid: p.burst for p in processes}
    current = None
    while proc_left or ready or current:
        while proc_left and proc_left[0].arrival <= t:
            ready.append(proc_left.pop(0))
        if not current and not ready:
            if proc_left:
                t = proc_left[0].arrival
                continue
            else:
                break
        candidates = ready[:]
        if current:
            candidates.append(current)
        # lower priority number -> higher priority
        candidates.sort(key=lambda p: (p.priority, p.arrival, p.pid))
        chosen = candidates[0]
        if current and chosen.pid != current.pid:
            schedule.append((current.pid, current_start, t))
            if chosen in ready:
                ready.remove(chosen)
            current = chosen
            current_start = t
        elif not current:
            if chosen in ready:
                ready.remove(chosen)
            current = chosen
            current_start = t
        # run one unit
        remaining[current.pid] -= 1
        t += 1
        if remaining[current.pid] == 0:
            schedule.append((current.pid, current_start, t))
            current = None
    return schedule

def round_robin(processes, quantum=2):
    proc_left = sorted(processes, key=lambda p: (p.arrival, p.pid))
    t = 0
    schedule = []
    ready = deque()
    remaining = {p.pid: p.burst for p in processes}
    while proc_left or ready:
        # enqueue arrivals
        while proc_left and proc_left[0].arrival <= t:
            ready.append(proc_left.pop(0))
        if not ready:
            if proc_left:
                t = proc_left[0].arrival
                continue
            else:
                break
        p = ready.popleft()
        start = t
        exec_time = min(quantum, remaining[p.pid])
        t += exec_time
        remaining[p.pid] -= exec_time
        schedule.append((p.pid, start, t))
        # add newly arrived processes during this quantum
        while proc_left and proc_left[0].arrival <= t:
            ready.append(proc_left.pop(0))
        if remaining[p.pid] > 0:
            ready.append(p)
    return schedule

# --------------- Utilities -----------------
def parse_process_list(raw_list):
    """
    raw_list: list of dicts or tuples -> returns list of Process with pid from 1..n
    Accepts [(arrival, burst, priority), ...] or dicts with keys arrival, burst, priority
    """
    processes = []
    for i, item in enumerate(raw_list, start=1):
        if isinstance(item, dict):
            a = item.get("arrival", 0)
            b = item["burst"]
            pr = item.get("priority", 0)
        else:
            # assume tuple
            if len(item) == 2:
                a, b = item
                pr = 0
            elif len(item) == 3:
                a, b, pr = item
            else:
                raise ValueError("Invalid process item")
        processes.append(Process(i, int(a), int(b), int(pr)))
    return processes

# -------------- Example and CLI --------------
def example_processes():
    # Example processes: (arrival, burst, priority)
    return [
        (0, 7, 2),   # P1
        (2, 4, 1),   # P2
        (4, 1, 3),   # P3
        (5, 4, 2),   # P4
    ]

def select_and_run(processes):
    print_header("Select Scheduling Algorithm")
    options = {
        "1": ("FCFS", fcfs),
        "2": ("SJF (non-preemptive)", sjf_nonpreemptive),
        "3": ("SJF (preemptive - SRTF)", sjf_preemptive),
        "4": ("Priority (non-preemptive)", priority_nonpreemptive),
        "5": ("Priority (preemptive)", priority_preemptive),
        "6": ("Round Robin", round_robin),
    }
    for k, (name, _) in options.items():
        print(f"{k}. {name}")
    choice = input("Choice (1-6): ").strip()
    if choice not in options:
        print("Invalid choice")
        return
    name, func = options[choice]
    print(f"\nRunning: {name}\n")
    if name.startswith("Round Robin"):
        try:
            q = int(input("Enter time quantum (integer, default 2): ") or "2")
        except ValueError:
            q = 2
        schedule = func(processes, quantum=q)
    else:
        schedule = func(processes)
    metrics = compute_metrics(schedule, processes)
    print_metrics(metrics)
    ascii_gantt(schedule)
    return schedule, metrics

def cli():
    print_header("CPU Scheduling Simulator - Python")
    use_example = input("Use example processes? (y/n) [y]: ").strip().lower() or "y"
    if use_example == "y":
        raw = example_processes()
    else:
        n = int(input("Enter number of processes: "))
        raw = []
        for i in range(n):
            a = int(input(f"Process {i+1} arrival time: "))
            b = int(input(f"Process {i+1} burst time: "))
            pr = int(input(f"Process {i+1} priority (lower number = higher priority) [0]: ") or "0")
            raw.append((a, b, pr))
    processes = parse_process_list(raw)
    print("\nProcesses:")
    for p in processes:
        print(f"P{p.pid}: arrival={p.arrival} burst={p.burst} priority={p.priority}")
    select_and_run(processes)
    print("Done.")

if __name__ == "__main__":
    cli()

