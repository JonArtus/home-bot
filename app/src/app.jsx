import { useState, useEffect } from 'preact/hooks';

// Basic Modal Component (can be moved to its own file later)
function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full overflow-y-auto max-h-[90vh]">
        {children}
        <button 
          onClick={onClose} 
          class="mt-4 bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded w-full"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Updated TaskForm for TaskDefinition with DueDate
function TaskDefinitionForm({ onTaskDefinitionAdded, closeModal }) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [taskType, setTaskType] = useState('one-off'); // 'one-off' or 'recurring'
  const [dueDate, setDueDate] = useState('');
  const [recurrenceRuleType, setRecurrenceRuleType] = useState('weekly'); // 'weekly', 'monthly'
  const [weeklyDay, setWeeklyDay] = useState(1); // 1 for Monday, ..., 7 for Sunday
  const [monthlyDay, setMonthlyDay] = useState(1); // 1-31
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
        const dateObj = new Date(dueDate + "T00:00:00Z");
        taskData.due_date = dateObj.toISOString();
      } catch (dateError) {
        setError('Invalid date format for Due Date.');
        return;
      }
    } else { // recurring
      let recurrence_rule = { rule_type: recurrenceRuleType };
      if (recurrenceRuleType === 'weekly') {
        if (!weeklyDay || weeklyDay < 1 || weeklyDay > 7) {
          setError('Please select a valid day for weekly recurrence (1-7).');
          return;
        }
        recurrence_rule.weekly_recurring_day = parseInt(weeklyDay, 10);
      } else if (recurrenceRuleType === 'monthly') {
        if (!monthlyDay || monthlyDay < 1 || monthlyDay > 31) {
          setError('Please select a valid day for monthly recurrence (1-31).');
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
        throw new Error(errData.error || 'Failed to create task definition');
      }
      const newTaskDef = await response.json();
      onTaskDefinitionAdded(newTaskDef);
      // Reset form
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

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <h2 class="text-2xl font-semibold text-white mb-4">Add New Task Definition</h2>
      {error && <p class="text-red-400 bg-red-900 p-2 rounded">{error}</p>}
      <div>
        <label htmlFor="description" class="block text-sm font-medium text-gray-300">Description *</label>
        <input 
          type="text" 
          id="description" 
          value={description} 
          onInput={e => setDescription(e.currentTarget.value)} 
          class="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-white"
          required
        />
      </div>
      <div>
        <label htmlFor="category" class="block text-sm font-medium text-gray-300">Category</label>
        <input 
          type="text" 
          id="category" 
          value={category} 
          onInput={e => setCategory(e.currentTarget.value)} 
          class="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-white"
        />
      </div>
      <div>
        <label htmlFor="priority" class="block text-sm font-medium text-gray-300">Priority</label>
        <select 
          id="priority" 
          value={priority} 
          onChange={e => setPriority(e.currentTarget.value)} 
          class="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-white"
        >
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Urgent</option>
        </select>
      </div>
      <div>
        <label htmlFor="task_type" class="block text-sm font-medium text-gray-300">Task Type</label>
        <select 
          id="task_type" 
          value={taskType} 
          onChange={e => setTaskType(e.currentTarget.value)} 
          class="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-white"
        >
          <option value="one-off">One-off Task</option>
          <option value="recurring">Recurring Task</option>
        </select>
      </div>
      {taskType === 'one-off' && (
        <div>
          <label htmlFor="due_date" class="block text-sm font-medium text-gray-300">Due Date *</label>
          <input 
            type="date" 
            id="due_date" 
            value={dueDate} 
            onInput={e => setDueDate(e.currentTarget.value)} 
            class="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-white"
            required
          />
        </div>
      )}
      {taskType === 'recurring' && (
        <div class="p-3 border border-gray-700 rounded-md space-y-3">
          <h3 class="text-lg font-medium text-gray-200">Recurrence Rule</h3>
          <div>
            <label htmlFor="recurrence_rule_type" class="block text-sm font-medium text-gray-300">Rule Type</label>
            <select 
              id="recurrence_rule_type" 
              value={recurrenceRuleType} 
              onChange={e => setRecurrenceRuleType(e.currentTarget.value)} 
              class="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-white"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          {recurrenceRuleType === 'weekly' && (
            <div>
              <label htmlFor="weekly_day" class="block text-sm font-medium text-gray-300">Day of the Week (1=Mon, 7=Sun)</label>
              <input 
                type="number" 
                id="weekly_day" 
                min="1" 
                max="7" 
                value={weeklyDay} 
                onInput={e => setWeeklyDay(parseInt(e.currentTarget.value, 10))} 
                class="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-white"
              />
            </div>
          )}
          {recurrenceRuleType === 'monthly' && (
            <div>
              <label htmlFor="monthly_day" class="block text-sm font-medium text-gray-300">Day of the Month (1-31)</label>
              <input 
                type="number" 
                id="monthly_day" 
                min="1" 
                max="31" 
                value={monthlyDay} 
                onInput={e => setMonthlyDay(parseInt(e.currentTarget.value, 10))} 
                class="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-white"
              />
            </div>
          )}
        </div>
      )}
      <style jsx global>{`
        .input-style {
          margin-top: 0.25rem; display: block; width: 100%; 
          background-color: #374151; border-color: #4B5563; 
          border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); 
          padding-top: 0.5rem; padding-bottom: 0.5rem; padding-left: 0.75rem; padding-right: 0.75rem; 
          color: white;
        }
        .input-style:focus {
          outline: none; ring-width: 2px; ring-color: #06B6D4; border-color: #06B6D4;
        }
      `}</style>
      <button 
        type="submit" 
        class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded"
      >
        Add Task Definition
      </button>
    </form>
  );
}

