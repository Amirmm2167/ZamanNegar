import os
import json
import gzip
import tempfile
from datetime import datetime
from sqlmodel import Session, select, delete
from database import engine
from models import AnalyticsLog

class SnapshotEngine:
    def __init__(self):
        # Try main directory first, fallback to /tmp if permission denied
        self.storage_path = os.path.join(os.getcwd(), "archives", "snapshots")
        self.enabled = False
        
        try:
            if not os.path.exists(self.storage_path):
                os.makedirs(self.storage_path, exist_ok=True)
            # Test write permission
            test_file = os.path.join(self.storage_path, ".test")
            with open(test_file, 'w') as f: f.write("test")
            os.remove(test_file)
            self.enabled = True
        except OSError:
            print(f"WARNING: Main archive dir readonly. Switching to /tmp...")
            try:
                self.storage_path = os.path.join(tempfile.gettempdir(), "zaman_archives")
                os.makedirs(self.storage_path, exist_ok=True)
                self.enabled = True
                print(f"SUCCESS: Using fallback storage at {self.storage_path}")
            except OSError as e:
                print(f"CRITICAL: SnapshotEngine disabled. No writable paths. {e}")

    def take_hourly_snapshot(self):
        if not self.enabled:
            return {"status": "error", "message": "Storage system unavailable"}

        cutoff_date = datetime.utcnow()

        with Session(engine) as session:
            logs = session.exec(select(AnalyticsLog)).all()
            
            if not logs:
                return {"status": "skipped", "message": "No logs to snapshot"}

            # Stats
            total = len(logs)
            errors = sum(1 for l in logs if l.event_type == 'ERROR')
            users = len(set(l.user_id for l in logs if l.user_id))
            breakdown = {}
            for l in logs:
                breakdown[l.event_type] = breakdown.get(l.event_type, 0) + 1

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename_raw = f"snapshot_{timestamp}.json.gz"
            filename_meta = f"summary_{timestamp}.json"

            # Prepare Summary
            summary = {
                "timestamp": timestamp,
                "stats": { "total": total, "errors": errors, "users": users },
                "breakdown": breakdown,
                "raw_file": filename_raw
            }

            try:
                # Save Raw
                path_raw = os.path.join(self.storage_path, filename_raw)
                data = [l.model_dump(mode='json') for l in logs]
                with gzip.open(path_raw, 'wt', encoding='UTF-8') as f:
                    json.dump(data, f)

                # Save Meta
                path_meta = os.path.join(self.storage_path, filename_meta)
                with open(path_meta, 'w') as f:
                    json.dump(summary, f)

                # Clean DB
                session.exec(delete(AnalyticsLog))
                session.commit()
                
                return {"status": "success", "count": total, "path": path_meta}
                
            except Exception as e:
                print(f"Snapshot Failed: {e}")
                return {"status": "error", "message": str(e)}

    def get_snapshots(self):
        if not self.enabled or not os.path.exists(self.storage_path):
            return []
        
        results = []
        for f in os.listdir(self.storage_path):
            if f.startswith("summary_") and f.endswith(".json"):
                try:
                    with open(os.path.join(self.storage_path, f)) as file:
                        results.append(json.load(file))
                except: continue
        return sorted(results, key=lambda x: x['timestamp'], reverse=True)