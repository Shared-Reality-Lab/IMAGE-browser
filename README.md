# IMAGE-browser 
IMAGE browser extensions & client-side code

## IMAGE project information
Please see https://image.a11y.mcgill.ca for general information about the project.

If you wish to contribute to the project, the following wiki page is a good starting point, including for those on the IMAGE project team:
https://github.com/Shared-Reality-Lab/IMAGE-server/wiki

## Extension Features

For a comprehensive list of features and capabilities provided by the IMAGE browser extension, please see the [FEATURES.md](FEATURES.md) file. This document details all the functionality available in the extension, including:

- Graphics, charts, and maps interpretation
- Keyboard shortcuts
- Accessibility features
- Customization options
- Developer features
- And more

## Development Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (latest LTS version recommended)
- [npm](https://www.npmjs.com/) (v7 or later)
- Git

### Clone the Repository
Clone this repository with submodules (for schemas):
```bash
git clone --recurse-submodules git@github.com:Shared-Reality-Lab/IMAGE-browser.git
```

If you've already cloned the repository without submodules, you can initialize and update them:
```bash
git submodule init
git submodule update
```

### Install Dependencies
Navigate to the project directory and install dependencies:
```bash
cd IMAGE-browser
npm install
```

## Building the Extension

### Development/Test Build
To create a development build with debugging enabled:
```bash
npm run pack:test
```
This will:
- Set the NODE_ENV to "development"
- Use the environment variables from `.env.development`
- Output the build to the `build-chrome` directory
- Add "(test)" suffix to the extension name

### Production Build
To create a production-ready build:
```bash
npm run pack:prod
```
This will:
- Set the NODE_ENV to "production"
- Use the environment variables from `.env.production`
- Output the build to the `build-chrome` directory
- Use the standard extension name without any suffix

#### Submitting Extension Build to Chrome Web Store
When preparing to submit the extension to the Chrome Web Store, follow these steps:

1. Create a production build using the instructions above.

2. Update the extension version in the generated `build-chrome/manifest.json` file to match the corresponding git tag of the codebase. You can view available tags [here](https://github.com/Shared-Reality-Lab/IMAGE-browser/tags).

3. Create a ZIP file of the `build-chrome` directory.

4. Submit the ZIP file to the Chrome Web Store Developer Dashboard following Google's submission guidelines.

This versioning approach ensures consistency between the published extension and the corresponding source code in the repository.

## Build System

### Webpack Configuration
The IMAGE browser extension uses webpack as its bundling tool. The webpack configuration is defined in `webpack.config.ts` and includes:

- **Entry Points**: Multiple entry points for various parts of the extension (background scripts, content scripts, UI pages, etc.)
- **Output Configuration**: Compiled files are output to the `build-chrome` directory
- **TypeScript Processing**: TypeScript files are processed using ts-loader
- **CSS Processing**: CSS files are processed using style-loader and css-loader
- **File Copying**: HTML, PNG, JSON, and MP3 files are copied from the src directory to the build directory using CopyWebpackPlugin
- **Environment Variables**: Environment variables from `.env.development` or `.env.production` are injected into the build using webpack.DefinePlugin

### Environment Variables
The build process uses different environment variables based on the build type:

- **Development Build**: Uses variables from `.env.development`, which includes `SUFFIX_TEXT = " (test)"` to append "(test)" to the extension name
- **Production Build**: Uses variables from `.env.production`

### Manifest Modification
During the production build process, the `manifest.json` file is modified to set the extension name to `__MSG_extensionName__`, which allows for localization of the extension name.

## Installing and Using the Extension

### Production Build
The official production build of the IMAGE extension is available on the Chrome Web Store:
- **URL**: [https://chromewebstore.google.com/detail/image-extension/iimmeciildnckfmnpbhglofiahllkhop](https://chromewebstore.google.com/detail/image-extension/iimmeciildnckfmnpbhglofiahllkhop)
- **Description**: This is the stable, production-ready version of the extension recommended for most users.
- **Installation**: Click the "Add to Chrome" button on the Chrome Web Store page.

### Test Build
The test build is a pre-release version with newer features that are still being tested:
- **URL**: [https://chromewebstore.google.com/detail/image-extension-test/emmcfbcpilagikejimnbilgoihgjfdln](https://chromewebstore.google.com/detail/image-extension-test/emmcfbcpilagikejimnbilgoihgjfdln)
- **Description**: This version includes features that are being tested before inclusion in the production build.
- **Installation**: Click the "Add to Chrome" button on the Chrome Web Store page.

### Nightly Build
The nightly build contains the latest changes from the main branch:
- **URL**: [https://nightly.link/Shared-Reality-Lab/IMAGE-browser/workflows/typescript-check/main/extension.zip](https://nightly.link/Shared-Reality-Lab/IMAGE-browser/workflows/typescript-check/main/extension.zip)
- **Description**: This build is automatically generated from the latest code in the main branch and may contain experimental features or bugs.
- **Installation**: 
  1. Download the ZIP file from the URL above
  2. Extract the ZIP file to a folder on your computer
  3. Follow the "Local Build" installation instructions below


**Warning**: Installing different versions of the extension (production and test) in a browser at the same time can cause unexpected issues, and the extension may not function properly. It is recommended to only have one version of the extension installed at any given time.

### Local Build
To use a locally built version of the extension:

#### Chrome/Chromium
1. Build the extension using either `npm run pack:test` or `npm run pack:prod` as described in the "Building the Extension" section
2. Open Chrome/Chromium
3. Navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in the top-right corner)
5. Click "Load unpacked"
6. Select the `build-chrome` directory from your project

## EARLY BETA: Safari Extension (desktop and iOS)
The Chrome extension can be converted into an extension that will run in desktop Safari, or (with a separate conversion) in Safari on iOS.
It is not currently possible to generate a signed extension that is installable on iOS, or deployable to the App Store, due to restrictions on using background workers on iPhones.
However, it is possible to run and test the iOS extension by installing it directly onto an iPhone via Xcode.
Details are available in [Safari.md](Safari.md).

## License

IMAGE project components (e.g., IMAGE browser extension and IMAGE Services), henceforth "Our Software" are licensed under GNU GPL3 (https://www.gnu.org/licenses/gpl-3.0.en.html) or AGPLv3 terms (https://www.gnu.org/licenses/agpl-3.0.txt) or later, as indicated in specific repositories or files on the project github located at https://github.com/Shared-Reality-Lab.

If you incorporate IMAGE code into your own project, but do not want to release your changes and additions consistent with the open source terms under which the IMAGE code is licensed, you may contact us to obtain an alternative license. For all inquiries, please contact us at image@cim.mcgill.ca.

If you are making a contribution to IMAGE, please note that we [require a Contributor License Agreement (CLA)](/CLA.md).

