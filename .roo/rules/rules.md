Guiding Principles for Professional Web App Development
These principles aim to ensure the development of high-quality, modern, robust, and delightful web applications, focusing on completeness, exceptional user experience, code excellence, and long-term maintainability.

1. Completeness and Holistic Feature Integration
Rule: No Dead Code or Orphaned Features.

Best Practice: Regularly audit the codebase. Before initiating new features, ensure existing ones are fully implemented, polished, and seamlessly integrated into the user's workflow. If a component or feature is partially built, prioritize its completion or make a conscious decision to remove it to prevent codebase bloat and confusion.

Example (AuraTask): Components lmust have a clear UI entry point and function flawlessly, or be removed. The most advanced and complete version of any duplicated component (e.g., SettingsPanel over SettingsModal) must be the one actively used and maintained.

Rule: All UI Elements Must Be Purposeful, Interactive, and Polished.

Best Practice: Every button, icon, link, and interactive element must have a clearly defined purpose, be fully functional, and provide appropriate visual feedback (hover, focus, active states). Avoid placeholder interactions or elements that lead nowhere.

Example (AuraTask): The settings icon in the header must reliably open the comprehensive SettingsPanel. All interactive elements within modals and forms must be wired to their respective actions.

Rule: Iterative Refinement and User-Centric Evolution.

Best Practice: Features are not "done" after initial implementation. Continuously gather feedback (even if simulated through self-critique initially) and iterate on existing features to improve usability, performance, and user satisfaction.

Example (AuraTask): After implementing task filtering, revisit it to see if the UI can be more intuitive or if additional useful filter options are needed based on potential user scenarios.

2. Exceptional User Interface (UI) and User Experience (UX) Design:
Rule: Prioritize Modern, Intuitive, and Visually "Gorgeous" Design.

Best Practice:

Consistent Design System: Leverage and extend a consistent design system (e.g., shadcn/ui primitives, Tailwind CSS).

Visual Hierarchy & Clarity: Ensure clear visual hierarchy, legible typography (e.g., Vazirmatn for Farsi), adequate color contrast (WCAG AA minimum), and spacious, uncluttered layouts.

Responsiveness: Design for a seamless experience across all devices (mobile-first or desktop-first with graceful degradation/enhancement). Ensure proper RTL layout for Farsi.

Microinteractions: Implement subtle microinteractions (e.g., button feedback, loading spinners, state changes) to make the UI feel alive and responsive.

Information Architecture: Organize content and navigation logically to minimize user cognitive load.

Example (AuraTask): Custom themes (Alireza, Neda) should be meticulously polished, with consistent application of their unique styles. Glassmorphism and other modern effects should be used tastefully.

Rule: Animations Must Be Meaningful, Performant, and Delightful.

Best Practice:

Purposeful Animation: Use animations (Framer Motion for complex interactions, GSAP for sophisticated sequences, CSS transitions/animations for simpler effects) to provide feedback, guide attention, indicate state changes, and enhance the perception of fluidity.

Performance: Ensure animations are smooth (aim for 60fps) and don't negatively impact performance, especially on less powerful devices. Use will-change CSS property judiciously.

Subtlety: Animations should generally be quick and subtle, enhancing the UX without being distracting or causing delays.

Example (AuraTask): The subtle hover effects, modal transitions (Framer Motion), custom cursor (Alireza theme), and Neda theme's bubbly effects are good starting points. Ensure these are optimized and consistently applied.

Rule: Real-time Feedback and Dynamic, Authentic Data Presentation.

Best Practice:

No Mock Data in Production: All data displayed to the user must be real and fetched from the backend (Supabase).

Real-time Updates: Utilize real-time capabilities (e.g., Supabase Realtime subscriptions) to ensure data is always current without requiring manual refreshes.

Optimistic Updates: For user actions that modify data (e.g., completing a task), update the UI immediately (optimistically) and then synchronize with the backend. Provide clear visual indicators for background processes or pending states. Revert UI and show an error if the backend update fails.

Graceful Loading States: Implement skeleton screens or meaningful loading indicators to prevent jarring content shifts and manage user perception during data fetching.

Example (AuraTask): Task list updates via Supabase Realtime. Optimistic updates for task completion. Use skeleton loaders for initial data fetching in TaskDashboard.

3. Superior Code Quality and Engineering Best Practices:
Rule: Immaculately Clean, Readable, and Maintainable Code.

Best Practice:

Modularity & Reusability: Decompose UI and logic into small, focused, and reusable components and functions/hooks.

Descriptive Naming: Employ clear, consistent, and unambiguous naming conventions for variables, functions, components, files, and types.

Comprehensive Comments & Documentation: Comment complex logic, non-obvious decisions, and public APIs of components/functions (JSDoc/TSDoc). Maintain up-to-date READMEs and architectural overviews if the project grows.

