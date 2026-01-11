# LEGO Parts Organizer - Quick Setup Guide

This guide will walk you through setting up the LEGO Parts Organizer from scratch.

## Prerequisites Check

Before starting, make sure you have:

```bash
node --version  # Should be v16 or higher
npm --version   # Should come with Node.js
```

If you don't have Node.js, download it from https://nodejs.org/

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
cd lego-brick-organizer
npm install
```

This will install:
- Express (web server)
- better-sqlite3 (database)
- csv-parse (data import)

### 2. Create Data Directories

```bash
mkdir -p data/downloads data/ldraw
```

### 3. Download Rebrickable Data

Visit https://rebrickable.com/downloads/ and download:

1. **parts.csv** (or parts.csv.gz)
   - Contains all LEGO part numbers and names
   - ~20MB compressed, ~80MB uncompressed

2. **part_categories.csv** (or part_categories.csv.gz)
   - Contains category names
   - Small file (~50KB)

Extract if needed and place both CSV files in `data/downloads/`

Your directory should look like:
```
data/
└── downloads/
    ├── parts.csv
    └── part_categories.csv
```

### 4. Import Data

```bash
npm run import-data
```

This will:
- Create the SQLite database
- Import all parts (~50,000+ entries)
- Import categories (~50 entries)
- Takes about 30-60 seconds

You should see:
```
Initializing database...
Importing part categories...
Importing parts...
=== Import Complete ===
Total parts: 50000+
Total categories: 50+
```

### 5. Start the Server

```bash
npm start
```

Open your browser to: **http://localhost:3000**

You're ready to go!

## Optional: Add Technical Drawings

For SVG line drawings instead of Rebrickable images:

### 1. Download LDraw Library

Visit https://library.ldraw.org/library/updates/complete.zip

This is the complete LDraw parts library (~50MB).

### 2. Extract to data/ldraw

```bash
cd data
unzip complete.zip -d ldraw/
```

Your directory should look like:
```
data/
└── ldraw/
    ├── parts/
    │   ├── 3001.dat
    │   ├── 3002.dat
    │   └── ...
    ├── p/
    └── models/
```

### 3. Restart the Server

The drawings will be generated on-demand when you view parts.

## First-Time Usage

### Create Your First Bin

1. Click **"Manage Bins"**
2. Click **"Create New Bin"**
3. Enter:
   - Bin ID: `A1`
   - Description: `Test bin`
   - Number of slots: `1`
4. Click **"Create Bin"**

### Assign a Part

1. Click on the **"A1"** bin you just created
2. Click on **"Slot 1"**
3. In the part number field, type: `3001`
4. Select from the autocomplete suggestions
5. Set quantity: `10`
6. Click **"Save"**

### Search for Parts

1. Click **"Search Parts"**
2. Type: `brick 2x4`
3. You'll see part `3001` (Brick 2x4) with your location info!

### Print Labels

1. Click **"Print Labels"**
2. Select **"Bin A1"** from dropdown
3. Click **"Generate Labels"**
4. Click **"Print Labels"** to print

## Development Mode

For development with auto-restart on file changes:

```bash
npm run dev
```

Requires installing nodemon (already in devDependencies).

## Troubleshooting

### Import fails with "File not found"

Make sure CSV files are in the exact location:
```bash
ls -la data/downloads/
# Should show parts.csv and part_categories.csv
```

### Port 3000 already in use

Change the port:
```bash
PORT=3001 npm start
```

### Database is locked

Stop the server (Ctrl+C) and try again. SQLite uses a file lock.

### No images showing

1. Check your internet connection (for Rebrickable images)
2. Or install the LDraw library (see above)
3. Placeholders will show if both are unavailable

## Data Locations

- Database: `data/lego-parts.db`
- CSV files: `data/downloads/`
- LDraw library: `data/ldraw/`
- Cached drawings: Stored in database

## Performance Tips

### Large Searches

The first search may take a few seconds as SQLite builds query plans. Subsequent searches are faster.

### SVG Generation

First-time SVG generation takes ~100-500ms per part as it parses LDraw files. Results are cached in the database.

### Database Size

- With Rebrickable data: ~150MB
- With cached drawings: +10-50MB depending on usage

## Next Steps

1. **Organize your bins**: Create bins matching your physical storage
2. **Import your inventory**: Assign parts to slots
3. **Print labels**: Generate and print labels for your bins
4. **Search and find**: Use the search to quickly locate parts

## Backup

Your data is in `data/lego-parts.db`. Back it up regularly:

```bash
cp data/lego-parts.db data/lego-parts.backup.db
```

Or use SQLite backup:

```bash
sqlite3 data/lego-parts.db ".backup data/backup.db"
```

## Updates

### Update Rebrickable Data

1. Download new CSV files
2. Delete old database: `rm data/lego-parts.db`
3. Re-run: `npm run import-data`

### Update LDraw Library

1. Download new complete.zip
2. Extract to `data/ldraw/` (overwrite)
3. Clear cached drawings if needed

## Support

For issues, check the main README.md or the GitHub repository.

## Workflow Summary

```
Download CSVs → Import Data → Start Server → Create Bins → Assign Parts → Search & Print
     (5 min)      (1 min)     (instant)    (2 min)      (ongoing)      (instant)
```

Total setup time: **~10 minutes**

Happy organizing!
