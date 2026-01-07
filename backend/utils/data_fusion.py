import os
import json
from datetime import datetime, timedelta
from sqlmodel import Session, select, func
from database import engine
from models import AnalyticsLog
# Ensure this path matches your SnapshotEngine path
SNAPSHOT_DIR = os.path.join(os.getcwd(), "archives", "snapshots")

class DataFusionEngine:
    """
    Merges Hot Data (DB) with Cold Data (Snapshots) 
    to provide unified analytics without restoring backups.
    """
    
    def get_time_series(self, range_key: str):
        """
        range_key: '1h', '24h', '7d', '30d'
        Returns: List of {date: str, count: int, errors: int}
        """
        now = datetime.utcnow()
        
        # 1. Determine Window
        if range_key == '1h': start_time = now - timedelta(hours=1)
        elif range_key == '24h': start_time = now - timedelta(hours=24)
        elif range_key == '7d': start_time = now - timedelta(days=7)
        else: start_time = now - timedelta(days=30)

        data_points = []

        # 2. READ COLD DATA (From JSON Summaries)
        if os.path.exists(SNAPSHOT_DIR):
            for f in sorted(os.listdir(SNAPSHOT_DIR)):
                if f.startswith("summary_") and f.endswith(".json"):
                    try:
                        # Filename: summary_YYYYMMDD_HHMMSS.json
                        ts_part = f.replace("summary_", "").replace(".json", "")
                        file_time = datetime.strptime(ts_part, "%Y%m%d_%H%M%S")
                        
                        if file_time > start_time:
                            with open(os.path.join(SNAPSHOT_DIR, f), 'r') as file:
                                content = json.load(file)
                                data_points.append({
                                    "timestamp": file_time,
                                    "total": content['stats']['total'],
                                    "errors": content['stats']['errors'],
                                    "type": "archive"
                                })
                    except: continue

        # 3. READ HOT DATA (From DB - The gap between last snapshot and now)
        with Session(engine) as session:
            # Fetch logs created AFTER the start time
            logs = session.exec(select(AnalyticsLog).where(AnalyticsLog.created_at >= start_time)).all()
            
            if range_key == '1h':
                # Minute-by-minute aggregation for live logs (High Resolution)
                buckets = {}
                for log in logs:
                    # Key: YYYY-MM-DD HH:MM
                    minute_key = log.created_at.replace(second=0, microsecond=0)
                    if minute_key not in buckets: 
                        buckets[minute_key] = {"total": 0, "errors": 0}
                    
                    buckets[minute_key]["total"] += 1
                    if log.event_type == 'ERROR': 
                        buckets[minute_key]["errors"] += 1
                
                for t, stats in buckets.items():
                    data_points.append({
                        "timestamp": t,
                        "total": stats["total"],
                        "errors": stats["errors"],
                        "type": "live"
                    })
            else:
                # Aggregate total live logs into one "Current" point for larger ranges
                total_live = len(logs)
                errors_live = sum(1 for l in logs if l.event_type == 'ERROR')
                if total_live > 0:
                    data_points.append({
                        "timestamp": now,
                        "total": total_live,
                        "errors": errors_live,
                        "type": "live"
                    })

        # 4. Sort and Format
        data_points.sort(key=lambda x: x['timestamp'])
        
        formatted = []
        for dp in data_points:
            # Format depends on granularity
            fmt = "%H:%M" if range_key == '1h' else "%m-%d %H:%M"
            formatted.append({
                "date": dp['timestamp'].strftime(fmt),
                "total": dp['total'],
                "errors": dp['errors'],
                "source": dp['type']
            })
            
        return formatted

    def get_aggregated_analysis(self):
        """
        Returns merged breakdown of actions (e.g., LOGIN: 500) from Files + DB
        """
        action_map = {}

        # 1. Summaries (Cold)
        if os.path.exists(SNAPSHOT_DIR):
            for f in os.listdir(SNAPSHOT_DIR):
                if f.startswith("summary_"):
                    try:
                        with open(os.path.join(SNAPSHOT_DIR, f)) as file:
                            data = json.load(file)
                            for k, v in data.get('breakdown', {}).items():
                                action_map[k] = action_map.get(k, 0) + v
                    except: continue

        # 2. Live DB (Hot)
        with Session(engine) as session:
            # Group by event_type
            results = session.exec(select(AnalyticsLog.event_type)).all()
            for et in results:
                action_map[et] = action_map.get(et, 0) + 1

        return [{"name": k, "value": v} for k, v in action_map.items()]