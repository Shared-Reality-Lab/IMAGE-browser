# Building the IMAGE Browser Extension for Safari

These instructions are for manually building and installing the the extension for Safari on either OSX or iOS.
Note that builds are currently [automated via github actions](https://github.com/Shared-Reality-Lab/IMAGE-browser/actions), including building extensions for both iOS and OSX.
If you are only looking to try the extension, and not build it yourself, you can [download the most recent extension artifact](https://github.com/Shared-Reality-Lab/IMAGE-browser/actions).
[SATVIK: Are those artifacts installable? If so, is it obvious how to do so? If not, I'd modify to indicate that although there is an automated build process, the artifacts are not installable for whatever the reason is, and indicate the instructions below must be followed to actually create and install the Safari extension.]

## Prerequisites
Before you start building the IMAGE browser extension for Safari, ensure that you have the following prerequisites:

- **macOS**
- **Xcode**
- **Safari**
- [**Node.js**](https://nodejs.org/en/)
- [**npm**](https://www.npmjs.com/)

## Building the Extension
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

4. **Open in Xcode:** Open the generated `IMAGE Extension.xcodeproj` file in Xcode.

## Configuration for macOS
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

## Configuration for iOS
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
- The extension may become non-responsive and require a manual restart. This behavious is usually noticed when Safari is restarted in iOS.
- On the Feedback page, selecting "(Optional) I consent to the IMAGE project saving this request and the responses associated with it under the conditions described above" may cause the "open form" button to not work as intended.
- Connecting haptic devices is not supported.

## Issues with Submitting iOS Safari Extension to App Store:
In addition to the above known issues, the following issues will need to be handled specifically for submitting the iOS version of the extension to the App Store, in order to make it widely available:

- Apple does not allow background scripts to run persistently in iOS devices due to memory and power constraints.

