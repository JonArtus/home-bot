from app_init import create_app, db # Import from app_init.py in root
from models.models import TaskDefinition, TaskInstance, RecurrenceRule, Setting, Category # Import RecurrenceRule, Setting, and Category
from services import generate_task_instances, DEFAULT_MAX_INSTANCES_TO_GENERATE, DEFAULT_MAX_ADVANCE_GENERATION_MONTHS # Import the service and defaults
from flask import jsonify, request, send_from_directory # Keep send_from_directory
import os
from datetime import datetime, timezone # Import datetime and timezone

app = create_app() # Create app instance using the factory

# The /api/hello endpoint can be removed or kept for testing
@app.route('/api/hello')
def hello():
    return jsonify(message="Hello from updated Flask app!")

# --- Category API Endpoints ---
@app.route('/api/categories', methods=['GET'])
def get_categories():
    categories = Category.query.order_by(Category.short_name).all()
    return jsonify([cat.to_dict() for cat in categories])

@app.route('/api/categories', methods=['POST'])
def create_category():
    data = request.get_json() or {}
    if not data.get('short_name'):
        return jsonify({'error': 'Short name is required'}), 400
    
    # Prevent changing short_name (PK) via POST, should be via specific endpoint if ever needed
    # For now, we assume short_name is immutable once created.
    if db.session.get(Category, data['short_name']):
         return jsonify({'error': 'Category with this short name already exists'}), 409

    new_category = Category(short_name=data['short_name'], icon=data.get('icon'))
    db.session.add(new_category)
    db.session.commit()
    return jsonify(new_category.to_dict()), 201

@app.route('/api/categories/<string:short_name>', methods=['PUT'])
def update_category(short_name):
    category = db.session.get(Category, short_name)
    if not category:
        return jsonify({'error': 'Category not found'}), 404
    data = request.get_json() or {}
    # Only icon is updatable for now, short_name is PK and shouldn't be changed here.
    # If short_name were to be changed, it would be a more complex operation (new record, update FKs, delete old).
    if 'icon' in data:
        category.icon = data['icon']
    # Add other updatable fields here if necessary
    db.session.commit()
    return jsonify(category.to_dict())

@app.route('/api/categories/<string:short_name>', methods=['DELETE'])
def delete_category(short_name):
    category = db.session.get(Category, short_name)
    if not category:
        return jsonify({'error': 'Category not found'}), 404
    
    # Check if category is in use by any TaskDefinition
    if category.task_definitions:
        return jsonify({'error': 'Category is in use and cannot be deleted. Please reassign tasks first.'}), 400

    db.session.delete(category)
    db.session.commit()
    return jsonify({'message': 'Category deleted'}), 200

# --- TaskDefinition CRUD API Endpoints ---

@app.route('/api/task_definitions', methods=['POST'])
def create_task_definition():
    data = request.get_json() or {}
    if 'title' not in data or not data['title']:
        return jsonify({'error': 'Title is required'}), 400

    category_short_name = data.get('category_short_name')
    if category_short_name:
        category_obj = db.session.get(Category, category_short_name)
        if not category_obj:
            return jsonify({'error': f'Category "{category_short_name}" not found.'}), 400
    
    due_date_str = data.get('due_date')
    recurrence_data = data.get('recurrence_rule')
    if due_date_str and recurrence_data:
        return jsonify({'error': 'Cannot have both due_date and recurrence_rule.'}), 400
    due_date_obj = None
    if due_date_str:
        try:
            due_date_obj = datetime.fromisoformat(due_date_str.replace('Z', '+00:00'))
            if due_date_obj.tzinfo is None: due_date_obj = due_date_obj.replace(tzinfo=timezone.utc)
        except ValueError: return jsonify({'error': 'Invalid due_date format.'}), 400

    task_def = TaskDefinition(
        title=data['title'],
        description=data.get('description'),
        notes=data.get('notes'),
        category_short_name=category_short_name,
        priority=data.get('priority'),
        due_date=due_date_obj
    )
    db.session.add(task_def)
    # db.session.flush() # Flush to get task_def.id before creating rule/instance

    if recurrence_data:
        rule_type = recurrence_data.get('rule_type')
        if not rule_type: return jsonify({'error': 'Recurrence rule_type is required.'}), 400
        new_recurrence_rule = RecurrenceRule(task_definition=task_def, rule_type=rule_type, weekly_recurring_day=recurrence_data.get('weekly_recurring_day'), monthly_recurring_day=recurrence_data.get('monthly_recurring_day'))
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
    if 'title' in data and not data['title']:
         return jsonify({'error': 'Title cannot be empty'}), 400

    task_def.title = data.get('title', task_def.title)
    task_def.description = data.get('description', task_def.description) # Update short description
    task_def.notes = data.get('notes', task_def.notes)                   # Update notes
    task_def.priority = data.get('priority', task_def.priority)

    if 'category_short_name' in data:
        new_cat_short_name = data['category_short_name']
        if new_cat_short_name:
            category_obj = db.session.get(Category, new_cat_short_name)
            if not category_obj:
                return jsonify({'error': f'Category "{new_cat_short_name}" not found.'}), 400
            task_def.category_short_name = new_cat_short_name
            task_def.defined_category = category_obj # Ensure relationship is updated if accessed before commit
        else: # explicitly setting category to null
            task_def.category_short_name = None
            task_def.defined_category = None # Ensure relationship is updated
            
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
    
    # Idempotency: if already completed, do nothing or return current state with 200 OK
    if instance.status == 'Completed':
        return jsonify(instance.to_dict()), 200 

    instance.completion_date = datetime.now(timezone.utc) # Use timezone-aware datetime
    instance.status = 'Completed'
    db.session.commit()
    return jsonify(instance.to_dict())

