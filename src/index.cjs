const { join, dirname, basename } = require("path");
const {
    download,
    glob,
    shouldServe,
    debug,
    Lambda,
} = require("@vercel/build-utils");
const { installRequirement, poetryInstall } = require("./install.cjs");

const PYTHON_CONFIG = {
    version: "3",
    pipPath: "pip3",
    poetryPath: "poetry",
    pythonPath: "python3",
    runtime: "python3.9",
};

// vercel manifest version
const version = 3;

async function downloadFilesInWorkPath({
    entrypoint,
    workPath,
    files,
    meta: vMeta,
}) {
    const meta = { ...vMeta, isDev: vMeta?.isDev || false };
    debug("Downloading user files...");
    let downloadedFiles = await download(files, workPath, meta);
    if (meta.isDev) {
        const { devCacheDir = join(workPath, ".now", "cache") } = meta;
        const destCache = join(devCacheDir, basename(entrypoint, ".py"));
        await download(downloadedFiles, destCache);
        downloadedFiles = await glob("**", destCache);
        workPath = destCache;
    }
    return workPath;
}
const build = async ({
    workPath = "",
    files: originalFiles = [],
    entrypoint,
    meta = {},
    config = {},
}) => {
    workPath = await downloadFilesInWorkPath({
        workPath,
        files: originalFiles,
        entrypoint,
        meta,
    });
    await installRequirement({
        pythonPath: PYTHON_CONFIG.pythonPath,
        pipPath: PYTHON_CONFIG.pipPath,
        dependency: "poetry",
        workPath,
        meta: { isDev: meta?.isDev || false },
    });
    console.log("Installing poetry dependencies...");
    await poetryInstall(PYTHON_CONFIG.poetryPath, dirname(entrypoint), [
        "install",
    ]);
    console.log("Completed poetry dependencies installation.");

    const globOptions = {
        cwd: workPath,
        ignore:
            typeof config?.excludeFiles === "string"
                ? config.excludeFiles
                : "node_modules/**",
    };
    const lambda = new Lambda({
        files: await glob("**", globOptions),
        handler: config?.handler || "server.handler",
        runtime: PYTHON_CONFIG.runtime,
        environment: {},
    });
    return {
        output: lambda,
    };
};
module.exports = {
    shouldServe,
    build,
    version,
    downloadFilesInWorkPath,
    poetryInstall,
};
