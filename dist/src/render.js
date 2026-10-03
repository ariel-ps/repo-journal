import { homedir } from "node:os";
function collapseHomeDirectory(path) {
    const home = homedir();
    if (!path.startsWith(home))
        return path;
    return `~${path.slice(home.length)}`;
}
export function homeHeader(description) {
    return {
        bin: collapseHomeDirectory(process.argv[1] ?? ""),
        description,
    };
}
export function withHelp(body, help) {
    if (help.length === 0)
        return body;
    return { ...body, help };
}
