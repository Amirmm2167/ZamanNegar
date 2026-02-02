import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models, database 
from routers import auth, events, departments, users, superadmin, holidays, issues, tags, analytics
from utils.logger import LogMiddleware
from utils.snapshot_engine import SnapshotEngine # NEW

# Background Task Loop
async def run_scheduler():
    snapshot_engine = SnapshotEngine()
    print("⏳ Scheduler started: Snapshots will run every 60 minutes.")
    
    while True:
        # Wait 60 minutes (3600 seconds)
        # We wait first so we don't clear the DB immediately on restart
        await asyncio.sleep(3600) 
        
        try:
            snapshot_engine.take_hourly_snapshot()
        except Exception as e:
            print(f"❌ Scheduler Error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Startup: Creating database tables...")
    database.create_db_and_tables()
    
    # Start Scheduler in Background
    asyncio.create_task(run_scheduler())
    
    yield
    print("Shutdown: Cleaning up...")

app = FastAPI(lifespan=lifespan)

# Add Logger FIRST
app.add_middleware(LogMiddleware)

origins = [
    "http://localhost:3000",
    os.getenv("FRONTEND_URL","http://localhost:3000"),
    "https://mohaman.ir",
    "https://api.mohaman.ir",
    "http://localhost:8000",
    "127.0.0.1:3000",
    "127.0.0.1:80",
    "localhost:80",
    "192.168.1.31:3000",
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(events.router, prefix="/events", tags=["Events"]) 
app.include_router(departments.router, prefix="/departments", tags=["Departments"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(superadmin.router, prefix="/superadmin", tags=["SuperAdmin"])
app.include_router(holidays.router, prefix="/holidays", tags=["Holidays"])
app.include_router(issues.router, prefix="/issues", tags=["Issues"])
app.include_router(tags.router, prefix="/tags", tags=["Tags"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

@app.get("/")
def read_root():
    return {"message": "Calendar API is running!", "status": "robust"}