# IMAGE Browser Extension Features

The IMAGE browser extension provides accessible interpretations of graphics, charts, and maps for users with visual impairments. The goal is to provide people who are blind or have low vision with a new and useful experience of internet graphics that goes beyond automatically generating alt tags.

## Core Features

### Graphics Interpretation

- **Rich Interpretations**: Provides detailed, context-aware interpretations of graphics that go far beyond basic alt text
- **Support for Both Web and Local Graphics**:
  - **Web Graphics**: Right-click on any graphic on the internet to access IMAGE processing options via the context menu
  - **Local Graphics**: Use the IMAGE Launchpad (Alt+I) and select "Use IMAGE on a graphic on my computer" to interpret graphics saved locally on your machine
- **Multiple Rendering Types**: Receive different types of interpretations tailored to the graphic content:
  - Detailed text descriptions
  - Audio renderings with spatial cues
  - Tactile SVG graphics for haptic devices
  - Specialized renderings based on graphic type and content

### Maps Support

- **Interactive Map Processing**: Specialized handling for maps found on web pages
- **Spatial Information**: Convey spatial relationships and geographic information in accessible formats
- **Context-Aware Descriptions**: Descriptions that focus on relevant geographic features and relationships

### Charts Support

- **Data Visualization Interpretation**: Make charts and graphs accessible through multiple modalities
- **Trend Identification**: Highlight important trends, patterns, and outliers in data visualizations
- **Highcharts Integration**: Special support for Highcharts-based visualizations
- **Data Sonification**: Convert chart data to audio patterns where appropriate

### Tactile Graphics

- **Tactile Authoring Tool**: Load graphics into a Tactile Authoring Tool for creating tactile representations
- **Monarch Integration**: Send graphics to Monarch haptic devices for tactile feedback
- **SVG Rendering**: Generate SVG representations of graphics optimized for tactile output
- **Tactile Simplification**: Automatically simplify complex graphics for effective tactile exploration

## Keyboard Shortcuts

The IMAGE browser extension provides several keyboard shortcuts for quick access to its features:

| Shortcut | Function | Description |
|----------|----------|-------------|
| `Alt+I` | Launch IMAGE Launchpad | Opens the IMAGE Launchpad interface with various options for processing graphics |
| `Ctrl+B` | Process Focused Image | When an image is focused (selected), this shortcut processes it with IMAGE |

## Accessibility Features

- **Screen Reader Integration**: Designed to work seamlessly with screen readers
- **Invisible Buttons**: Toggle-able invisible buttons that are only visible to screen readers
- **Keyboard Navigation**: Full keyboard accessibility for all features
- **Tabindex Management**: Automatically adds tabindex to images without it for improved keyboard navigation
- **Progressive Enhancement**: Works alongside existing accessibility features rather than replacing them

## Customization Options

### Interpretation Preferences

- **Audio Renderings**: Toggle audio interpretations on/off
- **Text Renderings**: Toggle text descriptions on/off
- **Rendering Preferences**: Customize which types of renderings are prioritized

### Language Settings

- **Multiple Languages**: Support for English and French
- **Automatic Language Detection**: Option to use the browser's language

### Server Configuration

- **McGill Server**: Use the default McGill University IMAGE server
- **Custom Server**: Specify a custom server URL for processing

### Haptic Device Settings

- **Monarch Configuration**: Settings for Monarch haptic devices:
  - Title
  - Channel ID
  - Secret key
  - Encryption key

## Developer Features

- **Developer Mode**: Toggle additional developer options
- **Preprocessing Only**: Request only the preprocessing step
- **Request Only**: Download the raw request JSON
- **Debug Information**: Access to additional debugging information

## User Experience

- **Progress Indication**: Visual feedback during graphic processing
- **Error Handling**: Comprehensive error messages and recovery options
- **First Launch Experience**: Guided introduction for new users
- **Feedback System**: Built-in feedback mechanism for reporting issues or suggestions

## Technical Capabilities

- **Image Compression**: Automatic compression of large graphics (>4MB)
- **Context Extraction**: Analysis of surrounding content to improve interpretation
- **Local File Support**: Process graphics from local files (file:// URLs)
- **Data URL Support**: Process graphics encoded as data URLs
