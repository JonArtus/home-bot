import { useState, useEffect } from 'preact/hooks';

// Basic Modal Component (can be moved to its own file later)
function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div class="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
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

// TaskForm component (can be moved to its own file later)
function TaskForm({ onTaskAdded, closeModal }) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    try {
      const response = await fetch('/api/task_definitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, category, priority })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create task');
      }
      const newTask = await response.json();
      onTaskAdded(newTask);
      setDescription('');
      setCategory('');
      setPriority('Medium');
      closeModal(); // Close modal on success
    } catch (err) {
      console.error("Error creating task:", err);
      setError(err.message || "Error creating task. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} class="space-y-4">
      <h2 class="text-2xl font-semibold text-white mb-4">Add New Task</h2>
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
      <button 
        type="submit" 
        class="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold py-2 px-4 rounded"
      >
        Add Task
      </button>
    </form>
  );
}

export function App() {
  const [taskDefinitions, setTaskDefinitions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTaskDefinitions = () => {
    setIsLoading(true);
    fetch('/api/task_definitions')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setTaskDefinitions(data);
        setError(null);
      })
      .catch(err => {
        console.error("Error fetching task definitions:", err);
        setError(err.message || "Failed to load tasks.");
        setTaskDefinitions([]); // Clear tasks on error
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchTaskDefinitions();
  }, []);

  const handleTaskAdded = (newTask) => {
    // setTaskDefinitions(prevTasks => [...prevTasks, newTask]); // Optimistic update
    fetchTaskDefinitions(); // Refetch all tasks to ensure consistency
  };
  
  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task definition?')) return;

    try {
        const response = await fetch(`/api/task_definitions/${taskId}`, {
            method: 'DELETE',
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to delete task');
        }
        fetchTaskDefinitions(); // Refresh the list
    } catch (err) {
        console.error("Error deleting task:", err);
        alert("Error deleting task: " + err.message);
    }
  };


  return (
    <div class="min-h-screen bg-gray-900 text-white flex flex-col items-center pt-10 px-4">
      <h1 class="text-5xl font-bold mb-8 text-cyan-400">Home Bot</h1>
      
      <button 
        onClick={() => setIsModalOpen(true)} 
        class="mb-6 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded shadow-lg transition duration-150 ease-in-out"
      >
        + Add New Task Definition
      </button>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <TaskForm onTaskAdded={handleTaskAdded} closeModal={() => setIsModalOpen(false)} />
      </Modal>

      <div class="w-full max-w-3xl">
        <h2 class="text-3xl font-semibold mb-6 text-gray-300">Task Definitions</h2>
        {isLoading && <p class="text-lg text-gray-400">Loading tasks...</p>}
        {error && <p class="text-lg text-red-400 bg-red-900 p-3 rounded">Error: {error}</p>}
        {!isLoading && !error && taskDefinitions.length === 0 && (
          <p class="text-lg text-gray-500">No task definitions yet. Click 'Add New Task Definition' to create one.</p>
        )}
        {!isLoading && !error && taskDefinitions.length > 0 && (
          <ul class="space-y-4">
            {taskDefinitions.map(task => (
              <li key={task.id} class="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition-colors duration-150">
                <div class="flex justify-between items-start">
                  <div>
                    <h3 class="text-xl font-semibold text-cyan-500">{task.description}</h3>
                    {task.category && <p class="text-sm text-gray-400">Category: <span class="font-medium text-gray-300">{task.category}</span></p>}
                    {task.priority && <p class="text-sm text-gray-400">Priority: <span class="font-medium text-gray-300">{task.priority}</span></p>}
                  </div>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    class="text-red-500 hover:text-red-400 font-semibold py-1 px-2 rounded text-sm"
                    title="Delete Task Definition"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 