# --- Settings API Endpoints ---
@app.route('/api/settings', methods=['GET'])
def get_settings():
    settings_db = Setting.query.all()
    settings_map = {s.key: s.value for s in settings_db}
    # Ensure defaults are present if not in DB for the frontend
    if 'MAX_INSTANCES_TO_GENERATE' not in settings_map:
        settings_map['MAX_INSTANCES_TO_GENERATE'] = str(DEFAULT_MAX_INSTANCES_TO_GENERATE)
    if 'MAX_ADVANCE_GENERATION_MONTHS' not in settings_map:
        settings_map['MAX_ADVANCE_GENERATION_MONTHS'] = str(DEFAULT_MAX_ADVANCE_GENERATION_MONTHS)
    return jsonify(settings_map)

@app.route('/api/settings', methods=['POST'])
def update_settings():
    data = request.get_json() or {}
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    allowed_keys = {'MAX_INSTANCES_TO_GENERATE', 'MAX_ADVANCE_GENERATION_MONTHS'} # Use a set for efficient lookup
    updated_settings = []
    errors = [] 

    for key, value in data.items():
        if key in allowed_keys:
            try:
                val_int = int(value)
                if val_int < 0:
                    errors.append(f'Invalid value for {key}: must be a non-negative integer.')
                    continue 
                value_str = str(val_int) # Store as string, but validated as int
            except ValueError:
                errors.append(f'Invalid value for {key}: must be an integer.')
                continue
            
            setting = db.session.get(Setting, key)
            if setting:
                setting.value = value_str
            else:
                setting = Setting(key=key, value=value_str)
                db.session.add(setting)
            updated_settings.append(key) # Keep track of what was processed
        else:
            # It might be better to collect all unknown keys and report once
            errors.append(f'Unknown or not-allowed setting key: {key}')
    
    if errors:
        return jsonify({'error': 'Failed to update settings.', 'details': errors}), 400

    if updated_settings:
        db.session.commit()
        return jsonify({'message': f'{len(updated_settings)} setting(s) updated successfully: {", ".join(updated_settings)}'}), 200
    else:
        return jsonify({'message': 'No valid settings were provided for update.'}), 200 # Or 400 if no valid keys were sent

# Function to bootstrap settings
def bootstrap_settings():
    defaults = {
        'MAX_INSTANCES_TO_GENERATE': str(DEFAULT_MAX_INSTANCES_TO_GENERATE),
        'MAX_ADVANCE_GENERATION_MONTHS': str(DEFAULT_MAX_ADVANCE_GENERATION_MONTHS)
    }
    for key, value_str in defaults.items():
        setting = db.session.get(Setting, key)
        if not setting:
            new_setting = Setting(key=key, value=value_str)
            db.session.add(new_setting)
    # Bootstrap Default Category
    if not db.session.get(Category, 'Default'):
        db.session.add(Category(short_name='Default', icon='📑')) # Default icon: Bookmark Tabs emoji
    db.session.commit()

# --- Static File Serving (for Preact frontend) ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    if path != "" and app.static_folder and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    elif app.static_folder and os.path.exists(os.path.join(app.static_folder, 'index.html')): # Check for index.html explicitly
        return send_from_directory(app.static_folder, 'index.html')
    else:
        # Consider a more specific error or a custom 404 page if index.html itself is missing
        app.logger.error(f"Static file not found: {path}. Static folder: {app.static_folder}")
        return jsonify(error="Resource not found or application not fully initialized."), 404


if __name__ == '__main__':
    with app.app_context(): # Ensure db operations have app context
        db.create_all() # Creates the database table if it doesn't exist
        bootstrap_settings() # Call bootstrap function
    app.run(debug=True) 