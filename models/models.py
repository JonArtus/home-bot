from app_init import db # Import db from app_init.py in the root
from datetime import datetime, timedelta # Import timedelta

# Ensure enums or choices are defined if used, or handle as strings/integers directly
# For simplicity, we'll use integers for day of week/month directly as requested.

class RecurrenceRule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_definition_id = db.Column(db.Integer, db.ForeignKey('task_definition.id'), unique=True, nullable=False)
    # rule_type helps distinguish: 'weekly', 'monthly' (future: 'daily', 'annually')
    rule_type = db.Column(db.String(50), nullable=False)
    
    # For weekly recurrence: 1 (Monday) to 7 (Sunday)
    weekly_recurring_day = db.Column(db.Integer, nullable=True) 
    # For monthly recurrence: 1 to 31
    monthly_recurring_day = db.Column(db.Integer, nullable=True)
    # We can add start_date and end_date for recurrence later if needed

    def __repr__(self):
        return f'<RecurrenceRule {self.id} for TaskDef {self.task_definition_id} - Type: {self.rule_type}>'

    def to_dict(self):
        return {
            'id': self.id,
            'task_definition_id': self.task_definition_id,
            'rule_type': self.rule_type,
            'weekly_recurring_day': self.weekly_recurring_day,
            'monthly_recurring_day': self.monthly_recurring_day
        }

class TaskDefinition(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False) # New: Task Title
    description = db.Column(db.String(255), nullable=True) # New: Short description
    notes = db.Column(db.Text, nullable=True) # Old description, now for detailed notes
    category = db.Column(db.String(100))
    priority = db.Column(db.String(50)) # e.g., Urgent, High, Medium, Low
    
    # For one-off tasks
    due_date = db.Column(db.DateTime, nullable=True)
    
    # For recurring tasks - establishes a one-to-one with RecurrenceRule
    recurrence_rule = db.relationship('RecurrenceRule', backref='task_definition', uselist=False, cascade="all, delete-orphan")

    # Relationship to TaskInstances
    # If a TaskDefinition is deleted, its instances are also deleted.
    instances = db.relationship('TaskInstance', backref='defined_task', lazy=True, cascade="all, delete-orphan") # Changed backref name slightly

    # We will add RecurrenceRule or DueDate later

    def __repr__(self):
        return f'<TaskDefinition {self.description}>'

    def to_dict(self):
        data = {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'notes': self.notes,
            'category': self.category,
            'priority': self.priority,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'recurrence_rule': self.recurrence_rule.to_dict() if self.recurrence_rule else None
        }
        return data

class TaskInstance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    # Changed ForeignKey to match new backref in TaskDefinition
    task_definition_id = db.Column(db.Integer, db.ForeignKey('task_definition.id'), nullable=False)
    # defined_task is available via backref from TaskDefinition.instances
    
    due_date = db.Column(db.DateTime, nullable=False)
    completion_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='Pending') # e.g., Pending, Completed, Overdue

    def __repr__(self):
        return f'<TaskInstance {self.id} for TaskDef {self.task_definition_id} - Status: {self.status}>'

    def to_dict(self):
        return {
            'id': self.id,
            'task_definition_id': self.task_definition_id,
            'task_definition_title': self.defined_task.title if self.defined_task else 'N/A', # Changed from description to title
            'task_definition_description': self.defined_task.description if self.defined_task else None, # New short description
            'task_definition_notes': self.defined_task.notes if self.defined_task else None, # New notes field
            'task_definition_category': self.defined_task.category if self.defined_task else None,
            'task_definition_priority': self.defined_task.priority if self.defined_task else None,
            'due_date': self.due_date.isoformat(),
            'completion_date': self.completion_date.isoformat() if self.completion_date else None,
            'status': self.status
        }

class Setting(db.Model):
    key = db.Column(db.String(50), primary_key=True)
    value = db.Column(db.String(255), nullable=False)

    def __repr__(self):
        return f'<Setting {self.key}={self.value}>'

    def to_dict(self):
        return {
            'key': self.key,
            'value': self.value
        } 