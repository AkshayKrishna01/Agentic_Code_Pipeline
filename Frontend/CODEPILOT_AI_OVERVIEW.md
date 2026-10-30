# CodePilot AI

## What is CodePilot AI?

CodePilot AI is a web-based developer workspace for interacting with a multi-agent AI coding pipeline.

It gives a developer one place to:

- Describe a coding, research, or code-review request.
- Send that request to an AI backend.
- Watch the request move through a multi-agent pipeline.
- Read the generated response.
- View generated source code with syntax highlighting.
- Copy or download generated code.
- Review previous requests from the current browser.
- Configure the backend URL and user session.
- Switch between dark and light themes.

The project is the **frontend client**. It provides the user interface and communicates with a separate FastAPI/LangGraph backend.

## What problem does it solve?

Normally, a developer may need separate tools for:

- Asking an AI to generate code.
- Asking an AI to explain a technical topic.
- Reviewing code quality.
- Tracking the response from a long-running AI workflow.
- Copying generated code into a project.

CodePilot AI combines these actions into a single developer-oriented workspace. The user submits one request, and the backend multi-agent workflow processes it and returns a response that the frontend formats according to its content.

## High-level architecture

```text
User
  |
  v
CodePilot AI React frontend
  |
  | POST /pipeline/code
  v
FastAPI + LangGraph multi-agent backend
  |
  v
Generated code, research, review, or response
  |
  v
CodePilot AI result workspace
```

The frontend does not run the AI agents itself. It sends a request to the backend and presents the backend response.

## Main user flow

### 1. Open the workspace

The application opens to the main workspace page.

The workspace contains:

- A header with connection and theme controls.
- A left sidebar with user information and request history.
- A central request and result area.
- A right sidebar with pipeline and request information.

### 2. Enter a request

The user types a request into the request composer.

Examples include:

- “Write a Python FastAPI endpoint that accepts a CSV file.”
- “Create a Python function that asynchronously fetches data from multiple APIs.”
- “Review this Python function and identify potential code quality issues.”
- “Research the best practices for connection pooling in PostgreSQL with Python.”

The composer:

- Displays the current character count.
- Limits input to 8,000 characters.
- Provides example prompts.
- Allows the request to be cleared.
- Supports submission with the Generate button.
- Supports `Ctrl + Enter` or `Command + Enter`.
- Avoids submitting while a user is still composing text with an IME.

### 3. Submit the request

When the user selects Generate, the frontend sends a request to the backend:

```http
POST {API_BASE_URL}/pipeline/code
Authorization: Bearer {API_AUTH_TOKEN}
Content-Type: application/json
Accept: application/json
```

The request body is:

```json
{
  "user_query": "The user's request",
  "user_id": "The browser's generated user ID"
}
```

The default backend URL is:

```text
http://localhost:8000/api/v1/agentic
```

In a deployed environment, this can be configured with the `VITE_API_BASE_URL` environment variable or changed through the Settings screen.
The bearer token is read from the `VITE_API_AUTH_TOKEN` environment variable. Do not commit the token or expose it in a public production frontend; use a secure backend proxy for production deployments.

### 4. Show pipeline progress

While the backend is processing the request, the frontend:

- Shows a loading state.
- Displays the submitted query.
- Shows elapsed time.
- Indicates that the connection is being checked.
- Allows the user to cancel the request.

The right sidebar shows the pipeline stages and the current request status.

### 5. Display the response

When the backend responds, the frontend:

- Shows request metadata.
- Shows the HTTP status.
- Shows the request ID when available.
- Shows the backend timestamp when available.
- Measures and displays request duration.
- Classifies the response.
- Displays the output in the appropriate presentation.

The frontend can identify responses as:

- Code
- Review
- Research
- Greeting
- Invalid request
- General text

## What the backend does

The backend is responsible for the actual AI workflow.

The frontend expects the backend to expose one main endpoint:

```text
POST /pipeline/code
```

The backend receives the user query and user ID, sends the query through its multi-agent pipeline, and returns a response.

The backend may return:

