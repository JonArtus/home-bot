import { useState, useEffect } from 'preact/hooks';

// Modal Component (Bulma styled)
function Modal({ isOpen, onClose, children, title }) {
  if (!isOpen) return null;
  return (
    <div class="modal is-active">
      <div class="modal-background" onClick={onClose}></div>
      <div class="modal-card">
        <header class="modal-card-head">
          <p class="modal-card-title">{title || 'Modal'}</p>
          <button class="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section class="modal-card-body">
          {children}
        </section>
        {/* Footer can be added here if needed, e.g., for form submission buttons if not in children */}
      </div>
    </div>
  );
}

// TaskDefinitionForm (Bulma styled)
function TaskDefinitionForm({ onTaskDefinitionAdded, closeModal }) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [taskType, setTaskType] = useState('one-off');
  const [dueDate, setDueDate] = useState('');
  const [recurrenceRuleType, setRecurrenceRuleType] = useState('weekly');
  const [weeklyDay, setWeeklyDay] = useState(1);
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    let taskData = { description, category, priority };

    if (taskType === 'one-off') {
      if (!dueDate) {
        setError('Due date is required for one-off tasks.');
        return;
      }
      try {
        taskData.due_date = new Date(dueDate + "T00:00:00Z").toISOString();
      } catch (dateError) {
        setError('Invalid date format for Due Date.');
        return;
      }
    } else {
      let recurrence_rule = { rule_type: recurrenceRuleType };
      if (recurrenceRuleType === 'weekly') {
        if (!weeklyDay || weeklyDay < 1 || weeklyDay > 7) {
          setError('Valid day (1-7) for weekly recurrence.');
          return;
        }
        recurrence_rule.weekly_recurring_day = parseInt(weeklyDay, 10);
      } else if (recurrenceRuleType === 'monthly') {
        if (!monthlyDay || monthlyDay < 1 || monthlyDay > 31) {
          setError('Valid day (1-31) for monthly recurrence.');
          return;
        }
        recurrence_rule.monthly_recurring_day = parseInt(monthlyDay, 10);
      }
      taskData.recurrence_rule = recurrence_rule;
    }

    try {
      const response = await fetch('/api/task_definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData)
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create task');
      }
      const newTaskDef = await response.json();
      onTaskDefinitionAdded(newTaskDef);
      // Reset form fields
      setDescription('');
      setCategory('');
      setPriority('Medium');
      setTaskType('one-off');
      setDueDate('');
      setRecurrenceRuleType('weekly');
      setWeeklyDay(1);
      setMonthlyDay(1);
      closeModal();
    } catch (err) {
      console.error("Error creating task definition:", err);
      setError(err.message || "Error creating task. Please try again.");
    }
  };
  
  // Helper to render form fields consistently with Bulma
  const RenderField = ({ label, id, children, helpText }) => (
    <div class="field">
      <label class="label" htmlFor={id}>{label}</label>
      <div class="control">
        {children}
      </div>
      {helpText && <p class="help">{helpText}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      {error && <div class="notification is-danger">{error}</div>}
      
      <RenderField label="Description *" id="desc">
        <input type="text" id="desc" value={description} onInput={e => setDescription(e.currentTarget.value)} required class="input" />
      </RenderField>
      <RenderField label="Category" id="cat">
        <input type="text" id="cat" value={category} onInput={e => setCategory(e.currentTarget.value)} class="input" />
      </RenderField>
      <RenderField label="Priority" id="prio">
        <div class="select is-fullwidth">
          <select id="prio" value={priority} onChange={e => setPriority(e.currentTarget.value)}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
      </RenderField>
      <RenderField label="Task Type" id="type">
        <div class="select is-fullwidth">
          <select id="type" value={taskType} onChange={e => setTaskType(e.currentTarget.value)}>
            <option value="one-off">One-off</option>
            <option value="recurring">Recurring</option>
          </select>
        </div>
      </RenderField>

      {taskType === 'one-off' && (
        <RenderField label="Due Date *" id="dueD">
          <input type="date" id="dueD" value={dueDate} onInput={e => setDueDate(e.currentTarget.value)} class="input" required />
        </RenderField>
      )}
      {taskType === 'recurring' && (
        <div class="box" style={{border: '1px solid #ddd', marginTop: '1em', marginBottom: '1em'}}> {/* Simple box for grouping */}
          <p class="title is-5">Recurrence Rule</p>
          <RenderField label="Rule Type" id="recType">
            <div class="select is-fullwidth">
              <select id="recType" value={recurrenceRuleType} onChange={e => setRecurrenceRuleType(e.currentTarget.value)}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </RenderField>
          {recurrenceRuleType === 'weekly' && (
            <RenderField label="Day of Week (1=Mon, 7=Sun)" id="wDay">
              <input type="number" id="wDay" min="1" max="7" value={weeklyDay} onInput={e => setWeeklyDay(parseInt(e.currentTarget.value, 10))} class="input" />
            </RenderField>
          )}
          {recurrenceRuleType === 'monthly' && (
            <RenderField label="Day of Month (1-31)" id="mDay">
              <input type="number" id="mDay" min="1" max="31" value={monthlyDay} onInput={e => setMonthlyDay(parseInt(e.currentTarget.value, 10))} class="input" />
            </RenderField>
          )}
        </div>
      )}
      <div class="field is-grouped is-grouped-right" style={{marginTop: '1.5em'}}>
        <div class="control">
          <button type="button" class="button is-light" onClick={closeModal}>Cancel</button>
        </div>
        <div class="control">
          <button type="submit" class="button is-primary">Create Definition</button>
        </div>
      </div>
    </form>
  );
}

