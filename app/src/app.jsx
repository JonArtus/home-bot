import { useState, useEffect } from 'preact/hooks';

// Placeholder for Router/Link components if we add routing later
// For now, we'll manage page display with state

// --- Reusable Components ---

// Moved RenderField to top level - CORRECTED AND EXPANDED
const RenderField = ({ id, label, type = "text", name, value, onChange, required = false, options, placeholder, readOnly = false, rows }) => {
  if (type === "select") {
    return (
      <div className="field">
        <label htmlFor={id} className="label has-text-light">{label}</label>
        <div className="control">
          <div className="select is-fullwidth">
            <select id={id} name={name} value={value} onChange={onChange} required={required} readOnly={readOnly}>
              {placeholder && <option value="">{placeholder}</option>}
              {options && options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  } else if (type === "textarea") {
    return (
      <div className="field">
        <label htmlFor={id} className="label has-text-light">{label}</label>
        <div className="control">
          <textarea
            id={id}
            name={name}
            className="textarea"
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            readOnly={readOnly}
            rows={rows || 3}
          />
        </div>
      </div>
    );
  }
  // Default to text input
  return (
    <div className="field">
      <label htmlFor={id} className="label has-text-light">{label}</label>
      <div className="control">
        <input
          id={id}
          name={name}
          className="input"
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          placeholder={placeholder}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};

// Modal Component (Bulma styled)
function Modal({ isOpen, onClose, children, title, footer }) {
  if (!isOpen) return null;
  return (
    <div className={`modal ${isOpen ? 'is-active' : ''}`}>
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">{title || 'Modal'}</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section className="modal-card-body">
          {children}
        </section>
        {footer && (
          <footer className="modal-card-foot">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

// TaskDefinitionForm (Bulma styled)
function TaskDefinitionForm({
  isOpen,
  onClose,
  onSave,
  initialTaskDefinition,
  availableCategories,
  assetId
}) {
  const [taskDefinition, setTaskDefinition] = useState({});
  const [taskType, setTaskType] = useState('one-off');
  const [error, setError] = useState('');

  const isEditing = !!initialTaskDefinition?.id;

  useEffect(() => {
    if (isOpen) { // Only reset/initialize when the modal becomes visible or initialTaskDefinition changes
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowISO = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format

      const baseState = {
        title: '',
        description: '',
        notes: '',
        category_short_name: assetId ? 'Maintenance' : 'Default', // Default to Maintenance if assetId is present for new task
        priority: 'Medium',
        due_date: tomorrowISO, 
        recurrence_rule: null,
        asset_id: assetId || null // Set asset_id if provided for new task
      };

      if (isEditing) {
        // When editing, populate form with existing data
        setTaskDefinition({
          // Start with base state that might include assetId from prop if we are editing a task that WASN'T linked
          // but now SHOULD be linked because the form was opened from an asset's context.
          // However, initialTaskDefinition.asset_id should take precedence if it exists.
          ...baseState, 
          ...initialTaskDefinition,
          due_date: initialTaskDefinition.due_date 
            ? new Date(initialTaskDefinition.due_date).toISOString().split('T')[0] 
            : (assetId && !initialTaskDefinition.due_date ? '' : tomorrowISO), // If for asset, and no existing due_date, maybe blank, else tomorrow
          recurrence_rule: initialTaskDefinition.recurrence_rule || null, 
          // Ensure asset_id from initialTaskDefinition takes precedence. 
          // If not present, use assetId from prop (e.g. creating a new task for an asset, or editing an unlinked task from asset page)
          asset_id: initialTaskDefinition.asset_id !== undefined && initialTaskDefinition.asset_id !== null 
                        ? initialTaskDefinition.asset_id 
                        : (assetId || null),
          // If editing, and it's linked to an asset, ensure category is Maintenance unless already set to something else
          category_short_name: initialTaskDefinition.asset_id !== undefined && initialTaskDefinition.asset_id !== null && (!initialTaskDefinition.category_short_name || initialTaskDefinition.category_short_name === 'Default')
                                ? 'Maintenance' 
                                : (initialTaskDefinition.category_short_name || baseState.category_short_name),
        });
        if (initialTaskDefinition.recurrence_rule) {
          setTaskType('recurring');
        } else if (initialTaskDefinition.due_date || (assetId && !initialTaskDefinition.due_date && !initialTaskDefinition.recurrence_rule) ) {
          setTaskType('one-off');
        } else {
          setTaskType('one-off');
        }
      } else {
        // For new task, (isEditing is false)
        // baseState already correctly sets asset_id from prop and category to Maintenance if assetId is present
        setTaskDefinition(baseState);
        setTaskType('one-off');
      }
      setError(''); 
    }
  }, [isOpen, initialTaskDefinition, isEditing, assetId]); // <<< assetId ADDED to dependency array

  // Effect to handle taskType changes
  useEffect(() => {
    if (!isOpen) return; // Only act when the form is open

    setTaskDefinition(currentDef => {
      let newDef = {...currentDef};
      if (taskType === 'one-off') {
        // If switching to one-off, clear recurrence_rule and potentially set a default due_date if desired
        newDef.recurrence_rule = null;
        // newDef.due_date = newDef.due_date || ''; // Keep existing due_date or set to empty
      } else if (taskType === 'recurring') {
        // If switching to recurring, clear due_date and initialize recurrence_rule if it's null
        newDef.due_date = '';
        newDef.recurrence_rule = newDef.recurrence_rule || { rule_type: 'weekly', weekly_recurring_day: '', monthly_recurring_day: '' };
      }
      return newDef;
    });
  }, [taskType, isOpen]); // Rerun when taskType or isOpen changes

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    if (name.startsWith('recurrence_rule.')) {
      const field = name.split('.')[1];
      setTaskDefinition(prev => ({
        ...prev,
        recurrence_rule: {
          ...(prev.recurrence_rule || { rule_type: taskType === 'recurring' ? (prev.recurrence_rule?.rule_type || 'weekly') : '' }), // Initialize rule_type if not present
          [field]: val
        }
      }));
    } else {
      setTaskDefinition(prev => ({ ...prev, [name]: val }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    console.log("[TaskDefinitionForm] handleSubmit triggered. isEditing:", isEditing);
    console.log("[TaskDefinitionForm] Current form state:", taskDefinition);
    console.log("[TaskDefinitionForm] Current taskType:", taskType);

    if (!taskDefinition.title?.trim()) {
      setError('Title is required.');
      console.error("[TaskDefinitionForm] Title is missing.");
      return;
    }

    let payload = { ...taskDefinition };

    if (taskType === 'one-off') {
      if (!payload.due_date) {
        setError('Due date is required for one-off tasks.');
        console.error("[TaskDefinitionForm] Due date is missing for one-off task.");
        return;
      }
      try {
        payload.due_date = new Date(payload.due_date + "T00:00:00.000Z").toISOString();
        payload.recurrence_rule = null; 
      } catch (dateError) {
        setError('Invalid date format for Due Date.');
        console.error("[TaskDefinitionForm] Invalid due date format:", payload.due_date, dateError);
        return;
      }
    } else { 
      if (!payload.recurrence_rule?.rule_type) {
        setError('Recurrence rule type is required for recurring tasks.');
        console.error("[TaskDefinitionForm] Recurrence rule type missing.");
        return;
      }
      if (payload.recurrence_rule.rule_type === 'weekly' && !payload.recurrence_rule.weekly_recurring_day) {
        setError('Weekly recurring day is required.');
        console.error("[TaskDefinitionForm] Weekly recurring day missing.");
        return;
      }
      if (payload.recurrence_rule.rule_type === 'monthly' && !payload.recurrence_rule.monthly_recurring_day) {
        setError('Monthly recurring day is required.');
        console.error("[TaskDefinitionForm] Monthly recurring day missing.");
        return;
      }
      if (payload.recurrence_rule.weekly_recurring_day) {
        payload.recurrence_rule.weekly_recurring_day = parseInt(payload.recurrence_rule.weekly_recurring_day, 10);
      }
      if (payload.recurrence_rule.monthly_recurring_day) {
        payload.recurrence_rule.monthly_recurring_day = parseInt(payload.recurrence_rule.monthly_recurring_day, 10);
      }
      payload.due_date = null; 
    }

    if (payload.category_short_name === '') {
        payload.category_short_name = null;
    }
    
    console.log("[TaskDefinitionForm] Prepared payload:", payload);
    onSave(payload, isEditing, assetId); 
  };
  
  if (!isOpen) return null;

  // Define form fields configuration
  const formFields = [
    { name: 'title', label: 'Title *', required: true },
    { name: 'description', label: 'Short Description (Optional)' },
    { name: 'notes', label: 'Detailed Notes (Optional)', type: 'textarea', rows: 3 },
    {
      name: 'priority',
      label: 'Priority',
      type: 'select',
      options: [
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' },
      ],
      required: true
    },
    { // Corrected category select field
      name: 'category_short_name',
      label: 'Category',
      type: 'select',
      placeholder: 'Select a category',
      options: availableCategories.map(cat => ({
        value: cat.short_name,
        label: cat.icon ? `${cat.icon} ${cat.short_name}` : cat.short_name
      })),
      required: false
    },
  ];

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="notification is-danger is-light">{error}</div>}
      
      {formFields.map(field => (
        <RenderField
          key={field.name}
          id={field.name}
          label={field.label}
          name={field.name}
          type={field.type}
          value={taskDefinition[field.name]}
          onChange={handleChange}
          required={field.required}
          options={field.options}
          placeholder={field.placeholder}
          rows={field.rows} // for textarea
        />
      ))}

      <RenderField
        id="taskType"
        label="Task Type"
        name="taskType"
        type="select"
        value={taskType}
        onChange={(e) => setTaskType(e.target.value)}
        options={[
          { value: 'one-off', label: 'One-off' },
          { value: 'recurring', label: 'Recurring' },
        ]}
      />

      {taskType === 'one-off' && (
        <RenderField
          id="due_date"
          label="Due Date *"
          name="due_date"
          type="date"
          value={taskDefinition.due_date || ''}
          onChange={handleChange}
          required
        />
      )}

      {taskType === 'recurring' && (
        <div className="box mt-4 p-4 has-background-grey-darker">
          <p className="subtitle is-5 has-text-light">Recurrence Rule</p>
          <RenderField
            id="recurrence_rule.rule_type"
            label="Rule Type"
            name="recurrence_rule.rule_type"
            type="select"
            value={taskDefinition.recurrence_rule?.rule_type || ''}
            onChange={handleChange}
            options={[
              { value: 'weekly', label: 'Weekly' },
              { value: 'monthly', label: 'Monthly' },
            ]}
            required={taskType === 'recurring'}
          />
          {taskDefinition.recurrence_rule?.rule_type === 'weekly' && (
            <RenderField
              id="recurrence_rule.weekly_recurring_day"
              label="Day of Week (1=Mon, 7=Sun)"
              name="recurrence_rule.weekly_recurring_day"
              type="number"
              value={taskDefinition.recurrence_rule?.weekly_recurring_day || ''}
              onChange={handleChange}
              min="1"
              max="7"
              required
            />
          )}
          {taskDefinition.recurrence_rule?.rule_type === 'monthly' && (
            <RenderField
              id="recurrence_rule.monthly_recurring_day"
              label="Day of Month (1-31)"
              name="recurrence_rule.monthly_recurring_day"
              type="number"
              value={taskDefinition.recurrence_rule?.monthly_recurring_day || ''}
              onChange={handleChange}
              min="1"
              max="31"
              required
            />
          )}
        </div>
      )}

      <div className="field is-grouped is-grouped-right mt-5">
        <div className="control">
          <button type="button" className="button is-light" onClick={onClose}>Cancel</button>
        </div>
        <div className="control">
          <button type="submit" className="button is-primary">
            {initialTaskDefinition ? 'Save Changes' : 'Create Definition'}
          </button>
        </div>
      </div>
    </form>
  );
}

// Task Instance Item Component (Bulma styled)
function TaskInstanceItem({ instance, onComplete, onShowDetails }) {
  const dueDate = new Date(instance.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Compare dates only

  let dueDateString;
  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (instance.status === 'Completed') {
    dueDateString = <span className="has-text-grey-light">Completed</span>;
  } else if (dueDate < today) {
    dueDateString = <span className="has-text-danger-dark has-text-weight-bold">Overdue</span>;
  } else if (dueDate.getTime() === today.getTime()) {
    dueDateString = <span className="has-text-warning-dark has-text-weight-bold">Today</span>;
  } else {
    dueDateString = `${diffDays} day${diffDays === 1 ? '' : 's'}`;
  }

  const categoryDisplay = instance.task_definition_category_details ?
    `${instance.task_definition_category_details.icon || ''} ${instance.task_definition_category_details.short_name}`.trim() :
    'N/A';

  return (
    <div className="card mb-3" style={{ backgroundColor: '#3f0071', border: '1px solid #7b1fa2' }}>
      <div className="card-content">
        <div className="media">
          <div className="media-content">
            <p className="title is-5 has-text-light">{instance.task_definition_title}</p>
            <p className="subtitle is-6 has-text-grey-lighter">
              Due: {dueDateString} | Category: {categoryDisplay} | Priority: {instance.task_definition_priority || 'N/A'}
            </p>
          </div>
          <div className="media-right">
            <button 
              onClick={() => onShowDetails(instance)} 
              className="button is-info is-outlined"
              title="Show Details"
              style={{marginRight: '0.5rem'}}
            >
              <span>ℹ️</span>
            </button>
            {instance.status !== 'Completed' && (
              <button 
                onClick={() => onComplete(instance.id)} 
                className="button is-success is-outlined"
                title="Mark as Complete"
              >
                <span>✔️</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Task Definition Item (Bulma styled - for debugging list)
function TaskDefinitionItem({ definition, onDelete, onEdit }) {
  const { id, title, description, category_short_name, priority, due_date, recurrence_rule, category } = definition;
  return (
    <div className="box" style={{ marginBottom: '0.5rem', padding: '0.75rem' }}>
      <div className="level">
        <div className="level-left">
          <div className="level-item">
            <div>
              <p className="title is-6">{title}</p>
              {description && <p className="subtitle is-7">{description}</p>}
              <p className="is-size-7">
                ID: {id} | 
                Cat: {category ? `${category.icon || ''} ${category.short_name}`.trim() : (category_short_name || 'N/A')} | 
                Prio: {priority || 'N/A'}
              </p>
              {due_date && <p className="is-size-7">One-off Due: {new Date(due_date).toLocaleDateString()}</p>}
              {recurrence_rule && (
                <p className="is-size-7">
                  Recurring: {recurrence_rule.rule_type} 
                  {recurrence_rule.weekly_recurring_day && ` (Day: ${recurrence_rule.weekly_recurring_day})`}
                  {recurrence_rule.monthly_recurring_day && ` (Day: ${recurrence_rule.monthly_recurring_day})`}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="level-right">
          <div className="level-item">
            <button className="button is-info is-outlined is-small mr-2" onClick={onEdit}>
              Edit
            </button>
            <button className="button is-danger is-outlined is-small" onClick={() => onDelete(id)}>
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Task Instance Details Modal ---
function TaskInstanceDetailsModal({ isOpen, onClose, instance }) {
  if (!isOpen || !instance) return null;

  const categoryDisplay = instance.task_definition_category_details ?
    `${instance.task_definition_category_details.icon || ''} ${instance.task_definition_category_details.short_name}`.trim() :
    'N/A';

  return (
    <div className="modal is-active">
      <div className="modal-background" onClick={onClose}></div>
      <div className="modal-card">
        <header className="modal-card-head">
          <p className="modal-card-title">Details: {instance.task_definition_title}</p>
          <button className="delete" aria-label="close" onClick={onClose}></button>
        </header>
        <section className="modal-card-body has-background-dark has-text-light">
          <p><strong>Title:</strong> {instance.task_definition_title}</p>
          <p><strong>Description:</strong> {instance.task_definition_description || 'N/A'}</p>
          <p><strong>Notes:</strong> {instance.task_definition_notes || 'N/A'}</p>
          <p><strong>Category:</strong> {categoryDisplay}</p>
          <p><strong>Priority:</strong> {instance.task_definition_priority || 'N/A'}</p>
          <p><strong>Due Date:</strong> {new Date(instance.due_date).toLocaleString()}</p>
          <p><strong>Status:</strong> {instance.status}</p>
          {instance.completion_date && <p><strong>Completed On:</strong> {new Date(instance.completion_date).toLocaleString()}</p>}
        </section>
      </div>
    </div>
  );
}

// --- Settings Page Component ---
function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.ok ? res.json() : Promise.reject('Failed to load settings'))
      .then(data => {
        setSettings(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(typeof err === 'string' ? err : (err.error || 'Could not fetch settings.'));
        setIsLoading(false);
      });
  }, []);

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMessage('');
    try {
      // Filter out any non-string values or empty strings if necessary, backend expects strings
      const payload = {
        MAX_INSTANCES_TO_GENERATE: String(settings.MAX_INSTANCES_TO_GENERATE || '4'),
        MAX_ADVANCE_GENERATION_MONTHS: String(settings.MAX_ADVANCE_GENERATION_MONTHS || '13'),
      };
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save settings');
      setSuccessMessage(result.message || 'Settings saved successfully!');
    } catch (err) {
      setError(err.message || 'Could not save settings.');
    }
  };

  if (isLoading) return <div className="notification is-info is-light">Loading settings... <progress className="progress is-small is-info" max="100"></progress></div>;
  if (error && !isLoading) return <div className="notification is-danger">Error: {error}</div>;

  const RenderSettingField = ({ label, id, value, onChange, helpText }) => (
    <div className="field">
      <label className="label" htmlFor={id}>{label}</label>
      <div className="control">
        <input className="input" type="number" id={id} value={value} onChange={e => onChange(id, e.currentTarget.value)} />
      </div>
      {helpText && <p className="help">{helpText}</p>}
    </div>
  );

  return (
    <section className="section">
      <h2 className="title is-3">Application Settings</h2>
      {successMessage && <div className="notification is-success is-light">{successMessage}</div>}
      {error && <div className="notification is-danger is-light">{error}</div>} {/* Re-display error if save fails */}
      
      <RenderSettingField 
        label="Max Future Task Instances to Generate"
        id="MAX_INSTANCES_TO_GENERATE"
        value={settings.MAX_INSTANCES_TO_GENERATE || ''} 
        onChange={handleChange}
        helpText="Number of future instances to create for a recurring task (e.g., 4)."
      />
      <RenderSettingField 
        label="Max Months in Advance to Generate Tasks"
        id="MAX_ADVANCE_GENERATION_MONTHS"
        value={settings.MAX_ADVANCE_GENERATION_MONTHS || ''} 
        onChange={handleChange}
        helpText="How many months ahead to generate instances (e.g., 13)."
      />
      <div className="field is-grouped is-grouped-right" style={{marginTop: '1.5em'}}>
        <div className="control">
          <button className="button is-primary" onClick={handleSave}>Save Settings</button>
        </div>
      </div>
    </section>
  );
}

// --- Category Management Page ---
const CategoryManagementPage = ({ categories, onUpdateCategories }) => {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [editingCategory, setEditingCategory] = useState(null); // { short_name: string, icon: string }
  const [error, setError] = useState(null);

  const handleAddCategory = async () => {
    setError(null);
    if (!newCategoryName.trim()) {
      setError('Category name cannot be empty.');
      return;
    }
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_name: newCategoryName, icon: newCategoryIcon }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to add category (${response.status})`);
      }
      setNewCategoryName('');
      setNewCategoryIcon('');
      onUpdateCategories(); // Refresh categories list in App
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory({ ...category }); // Set for editing
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editingCategory.short_name) return;
    setError(null);
    try {
      const response = await fetch(`/api/categories/${editingCategory.short_name}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ icon: editingCategory.icon }), // Only icon is editable for now
        }
      );
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to update category (${response.status})`);
      }
      setEditingCategory(null);
      onUpdateCategories();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCategory = async (short_name) => {
    if (!confirm(`Are you sure you want to delete category "${short_name}"? This cannot be undone.`)) {
        return;
    }
    setError(null);
    try {
        const response = await fetch(`/api/categories/${short_name}`, { method: 'DELETE' });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `Failed to delete category (${response.status})`);
        }
        onUpdateCategories();
    } catch (err) {
        setError(err.message);
    }
  };


  return (
    <section className="section">
      <h2 className="title is-3 has-text-light">Manage Categories</h2>
      {error && <div className="notification is-danger is-light">{error}</div>}

      {/* Add New Category Form */}
      <div className="box has-background-grey-darker p-5 mb-5">
        <h3 className="title is-4 has-text-light">Add New Category</h3>
        <RenderField 
            id="newCategoryName" 
            name="newCategoryName"
            type="text"
            label="Category Name (Short Name)" 
            value={newCategoryName} 
            onChange={(e) => setNewCategoryName(e.target.value)} 
            placeholder="e.g., Work, Personal, Hobby"
            required
        />
        <RenderField 
            id="newCategoryIcon" 
            name="newCategoryIcon"
            type="text"
            label="Icon (Optional Emoji or Class)" 
            value={newCategoryIcon} 
            onChange={(e) => setNewCategoryIcon(e.target.value)} 
            placeholder="e.g., 💼 or fas fa-briefcase"
        />
        <button className="button is-primary mt-3" onClick={handleAddCategory}>Add Category</button>
      </div>

      {/* Edit Category Modal (Simplified) */}
      {editingCategory && (
        <div className="modal is-active">
          <div className="modal-background" onClick={() => setEditingCategory(null)}></div>
          <div className="modal-card">
            <header className="modal-card-head has-background-dark">
              <p className="modal-card-title has-text-light">Edit Category: {editingCategory.short_name}</p>
              <button className="delete" aria-label="close" onClick={() => setEditingCategory(null)}></button>
            </header>
            <section className="modal-card-body has-background-dark">
              <RenderField 
                id="editingCategoryIcon" 
                name="editingCategoryIcon"
                type="text"
                label="Icon"
                value={editingCategory.icon || ''}
                onChange={(e) => setEditingCategory({...editingCategory, icon: e.target.value})}
              />
            </section>
            <footer className="modal-card-foot has-background-dark">
              <button className="button is-success" onClick={handleSaveEdit}>Save changes</button>
              <button className="button" onClick={() => setEditingCategory(null)}>Cancel</button>
            </footer>
          </div>
        </div>
      )}

      {/* List Existing Categories */}
      <div className="box has-background-grey-darker p-5">
        <h3 className="title is-4 has-text-light">Existing Categories</h3>
        {categories.length === 0 ? (
          <p className="has-text-grey-lighter">No categories defined yet.</p>
        ) : (
          <table className="table is-fullwidth is-hoverable has-background-grey-dark has-text-light">
            <thead>
              <tr>
                <th className="has-text-light">Icon</th>
                <th className="has-text-light">Name (Short Name)</th>
                <th className="has-text-light">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(cat => (
                <tr key={cat.short_name}>
                  <td>{cat.icon}</td>
                  <td>{cat.short_name}</td>
                  <td>
                    <button className="button is-info is-small mr-2" onClick={() => handleEditCategory(cat)}>Edit Icon</button>
                    <button className="button is-danger is-small" onClick={() => handleDeleteCategory(cat.short_name)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

// --- Asset Management Page (NEW) ---
const AssetManagementPage = ({ assets, onUpdateAssets, onNavigateToAssetDetail }) => {
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null); // Stores the asset being edited
  const [error, setError] = useState(null);

  const handleOpenNewAssetForm = () => {
    setEditingAsset(null); // Clear any previous editing state
    setIsAssetFormOpen(true);
  };

  const handleEditAsset = (asset) => {
    setEditingAsset(asset);
    setIsAssetFormOpen(true);
  };

  const handleSaveAsset = async (assetData, isEditing) => {
    setError(null);
    const url = isEditing ? `/api/assets/${assetData.id}` : '/api/assets';
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetData),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || `Failed to ${isEditing ? 'update' : 'create'} asset`);
      }
      onUpdateAssets(); // Callback to refresh assets list in App component
      setIsAssetFormOpen(false);
      setEditingAsset(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteAsset = async (assetId) => {
    if (!confirm('Are you sure you want to delete this asset? This may affect associated task definitions.')) {
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/assets/${assetId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to delete asset');
      }
      onUpdateAssets(); // Refresh asset list
    } catch (err) {
      setError(err.message);
    }
  };

  if (!assets) {
    return <p className="has-text-light">Loading assets...</p>;
  }

  return (
    <section className="section">
      <div className="level mb-5">
        <div className="level-left">
          <div className="level-item">
            <h2 className="title is-3 has-text-light">Manage Assets</h2>
          </div>
        </div>
        <div className="level-right">
          <div className="level-item">
            <button className="button is-primary" onClick={handleOpenNewAssetForm}>
              <span className="icon is-small"><i className="fas fa-plus"></i></span>
              <span>New Asset</span>
            </button>
          </div>
        </div>
      </div>

      {error && <div className="notification is-danger is-light">{error}</div>}

      {assets.length === 0 && !error && (
        <div className="notification is-info is-light">
            No assets defined yet. Click "New Asset" to add one.
        </div>
      )}

      {assets.length > 0 && (
        <div className="box has-background-grey-darker p-5">
          <h3 className="title is-4 has-text-light">Existing Assets</h3>
          {assets.map(asset => (
            <div key={asset.id} className="card mb-3 has-background-dark">
              <div className="card-content">
                <div className="level">
                  <div className="level-left">
                    <div className="level-item">
                        <div>
                            <p className="title is-5 has-text-light"><a href="#" onClick={(e) => { e.preventDefault(); onNavigateToAssetDetail(asset.id); }}>{asset.name}</a></p>
                            <p className="subtitle is-6 has-text-grey-lighter">{asset.description || 'No description'}</p>
                        </div>
                    </div>
                  </div>
                  <div className="level-right">
                    <div className="level-item">
                      <div className="buttons are-small">
                        <button className="button is-info is-outlined" onClick={() => handleEditAsset(asset)}>Edit</button>
                        <button className="button is-danger is-outlined" onClick={() => handleDeleteAsset(asset.id)}>Delete</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isAssetFormOpen} onClose={() => setIsAssetFormOpen(false)} title={editingAsset ? 'Edit Asset' : 'Add New Asset'}>
        <AssetForm
          isOpen={isAssetFormOpen} // Pass isOpen to AssetForm as well
          onClose={() => {
            setIsAssetFormOpen(false);
            setEditingAsset(null); // Clear editing state on close
          }}
          onSave={handleSaveAsset}
          initialAsset={editingAsset}
          key={editingAsset ? editingAsset.id : 'new-asset'} // Key to force re-render
        />
      </Modal>
    </section>
  );
};

// --- NEW AssetForm Component ---
function AssetForm({ isOpen, onClose, onSave, initialAsset }) {
  const [asset, setAsset] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  const isEditing = !!initialAsset?.id;

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        setAsset({ ...initialAsset });
      } else {
        setAsset({ name: '', description: '' });
      }
      setError('');
    }
  }, [isOpen, initialAsset, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAsset(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!asset.name?.trim()) {
      setError('Asset name is required.');
      return;
    }
    onSave(asset, isEditing);
  };

  if (!isOpen) return null;

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="notification is-danger is-light">{error}</div>}
      <RenderField
        id="assetName"
        label="Asset Name *"
        name="name"
        value={asset.name}
        onChange={handleChange}
        required
        placeholder="e.g., Main Computer, Kitchen Blender"
      />
      <RenderField
        id="assetDescription"
        label="Description (Optional)"
        name="description"
        type="textarea"
        value={asset.description}
        onChange={handleChange}
        placeholder="e.g., Custom built PC, for tasks and gaming"
      />
      <div className="field is-grouped is-grouped-right mt-5">
        <div className="control">
          <button type="button" className="button is-light" onClick={onClose}>Cancel</button>
        </div>
        <div className="control">
          <button type="submit" className="button is-primary">
            {isEditing ? 'Save Changes' : 'Create Asset'}
          </button>
        </div>
      </div>
    </form>
  );
}
// END NEW AssetForm Component ---

// --- NEW AssetDetailPage Component ---
const AssetDetailPage = ({ assetDetail, onOpenTaskForm, availableCategories, onNavigateBack, onTaskStatusChange }) => {
  if (!assetDetail) {
    return <div className="notification is-warning">Asset details not available.</div>;
  }

  // Filter task definitions: those that are part of the main assetDetail.task_definitions (active/future)
  // The backend currently embeds full task_definition objects if they are linked to the asset.
  const activeTaskDefinitions = assetDetail.task_definitions || [];
  const completedTaskInstances = assetDetail.completed_task_instances || [];

  // We need a way to complete task instances from this page too.
  // This would be similar to handleCompleteTaskInstance in App component.
  // For now, we assume onTaskStatusChange passed from App will refresh data adequately.
  const handleCompleteInstance = async (instanceId) => {
    try {
      const response = await fetch(`/api/task_instances/${instanceId}/complete`, { method: 'PUT' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to complete task');
      }
      onTaskStatusChange(); // Prop to refresh data in parent
    } catch (err) {
      console.error("Error completing task instance from AssetDetailPage:", err);
      alert(`Error: ${err.message}`); // Simple alert for now
    }
  };


  return (
    <section className="section">
      <nav className="breadcrumb" aria-label="breadcrumbs">
        <ul>
          <li><a href="#" onClick={(e) => { e.preventDefault(); onNavigateBack(); }}>Assets</a></li>
          <li className="is-active"><a href="#" aria-current="page">{assetDetail.name}</a></li>
        </ul>
      </nav>

      <div className="level mb-4">
        <div className="level-left">
            <div className="level-item">
                <h2 className="title is-2 has-text-light">{assetDetail.name}</h2>
            </div>
        </div>
        <div className="level-right">
            <div className="level-item">
                <button className="button is-primary" onClick={onOpenTaskForm}>
                    <span className="icon is-small"><i className="fas fa-plus"></i></span>
                    <span>New Task for this Asset</span>
                </button>
            </div>
        </div>
      </div>

      {assetDetail.description && (
        <div className="content box has-background-grey-darker p-4 mb-5">
          <h4 className="title is-5 has-text-light">Description</h4>
          <p className="has-text-light">{assetDetail.description}</p>
        </div>
      )}

      <div className="columns">
        <div className="column is-half">
          <div className="box has-background-grey-darker p-5">
            <h3 className="title is-4 has-text-light mb-4">Active/Upcoming Tasks</h3>
            {activeTaskDefinitions.length === 0 ? (
              <p className="has-text-grey-lighter">No active or upcoming task definitions for this asset.</p>
            ) : (
              activeTaskDefinitions.map(def => (
                // We can use TaskDefinitionItem here, or a more specialized display if needed
                // For now, let's use a simplified version of TaskDefinitionItem or adapt it
                <div key={def.id} className="box mb-3 has-background-dark p-3">
                    <p className="title is-6 has-text-light">{def.title}</p>
                    {def.description && <p className="subtitle is-7 has-text-grey-lighter">{def.description}</p>}
                    <p className="is-size-7 has-text-grey-lighter">
                        Category: {def.category ? `${def.category.icon || ''} ${def.category.short_name}`.trim() : 'N/A'} | 
                        Priority: {def.priority || 'N/A'}
                    </p>
                    {def.due_date && <p className="is-size-7 has-text-grey-lighter">One-off Due: {new Date(def.due_date).toLocaleDateString()}</p>}
                    {def.recurrence_rule && (
                        <p className="is-size-7 has-text-grey-lighter">
                        Recurring: {def.recurrence_rule.rule_type} 
                        {def.recurrence_rule.weekly_recurring_day && ` (Day: ${def.recurrence_rule.weekly_recurring_day})`}
                        {def.recurrence_rule.monthly_recurring_day && ` (Day: ${def.recurrence_rule.monthly_recurring_day})`}
                        </p>
                    )}
                    {/* TODO: Add actions like edit/delete task definition if needed from here */}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="column is-half">
          <div className="box has-background-grey-darker p-5">
            <h3 className="title is-4 has-text-light mb-4">Completed Tasks</h3>
            {completedTaskInstances.length === 0 ? (
              <p className="has-text-grey-lighter">No completed tasks for this asset.</p>
            ) : (
              completedTaskInstances.map(instance => (
                <div key={instance.id} className="box mb-3 has-background-dark p-3">
                    <p className="title is-6 has-text-light">{instance.task_definition_title}</p>
                    <p className="is-size-7 has-text-grey-lighter">
                        Completed: {new Date(instance.completion_date).toLocaleString()} <br/>
                        Originally Due: {new Date(instance.due_date).toLocaleDateString()}
                    </p>
                    {/* We could show more details from instance.to_dict() if needed */}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </section>
  );
};
// END NEW AssetDetailPage Component ---

// --- Main App Component with Navbar and Page State ---
export function App() {
  const [taskDefinitions, setTaskDefinitions] = useState([]);
  const [taskInstances, setTaskInstances] = useState([]);
  const [settings, setSettings] = useState({});
  const [categories, setCategories] = useState([]);
  const [assets, setAssets] = useState([]); // <<< ADDED: State for assets
  const [currentAssetDetail, setCurrentAssetDetail] = useState(null); // <<< NEW: For Asset Detail Page

  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [editingTaskDefinition, setEditingTaskDefinition] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedInstanceForDetails, setSelectedInstanceForDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'settings', 'categories', 'assets', 'assetDetail'
  const [selectedAssetIdForDetail, setSelectedAssetIdForDetail] = useState(null); // <<< NEW: To trigger detail view
  const [isNavbarActive, setIsNavbarActive] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [defsResponse, instancesResponse, settingsResponse, categoriesResponse, assetsResponse] = await Promise.all([
        fetch('/api/task_definitions'),
        fetch('/api/task_instances'),
        fetch('/api/settings'),
        fetch('/api/categories'),
        fetch('/api/assets') // <<< ADDED: Fetch assets
      ]);

      if (!defsResponse.ok) throw new Error(`Task Definitions: ${defsResponse.statusText} (${defsResponse.status})`);
      if (!instancesResponse.ok) throw new Error(`Task Instances: ${instancesResponse.statusText} (${instancesResponse.status})`);
      if (!settingsResponse.ok) throw new Error(`Settings: ${settingsResponse.statusText} (${settingsResponse.status})`);
      if (!categoriesResponse.ok) throw new Error(`Categories: ${categoriesResponse.statusText} (${categoriesResponse.status})`);
      if (!assetsResponse.ok) throw new Error(`Assets: ${assetsResponse.statusText} (${assetsResponse.status})`); // <<< ADDED: Check assetsResponse

      const defsData = await defsResponse.json();
      const instancesData = await instancesResponse.json();
      const settingsData = await settingsResponse.json();
      const categoriesData = await categoriesResponse.json();
      const assetsData = await assetsResponse.json(); // <<< ADDED: Parse assets JSON

      setTaskDefinitions(defsData);
      setTaskInstances(instancesData.sort((a, b) => new Date(a.due_date) - new Date(b.due_date)));
      setSettings(settingsData);
      setCategories(categoriesData);
      setAssets(assetsData); // <<< ADDED: Set assets state

      // If navigating to an asset detail page, fetch its full details including completed tasks
      if (selectedAssetIdForDetail && currentPage === 'assetDetail') {
        fetchAssetDetails(selectedAssetIdForDetail);
      }

    } catch (error) {
      console.error("Failed to fetch data:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // <<< NEW: Function to fetch specific asset details including completed tasks >>>
  const fetchAssetDetails = async (assetId) => {
    if (!assetId) {
      setCurrentAssetDetail(null);
      return;
    }
    setIsLoading(true); // Consider a more specific loading state for the detail page
    setError(null);
    try {
      const [assetRes, completedTasksRes] = await Promise.all([
        fetch(`/api/assets/${assetId}`),
        fetch(`/api/assets/${assetId}/completed_task_instances`)
      ]);

      if (!assetRes.ok) throw new Error(`Asset Details: ${assetRes.statusText} (${assetRes.status})`);
      if (!completedTasksRes.ok) throw new Error(`Completed Tasks for Asset: ${completedTasksRes.statusText} (${completedTasksRes.status})`);

      const assetData = await assetRes.json();
      const completedTasksData = await completedTasksRes.json();

      setCurrentAssetDetail({ ...assetData, completed_task_instances: completedTasksData });

    } catch (error) {
      console.error(`Failed to fetch details for asset ${assetId}:`, error);
      setError(error.message);
      setCurrentAssetDetail(null); // Clear detail on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(); // Initial fetch
  }, []); // Runs once on mount

  // <<< NEW: Effect to fetch asset details when selectedAssetIdForDetail changes >>>
  useEffect(() => {
    if (selectedAssetIdForDetail && currentPage === 'assetDetail') {
      fetchAssetDetails(selectedAssetIdForDetail);
    } else {
      setCurrentAssetDetail(null); // Clear details if not on detail page or no ID
    }
  }, [selectedAssetIdForDetail, currentPage]);

  // Handler to refresh categories, passed to CategoryManagementPage
  const refreshCategories = () => {
    fetch('/api/categories')
      .then(res => {
        if (!res.ok) throw new Error(`Categories: ${res.statusText} (${res.status})`);
        return res.json();
      })
      .then(setCategories)
      .catch(err => {
        console.error("Failed to refresh categories:", err);
        // Optionally set an error state here for categories specifically
      });
  };

  const handleSaveTaskDefinition = async (taskDefPayload, isEditing) => {
    setError(null); // Clear general app error
    console.log("[App] handleSaveTaskDefinition triggered. isEditing:", isEditing);
    console.log("[App] Payload received:", taskDefPayload);

    const url = isEditing ? `/api/task_definitions/${taskDefPayload.id}` : '/api/task_definitions';
    const method = isEditing ? 'PUT' : 'POST';

    console.log(`[App] Sending ${method} request to ${url}`);

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskDefPayload)
      });

      const resultText = await response.text(); // Get response text first for debugging
      console.log("[App] Raw response from server:", resultText);

      if (!response.ok) {
        let errorMsg = `Failed to ${isEditing ? 'update' : 'create'} task definition (${response.status})`;
        try {
          const errData = JSON.parse(resultText); // Try to parse error json
          errorMsg = errData.error || errorMsg;
        } catch (e) {
          // Not a JSON error response, use status text or raw text
          errorMsg = response.statusText || errorMsg;
          if (resultText) errorMsg += ` - ${resultText}`;
        }
        throw new Error(errorMsg);
      }

      // If response.ok is true, assume success. 
      // The backend returns the created/updated task definition directly.
      // We can parse it if needed, but for now, just log and proceed.
      try {
        const resultJson = JSON.parse(resultText);
        console.log("[App] Parsed successful JSON response:", resultJson);
        // No specific check like result.success is needed here if HTTP status is ok (200, 201)
      } catch (e) {
        console.warn("[App] Could not parse successful response as JSON, but proceeding as HTTP status was OK:", resultText, e);
        // This might happen if the backend sends an empty success response for example
      }
      
      console.log("[App] Task definition saved successfully (based on HTTP status).");
      fetchData();
      setIsTaskFormOpen(false);
      setEditingTaskDefinition(null);
    } catch (err) {
      console.error("[App] Error saving task definition:", err);
      setError(err.message || 'Error saving task definition.');
    }
  };

  const handleCompleteTaskInstance = async (instanceId) => {
    setError(null);
    try {
      const response = await fetch(`/api/task_instances/${instanceId}/complete`, { method: 'PUT' });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to complete task');
      }
      fetchData();
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
      fetchData();
    } catch (err) {
      console.error("Error deleting task definition:", err);
      setError(err.message || "Error deleting task definition.");
    }
  };

  const handleShowDetails = (instance) => {
    setSelectedInstanceForDetails(instance);
    setIsDetailsModalOpen(true);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'settings':
        return <SettingsPage />;
      case 'categories':
        return <CategoryManagementPage categories={categories} onUpdateCategories={refreshCategories} />;
      case 'assets': // <<< ADDED: Assets page route
        return <AssetManagementPage assets={assets} onUpdateAssets={fetchData} onNavigateToAssetDetail={(assetId) => { setSelectedAssetIdForDetail(assetId); setCurrentPage('assetDetail'); }} />;
      case 'assetDetail': // <<< NEW: Asset Detail Page Route >>>
        if (isLoading && !currentAssetDetail) return <div className="notification is-info is-light">Loading asset details... <progress className="progress is-small is-info" max="100"></progress></div>;
        if (error && !currentAssetDetail) return <div className="notification is-danger">Error: {error}</div>;
        if (!currentAssetDetail) return <div className="notification is-warning">Asset not found or details could not be loaded. <a onClick={() => setCurrentPage('assets')}>Go back to assets list.</a></div>;
        return <AssetDetailPage 
                  assetDetail={currentAssetDetail} 
                  onOpenTaskForm={() => {
                    setEditingTaskDefinition(null); // New task
                    // Asset ID for the form will be handled by passing it to TaskDefinitionForm directly or via a new state if needed
                    setIsTaskFormOpen(true); 
                  }}
                  availableCategories={categories}
                  onNavigateBack={() => { setCurrentPage('assets'); setSelectedAssetIdForDetail(null); }}
                  onTaskStatusChange={fetchData} // Refresh all data if a task instance status changes (e.g. complete)
                />;
      case 'home':
      default:
        return (
          <>
            <div className="level mb-5">
              <div className="level-left">
                <div className="level-item">
                  <h2 className="title is-3 has-text-light">Due Soon</h2>
                </div>
              </div>
            </div>
            
            {error && <div className="notification is-danger">{error}</div>}
            {isLoading && <div className="notification is-info is-light">Loading tasks... <progress className="progress is-small is-info" max="100"></progress></div>}

            {!isLoading && taskInstances.length === 0 && (
              <div className="notification is-warning">No task instances found. Try adding a task definition!</div>
            )}
            
            {!isLoading && taskInstances.length > 0 && (
              <div className="mb-6">
                {taskInstances.map(instance => (
                  <TaskInstanceItem key={instance.id} instance={instance} onComplete={handleCompleteTaskInstance} onShowDetails={handleShowDetails} />
                ))}
              </div>
            )}

            <hr style={{backgroundColor: '#444'}}/>
            <div className="mt-6">
              <h3 className="title is-4 has-text-grey-lighter">Task Definitions (Debug/Management)</h3>
              {isLoading && <p className="has-text-grey-lighter">Loading definitions...</p>}
              {!isLoading && taskDefinitions.length === 0 && (
                <p className="has-text-grey-lighter">No task definitions yet.</p>
              )}
              {!isLoading && taskDefinitions.length > 0 && (
                <div className="is-flex is-flex-direction-column">
                  {taskDefinitions.map(def => (
                    <TaskDefinitionItem key={def.id} definition={def} onDelete={handleDeleteTaskDefinition} />
                  ))}
                </div>
              )}
            </div>
          </>
        );
    }
  };

  return (
    <div style={{fontFamily: "'Rajdhani', sans-serif"}}>
      <nav className="navbar navbar-neon-purple" role="navigation" aria-label="main navigation">
        <div className="navbar-brand">
          <a className="navbar-item" href="#" onClick={() => { setCurrentPage('home'); setIsNavbarActive(false); }} style={{fontSize: '1.5rem'}}>
            <span role="img" aria-label="robot icon" style={{marginRight: '0.5em'}}>🤖</span> Home Bot
          </a>
          <a role="button" className={`navbar-burger burger ${isNavbarActive ? 'is-active' : ''}`} 
             aria-label="menu" aria-expanded={isNavbarActive} onClick={() => setIsNavbarActive(!isNavbarActive)}>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </a>
        </div>
        <div className={`navbar-menu ${isNavbarActive ? 'is-active' : ''}`}>
          <div className="navbar-start">
            <a className="navbar-item" href="#" onClick={() => { setCurrentPage('home'); setIsNavbarActive(false); }}>
              Home
            </a>
            <a className="navbar-item" href="#" onClick={() => { setCurrentPage('assets'); setIsNavbarActive(false); }}>
              Assets
            </a>
            <a className="navbar-item" href="#" onClick={() => { setCurrentPage('categories'); setIsNavbarActive(false); }}>
              Manage Categories
            </a>
            <a className="navbar-item" href="#" onClick={() => { setCurrentPage('settings'); setIsNavbarActive(false); }}>
              Settings
            </a>
          </div>
          <div className="navbar-end">
            <div className="navbar-item">
              <div className="buttons">
                <button className="button is-light" onClick={() => { setEditingTaskDefinition(null); setIsTaskFormOpen(true); setIsNavbarActive(false); }}>
                  <strong>New</strong>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <section className="section">
        <div className="container">
          {renderPage()}
        </div>
      </section>

      <Modal isOpen={isTaskFormOpen} onClose={() => setIsTaskFormOpen(false)} title={editingTaskDefinition ? "Edit Task Definition" : "Add New Task Definition"}>
        <TaskDefinitionForm
          isOpen={isTaskFormOpen}
          onClose={() => setIsTaskFormOpen(false)}
          onSave={handleSaveTaskDefinition}
          initialTaskDefinition={editingTaskDefinition}
          key={editingTaskDefinition ? editingTaskDefinition.id : (selectedAssetIdForDetail && currentPage === 'assetDetail' ? `new-for-asset-${selectedAssetIdForDetail}` : 'new')} // More specific key
          availableCategories={categories} // Pass categories to the form
          assetId={currentPage === 'assetDetail' && selectedAssetIdForDetail ? selectedAssetIdForDetail : null} // Pass assetId if on detail page
        />
      </Modal>
      <TaskInstanceDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        instance={selectedInstanceForDetails}
      />
    </div>
  );
} 