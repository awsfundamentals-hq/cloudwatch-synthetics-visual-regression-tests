const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');
const config = synthetics.getConfiguration();

const title = 'visual-regression-check';

config.setConfig({
  continueOnStepFailure: true,
  includeRequestHeaders: true,
  includeResponseHeaders: true,
  restrictedHeaders: [],
  restrictedUrlParameters: [],
});

config.disableStepScreenshots();
config.withVisualCompareWithBaseRun(true);
config.withVisualVarianceThresholdPercentage(10);

const takeScreenshot = async () => {
  await synthetics.executeStep(title, async () => {
    let page = await synthetics.getPage();
    await page.goto(process.env.SITE_URL, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 2500));
    let pageTitle = await page.title();
    log.info('Page title: ' + pageTitle);
    await synthetics.takeScreenshot(title, 'loaded');
  });
};

exports.handler = async () => {
  await takeScreenshot();
};
