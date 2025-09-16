# Nostria Management Portal

A modern Angular 20 management portal for Nostria, providing comprehensive tools for customer management, server configuration, and system administration.

## Features

- **Customer Management**: View and manage active customers
- **Server Configuration**: Configure and monitor server instances  
- **REST API Integration**: Connects to nostria-service backend
- **Responsive Design**: Modern, mobile-friendly interface
- **Real-time Updates**: Live data synchronization

## Tech Stack

- Angular 20.3.0
- TypeScript 5.9
- SCSS for styling
- Fetch API for HTTP requests (no HttpClient dependency)
- RxJS for reactive programming

## Development

### Prerequisites
- Node.js 20+
- npm 10+

### Setup
```bash
npm install
```

### Development Server
```bash
npm start
```
Navigate to `http://localhost:4200/`. The application will automatically reload when you change any source files.

### Building
```bash
npm run build
```
Build artifacts will be stored in the `dist/` directory.

### Testing
```bash
npm test
```

## Project Structure

```
src/
├── app/
│   ├── core/           # Core services and guards
│   ├── features/       # Feature modules
│   │   ├── customers/  # Customer management
│   │   └── servers/    # Server configuration
│   ├── shared/         # Shared components and utilities
│   └── ...
└── ...
```

## API Integration

This application integrates with the `nostria-service` REST API using the native Fetch API for optimal performance and reduced bundle size.