# Building the IMAGE Browser Extension for Safari

These instructions are for manually building and installing the the extension for Safari on either OSX or iOS.
To install the extension on either iOS or desktop Safari, you will need to follow the below steps, and install it directly onto the target iPhone or browser directly from within Xcode.</p>
You can also download the xcode project from the [automated github action page.](https://github.com/Shared-Reality-Lab/IMAGE-browser/actions/workflows/ios-automate.yaml) 
To do this, click on the latest run, and then click on the "Artifacts" tab. Download the "xcode-project" artifact, and then open the xcode project in Xcode. You can then follow the instructions below to install the extension on your device.

## Prerequisites
Before you start building the IMAGE browser extension for Safari, ensure that you have the following prerequisites:

- **macOS**
- **Xcode**
- **Safari**
- [**Node.js**](https://nodejs.org/en/)
- [**npm**](https://www.npmjs.com/)

## Building the Extension (common to iOS and desktop Safari)
To build and run the IMAGE browser extension, follow these steps:

1. **Clone the Repository:** Start by cloning the repository and installing the necessary dependencies using the following commands
   ```bash
   git clone https://github.com/Shared-Reality-Lab/IMAGE-browser.git
   cd IMAGE-browser
   npm install
   ```

2. **Build the Extension:** Use the following command to build the extension in the root directory of the repository:
   ```bash
   npm run pack:prod
   ```

3. **Convert to Safari App Extension:** To convert the extension into a Safari App Extension, run the following command, replacing `/path/to/extension/build` with the actual path to your extension build:
   ```bash
   xcrun safari-web-extension-converter /path/to/extension/build
   ```
   Note that this is available as an artifact from [automated via github actions](https://github.com/Shared-Reality-Lab/IMAGE-browser/actions/workflows/ios-automate.yaml).

4. **Open in Xcode:** Open the generated `IMAGE Extension.xcodeproj` file in Xcode.

## Configuration for macOS (not necessary for iOS)
For macOS, you need to perform the following steps:

1. **Enable Develop Menu in Safari:**
   - Go to Safari > Preferences > Advanced.
   - Check the box next to "Show Develop menu in menu bar."

2. **Allow Unsigned Extensions:**
   - In the Develop menu, select "Allow Unsigned Extensions."

3. **Run the Extension in Xcode:**
   - Select the "IMAGE Extension" scheme in Xcode.
   - Click the "Run" button to start the extension.

4. **Enable Extension in Safari:**
   - Go to Safari > Preferences > Extensions.
   - Check the box next to "IMAGE Extension" to enable it.

## Configuration for iOS (not necessary for desktop Safari)
For iOS, follow these additional steps:

1. **Connect iOS Device:**
   - Connect your iOS device to your Mac.

2. **Select iOS Device as Build Target:**
   - In Xcode, select your iOS device as the build target.

3. **Configure Signing & Capabilities:**
   - In the project navigator, select the `IMAGE Extension` target.
   - In the Signing & Capabilities tab, select your team from the Team dropdown.
   - Similarly, for the `IMAGE Extension Extension` target, configure the Signing & Capabilities.

4. **Update manifest.json:**
   - In the `manifest.json` file, make the following change:
   ```json
   "background": {
       "scripts": ["background.330bdd87.js"],
       "type": "module"
   }
   ```
   Note: The `background.330bdd87.js` file is generated during the build process and may have a different name for your project.

5. **Run the Extension:**
   - Select the "IMAGE Extension" scheme in Xcode.
   - Click the "Run" button to run the extension on your iOS device.

6. **Trust the Developer:**
   - On your iOS device, go to Settings > General > Device Management.
   - Select your developer account and trust it if necessary.

## Known Issues for Safari
While using the IMAGE browser extension on Safari, please be aware of the following known issues:

- The extension does not produce any sound when an IMAGE request is sent.
- The feedback link is missing when an IMAGE result is received for maps and charts.
- On the Feedback page, selecting "(Optional) I consent to the IMAGE project saving this request and the responses associated with it under the conditions described above" may cause the "open form" button to not work as intended.
- Connecting haptic devices is not supported.
- iOS only: The extension will become unresponsive and require a manual restart everytime Safari is restarted.

## Issues with Submitting iOS Safari Extension to App Store:
In addition to the above known issues, the following issues will need to be handled specifically for submitting the iOS version of the extension to the App Store, in order to make it widely available:

- Apple does not allow background scripts to run persistently in iOS devices due to memory and power constraints.

