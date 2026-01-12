# LEGO Parts Organizer

A local-first web application for tracking LEGO parts in physical storage bins. Features a searchable catalog with technical line drawings, inspired by McMaster-Carr's interface.

## Features

- **Local-first**: Runs entirely on your local machine, no cloud dependencies
- **Part Search**: Search by part number or name from the complete Rebrickable database
- **Technical Drawings**: Generate SVG line drawings from LDraw .dat files showing part geometry
- **Bin Management**: Organize parts by bins and numbered slots
- **Location Tracking**: Track which parts are in which bins and slots
- **Label Printing**: Generate printable labels for bin fronts

## Prerequisites

### Required

- Node.js (v20 or higher)
- npm (comes with Node.js)

### Optional (but recommended)

- Docker and Docker Compose (for running with microservices architecture)

## Installation

1. Clone this repository:
```bash
git clone <repository-url>
cd lego-brick-organizer
```

2. Install dependencies:
```bash
npm install
```

3. Create necessary directories:
```bash
mkdir -p data/downloads data/ldraw
```

## Setup

### Step 1: Download Rebrickable Data

1. Visit https://rebrickable.com/downloads/
2. Download these files:
   - `parts.csv` (or `parts.csv.gz`)
   - `part_categories.csv` (or `part_categories.csv.gz`)
3. Extract if needed (`.gz` files)
4. Place the CSV files in `data/downloads/`

### Step 2: Download LDraw Parts Library (Optional)

For technical line drawings, download the LDraw parts library:

1. Visit https://library.ldraw.org/library/updates/complete.zip
2. Download the complete library
3. Extract to `data/ldraw/`
   - Should contain folders like `parts/`, `p/`, etc.

**Note**: Without the LDraw library, the system will still work but will show placeholder images instead of technical drawings.

### Step 3: Import Data

Import the Rebrickable data into the local database:

```bash
npm run import-data
```

This will create a SQLite database at `data/lego-parts.db` and import all parts and categories.

## Usage

### Starting the Server

#### Option 1: Using Docker Compose (Recommended)

The application uses a microservices architecture with separate services for the web app and SVG generation. This prevents image generation from blocking the web server.

```bash
docker compose up
```

This will start both services:
- **Web App**: http://localhost:3000
- **SVG Service**: http://localhost:3001 (internal only)

To run in detached mode:
```bash
docker compose up -d
```

To stop the services:
```bash
docker compose down
```

To rebuild after code changes:
```bash
docker compose up --build
```

#### Option 2: Running Locally with Node.js

For development without Docker:

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

The application will be available at: http://localhost:3000

**Note**: When running locally without Docker, SVG generation runs in the same process and may block the web server during heavy image generation.

### Using the Application

#### Search for Parts

1. Click "Search Parts" in the navigation
2. Enter a part number (e.g., "3001") or name (e.g., "brick")
3. View results with images, names, and current locations

#### Create Bins

1. Click "Manage Bins"
2. Click "Create New Bin"
3. Enter:
   - Bin ID (e.g., "A1", "BIN-001")
   - Description (optional)
   - Number of slots
4. Click "Create Bin"

#### Assign Parts to Slots

1. Click "Manage Bins"
2. Click on a bin to view details
3. Click on a slot to assign a part
4. Enter:
   - Part number (use autocomplete)
   - Quantity
   - Notes (optional)
5. Click "Save"

#### Print Labels

1. Click "Print Labels"
2. Select a bin from the dropdown
3. Click "Generate Labels"
4. Click "Print Labels" to print

## Project Structure

