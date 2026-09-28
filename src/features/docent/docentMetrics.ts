const runtimeIds = new Set<string>();
const avatarIds = new Set<string>();

export function registerDocentRuntime(id: string): void {
  runtimeIds.add(id);
}

export function registerDocentAvatar(id: string): void {
  avatarIds.add(id);
}

export function readDocentMountMetrics(): {
  runtimeMountCount: number;
  avatarMountCount: number;
  modelLoadCount: number;
} {
  const modelLoadCount = typeof performance === "undefined"
    ? 0
    : performance.getEntriesByType("resource").filter(
      (entry) => entry.name.includes("/models/docent-") && entry.name.endsWith(".glb"),
    ).length;
  return {
    runtimeMountCount: runtimeIds.size,
    avatarMountCount: avatarIds.size,
    modelLoadCount,
  };
}
