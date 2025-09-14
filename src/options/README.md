# Extension Options

This directory contains files related to the options/preferences page of the IMAGE browser extension.

## Files

- **options.html**: HTML template for the options page
- **options.ts**: JavaScript for handling the options functionality
- **options.css**: Styles for the options page

## Functionality

The files in this directory are responsible for:

1. **User Preferences**: Allowing users to configure various aspects of the extension
2. **Language Settings**: Enabling users to select their preferred language
3. **Server Configuration**: Providing options for selecting the server to use (McGill or custom)
4. **Rendering Options**: Letting users choose which types of renderings they want (audio, text)
5. **Monarch Settings**: Configuring integration with the Monarch system
6. **Developer Mode**: Enabling advanced options for developers

## Usage

Users can access the options page by:
- Clicking the "IMAGE options" button in the launchpad
- Navigating to the extension's options in their browser's extension management page

The options page includes several sections:

1. **Interpretation Options**: Controls for enabling/disabling audio and text renderings
2. **Language and Interface Settings**: Language selection and options for displaying invisible buttons
3. **Server Options**: Selection between the McGill server and a custom server
4. **Haptic Devices**: Configuration for Monarch integration
5. **Developer Mode**: Advanced options for debugging and development

Changes to the options are saved when the user clicks the "Save Changes" button. The user can also cancel their changes by clicking the "Cancel" button.

The extension uses the browser's storage API to persist these settings across browser sessions.
