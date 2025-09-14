# Localization Files

This directory contains localization files for the IMAGE browser extension, allowing the extension to be used in multiple languages.

## Structure

- **en/**: English localization
  - **messages.json**: Contains all English text strings used in the extension
- **fr/**: French localization
  - **messages.json**: Contains all French text strings used in the extension

## Usage

The extension uses the WebExtension i18n API to load the appropriate strings based on the user's browser language or their selected preference. Each string has a unique identifier and can include a description to provide context for translators.

Example from messages.json:
```json
"extensionName": {
    "message": "IMAGE Extension",
    "description": "Extension name"
}
```

These strings are referenced in the code using `browser.i18n.getMessage("extensionName")`.