DRY (Don't Repeat Yourself): Abstract common patterns and logic into utility functions, custom hooks, or higher-order components.

SRP (Single Responsibility Principle): Each component and function should have one primary responsibility.

Consistent Code Style: Enforce a consistent code style using linters (ESLint with appropriate plugins for React/TypeScript) and auto-formatters (Prettier). Integrate these into the development workflow (e.g., pre-commit hooks).

Avoid Magic Values: Use named constants for magic numbers, strings, or configuration values.

Rule: Standardized and Modern Tooling & Libraries.

Best Practice: Make conscious decisions about libraries and stick to them for consistency. Prefer well-maintained, reputable libraries.

Example (AuraTask): Consolidate toast notifications to Sonner. Standardize on Framer Motion for primary UI animations.

Rule: Leverage TypeScript for Robust Type Safety.

Best Practice: Utilize TypeScript's features to their full potential. Define precise interfaces and types for props, state, API payloads, database entities, and function signatures. Use utility types (e.g., Partial, Pick, Omit), generics, and enums to create a strong type system. Minimize the use of any.

Example (AuraTask): Ensure types/index.ts is comprehensive and strictly adhered to. Type all function parameters and return values.

Rule: Proactive Error Handling, Graceful Degradation, and Insightful Logging.

Best Practice:

Client-Side Validation: Validate user inputs before submitting forms.

API Error Handling: Gracefully handle API errors, displaying user-friendly messages.

Unexpected States: Implement UI states for empty data, loading, and errors.

Graceful Degradation: Ensure the application remains usable at a basic level even if non-critical features or API calls fail.

Logging: Implement client-side logging for errors and important events (consider services like Sentry or LogRocket for production). Server-side (API routes) logging is also crucial.

Example (AuraTask): Use try/catch for all Supabase operations. Display informative toasts for errors. Implement clear loading states for data fetching and AI processing.

Rule: Performance as a Core Feature.

Best Practice:

Memoization: Use React.memo, useCallback, and useMemo strategically to prevent unnecessary re-renders.

Efficient Data Fetching: Fetch only the data needed for the current view. Use pagination or infinite scrolling for large datasets.

Code Splitting & Lazy Loading: Utilize Next.js dynamic imports (next/dynamic) for code splitting components and lazy loading routes or heavy components.

Image Optimization: Use optimized image formats (e.g., WebP) and responsive images (next/image or manual implementation).

Bundle Size Analysis: Regularly analyze the application bundle size (e.g., using @next/bundle-analyzer) and identify opportunities for reduction.

Debouncing/Throttling: Debounce or throttle event handlers for frequent events (e.g., search input, window resize).

Example (AuraTask): Debounce search input in Header. Ensure animations are GPU-accelerated where possible. Optimize Supabase queries (e.g., using .select() to fetch only necessary columns).

4. Database Design and Management (Supabase Focus):
Rule: Well-Structured, Normalized, and Secure Database Schema.

Best Practice:

Normalization: Design tables with clear relationships, aiming for at least 3rd Normal Form (3NF) where practical to reduce data redundancy and improve integrity.

Data Types: Use the most appropriate and specific data types for columns (e.g., timestamp with time zone for timestamps, uuid for primary keys, text vs varchar based on needs).

Primary & Foreign Keys: Clearly define primary keys for all tables and use foreign keys to enforce referential integrity between related tables. Specify ON DELETE cascade or set null behavior appropriately.

Naming Conventions: Use consistent naming for tables and columns (e.g., snake_case).

Example (AuraTask): The use of UUIDs for IDs is good. Ensure task_tags table is correctly implemented with composite primary key and foreign keys to tasks and tags with ON DELETE CASCADE.

Rule: Efficient, Optimized, and Secure Database Queries.

Best Practice:

Selective Fetching: Use select() in Supabase queries to fetch only the columns needed for a specific operation or view.

Indexing: Create indexes on columns frequently used in WHERE clauses, JOIN conditions, and ORDER BY clauses to speed up queries.

Avoid N+1 Queries: Be mindful of fetching related data. Use Supabase's ability to fetch nested related data in a single query where possible, or structure data fetching to avoid multiple round trips for lists of items.

Server-Side Logic for Complex Operations: For complex data manipulations or aggregations, consider using Supabase Edge Functions or database functions (PL/pgSQL) instead of performing heavy logic on the client.

Example (AuraTask): When fetching tasks, select('*, subtasks(*), tags(*)') is good for fetching related data efficiently. Ensure indexes exist on user_id, group_id, task_id, etc.

Rule: Comprehensive and Rigorously Tested Row Level Security (RLS).

Best Practice:

Enable RLS on All Tables: Ensure RLS is enabled for every table containing user-specific or sensitive data.

Principle of Least Privilege: Policies should grant only the necessary permissions. Users should only be able to SELECT, INSERT, UPDATE, DELETE their own data, or data explicitly shared with them according to application logic.

Test Policies Thoroughly: Test RLS policies from the perspective of different users (and unauthenticated users) to ensure they work as expected and there are no data leaks. Use Supabase SQL editor to test policies with SET ROLE.

Example (AuraTask): The existing RLS policies are a good foundation. Ensure the task_tags table has appropriate RLS policies allowing users to manage tags only for tasks they own.

Rule: Enforce Data Validation and Integrity at Multiple Levels.

Best Practice:

Database Constraints: Utilize NOT NULL, UNIQUE, CHECK constraints, and foreign key constraints in the database schema to maintain data integrity at the lowest level.

API Validation: Validate all incoming data in API routes (e.g., using Zod) before interacting with the database.

Client-Side Validation: Provide immediate feedback to users with client-side form validation (e.g., using Zod with react-hook-form).

Example (AuraTask): taskFormSchema uses Zod for client-side validation. Ensure database schema (schema.sql) includes NOT NULL for required fields.

Rule: Schema Migrations and Versioning.

Best Practice: Use Supabase's built-in migration tools or manage schema changes through versioned SQL migration scripts. Avoid making direct schema changes in the Supabase Studio dashboard for production environments without a corresponding migration script.

Example (AuraTask): Any changes to supabase/schema.sql should be considered a migration step.

5. Security by Design:
Rule: Embed Security Throughout the Development Lifecycle.

Best Practice:

Input Sanitization & Output Encoding: Sanitize all user inputs on the server-side to prevent injection attacks (SQLi, NoSQLi). Encode output appropriately to prevent XSS.

API Security: Authenticate and authorize all API requests. Validate request payloads rigorously.

Secret Management: Store API keys, database credentials, and other secrets securely using environment variables (e.g., Supabase project settings, Vercel environment variables). Never commit secrets to version control.

Rate Limiting: Implement rate limiting on sensitive API endpoints to prevent abuse.

HTTPS: Always use HTTPS in production.

Example (AuraTask): Ensure API routes (/api/process-task, /api/assign-group-emoji, /api/test-gemini) validate that the userId (if applicable) matches the authenticated user, or that the operation is otherwise authorized.

Rule: Regularly Audit Dependencies for Vulnerabilities.

Best Practice: Use tools like npm audit, pnpm audit, or GitHub Dependabot to identify and remediate known vulnerabilities in third-party packages.

6. Accessibility (a11y) as a Fundamental Requirement:
Rule: Design and Build for All Users, Including Those with Disabilities.

Best Practice:

Semantic HTML: Use HTML elements according to their semantic meaning (e.g., <button> for buttons, <nav> for navigation).

Keyboard Navigability: Ensure all interactive elements are focusable and operable using only a keyboard. Maintain a logical focus order.

ARIA Attributes: Use ARIA (Accessible Rich Internet Applications) attributes appropriately to provide additional context to assistive technologies when semantic HTML is insufficient (e.g., for custom components, dynamic content updates).

Color Contrast: Ensure sufficient color contrast between text and background to meet WCAG AA guidelines.

Text Alternatives: Provide alt text for images and other non-text content.

Focus Management: Manage focus effectively in modals, drawers, and other dynamic UI elements.

Testing: Regularly test with screen readers and keyboard-only navigation. Use accessibility audit tools.

Example (AuraTask): Add aria-label attributes to icon-only buttons. Ensure custom dropdowns and modals are fully keyboard accessible and manage focus correctly.

7. Robust Development Process and Workflow:
Rule: Structured and Iterative Development.

Best Practice:

Clear Task Definition: Break down features into small, well-defined tasks with clear acceptance criteria before starting implementation.

Incremental Implementation: Build and test features incrementally.

Regular Testing: Conduct thorough manual testing across different browsers and devices. Implement automated tests (unit, integration, end-to-end) where feasible to catch regressions.

Rule: Disciplined Version Control (Git).

Best Practice: Use Git effectively. Make small, atomic commits with clear, descriptive messages. Use feature branches for new development and bug fixes. Regularly pull/rebase to keep branches up-to-date.

Rule: Code Reviews and Collaborative Quality Assurance (if applicable).

Best Practice: If working in a team, enforce code reviews before merging to master/main. This helps maintain code quality, share knowledge, and catch potential issues early.

Rule: Proactive Dependency Management.

Best Practice: Regularly review and update project dependencies. Use tools to identify outdated packages and assess the impact of updates.

Rule: Comprehensive Documentation.

Best Practice: Maintain both user-facing documentation (how to use the app) and technical documentation (architecture, setup, complex components) as the project evolves.

By consistently applying these extended principles, the aim is to craft a web application that is not only functionally complete and technically sound but also exceptionally user-friendly, visually stunning, secure, accessible, and a pleasure to maintain and evolve.
