# Contributing to TimeWise

First off, thanks for taking the time to contribute! 🎉

The following is a set of guidelines for contributing to TimeWise. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/your-username/time-wise.git
    cd time-wise
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Create a branch** for your feature or fix (see Branching Strategy below).

## Development Workflow

### Branching Strategy

We use a simple branching model:

*   `main`: The production-ready branch.
*   `feature/your-feature-name`: For new features.
*   `fix/issue-description`: For bug fixes.
*   `chore/maintenance-task`: For housekeeping tasks (dependencies, config, etc.).

**Example:**
```bash
git checkout -b feature/add-calendar-view
```

### Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This helps us generate changelogs and keeps history readable.

**Format:** `<type>(<scope>): <description>`

*   **feat**: A new feature
*   **fix**: A bug fix
*   **docs**: Documentation only changes
*   **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
*   **refactor**: A code change that neither fixes a bug nor adds a feature
*   **perf**: A code change that improves performance
*   **test**: Adding missing tests or correcting existing tests
*   **chore**: Changes to the build process or auxiliary tools and libraries

**Example:**
```
feat(calendar): add monthly view component
fix(login): resolve validation error on email field
chore: update eslint configuration
```

## Coding Standards

### Linting & Formatting

We use **ESLint** and **Prettier** to maintain code quality and consistent formatting.

*   **Lint**: Run `npm run lint` to check for issues.
*   **Format**: Code is automatically formatted on commit (if hooks are set up) or you can run `npx prettier --write .`.

### Rules

*   **Imports**: Imports are automatically sorted.
*   **TypeScript**: Use strict typing where possible. Avoid `any`.
*   **Components**: Use functional components and hooks.

## Pull Request Process

1.  Ensure any install or build dependencies are removed before the end of the layer when doing a build.
2.  Update the README.md with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations and container parameters.
3.  Increase the version numbers in any examples files and the README.md to the new version that this Pull Request would represent.
4.  You may merge the Pull Request in once you have the sign-off of two other developers, or if you do not have permission to do that, you may request the second reviewer to merge it for you.

## Community

*   Be respectful and inclusive.
*   Accept constructive criticism.
*   Focus on what is best for the community.
