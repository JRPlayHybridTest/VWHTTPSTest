# ThreeModelViewerAR

## Setup

In the command line, run `npm install` to grab all of the dependencies for the project.

To avoid issues with CORS policies, this all needs to be served via a web server rather than locally. An option for this is the VS Code plugin Live Server, which provides a button along the footer bar to open a server instance of the project in a new browser tab.

## Build process

In order for the app to actually download and serve all of the required module dependencies live, we require a build step to transpile the node syntax into a "close enough" equivalent that the browser supports.

The original app used Webpack, however, that required a lot more prep and understanding to use, particularly given we don't currently have any of the build configuration for the original to work from.

So for now, we're using Browserify. This plugin will generate an ouput file containing the contents of the parameter input file, along with all of it's required dependencies (**that we have local to the project**).

At the moment, our entry point is Renderer.js, so the syntax is as follows:

```
browserify Renderer.js -p esmify > Bundle.js
```

This will re-generate a new bundle file, which is already included in the index.html. Bundles should only need additionally linking if we have multiple "entry point" files.

An issue with this deployment process is that it can't process any of our imported modules that are already served via a CDN, which includes the "core" ThreeJS library, and any of it's additional optional modules (format loaders, exporters, controllers, etc).

The currently required module imports for our entry point are defined but commented out at the top of the Renderer file. After running a `browserify` command and rebuilding the bundle, you should copy over this import "header" and uncomment it (ctrl+k, ctrl+u).

## Debugging

Firefox Developer Edition works best for web debugging in my experience, but Chrome dev tools work okay too. Toggle breakpoints in the bundle.js file via the "Debugger" header, after selecting it from the sources hierarchy.

## Additional Notes