- Generated code.
- A code review.
- Research or technical explanation.
- A greeting.
- A validation or unsupported-request message.
- An error response.

The frontend does not assume that every response is source code. It inspects the returned output and selects the most useful display.

## What each major frontend area does

### `src/main.jsx`

This is the browser entry point.

It:

- Creates the React root.
- Enables React Strict Mode.
- Loads the application stylesheet.
- Renders the `App` component.

### `src/App.jsx`

This is the top-level application component.

It renders the main `Workspace` page.

### `src/pages/Workspace.jsx`

This is the main application coordinator.

It manages:

- The current query.
- The submitted query.
- Loading state.
- Result state.
- Error state.
- Connection state.
- Request count.
- Selected history item.
- Settings modal visibility.
- Mobile sidebar visibility.
- Request cancellation.

It connects the UI components to the API service and browser persistence hooks.

### `src/services/api.js`

This module sends requests to the backend.

It:

- Builds the pipeline URL.
- Sends the user query and user ID.
- Applies a timeout.
- Supports request cancellation.
- Reads JSON or plain-text responses.
- Handles HTTP 400, 422, 5xx, and unexpected statuses.
- Converts backend errors into a consistent frontend error format.
- Converts unexpected output values into readable JSON instead of crashing.

### `src/utils/config.js`

This module manages application configuration and browser storage.

It provides:

- The API base URL.
- The pipeline path.
- Local storage keys.
- API URL normalization.
- User ID generation.
- User ID regeneration.
- Safe local storage access.

The generated user ID identifies the browser session to the backend. It is not an authentication credential.

### `src/components/request/RequestComposer.jsx`

This is the main request input area.

It contains:

- The request textarea.
- Example prompt controls.
- Clear functionality.
- Character counting.
- Submit controls.
- Keyboard submission behavior.

### `src/components/request/ExamplePrompts.jsx`

This displays ready-to-use prompts so users can understand what the application supports.

Selecting an example places its text into the request composer.

### `src/components/request/promptData.js`

This contains:

- Example prompt definitions.
- Intent category colors used by badges.

The data is kept in a separate module so it does not conflict with the similarly named `ExamplePrompts.jsx` component on case-insensitive filesystems such as Windows.

### `src/components/results/LoadingState.jsx`

This displays progress while the backend is processing a request.

It provides:

- A loading indicator.
- Elapsed time.
- Pipeline stage information.
- A cancel button.

### `src/components/results/ResultPanel.jsx`

This is the main successful-response container.

It displays:

- The response category.
- Backend status.
- Submitted query.
- Request metadata.
- Backend messages.
- Review-specific information.
- Research-specific information.
- Generated code or text output.

### `src/components/results/OutputRenderer.jsx`

This renders the parsed response segments.

It decides whether each segment should be displayed as:

- Readable Markdown text.
- A read-only code viewer.

### `src/components/results/CodeViewer.jsx`

This displays generated code.

It provides:

- Syntax coloring.
- Line numbers.
- Word-wrap control.
- Copy functionality.
- Download functionality.
- Fullscreen viewing.

The viewer does not execute generated code.

### `src/components/ui/Markdown.jsx`

This is a small, safe Markdown renderer.

It supports common formatting such as:

- Headings.
- Paragraphs.
- Lists.
- Quotes.
- Horizontal rules.
- Inline code.
- Bold and italic text.
- Safe external and relative links.

It renders content as React elements rather than injecting raw HTML.

### `src/components/results/ErrorPanel.jsx`

This displays errors in a user-friendly format.

It shows:

- Error title.
- Error message.
- HTTP status.
- Request ID.
- Timestamp.
- Detailed validation information.
- Retry controls.

Different error types receive different icons and retry labels.

### `src/hooks/useRequestHistory.js`

This manages browser-local request history.

It:

- Stores successful and failed requests.
- Keeps the newest entries first.
- Limits history to 20 items.
- Allows entries to be removed.
- Allows all history to be cleared.
- Persists history in `localStorage`.

The history is local to the current browser. It is not shared with the backend or other users.

### `src/hooks/useTheme.js`

