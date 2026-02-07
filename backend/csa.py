from sqlmodel import Session, select
from database import engine, create_db_and_tables
from models import User
from security import get_password_hash

def create_super_user():
    with Session(engine) as session:
        # 1. Check if superadmin exists
        statement = select(User).where(User.role == "superadmin")
        user = session.exec(statement).first()
        
        if user:
            print("Superadmin already exists.")
            return

        # 2. Create the user
        # Note: Superadmin doesn't need a company_id (it's null)
        super_user = User(
            username="admin",
            display_name="مدیر کل سیستم", # System Superadmin
            hashed_password=get_password_hash("123456"), # Change this in production!
            role="superadmin",
            company_id=None, 
            department_id=None
        )
        
        session.add(super_user)
        session.commit()
        print("✅ Superadmin created successfully!")
        print("Username: admin")
        print("Password: 123456")

if __name__ == "__main__":
    # Ensure tables exist first
    create_db_and_tables()
    create_super_user()