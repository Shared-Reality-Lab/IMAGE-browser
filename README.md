# auditory-haptic-graphics-browser
auditory-haptic-graphics browser extensions &amp; client-side code

## Set Up

Clone this repository and install the dependencies using NPM:
```bash
npm i
```
This includes the [web-ext](https://github.com/mozilla/web-ext) tool for running the tool in Firefox and Chrome/Chromium and building for firefox.
As the project is written in Typescript, we do use Parcel to resolve packages and convert to JavaScript first.
An automatically updating parcel build can be triggered with
```bash
npm start
```
from the command line.
To use web-ext to start, from the root of the project run
```
npx web-ext run -s build
```
to open it in Firefox.

A version ready to be bundled for distribution as a browser extension can be created using the
```
npm run pack
```
script.
A version that directly creates an *unsigned* Firefox package can be called with
```
npm run build:ff
```
A Chrome/Chromium version should be added soon.
