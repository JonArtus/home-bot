from app_init import create_app, db # Import from app_init.py in root
from models.models import TaskDefinition, TaskInstance, RecurrenceRule # Import RecurrenceRule
from services import generate_task_instances # Import the service
from flask import jsonify, request, send_from_directory # Keep send_from_directory
import os
from datetime import datetime, timezone # Import datetime and timezone

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

    due_date_str = data.get('due_date')
    recurrence_data = data.get('recurrence_rule')

    if due_date_str and recurrence_data:
        return jsonify({'error': 'Cannot have both due_date and recurrence_rule.'}), 400

    due_date_obj = None
    if due_date_str:
        try:
            due_date_obj = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
            if due_date_obj.tzinfo is None: due_date_obj = due_date_obj.replace(tzinfo=timezone.utc)
        except ValueError:
            return jsonify({'error': 'Invalid due_date format.'}), 400

    task_def = TaskDefinition(
        description=data['description'],
        category=data.get('category'),
        priority=data.get('priority'),
        due_date=due_date_obj
    )
    db.session.add(task_def)
    # db.session.flush() # Flush to get task_def.id before creating rule/instance

    if recurrence_data:
        rule_type = recurrence_data.get('rule_type')
        if not rule_type:
            return jsonify({'error': 'Recurrence rule_type is required.'}), 400
        
        new_recurrence_rule = RecurrenceRule(
            task_definition=task_def, # Associate with the task_def directly
            rule_type=rule_type,
            weekly_recurring_day=recurrence_data.get('weekly_recurring_day'),
            monthly_recurring_day=recurrence_data.get('monthly_recurring_day')
        )
        db.session.add(new_recurrence_rule)
        # task_def.recurrence_rule = new_recurrence_rule # This is handled by backref if task_definition=task_def used
        db.session.flush() # Ensure rule is associated and task_def.id is available
        generate_task_instances(task_def, is_new_definition=True)
    elif due_date_obj: # One-off task instance creation
        db.session.flush() # Ensure task_def.id is available
        instance = TaskInstance(
            task_definition_id=task_def.id,
            due_date=due_date_obj,
            status='Pending'
        )
        db.session.add(instance)
    
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

    due_date_str = data.get('due_date')
    recurrence_data = data.get('recurrence_rule')

    if due_date_str and recurrence_data:
        return jsonify({'error': 'Cannot have both due_date and recurrence_rule for update.'}), 400

    # Handle Due Date Update (clearing or setting new)
    if 'due_date' in data: # Check if key exists, even if value is null
        if due_date_str:
            try:
                due_date_obj = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
                if due_date_obj.tzinfo is None: due_date_obj = due_date_obj.replace(tzinfo=timezone.utc)
                task_def.due_date = due_date_obj
                if task_def.recurrence_rule: # If it was recurring, now it's one-off
                    db.session.delete(task_def.recurrence_rule)
                    task_def.recurrence_rule = None
                    # Potentially delete old future instances and create one new one
                    TaskInstance.query.filter(TaskInstance.task_definition_id == task_def.id, TaskInstance.due_date > datetime.utcnow(), TaskInstance.status == 'Pending').delete(synchronize_session=False)
                    instance = TaskInstance(task_definition_id=task_def.id, due_date=due_date_obj, status='Pending')
                    db.session.add(instance)

            except ValueError:
                return jsonify({'error': 'Invalid due_date format for update.'}), 400
        else: # due_date is explicitly set to null/empty, clear it
            task_def.due_date = None
            # If it becomes neither one-off nor recurring, handle as needed (maybe error or clear instances)

    # Handle Recurrence Rule Update
    if 'recurrence_rule' in data:
        if recurrence_data: # If new recurrence data is provided
            task_def.due_date = None # Cannot be a one-off task anymore
            # Clear existing future instances before generating new ones
            TaskInstance.query.filter(TaskInstance.task_definition_id == task_def.id, TaskInstance.due_date > datetime.utcnow(), TaskInstance.status == 'Pending').delete(synchronize_session=False)
            
            if task_def.recurrence_rule:
                # Update existing rule
                task_def.recurrence_rule.rule_type = recurrence_data.get('rule_type', task_def.recurrence_rule.rule_type)
                task_def.recurrence_rule.weekly_recurring_day = recurrence_data.get('weekly_recurring_day')
                task_def.recurrence_rule.monthly_recurring_day = recurrence_data.get('monthly_recurring_day')
            else:
                # Create new rule
                new_rule = RecurrenceRule(
                    task_definition=task_def,
                    rule_type=recurrence_data.get('rule_type'),
                    weekly_recurring_day=recurrence_data.get('weekly_recurring_day'),
                    monthly_recurring_day=recurrence_data.get('monthly_recurring_day')
                )
                db.session.add(new_rule)
                # task_def.recurrence_rule = new_rule # Handled by backref
            db.session.flush() # Important: ensure rule is associated
            generate_task_instances(task_def, is_new_definition=False) # Regenerate based on new/updated rule
        else: # Recurrence rule is explicitly set to null (remove recurrence)
            if task_def.recurrence_rule:
                db.session.delete(task_def.recurrence_rule)
                task_def.recurrence_rule = None
                # Also delete future pending instances for this task def
                TaskInstance.query.filter(TaskInstance.task_definition_id == task_def.id, TaskInstance.due_date > datetime.utcnow(), TaskInstance.status == 'Pending').delete(synchronize_session=False)

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

# --- TaskInstance API Endpoints ---

@app.route('/api/task_instances', methods=['GET'])
def get_task_instances():
    instances = TaskInstance.query.order_by(TaskInstance.due_date).all()
    return jsonify([instance.to_dict() for instance in instances])

@app.route('/api/task_instances/<int:id>', methods=['GET'])
def get_task_instance(id):
    instance = db.session.get(TaskInstance, id)
    if instance is None:
        return jsonify({'error': 'Task instance not found'}), 404
    return jsonify(instance.to_dict())

@app.route('/api/task_instances/<int:id>/complete', methods=['PUT'])
def complete_task_instance(id):
    instance = db.session.get(TaskInstance, id)
    if instance is None:
        return jsonify({'error': 'Task instance not found'}), 404
    
    # Idempotency: if already completed, do nothing or return current state
    if instance.status == 'Completed':
        return jsonify(instance.to_dict()), 200 

    instance.completion_date = datetime.now(timezone.utc) # Use timezone-aware datetime
    instance.status = 'Completed'
    db.session.commit()
    return jsonify(instance.to_dict())

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