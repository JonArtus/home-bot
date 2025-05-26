import os

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or \
        'sqlite:///app.db' # Will create app.db in the root project directory
    SQLALCHEMY_TRACK_MODIFICATIONS = False 