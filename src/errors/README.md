# Error Handling

This directory contains files related to error handling and display in the IMAGE browser extension.

## Files

- **errors.css**: Styles for error pages
- **errors.ts**: JavaScript for error handling and display
- **http_error.html**: HTML template for HTTP errors (e.g., server connection issues)
- **no_renderings.html**: HTML template for when no renderings are available for an image

## Functionality

The files in this directory are responsible for:

1. **Error Detection**: Identifying various error conditions that may occur during the extension's operation
2. **User Notification**: Displaying appropriate error messages to users
3. **Error Reporting**: Providing users with options to report errors to the IMAGE team
4. **Troubleshooting Guidance**: Offering suggestions for common issues that may prevent successful renderings

## Usage

When an error occurs during the extension's operation, such as a failure to connect to the IMAGE server or when no renderings are available for a particular image, the extension displays an appropriate error page to the user.

These error pages include:
- A description of the error
- Possible reasons for the error
- Contact information for the IMAGE team
- Options for providing feedback about the error
