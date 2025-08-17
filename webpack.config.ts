import path from 'path'
import glob from 'glob';
import webpack from 'webpack'
import dotenv from 'dotenv'
import CopyWebpackPlugin from 'copy-webpack-plugin'

if(process.env.NODE_ENV === "development"){
  dotenv.config({path: "./.env.development"});
}

const config: webpack.Configuration = {
  entry: {
    'utils': './src/utils.ts',
    'config': './src/config.ts',
    'content': './src/content.ts',
    'offscreen': './src/offscreen.js',
    'background': './src/background.ts',
    'buttons': './src/buttons.js',
    'info/info': './src/info/info.ts',
    'maps/maps-utils': './src/maps/maps-utils.ts',
    'options/options': './src/options/options.ts',
    'charts/charts-utils': '/src/charts/charts-utils.js',
    'errors/errors': './src/errors/errors.ts',
    'firstLaunch/firstLaunch': './src/firstLaunch/firstLaunch.ts',
    'feedback/feedback': './src/feedback/feedback.ts',
    'launchpad/launchpad': './src/launchpad/launchpad.ts',
    'progressBar/progressBar': './src/progressBar/progressBar.ts',
    'monarch/utils': './src/monarch/utils.ts',
    'monarch/types': './src/monarch/types.ts'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'build-chrome'),
    clean: true
  },
  resolve: {
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader'
        }
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          "css-loader",
        ],
      },
      {
        test: /\.js$|jsx/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        },
      },
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env)
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "**/*.{html,png,json,mp3}",
          to: "[path][name][ext]",
          context: "src/"
        },
        {
          from: "./*.css",
          to: "[path][name][ext]",
          context: "src/"
        },
        {
          from: "./src/manifest.json",
          to: "[path][name][ext]",
          transform(content) {
            return (modifyManifest(content))
          }
        },
      ],
    })
  ]
}


let modifyManifest = function (buffer: Buffer) {
  console.log("Modify Manifest function", process.env.NODE_ENV)
  if (process.env.NODE_ENV === "production") {
    // copy-webpack-plugin passes a buffer
    var manifest = JSON.parse(buffer.toString());
    // make any modifications you like, such as
    manifest.name = "__MSG_extensionName__";
    // pretty print to JSON with two spaces
    let manifest_JSON = JSON.stringify(manifest, null, 2);
    return manifest_JSON;
  }
  return buffer.toString();
}

export default config