import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import models, database 
from routers import auth, events, departments,users,superadmin, holidays, issues, tags

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Startup: Creating database tables...")
    database.create_db_and_tables()
    yield
    print("Shutdown: Cleaning up...")

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", "http://localhost:3000"),
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

@app.get("/")
def read_root():
    return {"message": "Calendar API is running!", "status": "robust"}