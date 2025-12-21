from sqlmodel import SQLModel, create_engine, Session

# 1. Configuration
# We use SQLite for development because it's a single file. 
# It's easy to delete and recreate.
sqlite_file_name = "database.db"
sqlite_url = f"sqlite:///{sqlite_file_name}"

# 2. The Engine
# check_same_thread=False is required for SQLite when using FastAPI
connect_args = {"check_same_thread": False}
engine = create_engine(sqlite_url, echo=True, connect_args=connect_args)

# 3. Initialization
def create_db_and_tables():
    # This magic line looks at all imported models and generates 
    # the "CREATE TABLE" SQL commands for them.
    SQLModel.metadata.create_all(engine)

# 4. Dependency Injection
def get_session():
    """
    Opens a fresh connection for a single request, 
    then closes it automatically.
    """
    with Session(engine) as session:
        yield session