// Task Instance Item Component (Bulma styled)
function TaskInstanceItem({ instance, onComplete }) {
  const { 
    id, task_definition_description, due_date, 
    task_definition_category, task_definition_priority, status 
  } = instance;

  const isCompleted = status === 'Completed';
  const dueDateObj = new Date(due_date);
  const isOverdue = !isCompleted && dueDateObj < new Date();

  let cardClasses = "box"; // Bulma box for each item
  if (isCompleted) cardClasses += " has-background-light";
  if (isOverdue) cardClasses += " has-background-danger-light"; // Or use a border

  let priorityTagClass = "tag";
  if (task_definition_priority === 'Urgent') priorityTagClass += " is-danger";
  else if (task_definition_priority === 'High') priorityTagClass += " is-warning";
  else if (task_definition_priority === 'Medium') priorityTagClass += " is-info";
  else priorityTagClass += " is-light";
  
  return (
    <div class={cardClasses} style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <p class={`title is-5 ${isCompleted ? 'has-text-grey-light' : ''}`} style={isCompleted ? {textDecoration: 'line-through'} : {}}>
          {task_definition_description}
        </p>
        <div class="tags are-small">
          <span class="tag is-info is-light">Due: {dueDateObj.toLocaleDateString()}</span>
          {task_definition_category && <span class="tag is-light">Cat: {task_definition_category}</span>}
          {task_definition_priority && <span class={priorityTagClass}>Prio: {task_definition_priority}</span>}
          <span class={`tag ${isCompleted ? 'is-success' : 'is-link is-light'}`}>{status}</span>
        </div>
      </div>
      {!isCompleted && (
        <button 
          onClick={() => onComplete(id)} 
          class="button is-success is-outlined"
          title="Mark as Complete"
        >
          <span>✔️</span>
        </button>
      )}
    </div>
  );
}

