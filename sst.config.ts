/// <reference path="./.sst/platform/config.d.ts" />
import * as pulumi from '@pulumi/pulumi';
import { join } from 'path';
import { cwd } from 'process';
import type { AppInput } from './.sst/platform/src/config';

const createCanaryStorage = () => {
  const canaryBucket = new aws.s3.Bucket('CanaryBucket', {
    versioning: {
      enabled: true,
    },
    forceDestroy: true,
  });

  const file = new pulumi.asset.FileAsset(join(cwd(), 'canary', 'index.js'));
  const canaryCodeArchive = new pulumi.asset.AssetArchive({ 'nodejs/node_modules/index.js': file });
  const canaryCodeS3Object = new aws.s3.BucketObject('CanaryCode', {
    bucket: canaryBucket.bucket,
    key: 'canary.zip',
    source: canaryCodeArchive,
  });
  return { canaryBucket, canaryCodeS3Object };
};

const createCanaryRole = () => {
  const canaryRole = new aws.iam.Role('CanaryRole', {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Principal: {
            Service: 'synthetics.amazonaws.com',
          },
          Effect: 'Allow',
          Sid: '',
        },
        {
          Action: 'sts:AssumeRole',
          Principal: {
            Service: 'lambda.amazonaws.com',
          },
          Effect: 'Allow',
          Sid: '',
        },
      ],
    }),
  });
  new aws.iam.RolePolicyAttachment('S3PolicyAttachment', {
    role: canaryRole,
    policyArn: 'arn:aws:iam::aws:policy/AmazonS3FullAccess',
  });
  new aws.iam.RolePolicyAttachment('CWPolicyAttachment', {
    role: canaryRole,
    policyArn: 'arn:aws:iam::aws:policy/CloudWatchFullAccess',
  });
  return { canaryRole };
};

export default $config({
  app(_input: AppInput) {
    return {
      name: 'cloudwatch-synthetics-visual-regression-tests',
      removal: 'remove',
      home: 'aws',
    };
  },
  async run() {
    new sst.aws.Astro('Web').url.apply((url) => {
      const { canaryBucket, canaryCodeS3Object } = createCanaryStorage();
      const { canaryRole } = createCanaryRole();

      new aws.synthetics.Canary('ScreenshotCanary', {
        name: 'visual-regressions',
        artifactS3Location: $interpolate`s3://${canaryBucket.bucket}/`,
        executionRoleArn: canaryRole.arn,
        handler: 'index.handler',
        // https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_nodejs_puppeteer.html
        runtimeVersion: 'syn-nodejs-puppeteer-7.0',
        schedule: {
          expression: 'rate(1 hour)',
          durationInSeconds: 60,
        },
        failureRetentionPeriod: 7,
        successRetentionPeriod: 7,
        startCanary: true,
        s3Bucket: canaryBucket.bucket,
        s3Key: canaryCodeS3Object.key,
        s3Version: canaryCodeS3Object.versionId,
        runConfig: {
          environmentVariables: {
            SITE_URL: url,
          },
        },
      });
    });
  },
});