This manages the dark and light themes.

It:

- Starts in dark mode by default.
- Stores the selected theme in `localStorage`.
- Applies the theme class to the document.
- Allows the user to switch themes.

### `src/components/layout`

The layout components organize the application shell:

- `AppShell.jsx` provides the overall page structure.
- `Header.jsx` displays the top navigation and connection status.
- `Sidebar.jsx` displays user information and navigation actions.
- `RequestHistory.jsx` displays previous requests.
- `RightSidebar.jsx` displays pipeline and request context.
- `SettingsModal.jsx` manages user preferences and API configuration.

### `src/components/pipeline`

The pipeline components visually represent the multi-agent workflow:

- `PipelineVisualizer.jsx` renders the pipeline.
- `PipelineNode.jsx` renders an individual stage.
- `pipelineStages.js` defines pipeline stage and technology information.

## Request states

The interface represents several request states.

### Unknown

The application has not yet established whether the backend is reachable.

### Checking

The frontend is currently sending or waiting for a request.

### Connected

The backend returned a response.

### Offline

The frontend could not reach the backend.

The user receives instructions to check the FastAPI server, host, port, and CORS configuration.

## Error behavior

The frontend handles the following situations:

### Empty request

The Generate action is disabled when the input is empty.

### Validation failure

HTTP 422 responses are shown as invalid request errors. FastAPI/Pydantic field details are converted into readable messages.

### Request processing failure

HTTP 400 responses are displayed as request processing failures.

### Backend failure

HTTP 500 and other 5xx responses are displayed as pipeline failures.

### Network failure

If the backend cannot be reached, the user sees the configured endpoint and troubleshooting guidance.

### Timeout

Requests have a default timeout of three minutes. A timeout is shown separately from a normal network failure because the backend workflow may still be running.

### Cancellation

The user can cancel an active request. The frontend aborts its request and displays a cancellation state.

## Browser storage behavior

The application uses browser-local storage for convenience.

Stored values include:

```text
codepilot.apiBaseUrl
codepilot.userId
codepilot.history
codepilot.theme
```

This means:

- Settings remain after refreshing the page.
- The generated user ID remains associated with the browser.
- Previous requests can be revisited.
- Theme preference is remembered.

The application does not store backend credentials.

## What the application does not do

The frontend does not:

- Execute generated code.
- Persist requests on a server.
- Provide user authentication by itself.
- Implement the AI agents.
- Replace the FastAPI backend.
- Guarantee that generated code is correct.
- Guarantee that backend results are safe for every use case.
- Provide a shared history across browsers.

Generated code should be reviewed and tested before being used in a real project.

## Typical use cases

### Generate code

The user describes a feature and receives generated source code.

Example:

```text
Create a Python FastAPI endpoint that accepts a CSV file and validates its contents.
```

The response is displayed in a code viewer with copy and download actions.

### Review code

The user submits code or describes a review request.

The backend returns review findings, and the frontend displays them as a review response. If the backend includes a score, the frontend extracts and displays it.

### Research a technical topic

The user asks for an explanation, comparison, or best practice.

The frontend displays the response as readable text and research content.

### Retry a failed request

If a request fails, the user can retry it from the error panel.

### Reopen a previous request

The user can select an item from request history to view its previous query and response.

## Running the project

Install dependencies:

```powershell
corepack pnpm install --frozen-lockfile
```

Start the development server:

```powershell
corepack pnpm run dev
```

Build for production:

```powershell
corepack pnpm run build
```

Preview the production build locally:

```powershell
corepack pnpm run preview
```

## Backend configuration

For local development, the frontend expects the backend at:

```text
http://localhost:8000/api/v1/agentic
```

To use another backend during a production build, define:

```text
VITE_API_BASE_URL=https://your-backend.example.com/api/v1/agentic
```

The backend must provide:

```text
POST /pipeline/code
```

It must also allow requests from the frontend origin through CORS.

## In one sentence

CodePilot AI is a browser-based developer workspace that sends coding, research, and review requests to a multi-agent backend and presents the returned results as organized, copyable, and downloadable developer output.