```
lego-brick-organizer/
├── data/                      # Data directory (not in git)
│   ├── downloads/             # Downloaded CSV files
│   ├── ldraw/                 # LDraw parts library
│   └── lego-parts.db          # SQLite database
├── database/
│   └── schema.js              # Database schema and initialization
├── lib/
│   ├── ldraw-parser.js        # Parse LDraw .dat files
│   └── svg-generator.js       # Generate SVG line drawings
├── docker-compose.yml         # Docker Compose orchestration
├── Dockerfile                 # Docker image for main web app
├── Dockerfile.svgservice      # Docker image for SVG service
├── server.js                  # Main Express web server
├── svg-service.js             # Separate SVG generation service
├── public/
│   ├── index.html             # Main HTML page
│   ├── styles.css             # Styles
│   ├── app.js                 # Frontend application entry point
│   └── js/                    # Frontend JavaScript components
│       ├── api/
│       │   └── partsApi.js    # API service layer
│       ├── components/
│       │   ├── base/
│       │   │   ├── Component.js   # Base component class
│       │   │   └── Modal.js       # Base modal component
│       │   ├── modals/
│       │   │   ├── CreateBinModal.js
│       │   │   ├── AssignPartModal.js
│       │   │   └── AssignToBinModal.js
│       │   ├── views/
│       │   │   ├── SearchView.js
│       │   │   ├── BinsView.js
│       │   │   └── LabelsView.js
│       │   └── ui/
│       │       ├── PartCard.js
│       │       ├── BinCard.js
│       │       ├── SlotCard.js
│       │       └── Autocomplete.js
│       └── utils/
│           ├── debounce.js    # Debounce utility
│           └── escapeHtml.js  # HTML escaping for security
├── scripts/
│   └── import-rebrickable.js  # Import Rebrickable data
├── __tests__/                 # Test files
│   └── unit/
│       ├── database/          # Database tests
│       └── lib/               # Library tests (parser, SVG generator)
└── package.json               # Dependencies and scripts
```

## Frontend Architecture

The frontend uses a **component-based architecture** built with vanilla JavaScript ES6 modules. This modular approach improves code organization, maintainability, and testability.

### Architecture Overview

The application is organized into several layers:

1. **Base Components** (`js/components/base/`)
   - `Component.js`: Base class providing common functionality (state management, event handling, lifecycle methods)
   - `Modal.js`: Base class for modal components with open/close functionality

2. **API Service Layer** (`js/api/`)
   - `partsApi.js`: Centralized API communication handling all HTTP requests to the backend
   - Provides methods for parts, bins, and slots endpoints

3. **View Components** (`js/components/views/`)
   - `SearchView.js`: Handles part search functionality with debounced input
   - `BinsView.js`: Manages bin listing and detailed bin views
   - `LabelsView.js`: Generates and displays printable labels

4. **Modal Components** (`js/components/modals/`)
   - `CreateBinModal.js`: New bin creation workflow
   - `AssignPartModal.js`: Part assignment to specific slots
   - `AssignToBinModal.js`: Complex part-to-bin assignment with multiple options

5. **UI Components** (`js/components/ui/`)
   - `PartCard.js`: Renders individual part cards
   - `BinCard.js`: Renders bin overview cards
   - `SlotCard.js`: Renders slot cards with part information
   - `Autocomplete.js`: Reusable autocomplete functionality

6. **Utilities** (`js/utils/`)
   - `debounce.js`: Debounce function for optimizing search input
   - `escapeHtml.js`: HTML escaping utility for security (fallback)

### Component Communication

Components communicate through a custom event system:
- Components emit events using `this.emit(eventName, data)`
- Other components listen using `this.on(eventName, handler)`
- The main app coordinates high-level events between views and modals

### Key Design Principles

- **Separation of Concerns**: Each component has a single, well-defined responsibility
- **Reusability**: UI components (cards, autocomplete) can be used across different views
- **Testability**: Components are isolated and can be unit tested independently
- **No Build Step**: Uses native ES6 modules, no webpack/babel required
- **Secure by Default**: Uses lit-html for automatic XSS protection

### Security

The frontend uses **lit-html** (~3KB) for templating, which provides automatic XSS (Cross-Site Scripting) protection:

