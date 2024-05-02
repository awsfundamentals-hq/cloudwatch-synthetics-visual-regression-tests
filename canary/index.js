const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

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
