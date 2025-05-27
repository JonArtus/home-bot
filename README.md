# Home Bot - Personal Operations Center

## 1. Overview & Goals

Home Bot is an evolving personal web application designed to help the user organize and manage multiple facets of their life. It aims to reduce mental load by reliably tracking tasks, assets, subscriptions, inventories, important dates, recipes, and shopping lists.

**Core Goals (Currently Implemented in part, with further expansion planned):**
* Provide a centralized system for defining and tracking all personal tasks.
    * _Currently implemented:_ Task Definitions (title, description, notes, category, priority, due date/recurrence) and Task Instances.
    * _Future Vision:_ Tasks auto-generated from various life-management modules.
* Support different task behaviors.
    * _Future Vision:_ Actionable (requiring completion), informational (dismissable or auto-archiving).
* Offer a unified dashboard for actionable items and easy access to different management modules.
    * _Currently implemented:_ Dashboard for task instances, settings page, category management.

**Future Vision - Additional Modules:**
* Manage home assets and their maintenance schedules.
* Track subscriptions and remind about renewals.
* Oversee freezer inventory and prompt for timely usage of items.
* Remember important dates (birthdays, anniversaries) and generate preparatory tasks.
* Store and manage recipes, linking them to a master ingredient list.
* Maintain a dynamic shopping list, with potential for barcode-driven additions.

**Target Audience:** The primary user (developer/owner).

## 2. Domain Language (Key Concepts & Modules)

### Currently Implemented:
* **Core Task System:**
    * **Task Definition:** The blueprint for a user-defined task. Holds `title`, `description` (short summary), `notes` (detailed text), `category_short_name` (links to `Category`), `priority`, and either a `due_date` (for one-off tasks) or a `recurrence_rule` (for repeating tasks).
    * **Task Instance:** A specific, actionable occurrence of a task generated from a `TaskDefinition`. This is what gets marked as "complete" and has its own due date and completion status.
    * **Recurrence Rule:** Defines how often a recurring task should occur (currently 'weekly' or 'monthly').
    * **Category:** A user-defined label (e.g., "Default", "Work") with an optional icon, used to group `TaskDefinition`s.
    * **Setting:** Key-value pairs for application configuration (e.g., task generation parameters).

### Future Vision - Expanded Domain:
* **Enhanced Core Task System:**
    * **Task Definition (Future Fields):** Will include `task_behavior` (e.g., actionable, informational), and `source_module` (e.g., "ASSET_MAINTENANCE", "FREEZER_ITEM_EXPIRY", "USER_DEFINED") to track its origin and behavior.
* **Asset Management Module (Future):** Tracks valuable items (`Asset`) and their `MaintenanceRule`s, generating maintenance tasks.
* **Subscription Tracker Module (Future):** Manages `Subscription` details and generates renewal reminders/tasks.
* **Freezer Inventory Module (Future):** Logs `FreezerItem`s, calculates expiry, and prompts usage via tasks. Links to `IngredientMaster`.
* **Important Dates Module (Future):** Stores `ImportantDateEvent`s (birthdays, anniversaries) and creates advance reminder tasks.
* **Recipe & Ingredients Module (Future):**
    * `IngredientMaster`: A central list of all ingredients (food, household) with categories and optional barcodes.
    * `Recipe`: Stores recipes with ingredients, methods, tags, etc.
    * `RecipeIngredient`: Links recipes to master ingredients with quantities.
* **Shopping List Module (Future):** Manages `ShoppingListItem`s, which can be added manually, from recipes, or via barcode scanning.

## 3. System Architecture

* **Overall Architecture:** Client-Server model.
    * **Client:** Single Page Application (SPA) running in the user's web browser.
    * **Server:** Python-based API backend.
        * _Future Vision:_ To become more modular in structure as new features are added.
* **Communication:** RESTful API.
* **Data Storage:** Local-first (SQLite on Raspberry Pi) with SQLAlchemy ORM.
* **Background Processing:** APScheduler (initial setup for future use) for generating recurring task instances.
    * _Future Vision:_ APScheduler will also handle task generation for all relevant modules (maintenance, renewals, freezer usage, important dates) and other scheduled jobs.

## 4. Technical Implementation

### 4.1. Backend
* **Language:** Python (3.8+)
* **Framework:** Flask
* **Database:** SQLite 3 with SQLAlchemy ORM
* **Migrations:** Alembic (setup, to be used for future schema changes)
* **Task Scheduling:** APScheduler (integrated for basic recurring task instance generation)
* **Modularity (Future Vision):** As new domains (Assets, Subscriptions, etc.) are added, the backend will evolve to use Flask Blueprints for better organization, with dedicated service layers and SQLAlchemy models for each.

### 4.2. Frontend
* **Framework:** Preact
* **Styling:** Bulma (CSS framework) with custom styles in `app/src/index.css`. Dark mode theme implemented.
* **Build Tool:** Vite
* **UI/UX (Current):**
    * Single Page Application (SPA) with a dark mode theme.
    * Main view is a list of upcoming task instances.
    * Modals for adding/editing task definitions and viewing task instance details.
    * Pages for managing application settings and categories.
* **UI/UX (Future Vision):**
    * Dedicated sections/views for managing each new module (Assets, Freezer, Recipes, etc.).
    * Task items in lists will adapt their appearance and available actions based on `task_behavior`.
    * Potential for simple barcode input for shopping list features.
* **State Management:** Preact `useState` and `useEffect` hooks. (Can explore signals or context if complexity grows).

## 5. Deployment

* **Environment:** Bare-metal Raspberry Pi (or similar).
* **Process:** Manual deployment via SSH and a custom shell script (`deploy.sh`).
    * The script handles: `git pull`, Python dependency updates (`pip install -r requirements.txt`), Node.js dependency updates (`cd app && npm install`), frontend build (`cd app && npm run build`), and provides guidance for restarting the Flask server.
* **Serving:** The Flask application serves both the API and the static frontend files from the `app/dist` directory.

## 6. Project Structure (Current)

* **Root Directory (`/`):**
    * `run.py`: Main Flask application runner, defines API endpoints.
    * `app_init.py`: Flask app factory, initializes extensions (SQLAlchemy, Migrate).
    * `config.py`: Application configuration (e.g., database URI).
    * `services.py`: Business logic for task instance generation.
    * `models/`: Directory for SQLAlchemy models.
        * `models.py`: Defines `TaskDefinition`, `TaskInstance`, `RecurrenceRule`, `Category`, `Setting`.
    * `migrations/`: Alembic database migrations directory.
    * `requirements.txt`: Python backend dependencies.
    * `venv/`: Python virtual environment (typically gitignored).
    * `.gitignore`: Specifies intentionally untracked files.
    * `README.md`: This file.
* **Frontend Subdirectory (`/app/`):**
    * `src/`: Preact components, main `app.jsx`, and `index.css`.
    * `public/`: Static assets like `index.html`.
    * `index.html`: Main HTML entry point for the SPA.
    * `vite.config.mjs`: Vite build configuration.
    * `package.json`, `package-lock.json`: Node.js project manifest and lock file.
    * `node_modules/`: Frontend dependencies (typically gitignored).
    * `dist/`: Output directory for the built frontend assets (served by Flask).

---

This `README.md` provides an updated summary of the Home Bot project, outlining its current state and future direction.
