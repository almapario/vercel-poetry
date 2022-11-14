import execa from "execa";
import { debug } from "@vercel/build-utils";

const makeDependencyCheckCode = (dependency) => `
from importlib import util
dep = '${dependency}'.replace('-', '_')
spec = util.find_spec(dep)
print(spec.origin)
`;
async function isInstalled(pythonPath, dependency, cwd) {
    try {
        const { stdout } = await execa(
            pythonPath,
            ["-c", makeDependencyCheckCode(dependency)],
            {
                stdio: "pipe",
                cwd,
            }
        );
        return stdout.startsWith(cwd);
    } catch (err) {
        return false;
    }
}

export async function poetryInstall(poetryPath, workPath, cmdArgs = []) {
    const pretty = `${poetryPath} ${cmdArgs.join(" ")}`;
    debug(`Running "${pretty}"...`);
    try {
        await execa(poetryPath, cmdArgs, {
            cwd: workPath,
        });
    } catch (err) {
        console.log(`Failed to run "${pretty}"`);
        throw err;
    }
}
export async function installRequirement({
    pythonPath,
    poetryPath,
    dependency,
    version,
    workPath,
    args = [],
}) {
    if (meta.isDev && (await isInstalled(pythonPath, dependency, workPath))) {
        debug(
            `Skipping ${dependency} dependency installation, already installed in ${workPath}`
        );
        return;
    }
    const exact = version ? `${dependency}==${version}` : dependency;
    await poetryInstall(poetryPath, workPath, ["add", exact, ...args]);
}
