# Charts Utilities

This directory contains utilities for handling and processing chart data in the IMAGE browser extension.

## Files

- **charts-utils.js**: Contains functions for extracting data from HighCharts objects to prepare them for rendering

## Functionality

The utilities in this folder are responsible for:

1. **Data Extraction**: Extracting relevant data from HighCharts objects, including:
   - Chart title and subtitle
   - Axis information (titles, types, ranges)
   - Series data (names, types, data points)
   - Accessibility text

2. **Data Sanitization**: Ensuring that extracted data is properly formatted and sanitized for processing

3. **Chart Analysis**: Analyzing chart structure to determine the type of chart (pie, line, area, etc.)

## Usage

These utilities are used when a user requests an accessible rendering of a chart on a webpage. The extension identifies charts created with HighCharts, extracts the relevant data using these utilities, and sends the data to the IMAGE server for processing.

Currently, the extension supports a subset of HighCharts formats, including pie charts and single-trend area or line charts.
