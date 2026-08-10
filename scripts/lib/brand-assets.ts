export const BRAND_ASSET_PATHS = {
  productionMacIconPng: "assets/brand/exports/app-icon-1024.png",
  productionMacLegacyIconPng: "assets/brand/exports/app-icon-1024.png",
  productionLinuxIconPng: "assets/brand/exports/app-icon-512.png",
  productionWindowsIconIco: "assets/brand/exports/app-icon.ico",
  productionWebFaviconIco: "assets/brand/exports/favicon.ico",
  productionWebFavicon16Png: "assets/brand/exports/favicon-16.png",
  productionWebFavicon32Png: "assets/brand/exports/favicon-32.png",
  productionWebAppleTouchIconPng: "assets/brand/exports/apple-touch-icon.png",
  developmentWindowsIconIco: "assets/brand/exports/app-icon.ico",
  developmentWebFaviconIco: "assets/brand/exports/favicon.ico",
  developmentWebFavicon16Png: "assets/brand/exports/favicon-16.png",
  developmentWebFavicon32Png: "assets/brand/exports/favicon-32.png",
  developmentWebAppleTouchIconPng: "assets/brand/exports/apple-touch-icon.png",
} as const;

export interface IconOverride {
  readonly sourceRelativePath: string;
  readonly targetRelativePath: string;
}

export const DEVELOPMENT_ICON_OVERRIDES: ReadonlyArray<IconOverride> = [
  {
    sourceRelativePath: BRAND_ASSET_PATHS.developmentWebFaviconIco,
    targetRelativePath: "dist/client/favicon.ico",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.developmentWebFavicon16Png,
    targetRelativePath: "dist/client/favicon-16x16.png",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.developmentWebFavicon32Png,
    targetRelativePath: "dist/client/favicon-32x32.png",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.developmentWebAppleTouchIconPng,
    targetRelativePath: "dist/client/apple-touch-icon.png",
  },
];

export const PUBLISH_ICON_OVERRIDES: ReadonlyArray<IconOverride> = [
  {
    sourceRelativePath: BRAND_ASSET_PATHS.productionWebFaviconIco,
    targetRelativePath: "dist/client/favicon.ico",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.productionWebFavicon16Png,
    targetRelativePath: "dist/client/favicon-16x16.png",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.productionWebFavicon32Png,
    targetRelativePath: "dist/client/favicon-32x32.png",
  },
  {
    sourceRelativePath: BRAND_ASSET_PATHS.productionWebAppleTouchIconPng,
    targetRelativePath: "dist/client/apple-touch-icon.png",
  },
];