- **Automatic escaping**: All data interpolated in templates is automatically escaped
- **Safe by default**: HTML/JavaScript in user data cannot execute
- **No build step required**: Loaded via CDN using import maps
- **Fallback utility**: `escapeHtml()` utility available for edge cases

Example of safe rendering:
```javascript
// Safe: lit-html automatically escapes part.name
html`<p class="part-name">${part.name}</p>`

// Would be vulnerable with plain template literals:
// `<p class="part-name">${part.name}</p>` ← Don't do this!
```

Even if malicious data like `<script>alert('XSS')</script>` is in the database, lit-html renders it as harmless text, not executable code.

### Testing

The backend has unit tests using Jest:
- Database schema tests
- LDraw parser tests
- SVG generator tests

Run tests with:
```bash
npm test
```

**Frontend Testing Note**: The frontend components use ES6 modules with CDN imports (lit-html), which makes traditional Jest testing complex. For comprehensive frontend testing, consider:
- Browser-based testing frameworks (Playwright, Cypress)
- Manual testing via the UI
- The component architecture makes future test integration easier

## API Endpoints

### Parts

- `GET /api/parts/search?q=<query>` - Search parts
- `GET /api/parts/:partNum` - Get part details
- `GET /api/parts/:partNum/drawing` - Get SVG drawing
- `GET /api/categories` - List categories

### Bins

- `GET /api/bins` - List all bins
- `GET /api/bins/:binId` - Get bin details
- `POST /api/bins` - Create new bin
- `GET /api/bins/:binId/labels` - Generate labels

### Slots

- `POST /api/slots` - Assign part to slot
- `PUT /api/slots/:id` - Update slot
- `DELETE /api/slots/:id` - Remove assignment

## Technical Details

### Microservices Architecture

The application uses a microservices architecture to prevent SVG generation from blocking the web server:

**Main Web App** (`server.js` on port 3000):
- Serves the frontend SPA
- Handles all API endpoints for parts, bins, and slots
- Proxies SVG drawing requests to the SVG service
- No blocking operations

**SVG Generation Service** (`svg-service.js` on port 3001):
- Dedicated service for generating SVG drawings
- Parses LDraw .dat files
- Caches generated SVGs in the shared database
- Handles computationally intensive isometric projection

**Communication**:
- Services communicate over HTTP
- Shared database via Docker volumes (or local filesystem)
- Environment variable `SVG_SERVICE_URL` configures the connection
- Falls back to placeholder SVGs on service errors

This architecture ensures the web interface remains responsive even when generating complex technical drawings from large LDraw files.

### LDraw File Format

LDraw .dat files contain part geometry as plain text with line types:

- Type 0: Comments/metadata
- Type 1: Sub-file references
- Type 2: Lines/edges (used for technical drawings)
- Type 3: Triangles
- Type 4: Quadrilaterals

The parser extracts Type 2 lines and recursively processes sub-files, applying transformation matrices.

### SVG Generation

3D edges are projected to 2D using isometric projection (30° angle), then scaled to fit a viewBox with padding. The result is a clean technical line drawing.

### Database Schema

- `parts` - LEGO part catalog from Rebrickable
- `part_categories` - Part categories
- `bins` - Physical storage containers
- `slots` - Locations within bins
- `part_drawings` - Cached SVG drawings

## Troubleshooting

### "No parts found" after importing

Make sure the CSV files are in `data/downloads/` and named exactly `parts.csv` and `part_categories.csv`.

### No technical drawings showing

1. Verify LDraw library is in `data/ldraw/`
2. Check that part files exist in `data/ldraw/parts/`
3. The system will show placeholders if files are missing

### Port already in use

Change the port by setting the PORT environment variable:

```bash
PORT=3001 npm start
```

## Data Sources

- **Rebrickable**: https://rebrickable.com/downloads/ (parts database)
- **LDraw**: https://www.ldraw.org/ (part geometry files)

Both are free and regularly updated by the LEGO community.

## License

MIT
