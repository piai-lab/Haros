export type MessageMap = Readonly<Record<string, string>>;

type NoExtraKeys<Candidate, Expected> = Record<Exclude<keyof Candidate, keyof Expected>, never>;

export type MessageSlice = Readonly<{
  en: MessageMap;
  "zh-CN": MessageMap;
}>;

export function defineMessageSlice<
  const English extends MessageMap,
  const Chinese extends MessageMap,
>(
  english: English,
  chinese: Chinese & { readonly [Key in keyof NoInfer<English>]: string } & NoExtraKeys<
      Chinese,
      NoInfer<English>
    >,
) {
  return {
    en: english,
    "zh-CN": chinese,
  } as const;
}

type UnionToIntersection<Union> = (Union extends unknown ? (value: Union) => void : never) extends (
  value: infer Intersection,
) => void
  ? Intersection
  : never;

type CatalogFor<
  Slices extends readonly MessageSlice[],
  Locale extends keyof MessageSlice,
> = UnionToIntersection<Slices[number][Locale]>;

export function composeMessageCatalog<const Slices extends readonly MessageSlice[]>(
  slices: Slices,
) {
  const catalogs = {
    en: {} as Record<string, string>,
    "zh-CN": {} as Record<string, string>,
  };

  for (const slice of slices) {
    for (const locale of ["en", "zh-CN"] as const) {
      const catalog = catalogs[locale];
      for (const [key, message] of Object.entries(slice[locale])) {
        if (Object.hasOwn(catalog, key)) {
          throw new Error(`Duplicate i18n message key: ${key}`);
        }
        catalog[key] = message;
      }
    }
  }

  return catalogs as {
    readonly en: CatalogFor<Slices, "en">;
    readonly "zh-CN": CatalogFor<Slices, "zh-CN">;
  };
}
