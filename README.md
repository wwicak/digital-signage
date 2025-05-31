# DigitalSignage

*📺 Simple self-hosted digital signage software for turning screens into beautiful content displays*

[![Outdated Dependencies](https://david-dm.org/wassgha/digital-signage.svg)](https://david-dm.org/wassgha/digital-signage) [![Travis Build](https://travis-ci.org/wassgha/digital-signage.svg?branch=master)](https://travis-ci.org/wassgha/digital-signage)
*(Note: Dependency and build status badges may be outdated)*

## Features

- ✅ Automatic refresh on content change (you should never need to touch a display once set up!)
- ✅ Totally modular, with a comprehensive widget management system (adding a widget is very simple!)
- ✅ Multiple built-in widgets to get you started:
  - ✅ Slideshow widget
  - ✅ Weather widget
  - ✅ "Congratulations" widget
  - ✅ Youtube embed widget
  - ✅ Web (iframe) widget
  - ✅ Standalone image widget
  - ✅ Announcements widget
  - ✅ List widget (can be used a directory, time sheet, etc.)
- ✅ Flexible, responsive widget grid that allows you to drag, drop and resize widgets
- ✅ Versatile slideshow system that allows multiple slideshows, multiple slide types (images, videos, youtube, web, etc.) inside the same display with variable durations, titles and descriptions for each slide!
- ✖ Support for multiple displays (in progress)

## Screenshots

Digital Display Preview
![Screenshot of the display](assets/preview.png?raw=true)

Administrator Panel: Changing the widget layout
![Screenshot of the administrator panel](assets/layout.png?raw=true)

Administrator Panel: Slides inside a slideshow
![Screenshot of the administrator panel](assets/slides.png?raw=true)

## Demo

Use the demo website at [http://digitaldisplay.herokuapp.com](http://digitaldisplay.herokuapp.com) (username: **demo**, password: **demo**)
*(Note: This demo may be outdated or unavailable)*

## Local Development Setup

This section guides you through setting up the project for local development.

### Prerequisites

*   **Node.js**: A recent LTS version is recommended (e.g., v18.x, v20.x).
*   **Bun**: This project uses Bun for running server scripts. Please refer to the [official Bun installation guide](https://bun.sh/docs/installation).
*   **MongoDB**: A running MongoDB instance (local or cloud-hosted like MongoDB Atlas).

### Cloning the Repository

```bash
git clone https://github.com/alexander-e-andrews/CSSeniorDisplayProject.git
cd CSSeniorDisplayProject
```

### Install Dependencies

Install project dependencies using Bun:

```bash
bun install
```

### Environment Variables

Environment variables are crucial for configuring the application.
1.  Create a `.env` file in the root of the project by copying the example file:
    ```bash
    cp .env.example .env
    ```
2.  Edit the `.env` file and provide values for the following variables:

    *   `MONGODB_URI`: The connection string for your MongoDB database.
        *   Example: `mongodb://localhost:27017/digitaldisplay` or a MongoDB Atlas SRV string.
    *   `SESSION_SECRET`: A long, random string used to secure user sessions. You can generate one using a password manager or an online generator.
        *   Example: `super-secret-key-for-sessions`
    *   `PORT`: The port on which the application server will run.
        *   Default: `3001`
    *   `ENVIRON`: The runtime environment. Set to `DEV` for development.
        *   Options: `DEV`, `PROD`
    *   `SERVER_HOST`: (Optional but recommended for development) The base URL of the server, including the port. This is used for generating absolute URLs if needed by the application.
        *   Example: `http://localhost:3001` (if your port is 3001)

### Database Setup and Initial Configuration

The project includes a setup script that helps configure environment variables, primarily the `MONGODB_URI`.
Run the setup utility using:
```bash
bun run setup
```
This command utilizes the `makeconf` utility. If a `.env` file does not exist, it will prompt you to enter configuration values (like your MongoDB URI) and create the `.env` file for you. If `.env` already exists, this script might not do anything unless `makeconf` is designed to update existing files.

Ensure your MongoDB server is running and accessible from your development machine with the URI provided. The database specified in the `MONGODB_URI` (e.g., `digitaldisplay`) will be created automatically by MongoDB when the application first connects and writes data to it, or you can create it manually beforehand.

## Running the Application

Once the setup is complete:

1.  **Start the development server:**
    The primary command for running the application in development mode (which includes the Next.js frontend and the custom Express backend) is:
    ```bash
    bun run dev:server
    ```
    This command uses `nodemon` to watch for changes in server-side files and `bun` to execute `server.ts`. The `server.ts` file handles both serving the API and the Next.js application.

2.  **Accessing the Application:**
    Open your web browser and navigate to:
    ```
    http://localhost:PORT
    ```
    (Replace `PORT` with the value specified in your `.env` file, e.g., `http://localhost:3001`).

## Running with Docker

This project includes Docker and Docker Compose configurations to simplify setup and deployment for both development and production environments.

### Prerequisites for Docker

*   **Docker Desktop**: Install Docker Desktop (or Docker Engine and Docker Compose CLI for Linux). Refer to the [official Docker documentation](https://docs.docker.com/get-docker/).

### Environment Variables for Docker

Similar to the local setup, Dockerized environments require a `.env` file at the root of the project.
1.  Create a `.env` file if you haven't already:
    ```bash
    cp .env.example .env
    ```
2.  Edit the `.env` file and provide necessary values. Key variables for the Docker setup include:

    *   `MONGODB_URI`: **Crucial for both dev and prod.** With the included MongoDB service in `docker-compose.yml`, you should configure this to connect to the `mongo` service.
        *   Example: `mongodb://${MONGO_ROOT_USER}:${MONGO_ROOT_PASSWORD}@mongo:27017/${MONGO_DATABASE}?authSource=admin&directConnection=true`
        *   The hostname `mongo` is resolvable by other services in the same Docker Compose network.
        *   Ensure the credentials and database name here match the `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`, and `MONGO_DATABASE` variables below.
    *   `MONGO_ROOT_USER`: The initial root username for the MongoDB instance. This is used by the `mongo` service on its first run to create a root user.
        *   Example: `admin` (from `.env.example`)
    *   `MONGO_ROOT_PASSWORD`: The password for the MongoDB root user.
        *   Example: `secretpassword` (from `.env.example`)
    *   `MONGO_DATABASE`: The name of the database to be created by MongoDB's initialization process and used by the application.
        *   Example: `digitaldisplay` (from `.env.example`)
    *   `SESSION_SECRET`: A long, random string.
    *   `PORT`: Typically `3001` (the backend server port inside the container).
    *   `ENVIRON`: Set to `DEV` for development-specific settings or `PROD` for production.
    *   `SERVER_HOST`: e.g., `http://localhost:3001` (for dev). For production, this would be your public domain.

    The `docker-compose.yml` file is configured to pass these variables from the `.env` file into the respective services. The `mongo` service uses `MONGO_ROOT_USER`, `MONGO_ROOT_PASSWORD`, and `MONGO_DATABASE` to initialize itself.

### Development Environment with Docker

The development setup uses `Dockerfile.dev` and provides live reloading for code changes. It runs three main services: the Next.js frontend, the backend API server, and a MongoDB database instance.

1.  **Build and Start Development Containers:**
    This command starts the frontend, backend, and MongoDB services.
    ```bash
    docker-compose up app-dev-frontend app-dev-backend mongo
    ```
    Or, to run in detached mode:
    ```bash
    docker-compose up -d app-dev-frontend app-dev-backend mongo
    ```

2.  **Accessing the Application (Development):**
    *   Frontend (Next.js): `http://localhost:3000`
    *   Backend API: `http://localhost:3001` (or as consumed by the frontend)
    *   MongoDB (if port 27017 is mapped to host in `docker-compose.yml`): `localhost:27017` (can be used with tools like MongoDB Compass, using the `MONGO_ROOT_USER` and `MONGO_ROOT_PASSWORD` from your `.env` file).

3.  **Key Features (Development):**
    *   **Live Reloading**: Changes to your local source code (frontend and backend) will trigger automatic rebuilds and restarts inside the containers.
    *   **Separate Services**: Frontend, backend, and database run in separate containers, promoting modularity.
    *   **Uses `Dockerfile.dev`**: Optimized for development speed and tooling.

4.  **Stopping Development Containers:**
    If running attached (no `-d` flag), press `Ctrl+C`. If detached, run:
    ```bash
    docker-compose down
    ```
    This command stops and removes the containers defined in your `docker-compose.yml`. Add `-v` to also remove named volumes if you want a complete cleanup (e.g., `docker-compose down -v`).

### Production Environment with Docker

The production setup uses a multi-stage `Dockerfile` to create an optimized, smaller image for deployment. It runs the application service and the MongoDB database service.

1.  **Build and Start Production Container:**
    This command builds the `app-prod` image (if not already built) and starts both the `app-prod` service and the `mongo` service it depends on.
    ```bash
    docker-compose up -d app-prod mongo
    ```
    If you only want to start `app-prod` and its dependencies (like `mongo`), you can often just run:
    ```bash
    docker-compose up -d app-prod
    ```

2.  **Accessing the Application (Production):**
    The `docker-compose.yml` maps port `8080` on the host to port `3001` (the application's backend server port) in the container.
    *   Access the application at: `http://localhost:8080`

3.  **Key Features (Production):**
    *   **Optimized Image**: The `app-prod` service uses a multi-stage build to minimize image size.
    *   **Integrated Services**: Runs the application and database services.
    *   **Uses `Dockerfile`**: Contains build and runtime optimizations for the application.

4.  **Stopping Production Container:**
    ```bash
    docker-compose stop app-prod mongo # To stop the services
    docker-compose down                 # To stop and remove all related containers, networks
    ```

### Data Persistence

The Docker Compose setup ensures data persistence for critical components:
*   **MongoDB Data**: Stored in a named Docker volume called `mongo_data`. This means your database contents will survive container restarts and removals.
*   **Application Uploads**: Files uploaded to the application (e.g., images for slides) are stored in a named Docker volume called `uploads_data` and mounted into `/app/uploads` in both `app-dev-backend` and `app-prod` services. This ensures your uploaded files are also persistent.

### Service Reliability

Key services defined in `docker-compose.yml` (application services and MongoDB) are configured with a `restart: unless-stopped` policy. This means Docker will automatically attempt to restart these services if they crash or if the Docker daemon itself is restarted, enhancing the overall uptime and resilience of the deployment.

#### Log Management

*   **Container Logs**: Both the Next.js/Express application and the MongoDB service are configured to output their logs to `stdout` and `stderr`. Docker captures these logs automatically. You can view them using:
    ```bash
    docker-compose logs <service_name>
    # Examples:
    # docker-compose logs app-prod
    # docker-compose logs app-dev-backend
    # docker-compose logs mongo
    ```
    To follow logs in real-time:
    ```bash
    docker-compose logs -f <service_name>
    ```

*   **Production Logging**: For production environments, relying solely on `docker-compose logs` might not be sufficient for robust log management, aggregation, and analysis. Common strategies include:
    *   **Docker Logging Drivers**: Configure Docker to use logging drivers (e.g., `json-file` with rotation options, `syslog`, `journald`, or drivers for cloud services like AWS CloudWatch Logs, Google Cloud Logging, Splunk, ELK stack). This is configured at the Docker daemon level or sometimes per container in `docker-compose.yml` via the `logging` directive.
    *   **Log Aggregation Platforms**: Forward logs to dedicated log aggregation platforms (e.g., Datadog, Logz.io, Sematext, or a self-hosted ELK/EFK stack). Applications might use a logging library that can directly send logs to these platforms, or a logging driver can forward them.

    Implementing advanced log rotation and aggregation is beyond the scope of this project's basic Docker setup but is a critical consideration for production deployments. The current setup ensures logs are accessible via Docker for immediate inspection.

### Managing Docker Resources

*   **View running containers:** `docker ps`
*   **View all containers (including stopped):** `docker ps -a`
*   **View container logs:** `docker-compose logs <service_name>` (e.g., `docker-compose logs app-dev-frontend` or `docker-compose logs mongo`)
*   **Remove unused images, containers, networks, and volumes:** `docker system prune` (use with caution)
*   **Rebuild images:** Add the `--build` flag to `docker-compose up` commands (e.g., `docker-compose up --build -d app-prod`).

This Docker setup provides a consistent environment for developing, testing, and running the DigitalSignage application.

## Development Manual

This section provides guidance for developers working on the DigitalSignage project.

### Overview of Project Structure

The project is organized as a monorepo with a Next.js frontend and an Express.js backend. Key directories include:

*   `api/`: Contains the backend Express API code.
    *   `api/helpers/`: Server-side helper functions for the API.
    *   `api/models/`: Mongoose models for database schema.
    *   `api/routes/`: API route definitions.
    *   `api/sse_manager.ts`: Server-Sent Events manager for real-time updates.
*   `app/`: The Next.js frontend using the App Router.
    *   Contains route segments (folders like `app/display/[id]/page.tsx`) and layouts.
    *   `app/lib/`: Client-side libraries or utilities specific to the Next.js app.
*   `components/`: Shared React components used across the frontend.
    *   `components/Admin/`: Components for the admin interface.
    *   `components/Display/`: Components for the public display view.
    *   `components/Form/`: Reusable form components.
    *   `components/Widgets/`: Generic widget handling components (e.g., providers, empty states).
    *   `components/ui/`: Basic UI primitives (often from a UI library like Shadcn/ui via `components.json`).
*   `widgets/`: Contains the specific logic and UI for each available widget. Each widget typically has its own sub-directory.
    *   `widgets/[widgetName]/index.ts`: Main class definition for the widget, extending `base_widget.ts`.
    *   `widgets/[widgetName]/src/`: React components for the widget's display (`Content.tsx`) and options dialog (`Options.tsx`).
    *   `widgets/base_widget.ts`: Base class that all widgets extend.
    *   `widgets/widget_list.ts`: An array that registers all available widgets.
*   `public/`: Static assets publicly served by Next.js (e.g., images, fonts).
*   `helpers/`: Client-side helper functions and hooks for the Next.js frontend (e.g., `helpers/auth.tsx`, `hooks/useDisplay.ts`).
*   `actions/`: Next.js Server Actions for handling form submissions and mutations from the client.
*   `pages/`: Contains some specific Next.js pages that might not use the App Router, or custom overrides like `_app.tsx`, `_document.tsx`. The primary routing is in `app/`.

**Important Root Files:**

*   `server.ts`: Sets up and runs the main Express server, which also serves the Next.js application.
*   `next.config.js`: Configuration for the Next.js framework.
*   `tsconfig.json`: TypeScript configuration for the Next.js frontend.
*   `tsconfig.server.json`: TypeScript configuration for the backend server code.
*   `bun.lockb`: Bun's lockfile.
*   `package.json`: Project scripts, dependencies, and metadata.

### Coding Style and Conventions

*   **Linting**: The project uses ESLint to enforce code style and catch potential errors.
*   **Run Linter**: To check your code against the linting rules, run:
    ```bash
    bun run lint
    ```
*   **Code Patterns**: Please try to follow existing code patterns and conventions found in the project. This helps maintain consistency and readability.
*   **TypeScript**: The project is primarily written in TypeScript. Ensure new code uses TypeScript features appropriately.

### General Workflow

A general workflow for adding new features or making modifications might look like this:

1.  **Backend (API) Changes (if applicable)**:
    *   Define or update Mongoose models in `api/models/`.
    *   Create or modify API routes in `api/routes/`.
    *   Add or update server-side helper functions in `api/helpers/`.
    *   Write or update unit/integration tests for your API changes (see "Testing" section).
2.  **Frontend (Next.js App) Changes**:
    *   If using Server Actions, define them in `actions/`.
    *   Create or modify pages/routes in `app/`.
    *   Develop or update React components in `components/` or widget-specific directories.
    *   Add or update client-side helper functions in `helpers/` or `app/lib/`.
    *   Write or update tests for your frontend components and logic.
3.  **Testing**: Ensure new code is covered by tests, and existing tests pass.
4.  **Documentation**: Update any relevant documentation, including this README if necessary.

### Adding a New Widget

Given the highly modular structure of this program, implementing a new widget is a core development task.
1.  Create a new folder inside the `widgets/` folder. Name it descriptively for your widget (e.g., `MyWidget`).

    ```
     widgets/
       announcement/
       ...
       MyWidget/  <-- (new)
       base_widget.ts
       widget_list.ts
       index.ts  <-- (Main export for all widgets)
    ```
2.  Inside your new widget's folder (e.g., `widgets/MyWidget/`), create an `index.ts` file. This file will define the widget's class, extending `BaseWidget` from `../base_widget.ts`.

    ```typescript
    // widgets/MyWidget/index.ts
    import BaseWidget, { WidgetConfig } from '../base_widget';
    // Potentially import types for your specific data or options
    // import MyWidgetOptionsComponent from './src/MyWidgetOptions';
    // import MyWidgetContentComponent from './src/MyWidgetContent';

    // Define an interface for your widget's specific data structure
    interface MyWidgetData {
      message: string;
      // Add other data fields as needed
    }

    export default class MyWidget extends BaseWidget<MyWidgetData> {
      constructor() {
        super({
          name: 'My Widget Name', // User-friendly name
          slug: 'MyWidget',        // Unique slug (often same as class name)
          version: '0.1',
          icon: 'Smile',           // Icon name from Lucide React library
          defaultData: {
            message: 'Hello World!',
            // Initialize other default data fields
          },
          description: 'A brief description of what my widget does.',
        } as WidgetConfig<MyWidgetData>);
      }

      // Override the Widget getter to return your display component
      override get WidgetView() {
        // Dynamically import your component to enable code splitting
        return import('./src/MyWidgetContent');
      }

      // Override the Options getter to return your options component
      override get OptionsView() {
        // Dynamically import your component
        return import('./src/MyWidgetOptions');
      }
    }
    ```
    *   **Note**: The `icon` property uses [Lucide React](https://lucide.dev/) icons.
    *   The `slug` property is important for identifying the widget.
    *   Use generics with `BaseWidget<MyWidgetData>` if your widget has specific data types.

3.  Create a `src/` subfolder (e.g., `widgets/MyWidget/src/`). Inside `src/`, implement two React components:
    *   `MyWidgetOptions.tsx`: This component renders the dialog content for administrators to configure your widget's data. It will typically receive `data` and `updateData` props.
    *   `MyWidgetContent.tsx`: This component renders the user-facing side of the widget that will be displayed on the TV. It will receive the widget's `data` as a prop.

    **Example `MyWidgetContent.tsx`:**
    ```tsx
    // widgets/MyWidget/src/MyWidgetContent.tsx
    import React from 'react';

    interface MyWidgetData {
      message: string;
    }

    interface MyWidgetContentProps {
      data: MyWidgetData;
    }

    const MyWidgetContent: React.FC<MyWidgetContentProps> = ({ data }) => {
      return (
        <div>
          <h1>{data.message}</h1>
        </div>
      );
    };
    export default MyWidgetContent;
    ```

    **Example `MyWidgetOptions.tsx`:**
    ```tsx
    // widgets/MyWidget/src/MyWidgetOptions.tsx
    import React from 'react';
    import { Input } from '@/components/ui/input';
    import { Label } from '@/components/ui/label';

    interface MyWidgetData {
      message: string;
    }

    interface MyWidgetOptionsProps {
      data: MyWidgetData;
      updateData: (newData: Partial<MyWidgetData>) => void;
    }

    const MyWidgetOptions: React.FC<MyWidgetOptionsProps> = ({ data, updateData }) => {
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="message">Message</Label>
            <Input
              id="message"
              value={data.message}
              onChange={(e) => updateData({ message: e.target.value })}
            />
          </div>
        </div>
      );
    };
    export default MyWidgetOptions;
    ```

4.  Register your new widget by adding its class to the `widgets/widget_list.ts` file:

    ```typescript
    // widgets/widget_list.ts
    import Slideshow from './slideshow';
    import Weather from './weather';
    // ... other widget imports
    import MyWidget from './MyWidget'; // Import your new widget class

    export default [
        Slideshow,
        Weather,
        // ... other existing widgets
        MyWidget, // Add your new widget class here
    ];
    ```
    Also, ensure your widget is exported from `widgets/index.ts`:
    ```typescript
    // widgets/index.ts
    export { default as Slideshow } from './slideshow';
    export { default as Weather } from './weather';
    // ... other widget exports
    export { default as MyWidget } from './MyWidget'; // Export your new widget
    ```

5.  Restart the development server (`bun run dev:server`) to see the new widget appear in the administrator panel.

## Debugging

This section provides tips for debugging different parts of the application.

### Backend (Node.js/Express)

*   **Console Logging**: For simple debugging, `console.log()` statements in your backend code (API routes, helpers, `server.ts`) can be very effective. Output will appear in the terminal where you ran `bun run dev:server`.
*   **Nodemon Auto-Restart**: The `bun run dev:server` script uses `nodemon`. This tool automatically monitors changes in server-side files (as configured in `package.json`) and restarts the Node.js server. This means you don't usually need to manually restart after making backend code changes.
*   **Node.js Debugger (e.g., VS Code)**: For more complex debugging scenarios, you can use the Node.js debugger.
    *   **VS Code**: You can create a `launch.json` configuration to attach to the running `nodemon` process or to launch `server.ts` directly with the debugger.
        *   An example `launch.json` configuration for attaching to `nodemon` might involve using the `--inspect` flag with `nodemon` and then attaching VS Code's debugger.
        *   Alternatively, configure it to run `bun --bun run --project tsconfig.server.json -r tsconfig-paths/register server.ts` directly with debugging flags.
    *   Refer to the [Node.js debugging documentation](https://nodejs.org/en/docs/guides/debugging-getting-started/) and your IDE's specific instructions.

### Frontend (Next.js/React)

*   **Browser Developer Tools**: Your web browser's built-in developer tools are indispensable for frontend debugging.
    *   **Elements Tab**: Inspect the DOM structure, CSS styles, and layout.
    *   **Console Tab**: View `console.log()` messages from your frontend code, as well as errors and warnings from React or Next.js.
    *   **Network Tab**: Inspect network requests made by the application (e.g., API calls to your backend, static asset loading). This is useful for debugging data fetching issues.
    *   **Sources Tab**: Set breakpoints and debug JavaScript/TypeScript code running in the browser.
*   **React DevTools**: Install the React DevTools browser extension (available for Chrome, Firefox, Edge). This tool allows you to:
    *   Inspect the React component hierarchy.
    *   View and modify component props and state.
    *   Profile component rendering performance.

## Testing

Ensuring the application is well-tested is crucial for stability and maintainability.

*   **Running Tests**: To run all tests, use the command:
    ```bash
    bun test
    ```
*   **Testing Framework**: The project uses [Jest](https://jestjs.io/) as its testing framework.
*   **Test File Location**: Test files are located in the `__tests__` directory at the root of the project. The structure within `__tests__` generally mirrors the main project structure (e.g., `__tests__/api/routes/user.test.ts` for `api/routes/user.ts`).
*   **Writing New Tests**:
    *   Create test files with the naming convention `*.test.ts` (or `*.test.tsx` for files containing JSX).
    *   Use Jest's global functions:
        *   `describe(name, fn)`: Creates a block that groups together several related tests.
        *   `it(name, fn)` or `test(name, fn)`: Defines an individual test case.
        *   `expect(value)`: Used with matcher functions to assert that a value meets certain conditions (e.g., `toBe()`, `toEqual()`, `toHaveBeenCalled()`).
    *   **Mocking**:
        *   `jest.fn()`: Creates a mock function, useful for replacing real function implementations or tracking calls.
        *   `jest.spyOn(object, methodName)`: Spies on an existing method of an object, allowing you to track calls or provide a mock implementation while retaining the original.
    *   **Best Practices**: Review existing tests in `__tests__/` to understand common patterns for mocking Mongoose models, API requests, helper functions, and React components.
*   **Test Coverage**: To generate a test coverage report, run:
    ```bash
    bun test --coverage
    ```
    This will output a coverage summary to the console and typically create an HTML report in a `coverage/` directory.
*   **Importance of Testing**: Writing tests for new features and bug fixes helps prevent regressions, ensures code quality, and makes refactoring safer. Aim for good test coverage across the application.

## Updating the software

Assuming the software was cloned from this GitHub repository, it is possible to use the included script:

```bash
bun run update
```

This script pulls the latest changes from the repository, installs dependencies, and rebuilds the software.
