from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from config import Config # Import from root config.py

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    # Adjusted static_folder to point from root to app/dist
    app = Flask(__name__, static_folder='app/dist', static_url_path='') 
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)

    # Import models from the new models directory
    # To make this work, models/models.py will need to be importable.
    # We might need an __init__.py in the models directory.
    from models import models # Import from models.models

    # Register Blueprints here if you add them later
    # from .api import bp as api_bp # This would need adjustment too
    # app.register_blueprint(api_bp, url_prefix='/api')

    return app 