// Task Definition Item (Bulma styled - for debugging list)
function TaskDefinitionItem({ definition, onDelete }) {
  const { id, description, category, priority, due_date, recurrence_rule } = definition;
  return (
    <div class="box" style={{ marginBottom: '0.5rem', padding: '0.75rem' }}>
      <div class="level">
        <div class="level-left">
          <div class="level-item">
            <div>
              <p class="title is-6">{description}</p>
              <p class="subtitle is-7">
                ID: {id} | Cat: {category || 'N/A'} | Prio: {priority || 'N/A'}
              </p>
              {due_date && <p class="is-size-7">One-off Due: {new Date(due_date).toLocaleDateString()}</p>}
              {recurrence_rule && (
                <p class="is-size-7">
                  Recurring: {recurrence_rule.rule_type} 
                  {recurrence_rule.weekly_recurring_day && ` (Day: ${recurrence_rule.weekly_recurring_day})`}
                  {recurrence_rule.monthly_recurring_day && ` (Day: ${recurrence_rule.monthly_recurring_day})`}
                </p>
              )}
            </div>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <button class="button is-danger is-outlined is-small" onClick={() => onDelete(id)}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const [taskInstances, setTaskInstances] = useState([]);
  const [taskDefinitions, setTaskDefinitions] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Simplified loading state
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = () => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      fetch('/api/task_instances').then(res => {
        if (!res.ok) return res.json().then(err => Promise.reject(err));
        return res.json();
      }),
      fetch('/api/task_definitions').then(res => {
        if (!res.ok) return res.json().then(err => Promise.reject(err));
        return res.json();
      })
    ])
    .then(([instances, definitions]) => {
      setTaskInstances(instances.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)));
      setTaskDefinitions(definitions);
    })
    .catch(err => {
      console.error("Error fetching data:", err);
      setError(err.error || err.message || "Failed to load data. Check API server.");
      setTaskInstances([]); // Clear data on error
      setTaskDefinitions([]);
    })
    .finally(() => {
      setIsLoading(false);
    });
  };

  useEffect(fetchData, []);

  const handleTaskDefinitionAdded = () => {
    fetchData(); // Refetch all data
    setIsModalOpen(false); // Close modal on success
  };

  const handleCompleteTaskInstance = async (instanceId) => {
    setError(null);
    try {
      const response = await fetch(`/api/task_instances/${instanceId}/complete`, { method: 'PUT' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to complete task');
      }
      fetchData(); // Refetch to update list
    } catch (err) {
      console.error("Error completing task instance:", err);
      setError(err.message || "Error completing task.");
    }
  };

  const handleDeleteTaskDefinition = async (defId) => {
    if (!window.confirm("Are you sure you want to delete this task definition and all its instances?")) return;
    setError(null);
    try {
      const response = await fetch(`/api/task_definitions/${defId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete task definition');
      }
      fetchData(); // Refetch to update list
    } catch (err) {
      console.error("Error deleting task definition:", err);
      setError(err.message || "Error deleting task definition.");
    }
  };

  return (
    <section class="section" style={{fontFamily: "'Rajdhani', sans-serif"}}>
      <div class="container">
        <div class="has-text-centered mb-5">
          <h1 class="title is-1">
            <span role="img" aria-label="home icon">🏠</span> Home Bot <span role="img" aria-label="robot icon">🤖</span>
          </h1>
        </div>

        <div class="level mb-5">
            <div class="level-left">
                <div class="level-item">
                    <h2 class="title is-3">Due Soon</h2>
                </div>
            </div>
            <div class="level-right">
                <div class="level-item">
                    <button class="button is-primary is-medium" onClick={() => setIsModalOpen(true)}>
                      Add New Task Definition
                    </button>
                </div>
            </div>
        </div>
        

        {error && <div class="notification is-danger">{error}</div>}
        {isLoading && <div class="notification is-info is-light">Loading tasks... <progress class="progress is-small is-info" max="100"></progress></div>}

        {!isLoading && taskInstances.length === 0 && (
          <div class="notification is-warning">No task instances found. Try adding a task definition!</div>
        )}
        
        {!isLoading && taskInstances.length > 0 && (
          <div class="mb-6">
            {taskInstances.map(instance => (
              <TaskInstanceItem key={instance.id} instance={instance} onComplete={handleCompleteTaskInstance} />
            ))}
          </div>
        )}

        <hr />
        <div class="mt-6">
          <h3 class="title is-4">Task Definitions (for Debugging/Management)</h3>
          {isLoading && <p>Loading definitions...</p>}
          {!isLoading && taskDefinitions.length === 0 && (
            <p>No task definitions yet.</p>
          )}
          {!isLoading && taskDefinitions.length > 0 && (
            <div class="is-flex is-flex-direction-column">
              {taskDefinitions.map(def => (
                <TaskDefinitionItem key={def.id} definition={def} onDelete={handleDeleteTaskDefinition} />
              ))}
            </div>
          )}
        </div>

        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Task Definition">
          <TaskDefinitionForm onTaskDefinitionAdded={handleTaskDefinitionAdded} closeModal={() => setIsModalOpen(false)} />
        </Modal>
      </div>
    </section>
  );
} 