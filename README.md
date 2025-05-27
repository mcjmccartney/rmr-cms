# RMRCMS - Raising My Rescue Content Management System

A comprehensive practice management system built with Next.js 15 for dog behaviorists to manage clients, sessions, and finances. This version uses mock data services for development and testing, with a clean architecture ready for database integration.

## Features

- **Client Management**: Track client information, dog details, and behavioral assessments
- **Session Scheduling**: Calendar-based session booking with different session types
- **Behavioral Forms**: Public intake forms (Brief and Questionnaire) for new clients
- **Finance Tracking**: Session pricing and financial management
- **Dashboard**: Overview of upcoming sessions and client statistics
- **Mock Authentication**: Simple token-based authentication for development

## Tech Stack

- **Frontend**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **Data Layer**: Mock data service with repository pattern
- **Authentication**: Mock authentication system
- **Forms**: React Hook Form with Zod validation
- **State Management**: React hooks with TanStack Query

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd rmrcms
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:9003](http://localhost:9003) with your browser to see the result.

## Authentication

The system uses a mock authentication system for development:
- **Email**: Any valid email address
- **Password**: `password123`

## Mock Data

The application includes realistic mock data for:
- **Clients**: Sample client profiles with dog information
- **Sessions**: Upcoming and past sessions
- **Behavioral Assessments**: Sample brief and questionnaire data

All data is stored in memory and resets on application restart.

## Development

### Available Scripts

- `npm run dev` - Start development server on port 9003
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

### Data Service Architecture

The application uses a repository pattern with a centralized data service (`src/lib/dataService.ts`) that:
- Provides consistent API interfaces
- Simulates network delays for realistic testing
- Maintains data relationships and integrity
- Can be easily swapped for real database implementations

### Future Database Integration

To integrate a real database:

1. **Replace the data service**: Update `src/lib/dataService.ts` with real database calls
2. **Update authentication**: Replace mock auth with real authentication service
3. **Environment configuration**: Add database connection settings
4. **Migration scripts**: Create scripts to migrate mock data structure to real database

## Migration from Firebase Version

## Firebase Migration Complete ✅

This application has been successfully migrated from Firebase to a local file-based system:

### Authentication System
- **Mock Authentication**: Login with any email + password "password123"
- **Session Management**: Maintains user state during application session
- **No External Dependencies**: Works completely offline

### Data Persistence
- **Local File Storage**: All data saved to JSON files in `data/` directory
- **Automatic Persistence**: Data persists between application restarts
- **File Structure**:
  - `data/clients.json` - Client records
  - `data/sessions.json` - Session data
  - `data/briefs.json` - Behavioural briefs
  - `data/questionnaires.json` - Behaviour questionnaires

### Key Features Maintained
- ✅ Client management (add, edit, delete)
- ✅ Session tracking and scheduling
- ✅ Public intake forms (behavioural brief)
- ✅ Behaviour questionnaires
- ✅ All form validations and business logic
- ✅ Responsive UI and navigation
- ✅ Data export capabilities

### Migration Changes
- **Removed**: All Firebase dependencies and configuration
- **Replaced**: Firestore with local JSON file storage
- **Replaced**: Firebase Auth with mock authentication system
- **Added**: File-based persistence with automatic backup
- **Maintained**: Identical UI, functionality, and user experience

### Testing the Application

1. **Start the Application**:
   ```bash
   cd rmrcms
   npm run dev
   ```
   Application will be available at http://localhost:9003

2. **Test Authentication**:
   - Navigate to http://localhost:9003/login
   - Use any email (e.g., test@example.com) with password "password123"
   - Should successfully log in and redirect to dashboard

3. **Test Public Forms**:
   - Navigate to http://localhost:9003/public-intake
   - Fill out the behavioural brief form
   - Submit and verify data is saved to `data/briefs.json` and `data/clients.json`

4. **Test Data Persistence**:
   - Add clients, sessions, or submit forms
   - Restart the application
   - Verify all data persists and is loaded correctly

5. **Test Offline Functionality**:
   - Disconnect from internet
   - All features should work normally (no external dependencies)

### File Structure
```
rmrcms/
├── data/                    # Local data storage
│   ├── clients.json        # Client records
│   ├── sessions.json       # Session data
│   ├── briefs.json         # Behavioural briefs
│   └── questionnaires.json # Behaviour questionnaires
├── src/
│   ├── lib/
│   │   └── dataService.ts  # Mock data service (replaces Firebase)
│   └── contexts/
│       └── auth-context.tsx # Mock authentication context
└── ...
```

## License

This project is licensed under the MIT License.
