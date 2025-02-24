# CLAUDE.md - Poker Trainer Project Guide

## Build Commands
- `npm start` - Start development server
- `npm test` - Run all tests
- `npm test -- -t "test name"` - Run specific test
- `npm run build` - Build for production
- `npm run deploy` - Deploy to GitHub Pages

## Code Style Guidelines
- **React Components**: Use functional components with hooks
- **File Extensions**: .jsx for React components, .js for utilities
- **CSS**: Use TailwindCSS for styling with utility classes
- **Imports**: Group React imports first, then external libraries, then local imports
- **Error Handling**: Use try/catch blocks with specific error messages
- **State Management**: Use React hooks (useState, useEffect)
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Comments**: Add comments for complex logic, avoid unnecessary comments
- **Types**: Use descriptive prop/param names even without TypeScript
- **Event Handling**: Use custom events for cross-component communication

## Project Structure
- `src/components/` - React components
- `src/game/` - Game logic and state management
- TailwindCSS for styling