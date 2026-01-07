import os
import gzip
import json
from datetime import datetime, timedelta
from sqlmodel import Session, select, delete
from models import AnalyticsLog
from database import engine

# Use absolute path to ensure we are looking at /app/archives in Docker
ARCHIVE_DIR = os.path.join(os.getcwd(), "archives")

class ArchiveManager:
    def __init__(self):
        """
        Initialize the archive directory.
        If permission is denied (common in some Docker configs), log a warning 
        but DO NOT crash the app.
        """
        self.enabled = False
        try:
            if not os.path.exists(ARCHIVE_DIR):
                os.makedirs(ARCHIVE_DIR, exist_ok=True)
            self.enabled = True
        except OSError as e:
            print(f"WARNING: ArchiveManager disabled. Failed to create '{ARCHIVE_DIR}': {e}")

    def archive_logs(self, days_older_than: int = 30):
        """
        Moves logs older than X days from DB to a compressed JSON file.
        """
        if not self.enabled:
            return {"status": "error", "message": "Archiving disabled due to file permissions"}

        cutoff_date = datetime.utcnow() - timedelta(days=days_older_than)
        
        with Session(engine) as session:
            # 1. Select Old Logs
            statement = select(AnalyticsLog).where(AnalyticsLog.created_at < cutoff_date)
            logs = session.exec(statement).all()
            
            if not logs:
                return {"status": "no_data", "count": 0}

            # 2. Prepare Data
            try:
                data_to_save = [log.model_dump(mode='json') for log in logs]
            except Exception as e:
                 # Fallback for older SQLModel versions
                 data_to_save = [log.dict() for log in logs]
            
            # 3. Write to GZIP File
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"logs_archive_{timestamp}.json.gz"
            filepath = os.path.join(ARCHIVE_DIR, filename)
            
            try:
                with gzip.open(filepath, 'wt', encoding='UTF-8') as f:
                    json.dump(data_to_save, f)
            except OSError as e:
                print(f"ERROR: Failed to write archive file: {e}")
                return {"status": "error", "message": f"Write failed: {e}"}
            
            # 4. Delete from DB
            # We delete only after successful write
            delete_statement = delete(AnalyticsLog).where(AnalyticsLog.created_at < cutoff_date)
            session.exec(delete_statement)
            session.commit()
            
            try:
                file_size_kb = os.path.getsize(filepath) / 1024
            except:
                file_size_kb = 0

            return {
                "status": "archived",
                "count": len(logs),
                "filename": filename,
                "size_kb": round(file_size_kb, 2),
                "freed_rows": len(logs)
            }

    def list_archives(self):
        """
        Returns a list of available archive files.
        """
        if not self.enabled or not os.path.exists(ARCHIVE_DIR):
            return []
            
        files = []
        try:
            for f in os.listdir(ARCHIVE_DIR):
                if f.endswith(".gz"):
                    path = os.path.join(ARCHIVE_DIR, f)
                    try:
                        files.append({
                            "filename": f,
                            "size_kb": round(os.path.getsize(path) / 1024, 2),
                            "created_at": datetime.fromtimestamp(os.path.getctime(path))
                        })
                    except OSError:
                        continue 
        except OSError:
            return []

        return sorted(files, key=lambda x: x['created_at'], reverse=True)