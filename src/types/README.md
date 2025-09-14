# TypeScript Type Definitions

This directory contains TypeScript type definitions for the IMAGE browser extension.

## Files

- **background.types.ts**: Type definitions for the background script
- **definitions.d.ts**: General type definitions
- **handler-response.schema.d.ts**: Type definitions for handler responses
- **message-types.constants.ts**: Constants for message types
- **preprocessor-response.schema.d.ts**: Type definitions for preprocessor responses
- **request.schema.d.ts**: Type definitions for IMAGE requests
- **response.schema.d.ts**: Type definitions for IMAGE responses
- **simpleaudio.schema.d.ts**: Type definitions for simple audio
- **text.schema.d.ts**: Type definitions for text renderings

## Functionality

The type definitions in this directory serve several important purposes:

1. **Type Safety**: Ensuring that data structures are used consistently throughout the codebase
2. **Code Completion**: Enabling IDE features like auto-completion and parameter hints
3. **Documentation**: Providing information about the structure of various data objects
4. **Error Prevention**: Catching type-related errors at compile time rather than runtime

## Usage

These type definitions are imported and used throughout the extension's codebase. For example:

- Message interfaces in background.types.ts define the structure of messages sent between content scripts and the background script
- Schema definitions like request.schema.d.ts and response.schema.d.ts define the structure of data sent to and received from the IMAGE server
- Constants in message-types.constants.ts provide a centralized definition of message type identifiers

By using these type definitions, the extension's code is more robust and easier to maintain, as type-related errors can be caught during development rather than in production.
