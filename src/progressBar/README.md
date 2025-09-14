# Progress Bar

This directory contains files related to the progress bar displayed during the rendering process in the IMAGE browser extension.

## Files

- **progressBar.html**: HTML template for the progress bar
- **progressBar.js**: JavaScript for handling the progress bar functionality
- **progressBar.css**: Styles for the progress bar
- **audio-files/**: Directory containing audio files for progress notifications

## Functionality

The files in this directory are responsible for:

1. **Processing Indication**: Showing users that their request is being processed
2. **Progress Visualization**: Providing a visual representation of the processing progress
3. **Audio Feedback**: Playing audio cues at different stages of processing
4. **Status Updates**: Informing users about the current status of their request

## Usage

When a user requests an accessible rendering of an image, chart, or map, the extension:

1. Sends the request to the IMAGE server
2. Opens a progress bar window or tab to indicate that processing is underway
3. Updates the progress bar as the server processes the request
4. Plays audio cues at key points (e.g., when the request is sent, when results arrive)
5. Closes the progress bar when processing is complete or if an error occurs

The progress bar helps users understand that their request is being processed, especially for complex images or slow network connections where processing might take some time.

The audio files in the audio-files directory provide non-visual feedback about the processing status, which is particularly helpful for users who rely on screen readers or other assistive technologies.
