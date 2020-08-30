// based on file generated by create-electron-app with option --template=webpack

const LicenseWebpackPlugin = require("license-webpack-plugin").LicenseWebpackPlugin;
const CopyPlugin = require("copy-webpack-plugin");

const rules = require("./webpack.rules");

rules.push({
    test: /\.css$/,
    use: [{ loader: "style-loader" }, { loader: "css-loader" }],
});

module.exports = {
    module: {
        rules,
    },
    // move source maps out of bundled JS files
    // seems this is automatically set for main on prod build but not for renderer
    devtool: "source-map",
    plugins: [
        new LicenseWebpackPlugin(),
        new CopyPlugin({
            patterns: ["LICENSE"],
        }),
    ],
};
