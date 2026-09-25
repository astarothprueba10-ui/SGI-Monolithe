#!/usr/bin/env python3
import json
import subprocess
import time
import re

SPRINT_DATES = {
    "S0": ("2026-08-17", "2026-08-26"),
    "S1": ("2026-08-27", "2026-09-07"),
    "S2": ("2026-09-07", "2026-09-18"),
    "S3": ("2026-09-21", "2026-10-02"),
    "S4": ("2026-10-05", "2026-10-16"),
    "S5": ("2026-10-19", "2026-10-30"),
    "S6": ("2026-11-02", "2026-11-13"),
    "S7": ("2026-11-16", "2026-11-27"),
    "S8": ("2026-11-30", "2026-12-04"),
}

PROJECT_ID = "PVT_kwHOE2BQ5s4BkfML"
START_FIELD_ID = "PVTF_lAHOE2BQ5s4BkfMLzhjPnK4"
TARGET_FIELD_ID = "PVTF_lAHOE2BQ5s4BkfMLzhjPnK8"
STATUS_FIELD_ID = "PVTSSF_lAHOE2BQ5s4BkfMLzhjPm9U"

STATUS_DONE = "98236657"
STATUS_IN_PROGRESS = "47fc9ee4"
STATUS_TODO = "f75ad846"

def get_items():
    cmd = ['gh', 'project', 'item-list', '2', '--owner', 'astarothprueba10-ui', '--limit', '250', '--format', 'json']
    res = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(res.stdout).get('items', [])

def update_field(item_id, field_id, flag, value):
    cmd = [
        'gh', 'project', 'item-edit',
        '--id', item_id,
        '--project-id', PROJECT_ID,
        '--field-id', field_id,
        flag, value
    ]
    subprocess.run(cmd, capture_output=True, text=True)

def main():
    items = get_items()
    print(f"Total de items a procesar: {len(items)}")

    for i, it in enumerate(items):
        item_id = it['id']
        title = it.get('title', '')
        
        match = re.search(r'\[(S[0-8])\]', title)
        if not match:
            continue
        
        sprint_code = match.group(1)
        start_date, target_date = SPRINT_DATES.get(sprint_code, (None, None))
        
        if start_date and target_date:
            print(f"[{i+1}/{len(items)}] {sprint_code}: {title[:40]}...")
            update_field(item_id, START_FIELD_ID, '--date', start_date)
            update_field(item_id, TARGET_FIELD_ID, '--date', target_date)
            
            if sprint_code in ["S0", "S1", "S2"]:
                update_field(item_id, STATUS_FIELD_ID, '--single-select-option-id', STATUS_DONE)
            elif sprint_code == "S3":
                update_field(item_id, STATUS_FIELD_ID, '--single-select-option-id', STATUS_IN_PROGRESS)
            else:
                update_field(item_id, STATUS_FIELD_ID, '--single-select-option-id', STATUS_TODO)
            
            time.sleep(0.05)

    print("Proceso completado exitosamente.")

if __name__ == '__main__':
    main()
