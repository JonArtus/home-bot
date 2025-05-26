from app_init import db # Import db from app_init.py in the root

class TaskDefinition(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(255), nullable=False)
    category = db.Column(db.String(100))
    priority = db.Column(db.String(50)) # e.g., Urgent, High, Medium, Low

    # We will add RecurrenceRule or DueDate later

    def __repr__(self):
        return f'<TaskDefinition {self.description}>'

    def to_dict(self):
        return {
            'id': self.id,
            'description': self.description,
            'category': self.category,
            'priority': self.priority
        } 