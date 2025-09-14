# Monarch Integration

This directory contains utilities for integrating with the Monarch system, which appears to be related to tactile rendering and authoring.

## Files

- **types.ts**: Contains TypeScript type definitions for Monarch-related data structures
- **utils.ts**: Contains utility functions for Monarch integration, including encryption and decryption

## Functionality

The utilities in this folder are responsible for:

1. **Data Encryption**: Encrypting data before sending it to Monarch
2. **Data Decryption**: Decrypting data received from Monarch
3. **Local Storage**: Saving SVG data to local storage for use with the Tactile Authoring Tool
4. **User Notifications**: Displaying alerts to users about Monarch operations

## Usage

The Monarch integration appears to be an advanced feature of the IMAGE extension that allows users to:

1. Send graphics to the Monarch system for tactile rendering
2. Load graphics in the Tactile Authoring Tool for editing
3. Create or update channels in the Monarch system

The integration uses encryption to secure sensitive data, such as channel IDs and secret keys. Users can configure their Monarch settings in the extension's options page, including:

- Graphic title
- Channel ID
- Secret key
- Encryption key

When a user chooses to send a graphic to Monarch or load it in the Tactile Authoring Tool, the extension uses the functions in this directory to process the data securely.
