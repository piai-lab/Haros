// Read-only/draft shapes for donor-era model selections. Provider/model ids stay opaque strings;
// current Product execution authority comes only from ProductRequestedSelection and Host catalog.

export type HistoricalModelOptions = Readonly<Record<string, string | boolean>>;

export interface HistoricalModelSelection {
  readonly provider: string;
  readonly model: string;
  readonly options?: HistoricalModelOptions;
  readonly supportsAutoMode?: boolean;
}

export type HistoricalModelSlug = string;
