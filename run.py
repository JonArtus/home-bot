from app_init import create_app, db # Import from app_init.py in root
from models.models import TaskDefinition # Import from models/models.py
from flask import jsonify, request, send_from_directory # Keep send_from_directory
import os

app = create_app() # Create app instance using the factory

# The /api/hello endpoint can be removed or kept for testing
@app.route('/api/hello')
def hello():
    return jsonify(message="Hello from updated Flask app!")

# --- TaskDefinition CRUD API Endpoints ---

@app.route('/api/task_definitions', methods=['POST'])
def create_task_definition():
    data = request.get_json() or {}
    if 'description' not in data or not data['description']:
        return jsonify({'error': 'Description is required'}), 400
    
    task_def = TaskDefinition(
        description=data['description'],
        category=data.get('category'),
        priority=data.get('priority')
    )
    db.session.add(task_def)
    db.session.commit()
    return jsonify(task_def.to_dict()), 201

@app.route('/api/task_definitions', methods=['GET'])
def get_task_definitions():
    tasks = TaskDefinition.query.all()
    return jsonify([task.to_dict() for task in tasks])

@app.route('/api/task_definitions/<int:id>', methods=['GET'])
def get_task_definition(id):
    task_def = db.session.get(TaskDefinition, id) # Use db.session.get for SQLAlchemy 2.0+
    if task_def is None:
        return jsonify({'error': 'Task definition not found'}), 404
    return jsonify(task_def.to_dict())

@app.route('/api/task_definitions/<int:id>', methods=['PUT'])
def update_task_definition(id):
    task_def = db.session.get(TaskDefinition, id)
    if task_def is None:
        return jsonify({'error': 'Task definition not found'}), 404
    
    data = request.get_json() or {}
    if 'description' in data and not data['description']:
         return jsonify({'error': 'Description cannot be empty'}), 400

    task_def.description = data.get('description', task_def.description)
    task_def.category = data.get('category', task_def.category)
    task_def.priority = data.get('priority', task_def.priority)
    db.session.commit()
    return jsonify(task_def.to_dict())

@app.route('/api/task_definitions/<int:id>', methods=['DELETE'])
def delete_task_definition(id):
    task_def = db.session.get(TaskDefinition, id)
    if task_def is None:
        return jsonify({'error': 'Task definition not found'}), 404
    db.session.delete(task_def)
    db.session.commit()
    return jsonify({'message': 'Task definition deleted'}), 200

# --- Static File Serving (for Preact frontend) ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    if path != "" and app.static_folder and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    elif app.static_folder: # Check if static_folder is not None
        return send_from_directory(app.static_folder, 'index.html')
    else:
        return "Static folder not configured", 500


if __name__ == '__main__':
    with app.app_context(): # Ensure db operations have app context
        db.create_all() # Creates the database table if it doesn't exist
    app.run(debug=True) 