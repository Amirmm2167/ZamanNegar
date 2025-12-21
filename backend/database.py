import os
from sqlmodel import SQLModel, create_engine, Session

# 1. Configuration
# Get the DB URL from environment variable (injected by Docker/K8s)
# Example Postgres URL: postgresql://user:password@db_host:5432/db_name
database_url = os.getenv("DATABASE_URL", "sqlite:///database.db")

# 2. The Engine
connect_args = {}

# SQLite specific check (only needed if falling back to sqlite locally)
if database_url.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(database_url, echo=True, connect_args=connect_args)

# 3. Initialization
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# 4. Dependency Injection
def get_session():
    with Session(engine) as session:
        yield session