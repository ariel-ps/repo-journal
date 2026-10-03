export function parseGlobalFlags(args) {
    const stripped = [];
    let plain = false;
    let json = false;
    for (const arg of args) {
        if (arg === "--plain") {
            plain = true;
            continue;
        }
        if (arg === "--json") {
            json = true;
            continue;
        }
        stripped.push(arg);
    }
    return { stripped, plain, json };
}
export function takeFlag(stripped, name) {
    const out = [];
    let present = false;
    for (const arg of stripped) {
        if (arg === name) {
            present = true;
            continue;
        }
        out.push(arg);
    }
    return { args: out, present };
}
