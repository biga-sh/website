import type { FileNode } from "@biga/types";

/**
 * Recursively collects the virtual paths of all binary files in the tree.
 * Used to skip content fetches and render placeholders for binary entries.
 */
export function collectBinaryPaths(
    node: FileNode,
    into: Set<string> = new Set()
): Set<string> {
    if (node.type === "file") {
        if (node.binary) {
            into.add(node.path);
        }
        return into;
    }
    for (const child of node.children) {
        collectBinaryPaths(child, into);
    }
    return into;
}

/**
 * Returns every file path in the tree in an unordered flat array.
 */
export function listFilePaths(node: FileNode, into: string[] = []): string[] {
    if (node.type === "file") {
        into.push(node.path);
        return into;
    }
    for (const child of node.children) {
        listFilePaths(child, into);
    }
    return into;
}

/**
 * Returns the lexicographically first file path in the tree.
 */
export function firstFilePath(node: FileNode): string | undefined {
    const paths = listFilePaths(node);
    if (paths.length === 0) return undefined;
    let first = paths[0]!;
    for (let i = 1; i < paths.length; i++) {
        if (paths[i]! < first) first = paths[i]!;
    }
    return first;
}

const README_RE = /^readme(\.(md|mdx|markdown|txt|rst))?$/i;

/**
 * The file to open when a session has no recent change to point at: a root
 * README if there is one, since that is where a reader would start, otherwise
 * the first file in the tree.
 */
export function preferredFilePath(node: FileNode): string | undefined {
    if (node.type === "directory") {
        const readme = node.children.find(
            (child) => child.type === "file" && !child.binary && README_RE.test(child.name)
        );
        if (readme) {
            return readme.path;
        }
    }
    return firstFilePath(node);
}

/**
 * The first file in a change list that can be shown in the editor: one that
 * still exists after the change and has text content.
 */
export function firstViewableChange(
    changes: readonly { path: string; changeType: string; binary?: boolean }[]
): string | undefined {
    return changes.find((change) => change.changeType !== "deleted" && !change.binary)?.path;
}