export function App() {
  const [taskInstances, setTaskInstances] = useState([]);
  const [taskDefinitions, setTaskDefinitions] = useState([]); // For displaying task definitions
  const [isLoadingInstances, setIsLoadingInstances] = useState(true);
  const [isLoadingDefinitions, setIsLoadingDefinitions] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTaskInstances = () => {
    setIsLoadingInstances(true);
    fetch('/api/task_instances')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        setTaskInstances(data.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)));
        setError(null);
      })
      .catch(err => {
        console.error("Error fetching task instances:", err);
        setError(err.message || "Failed to load task instances.");
        setTaskInstances([]);
      })
      .finally(() => setIsLoadingInstances(false));
  };

  const fetchTaskDefinitions = () => {
    setIsLoadingDefinitions(true);
    fetch('/api/task_definitions')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status} - ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        setTaskDefinitions(data);
      })
      .catch(err => {
        console.error("Error fetching task definitions:", err);
        // Not setting main error for this, as instance list is primary
      })
      .finally(() => setIsLoadingDefinitions(false));
  };

  useEffect(() => {
    fetchTaskInstances();
    fetchTaskDefinitions(); // Fetch definitions as well
  }, []);

  const handleTaskDefinitionAdded = (newTaskDef) => {
    fetchTaskInstances(); // New instances might have been created
    fetchTaskDefinitions(); // Refresh definition list
  };
  
  const handleCompleteTaskInstance = async (instanceId) => {
    setError(null); // Clear previous errors
    try {
      const response = await fetch(`/api/task_instances/${instanceId}/complete`, { method: 'PUT' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to complete task');
      }
      fetchTaskInstances();
    } catch (err) {
      console.error("Error completing task instance:", err);
      setError(err.message || "Error completing task.");
    }
  };

  const handleDeleteTaskDefinition = async (defId) => {
    setError(null);
    if (!confirm('Are you sure you want to delete this task definition and all its instances?')) return;
    try {
      const response = await fetch(`/api/task_definitions/${defId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete task definition');
      }
      fetchTaskInstances(); // Instances will be deleted by cascade
      fetchTaskDefinitions(); // Refresh definition list
    } catch (err) {
      console.error("Error deleting task definition:", err);
      setError(err.message || "Error deleting task definition.");
    }
  };

  return (
    <div class="min-h-screen bg-gray-900 text-white flex flex-col items-center pt-10 px-4 pb-20">
      <h1 class="text-5xl font-bold mb-8 text-cyan-400">Home Bot - Task Instances</h1>
      
      <button 
        onClick={() => setIsModalOpen(true)} 
        class="mb-6 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded shadow-lg transition duration-150 ease-in-out"
      >
        + Add New Task Definition
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <TaskDefinitionForm onTaskDefinitionAdded={handleTaskDefinitionAdded} closeModal={() => setIsModalOpen(false)} />
      </Modal>

      {error && <div class="w-full max-w-3xl mb-4 p-3 bg-red-800 text-red-200 rounded-md"><p><strong>Error:</strong> {error}</p></div>}

      <div class="w-full max-w-3xl mb-12">
        <h2 class="text-3xl font-semibold mb-6 text-gray-300">Upcoming Task Instances</h2>
        {isLoadingInstances && <p>Loading instances...</p>}
        {!isLoadingInstances && taskInstances.length === 0 && <p class="text-gray-500">No upcoming task instances.</p>}
        {!isLoadingInstances && taskInstances.length > 0 && (
          <ul class="space-y-3">
            {taskInstances.map(inst => (
              <li key={inst.id} class={`p-3 rounded-md shadow-md flex justify-between items-center ${inst.status === 'Completed' ? 'bg-gray-700 opacity-70' : 'bg-gray-800 hover:bg-gray-700'}`}>
                <div>
                  <h3 class={`text-lg font-semibold ${inst.status === 'Completed' ? 'line-through text-gray-500' : 'text-cyan-400'}`}>{inst.task_definition_description}</h3>
                  <p class="text-xs text-gray-400">Due: {new Date(inst.due_date).toLocaleDateString()} {inst.task_definition_category && `| ${inst.task_definition_category}`} {inst.task_definition_priority && `| ${inst.task_definition_priority}`}</p>
                  <p class={`text-xs font-medium ${inst.status === 'Completed' ? 'text-green-400' : 'text-yellow-400'}`}>{inst.status}</p>
                </div>
                {inst.status !== 'Completed' && <button onClick={() => handleCompleteTaskInstance(inst.id)} class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1 px-2 rounded">✓ Complete</button>}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div class="w-full max-w-3xl">
        <h2 class="text-3xl font-semibold mb-6 text-gray-300">Task Definitions (for Debug)</h2>
        {isLoadingDefinitions && <p>Loading definitions...</p>}
        {!isLoadingDefinitions && taskDefinitions.length === 0 && <p class="text-gray-500">No task definitions created yet.</p>}
        {!isLoadingDefinitions && taskDefinitions.length > 0 && (
          <ul class="space-y-2 text-xs">
            {taskDefinitions.map(def => (
              <li key={def.id} class="p-2 bg-gray-800 rounded-md flex justify-between items-center">
                <div>
                  <p class="font-semibold text-gray-200">{def.description}</p>
                  <p class="text-gray-400">ID: {def.id} | Cat: {def.category || 'N/A'} | Prio: {def.priority || 'N/A'}</p>
                  {def.due_date && <p class="text-gray-400">One-off Due: {new Date(def.due_date).toLocaleDateString()}</p>}
                  {def.recurrence_rule && (
                    <p class="text-gray-400">
                      Recurrence: {def.recurrence_rule.rule_type} 
                      {def.recurrence_rule.weekly_recurring_day && ` (Day: ${def.recurrence_rule.weekly_recurring_day})`}
                      {def.recurrence_rule.monthly_recurring_day && ` (Day: ${def.recurrence_rule.monthly_recurring_day})`}
                    </p>
                  )}
                </div>
                <button onClick={() => handleDeleteTaskDefinition(def.id)} class="bg-red-700 hover:bg-red-800 text-white text-xs font-semibold py-1 px-2 rounded">🗑️ Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 