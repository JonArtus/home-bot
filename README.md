# Home Bot - Personal Task Management Application

## 1. Overview & Goals

Home Bot is a personal web application designed to help the user organize and manage their life by tracking regular and one-off tasks.

**Core Goals:**
* Provide a centralized system for defining and tracking all personal tasks.
* Support various task recurrence patterns (daily, weekly, monthly, annually) and one-off tasks.
* Facilitate new habit formation through daily task tracking.
* Offer clear dashboard views of tasks (e.g., "due today," "upcoming urgent," "week view").
* Allow users to record task completion and undo completions if necessary.
* Categorize and prioritize tasks for better organization.

**Target Audience:** The primary user (developer/owner).

## 2. Domain Language (Key Concepts)

* **Task Definition:** The blueprint for a task, holding its description, category, and priority. It can either have a `RecurrenceRule` (for repeating tasks) or a `DueDate` (for one-off tasks), but not both.
* **Task Instance:** A specific, actionable occurrence of a task generated from a `TaskDefinition`. This is what gets marked as "complete" and has its own due date and completion status.
* **Recurrence Rule:** Defines how often a recurring task should occur (e.g., daily, weekly on a specific day, monthly on the Nth day, annually). Includes a start date and optional end date.
* **Category:** A user-defined label to group tasks (e.g., Self-Care, Home Maintenance).
* **Priority:** Indicates the urgency/importance (e.g., Urgent, High, Medium, Low).
* **Dashboard:** The main UI, initially a list of upcoming tasks, with features to add, view details, and complete tasks.

## 3. System Architecture

* **Overall Architecture:** Client-Server model.
    * **Client:** Single Page Application (SPA) running in the user's web browser.
    * **Server:** Python-based API backend.
* **Communication:** RESTful API for frontend-backend communication.
* **Data Storage:** Local-first approach with data primarily stored and managed on the Raspberry Pi.
    * **Database:** SQLite, running in-process with the Python API.
    * **ORM:** SQLAlchemy.
* **Background Processing:** APScheduler for nightly generation of recurring task instances and on application startup.

## 4. Technical Implementation

### 4.1. Backend
* **Language:** Python (3.8+)
* **Framework:** Flask
* **Database:** SQLite 3 with SQLAlchemy ORM
* **Migrations:** Alembic
* **Task Scheduling:** APScheduler

### 4.2. Frontend
* **Framework:** Preact (lightweight React alternative)
* **Styling:** Tailwind CSS (utility-first)
* **Build Tool:** Vite
* **UI/UX:**
    * Single Page Application (SPA) with a dark mode theme and minimalist design.
    * Main view is a scrollable list of tasks.
    * Modals for adding new tasks and viewing task details.
    * Icons for actions (e.g., complete task, application header).
* **State Management:** Preact signals or context.

## 5. Deployment

* **Environment:** Bare-metal Raspberry Pi (or similar).
* **Process:** Manual deployment via SSH and a custom shell script (`deploy.sh`).
    * The script handles:
        * Pulling latest code from Git (`main` branch).
        * Updating Python backend dependencies (`pip install -r requirements.txt`).
        * Updating Node.js frontend dependencies (`npm install`).
        * Building the frontend static assets (`npm run build`).
        * (Guidance for) Restarting the Flask application server.
* **Serving:** The Flask application serves both the API and the static frontend files.

## 6. Project Structure (High-Level)

* **`homebot_app/` (Backend - Flask)**
    * `app/`: Core application logic (blueprints, models, services).
    * `migrations/`: Alembic database migrations.
    * `tests/`: Pytest tests for the backend.
    * `config.py`: Application configuration.
    * `run.py`: Script to run the Flask development server.
* **`homebot-frontend/` (Frontend - Preact)**
    * `src/`: Preact components, pages/views, services, assets.
    * `public/`: Static assets.
    * `vite.config.js`: Vite build configuration.
    * `tailwind.config.js`: Tailwind CSS configuration.
