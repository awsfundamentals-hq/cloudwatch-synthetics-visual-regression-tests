/// <reference path="./.sst/platform/config.d.ts" />
import * as pulumi from '@pulumi/pulumi';
import path from 'path';
import type { AppInput } from './.sst/platform/src/config';

export default $config({
  app(_input: AppInput) {
    return {
      name: 'cloudwatch-synthetics-visual-regression-tests',
      removal: 'remove',
      home: 'aws',
    };
  },
  async run() {
    const site = new sst.aws.Astro('Web');

    const canaryBucket = new aws.s3.Bucket('CanaryBucket');
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

    site.url.apply((url) => {
      const canaryCodeArchive = new pulumi.asset.AssetArchive({
        'nodejs/node_modules/index.js': new pulumi.asset.FileAsset(path.join(process.cwd(), 'canary', 'index.js')),
      });
      const canaryCodeS3Object = new aws.s3.BucketObject('CanaryCode', {
        bucket: canaryBucket.bucket,
        key: 'canary.zip',
        source: canaryCodeArchive,
      });

      new aws.synthetics.Canary('ScreenshotCanary', {
        name: 'canary',
        artifactS3Location: $interpolate`s3://${canaryBucket.bucket}/`,
        executionRoleArn: canaryRole.arn,
        handler: 'index.handler',
        // From: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Library_nodejs_puppeteer.html
        runtimeVersion: 'syn-nodejs-puppeteer-7.0',
        schedule: {
          expression: 'rate(1 hour)',
          durationInSeconds: 3600,
        },
        startCanary: true, // Automatically start the canary after creation
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
