import os
from dotenv import load_dotenv

load_dotenv()  

class Config:
    SECRET_KEY = os.urandom(24)
    SQLALCHEMY_DATABASE_URI = "postgresql://postgres.awycoggvfjvkoauzbhqw:L5cXxtG1tTXF7Z9W@aws-0-us-east-1.pooler.supabase.com:6543/postgres" #os.environ.get('DATABASE_URL') or os.environ.get('POSTGES_URL')    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max upload size
