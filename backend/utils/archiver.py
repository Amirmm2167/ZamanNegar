import os
import gzip
import json
from datetime import datetime, timedelta
from sqlmodel import Session, select, delete
from models import AnalyticsLog
from database import engine

ARCHIVE_DIR = "archives"

class ArchiveManager:
    def __init__(self):
        if not os.path.exists(ARCHIVE_DIR):
            os.makedirs(ARCHIVE_DIR)

    def archive_logs(self, days_older_than: int = 30):
        """
        Moves logs older than X days from DB to a compressed JSON file.
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_older_than)
        
        with Session(engine) as session:
            # 1. Select Old Logs
            statement = select(AnalyticsLog).where(AnalyticsLog.created_at < cutoff_date)
            logs = session.exec(statement).all()
            
            if not logs:
                return {"status": "no_data", "count": 0}

            # 2. Prepare Data
            data_to_save = [log.model_dump(mode='json') for log in logs]
            
            # 3. Write to GZIP File
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"logs_archive_{timestamp}.json.gz"
            filepath = os.path.join(ARCHIVE_DIR, filename)
            
            with gzip.open(filepath, 'wt', encoding='UTF-8') as f:
                json.dump(data_to_save, f)
            
            # 4. Delete from DB
            # Note: In SQLModel/SQLAlchemy, mass delete is safer via distinct execution
            # But for simple logic, we use the where clause again
            delete_statement = delete(AnalyticsLog).where(AnalyticsLog.created_at < cutoff_date)
            session.exec(delete_statement)
            session.commit()
            
            file_size_kb = os.path.getsize(filepath) / 1024

            return {
                "status": "archived",
                "count": len(logs),
                "filename": filename,
                "size_kb": round(file_size_kb, 2),
                "freed_rows": len(logs)
            }

    def list_archives(self):
        files = []
        for f in os.listdir(ARCHIVE_DIR):
            if f.endswith(".gz"):
                path = os.path.join(ARCHIVE_DIR, f)
                files.append({
                    "filename": f,
                    "size_kb": round(os.path.getsize(path) / 1024, 2),
                    "created_at": datetime.fromtimestamp(os.path.getctime(path))
                })
        return sorted(files, key=lambda x: x['created_at'], reverse=True)