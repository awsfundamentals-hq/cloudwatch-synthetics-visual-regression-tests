/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "cloudwatch-synthetics-visual-regression-tests",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    new sst.aws.Astro("MyWeb");
  },
});
