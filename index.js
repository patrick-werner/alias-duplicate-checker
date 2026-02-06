const fs = require("fs");
const path = require("path");

const ALIAS_REGEX = /^Alias:\s*(\S+)\s*=\s*(\S+)/;

function normalizeUrl(url) {
  return url.replace(/^[a-zA-Z]+:\/\//, "");
}

function getScheme(url) {
  const match = url.match(/^([a-zA-Z]+):\/\//);
  return match ? match[1].toLowerCase() : null;
}

function formatLocation(definition) {
  const relativePath = path.relative(process.cwd(), definition.file);
  return `${relativePath}:${definition.line}`;
}

async function listFshFiles(directory) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFshFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith(".fsh")) {
      files.push(fullPath);
    }
  }

  return files;
}

async function writeSummary(coreModule, definitions) {
  const summary = coreModule.summary;
  summary.addHeading("FSH Aliases");

  if (definitions.length === 0) {
    summary.addParagraph("No aliases found.");
    await summary.write();
    return;
  }

  const rows = [["Alias", "URL", "Location"]];
  const sorted = [...definitions].sort((a, b) => {
    if (a.name === b.name) {
      return formatLocation(a).localeCompare(formatLocation(b));
    }
    return a.name.localeCompare(b.name);
  });

  for (const def of sorted) {
    rows.push([def.name, def.url, formatLocation(def)]);
  }

  summary.addTable(rows);
  await summary.write();
}

async function runWithCore(coreModule) {
  try {
    const inputDir = coreModule.getInput("fsh_directory") || "input/fsh";
    const rootDir = path.resolve(process.cwd(), inputDir);

    if (!fs.existsSync(rootDir)) {
      coreModule.setFailed(`Directory not found: ${rootDir}`);
      return;
    }

    const files = await listFshFiles(rootDir);
    const definitions = [];
    const errors = [];

    const nameMap = new Map();
    const urlMap = new Map();
    const normalizedUrlMap = new Map();

    for (const file of files) {
      const content = await fs.promises.readFile(file, "utf8");
      const lines = content.split(/\r?\n/);

      lines.forEach((line, index) => {
        const match = line.match(ALIAS_REGEX);
        if (!match) {
          return;
        }

        const definition = {
          name: match[1],
          url: match[2],
          file,
          line: index + 1,
        };

        definitions.push(definition);

        const existingByName = nameMap.get(definition.name);
        if (existingByName && existingByName.url !== definition.url) {
          errors.push(
            `Alias name duplicate: ${definition.name} maps to ${definition.url} at ${formatLocation(
              definition,
            )}, but ${existingByName.url} at ${formatLocation(existingByName)}`,
          );
        } else if (!existingByName) {
          nameMap.set(definition.name, definition);
        }

        const existingByUrl = urlMap.get(definition.url);
        if (existingByUrl && existingByUrl.name !== definition.name) {
          errors.push(
            `URL duplicate: ${definition.url} is mapped to ${definition.name} at ${formatLocation(
              definition,
            )}, but ${existingByUrl.name} at ${formatLocation(existingByUrl)}`,
          );
        } else if (!existingByUrl) {
          urlMap.set(definition.url, definition);
        }

        const scheme = getScheme(definition.url);
        if (scheme === "http" || scheme === "https") {
          const normalized = normalizeUrl(definition.url);
          const existingByNormalized = normalizedUrlMap.get(normalized);
          if (existingByNormalized && existingByNormalized.scheme !== scheme) {
            errors.push(
              `Protocol mismatch: ${definition.url} at ${formatLocation(
                definition,
              )} differs by protocol from ${existingByNormalized.url} at ${formatLocation(
                existingByNormalized.definition,
              )}`,
            );
          } else if (!existingByNormalized) {
            normalizedUrlMap.set(normalized, {
              scheme,
              url: definition.url,
              definition,
            });
          }
        }
      });
    }

    await writeSummary(coreModule, definitions);

    if (errors.length > 0) {
      coreModule.setFailed(
        `Found ${errors.length} alias inconsistencies:\n${errors.join("\n")}`,
      );
    }
  } catch (error) {
    coreModule.setFailed(error instanceof Error ? error.message : String(error));
  }
}

if (require.main === module) {
  // Lazy-load to keep tests independent of installed action dependencies.
  const core = require("@actions/core");
  runWithCore(core);
}

module.exports = {
  runWithCore,
  listFshFiles,
  normalizeUrl,
  getScheme,
  formatLocation,
  ALIAS_REGEX,
};
