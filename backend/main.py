import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models, database 
from routers import auth, events, departments, users, superadmin, holidays, issues, tags, analytics
from utils.logger import LogMiddleware
from utils.snapshot_engine import SnapshotEngine
from middleware import ContextMiddleware # <--- NEW IMPORT

# Background Task Loop
async def run_scheduler():
    snapshot_engine = SnapshotEngine()
    print("⏳ Scheduler started: Snapshots will run every 60 minutes.")
    
    while True:
        await asyncio.sleep(3600) 
        try:
            snapshot_engine.take_hourly_snapshot()
        except Exception as e:
            print(f"❌ Scheduler Error: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Startup: Creating database tables...")
    database.create_db_and_tables()
    asyncio.create_task(run_scheduler())
    yield
    print("Shutdown: Cleaning up...")

app = FastAPI(lifespan=lifespan)

# Middlewares
app.add_middleware(LogMiddleware)
app.add_middleware(ContextMiddleware) # <--- REGISTERED HERE

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

# Note: Ideally replace "*" with specific origins for security, especially with credentials
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