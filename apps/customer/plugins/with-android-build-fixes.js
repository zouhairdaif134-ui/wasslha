// Local Expo config plugin: makes the Android release build fit in CI memory.
// - more JVM memory for Gradle (the default caused OutOfMemoryError: Metaspace)
// - skip the lintVital* tasks (slow, memory hungry, not needed for test APKs)
const {
  withGradleProperties,
  withProjectBuildGradle,
} = require("expo/config-plugins");

module.exports = function withAndroidBuildFixes(config) {
  config = withGradleProperties(config, (cfg) => {
    const setProperty = (key, value) => {
      const existing = cfg.modResults.find(
        (item) => item.type === "property" && item.key === key
      );
      if (existing) {
        existing.value = value;
      } else {
        cfg.modResults.push({ type: "property", key, value });
      }
    };
    setProperty("org.gradle.jvmargs", "-Xmx4g -XX:MaxMetaspaceSize=1g");
    return cfg;
  });

  config = withProjectBuildGradle(config, (cfg) => {
    const marker = "// wasslha: skip lintVital tasks";
    if (!cfg.modResults.contents.includes(marker)) {
      cfg.modResults.contents +=
        "\n" +
        marker +
        "\nallprojects {\n" +
        "  tasks.configureEach { task ->\n" +
        "    if (task.name.startsWith('lintVital')) {\n" +
        "      task.enabled = false\n" +
        "    }\n" +
        "  }\n" +
        "}\n";
    }
    return cfg;
  });

  return config;
};
