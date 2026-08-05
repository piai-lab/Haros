export function isMacPlatform(platform: string): boolean {
  return /mac|darwin|iphone|ipad|ipod/i.test(platform);
}

export function isWindowsPlatform(platform: string): boolean {
  return /^win(dows)?/i.test(platform);
}
