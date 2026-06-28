import { parse } from "jsr:@std/yaml";
import { join } from "jsr:@std/path";

const PLURAL_QUANTITIES = [
  "zero",
  "one",
  "two",
  "few",
  "many",
  "other",
] as const;
type PluralQuantity = typeof PLURAL_QUANTITIES[number];

type StringValue = string;
type PluralValue = Partial<Record<PluralQuantity, string>>;
type ResourceValue = StringValue | PluralValue;

type LocaleMap = Record<string, ResourceValue>; // { _: ..., ja: ..., ... }
type ResourcesMap = Record<string, LocaleMap>; // { hello: { _: ..., ja: ... }, ... }

interface YamlRoot {
  resources: ResourcesMap;
}

const isPluralValue = (value: unknown): value is PluralValue => {
  if (typeof value !== "object" || value === null) return false;
  return Object.keys(value).every((k) =>
    (PLURAL_QUANTITIES as readonly string[]).includes(k)
  );
};

const escapeXml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n");

const buildStringElement = (name: string, value: string): string =>
  `    <string name="${name}">${escapeXml(value)}</string>`;

const buildPluralsElement = (name: string, value: PluralValue): string => {
  const items = (Object.entries(value) as [PluralQuantity, string][])
    .sort((a, b) =>
      PLURAL_QUANTITIES.indexOf(a[0]) - PLURAL_QUANTITIES.indexOf(b[0])
    )
    .map(([quantity, text]) =>
      `        <item quantity="${quantity}">${escapeXml(text)}</item>`
    )
    .join("\n");
  return `    <plurals name="${name}">\n${items}\n    </plurals>`;
};

const buildXml = (elements: string[]): string => {
  const body = elements.join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${body}\n</resources>\n`;
};

const validateResources = (resources: ResourcesMap) => {
  for (const [key, localeMap] of Object.entries(resources)) {
    if (!("_" in localeMap)) {
      console.error(`Error: resource "${key}" has no default ("_") entry.`);
      Deno.exit(1);
    }

    for (const [locale, value] of Object.entries(localeMap)) {
      if (typeof value !== "string" && !isPluralValue(value)) {
        console.error(
          `Error: resource "${key}" locale "${locale}" has an invalid value type. ` +
            `Expected a string or a plural object (${
              PLURAL_QUANTITIES.join(", ")
            }).`,
        );
        Deno.exit(1);
      }
    }
  }
};

const buildLocaleContents = (resources: ResourcesMap): Map<string, string> => {
  const localeSet = new Set<string>();
  for (const localeMap of Object.values(resources)) {
    for (const locale of Object.keys(localeMap)) {
      localeSet.add(locale);
    }
  }

  const result = new Map<string, string>();

  for (const locale of localeSet) {
    const elements: string[] = [];

    for (const [name, localeMap] of Object.entries(resources)) {
      const value = localeMap[locale];
      if (value === undefined) continue;

      if (typeof value === "string") {
        elements.push(buildStringElement(name, value));
      } else {
        elements.push(buildPluralsElement(name, value));
      }
    }

    result.set(locale, buildXml(elements));
  }

  return result;
};

const localeToValuesDir = (locale: string): string =>
  locale === "_" ? "values" : `values-${locale}`;

const main = async (): Promise<void> => {
  const args = Deno.args;
  if (args.length !== 2) {
    console.error("Usage: <script-file>.ts <yaml-file> <res-dir>");
    Deno.exit(1);
  }
  const [yamlPath, resDir] = args;

  const yamlText = await Deno.readTextFile(yamlPath);
  const root = parse(yamlText) as YamlRoot;

  if (!root.resources || typeof root.resources !== "object") {
    console.error('Error: YAML must have a top-level "resources" object.');
    Deno.exit(1);
  }

  validateResources(root.resources);

  const localeContents = buildLocaleContents(root.resources);

  for (const [locale, xmlContent] of localeContents) {
    const valuesDir = join(resDir, localeToValuesDir(locale));
    const outPath = join(valuesDir, "strings.xml");

    await Deno.mkdir(valuesDir, { recursive: true });
    await Deno.writeTextFile(outPath, xmlContent);
    console.log(`Written: ${outPath}`);
  }
};

main();
