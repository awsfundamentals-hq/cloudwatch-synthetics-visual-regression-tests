const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');
const syntheticsConfiguration = synthetics.getConfiguration();

syntheticsConfiguration.setConfig({
  continueOnStepFailure: false, // Set to true if you want the script to continue even after a step fails.
  includeRequestHeaders: true, // Enable if headers should be displayed in HAR
  includeResponseHeaders: true, // Enable if headers should be displayed in HAR
  restrictedHeaders: ['Authorization'], // Value of these headers will be redacted from logs and reports
  restrictedUrlParameters: [], // Values of these url parameters will be redacted from logs and reports
  withVisualCompareWithBaseRun: true,
  withVisualVarianceThresholdPercentage: 0,
});

const takeScreenshot = async () => {
  let page = await synthetics.getPage();
  await page.goto(process.env.SITE_URL, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: '/tmp/screenshot.png' });
  let pageTitle = await page.title();
  log.info('Page title: ' + pageTitle);
};

exports.handler = async () => {
  await takeScreenshot();
};
