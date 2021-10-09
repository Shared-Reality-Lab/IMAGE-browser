# auditory-haptic-graphics-browser
auditory-haptic-graphics browser extensions &amp; client-side code

## Set Up

Clone this repository. Note that the schemas are a submodule, so you need to either get them in the initial clone, e.g.,
```
git clone --recurse-submodules git@github.com:Shared-Reality-Lab/auditory-haptic-graphics-browser.git
```

or else get them after you've done the initial clone (while in the root of the cloned repo on your local machine):
```
git submodule init
git submodule update
```


Install the dependencies using NPM.
Ensure you have npm v7 or later installed, ideally by using [nvm](https://github.com/nvm-sh/nvm)!
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

A signed package can be made with Chromium by running
```
npm run build:chromium
```
where the environment variable `PATH_TO_CHROME_KEY` points to the extension's key.

It should also be possible to just load a zipped version of the `build` directory generated by `npm run pack` in any browser supporting WebExtensions, but tools might do other things too.
