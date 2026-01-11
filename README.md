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

- Node.js (v16 or higher)
- npm (comes with Node.js)

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

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

The application will be available at: http://localhost:3000

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
├── public/
│   ├── index.html             # Main HTML page
│   ├── styles.css             # Styles
│   └── app.js                 # Frontend JavaScript
├── scripts/
│   └── import-rebrickable.js  # Import Rebrickable data
├── server.js                  # Express server and API
└── package.json               # Dependencies and scripts
```

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
