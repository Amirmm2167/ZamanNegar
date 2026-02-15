import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import create_db_and_tables
from routers import auth, events, users, companies, departments, holidays, tags, analytics, superadmin, notifications

# 1. IMPORT YOUR CUSTOM MIDDLEWARE
from middleware import ContextMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

# 2. ADD CORS MIDDLEWARE (Must be last to wrap everything)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]


app.add_middleware(ContextMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Session-ID", "X-Company-ID"]
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(companies.router, prefix="/companies", tags=["Companies"])
app.include_router(departments.router, prefix="/departments", tags=["Departments"])
app.include_router(events.router, prefix="/events", tags=["Events"])
app.include_router(holidays.router, prefix="/holidays", tags=["Holidays"])
app.include_router(tags.router, prefix="/tags", tags=["Tags"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(superadmin.router, prefix="/superadmin", tags=["SuperAdmin"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

@app.get("/")
def read_root():
    return {"message": "ZamanNegar API is running"}