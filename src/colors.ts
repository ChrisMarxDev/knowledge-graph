export type ColorConfig = {
  types: Record<string, string>;
  dimensions: Record<string, string>;
};
const mapping = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
/** Colors are optional fields on existing vocabulary definitions. */
export function metadataColors(meta: Record<string, unknown>): {
  colors: ColorConfig;
  colorWarning: string | null;
} {
  const warnings: string[] = [];
  const read = (group: string) =>
    Object.fromEntries(
      Object.entries(mapping(meta[group]) ? meta[group] : {}).flatMap(
        ([name, definition]) => {
          if (!mapping(definition) || definition.color === undefined) return [];
          if (
            typeof definition.color !== "string" ||
            !/^#[0-9a-f]{6}$/i.test(definition.color)
          ) {
            warnings.push(
              `${group}.${name}.color must be a quoted #RRGGBB value`,
            );
            return [];
          }
          return [[name, definition.color]];
        },
      ),
    );
  const colors = { types: read("types"), dimensions: read("dimensions") };
  return {
    colors,
    colorWarning: warnings.length
      ? `${warnings.join("; ")}. Using defaults for invalid colors.`
      : null,
  };
}
