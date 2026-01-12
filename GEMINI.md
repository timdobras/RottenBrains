# RottenBrains Project Context

## Project Overview

RottenBrains is a social media platform designed for movie and TV show enthusiasts. It enables users to connect with friends, share reviews, and discover new content based on community recommendations. The platform is built using a modern web stack:

- **Framework**: Next.js (a React framework)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Supabase (for database, authentication, and real-time features)

## Building and Running

To get the project up and running, use the following commands:

- **Development**: `npm run dev`

  - Runs the app in development mode. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

- **Build**: `npm run build`

  - Builds the app for production.

- **Start**: `npm run start`
  - Starts the production server.

## Development Conventions

The project follows standard development practices for Next.js and TypeScript projects. Key conventions include:

- **Linting**: The project uses ESLint for code quality. Run `npm run lint` to check for issues and `npm run lint:fix` to automatically fix them.

- **Formatting**: Code formatting is enforced using Prettier. Run `npm run format` to format the entire codebase and `npm run format:check` to verify the formatting.

- **Type Checking**: The project uses TypeScript for static type checking. Run `npm run type-check` to check for type errors.
