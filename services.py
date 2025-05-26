from datetime import datetime, timedelta, date
from models.models import TaskInstance, RecurrenceRule, Setting # Import Setting
from app_init import db # Assuming db is initialized in app_init.py

# Default values, to be overridden by DB settings if they exist
DEFAULT_MAX_INSTANCES_TO_GENERATE = 4
DEFAULT_MAX_ADVANCE_GENERATION_MONTHS = 13

def get_setting_value(key, default_value):
    setting = db.session.get(Setting, key)
    if setting:
        try:
            return int(setting.value) # Assuming numeric settings for now
        except ValueError:
            return default_value # Fallback if value is not an int
    return default_value

def generate_task_instances(task_def, is_new_definition=True):
    """
    Generates future TaskInstances for a given TaskDefinition based on its RecurrenceRule.
    If is_new_definition is True, it generates all initial instances.
    If False (e.g., for a nightly job), it might only generate upcoming ones or fill gaps.
    """
    max_instances = get_setting_value('MAX_INSTANCES_TO_GENERATE', DEFAULT_MAX_INSTANCES_TO_GENERATE)
    max_advance_months = get_setting_value('MAX_ADVANCE_GENERATION_MONTHS', DEFAULT_MAX_ADVANCE_GENERATION_MONTHS)

    if not task_def.recurrence_rule:
        return # Not a recurring task

    # For now, let's clear existing future instances if we are re-generating for an existing definition.
    # A more sophisticated approach would be to only add new ones or update existing ones if their definition changed.
    # This simple clear and regenerate is easier for now, but be mindful of completed tasks.
    # We should only delete PENDING instances.
    if not is_new_definition:
        TaskInstance.query.filter(
            TaskInstance.task_definition_id == task_def.id,
            TaskInstance.due_date > datetime.utcnow(), # Only future instances
            TaskInstance.status == 'Pending'
        ).delete(synchronize_session=False)
        # db.session.commit() # Commit deletions if any

    rule = task_def.recurrence_rule
    generated_count = 0
    today = date.today()
    # Ensure we don't generate too far into the future, e.g., 13 months from today
    # This is a simple way to cap generation for all rule types for now.
    # For annual tasks specifically, we'd only generate one if it falls within this window.
    overall_end_date_cap = today + timedelta(days=max_advance_months * 30) # Approximate

    current_check_date = today

    if rule.rule_type == 'weekly':
        # weekly_recurring_day: 1 (Monday) to 7 (Sunday)
        # Python's weekday(): Monday is 0 and Sunday is 6
        target_weekday = rule.weekly_recurring_day - 1 
        
        # Start checking from today
        # Find the first occurrence on or after today
        days_ahead = target_weekday - current_check_date.weekday()
        if days_ahead < 0: # Target day already passed this week
            days_ahead += 7
        next_due_date_dt = datetime(current_check_date.year, current_check_date.month, current_check_date.day) + timedelta(days=days_ahead)

        while generated_count < max_instances and next_due_date_dt.date() <= overall_end_date_cap:
            # Check if an instance for this due date already exists (e.g. if not is_new_definition)
            exists = TaskInstance.query.filter_by(task_definition_id=task_def.id, due_date=next_due_date_dt).first()
            if not exists:
                instance = TaskInstance(
                    task_definition_id=task_def.id,
                    due_date=next_due_date_dt, # Store as datetime
                    status='Pending'
                )
                db.session.add(instance)
                generated_count += 1
            next_due_date_dt += timedelta(weeks=1)
            
    elif rule.rule_type == 'monthly':
        # monthly_recurring_day: 1 to 31
        target_day_of_month = rule.monthly_recurring_day
        
        # Start checking from the current month
        check_month_dt = datetime(current_check_date.year, current_check_date.month, 1)
        
        processed_months = 0
        # Limit how many months we iterate to avoid infinite loops with invalid day (e.g. 31st in Feb)
        # and to respect overall_end_date_cap
        max_months_to_check = max_advance_months + 2 # a little buffer

        while generated_count < max_instances and processed_months < max_months_to_check:
            year, month = check_month_dt.year, check_month_dt.month
            try:
                # Attempt to create the date for the target day in the current check_month_dt
                next_due_date_dt = datetime(year, month, target_day_of_month)
            except ValueError: # Day is invalid for the month (e.g., Feb 30th)
                # Skip this month, move to the first day of the next month
                if month == 12:
                    check_month_dt = datetime(year + 1, 1, 1)
                else:
                    check_month_dt = datetime(year, month + 1, 1)
                processed_months += 1
                continue

            if next_due_date_dt.date() < today:
                 # If this calculated date is in the past for the current month, try for next month's occurrence
                if month == 12:
                    check_month_dt = datetime(year + 1, 1, 1)
                else:
                    check_month_dt = datetime(year, month + 1, 1)
                processed_months += 1
                continue

            if next_due_date_dt.date() > overall_end_date_cap:
                break # Exceeded overall cap

            exists = TaskInstance.query.filter_by(task_definition_id=task_def.id, due_date=next_due_date_dt).first()
            if not exists:
                instance = TaskInstance(
                    task_definition_id=task_def.id,
                    due_date=next_due_date_dt,
                    status='Pending'
                )
                db.session.add(instance)
                generated_count += 1
            
            # Move to the first day of the next month for the next iteration
            if month == 12:
                check_month_dt = datetime(year + 1, 1, 1)
            else:
                check_month_dt = datetime(year, month + 1, 1)
            processed_months += 1

    # No explicit db.session.commit() here; assume it's handled by the caller (e.g., after API endpoint finishes)
    # However, if this service function is called from a background job, it might need to commit. 