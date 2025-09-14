# Maps Processing

This directory contains utilities for handling and processing map data in the IMAGE browser extension.

## Files

- **maps-utils.ts**: Contains functions for processing maps and generating map queries

## Functionality

The utilities in this folder are responsible for:

1. **Map Detection**: Identifying maps embedded in web pages (currently supports Google Maps and potentially OpenStreetMap)
2. **Map Processing**: Extracting relevant data from maps, such as coordinates and context
3. **Query Generation**: Creating queries to send to the IMAGE server for map rendering
4. **UI Integration**: Adding buttons and controls to maps for accessing IMAGE features

## Usage

When a user visits a webpage containing a map (such as a Google Maps embed), the extension:

1. Detects the map using the `processMaps` and `processMAPImages` functions
2. Adds a button next to the map that allows the user to request an accessible rendering
3. When the user clicks the button, the extension extracts the map's coordinates and context
4. The extension sends this information to the IMAGE server for processing
5. The server returns accessible renderings, which are displayed to the user

The extension currently supports two types of map requests:
- **Map Resource**: Based on latitude and longitude coordinates
- **Map Search**: Based on a place ID or query string

Maps are processed differently depending on their type (Google Maps, OpenStreetMap) and how they are embedded in the page (iframe, static image).
