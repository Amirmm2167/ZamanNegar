import os
import json
import gzip
import time
from datetime import datetime, timedelta
from sqlmodel import Session, select, func, delete
from database import engine
from models import AnalyticsLog

# Absolute path for robustness
SNAPSHOT_DIR = os.path.join(os.getcwd(), "archives", "snapshots")

class SnapshotEngine:
    def __init__(self):
        try:
            if not os.path.exists(SNAPSHOT_DIR):
                os.makedirs(SNAPSHOT_DIR, exist_ok=True)
            self.enabled = True
        except OSError as e:
            print(f"WARNING: SnapshotEngine disabled. Permission denied: {e}")
            self.enabled = False

    def take_hourly_snapshot(self):
        """
        Runs the Analysis -> Summarize -> Archive -> Clean cycle.
        Returns a dict with operation status.
        """
        if not self.enabled:
            print("   -> Snapshot Engine is disabled.")
            return {"status": "error", "message": "Engine disabled due to permission issues"}

        print(f"[{datetime.now()}] 📸 Starting Hourly Snapshot...")
        
        cutoff_date = datetime.utcnow()

        with Session(engine) as session:
            # 1. Fetch Data
            logs = session.exec(select(AnalyticsLog)).all()
            
            if not logs:
                print("   -> No logs to snapshot. Skipping.")
                return {"status": "skipped", "message": "No logs found"}

            # 2. Calculate Stats
            total_logs = len(logs)
            error_count = sum(1 for l in logs if l.event_type == 'ERROR')
            unique_users = len(set(l.user_id for l in logs if l.user_id))
            
            actions = {}
            for l in logs:
                actions[l.event_type] = actions.get(l.event_type, 0) + 1

            # 3. Create Summary Object
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            summary = {
                "timestamp": timestamp_str,
                "range_end": str(cutoff_date),
                "stats": {
                    "total": total_logs,
                    "errors": error_count,
                    "users": unique_users
                },
                "breakdown": actions,
                "raw_file": f"snapshot_{timestamp_str}.json.gz"
            }

            # 4. Save Summary JSON
            summary_path = os.path.join(SNAPSHOT_DIR, f"summary_{timestamp_str}.json")
            try:
                with open(summary_path, 'w', encoding='utf-8') as f:
                    json.dump(summary, f, indent=2)
            except Exception as e:
                print(f"   -> Failed to write summary: {e}")
                return {"status": "error", "message": f"Summary write failed: {e}"}

            # 5. Save Raw Logs
            raw_path = os.path.join(SNAPSHOT_DIR, summary['raw_file'])
            try:
                data_to_save = [log.model_dump(mode='json') for log in logs]
                with gzip.open(raw_path, 'wt', encoding='UTF-8') as f:
                    json.dump(data_to_save, f)
            except Exception as e:
                print(f"   -> Failed to write raw backup: {e}")
                return {"status": "error", "message": f"Raw write failed: {e}"}

            # 6. Clean Database
            try:
                session.exec(delete(AnalyticsLog))
                session.commit()
                print(f"   -> Snapshot Complete! Archived {total_logs} records.")
                return {
                    "status": "success", 
                    "count": total_logs, 
                    "file": summary['raw_file']
                }
            except Exception as e:
                print(f"   -> Failed to clean DB: {e}")
                return {"status": "error", "message": f"DB Cleanup failed: {e}"}

    def get_snapshots(self):
        """List all available summaries for the frontend"""
        if not self.enabled: return []
        
        summaries = []
        if not os.path.exists(SNAPSHOT_DIR):
             return []

        for f in os.listdir(SNAPSHOT_DIR):
            if f.startswith("summary_") and f.endswith(".json"):
                path = os.path.join(SNAPSHOT_DIR, f)
                try:
                    with open(path, 'r') as file:
                        data = json.load(file)
                        summaries.append(data)
                except:
                    continue
        
        return sorted(summaries, key=lambda x: x['timestamp'], reverse=True)