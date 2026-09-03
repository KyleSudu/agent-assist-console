import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "server/graphql/schema.ts",
  documents: ["src/**/*.{ts,tsx}", "!src/graphql/generated/**/*"],
  generates: {
    "src/graphql/generated/": {
      preset: "client",
    },
  },
  hooks: {
    afterAllFileWrite: ["prettier --write"],
  },
};

export default config;
