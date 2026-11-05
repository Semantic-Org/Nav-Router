// sizes as the site prints them: kilobytes (1000 bytes) to one decimal, the same rule as the build
export const formatSizeBytes = (bytes) => `${(bytes / 1000).toFixed(1)} kB`;
