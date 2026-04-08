import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const translationsModule = await import(new URL("../src/lib/translations.ts", import.meta.url));
const goalSuggestionsModule = await import(
  new URL("../src/lib/goalSuggestions.ts", import.meta.url)
);

const { supportedLanguages, translations } = translationsModule;
const { shortGoalSuggestions, longGoalSuggestions } = goalSuggestionsModule;

assert.deepEqual(
  supportedLanguages,
  ["sv", "en"],
  "supportedLanguages should expose sv and en."
);

for (const language of supportedLanguages) {
  const messages = translations[language];
  assert.ok(messages, `Missing translations for ${language}.`);
  assert.ok(messages.common.searchPlaceholder.trim(), `${language}: missing search placeholder.`);
  assert.ok(messages.settings.pageTitle.trim(), `${language}: missing settings page title.`);
  assert.ok(messages.home.accessMode.trim(), `${language}: missing home access mode label.`);
  assert.ok(messages.squad.title.trim(), `${language}: missing squad title.`);
  assert.ok(messages.iup.reviewPlan.trim(), `${language}: missing review plan label.`);
}

const validGroups = new Set(["all", "gk", "def", "mid", "fwd"]);

const validateSuggestions = (label, suggestions) => {
  assert.ok(suggestions.length >= 10, `${label}: expected at least 10 suggestions.`);

  for (const suggestion of suggestions) {
    assert.ok(suggestion.title.trim(), `${label}: suggestion title must not be empty.`);
    assert.ok(
      suggestion.description.trim(),
      `${label}: suggestion description must not be empty.`
    );
    assert.ok(
      suggestion.groups.length > 0,
      `${label}: suggestion groups must contain at least one value.`
    );
    assert.ok(
      suggestion.groups.includes("all"),
      `${label}: every suggestion should include the all group.`
    );
    for (const group of suggestion.groups) {
      assert.ok(validGroups.has(group), `${label}: invalid group ${group}.`);
    }
  }
};

validateSuggestions("shortGoalSuggestions", shortGoalSuggestions);
validateSuggestions("longGoalSuggestions", longGoalSuggestions);

for (const scriptName of ["lint", "typecheck", "smoke", "ci"]) {
  assert.ok(
    packageJson.scripts?.[scriptName],
    `package.json is missing the ${scriptName} script.`
  );
}

process.stdout.write("Smoke contracts passed.\n");
