import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { argv } from 'node:process'

const root = fileURLToPath(new URL('..', import.meta.url))
const output = argv[2]
if (!output) throw Error('Provide an output path for the CloudFormation template')
// CloudFormation ZipFile produces index.js. Build one CommonJS file from the tested modules.
const modules = ['contract.mjs', 'handler.mjs', 'store.mjs', 'adapter.mjs', 'owner-events.mjs', 'index.mjs']
const code = ["const { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand } = require('@aws-sdk/client-dynamodb');", "const { GetSecretValueCommand, SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');", "const { createHash, randomUUID } = require('node:crypto');"]
for (const module of modules) {
  let source = fs.readFileSync(path.join(root, 'services/supplier-intake', module), 'utf8')
  source = source.replace(/^import .*\n/gm, '').replace(/^export /gm, '')
  code.push(source)
}
code.push('exports.handler = handler;')
const notifierCode = ["const { GetSecretValueCommand, SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');"]
for (const module of ['owner-events.mjs', 'notifier.mjs']) {
  let source = fs.readFileSync(path.join(root, 'services/supplier-intake', module), 'utf8')
  source = source.replace(/^import .*\n/gm, '').replace(/^export /gm, '')
  notifierCode.push(source)
}
notifierCode.push('exports.handler = handler;')
const ref = value => ({ Ref: value })
const attr = (name, value) => ({ 'Fn::GetAtt': [name, value] })
const sub = value => ({ 'Fn::Sub': value })
const resources = {
  Records: { Type: 'AWS::DynamoDB::Table', DeletionPolicy: 'Retain', UpdateReplacePolicy: 'Retain', Properties: {
    BillingMode: 'PAY_PER_REQUEST', AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }], KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
    SSESpecification: { SSEEnabled: true }, PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    TimeToLiveSpecification: { AttributeName: 'expires_at', Enabled: true }, StreamSpecification: { StreamViewType: 'NEW_IMAGE' },
  } },
  Logs: { Type: 'AWS::Logs::LogGroup', Properties: { RetentionInDays: 30 } },
  Role: { Type: 'AWS::IAM::Role', Properties: {
    AssumeRolePolicyDocument: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }] },
    Policies: [{ PolicyName: 'supplier-intake-only', PolicyDocument: { Version: '2012-10-17', Statement: [
      { Effect: 'Allow', Action: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem'], Resource: attr('Records', 'Arn') },
      { Effect: 'Allow', Action: ['dynamodb:DescribeStream', 'dynamodb:GetRecords', 'dynamodb:GetShardIterator', 'dynamodb:ListStreams'], Resource: sub('${Records.Arn}/stream/*') },
      { Effect: 'Allow', Action: ['secretsmanager:GetSecretValue'], Resource: ref('OwnerActivitySecretArn') },
      { Effect: 'Allow', Action: ['sqs:SendMessage'], Resource: attr('NotificationFailureQueue', 'Arn') },
      { Effect: 'Allow', Action: ['logs:CreateLogStream', 'logs:PutLogEvents'], Resource: [sub('${Logs.Arn}:*'), sub('${NotifierLogs.Arn}:*')] },
    ] } }],
  } },
  Intake: { Type: 'AWS::Lambda::Function', Properties: {
    Runtime: 'nodejs22.x', Handler: 'index.handler', Role: attr('Role', 'Arn'), Timeout: 15, MemorySize: 128,
    LoggingConfig: { LogGroup: ref('Logs') },
    Environment: { Variables: { SUPPLIER_TABLE: ref('Records'), SUPPLIER_PREVIEW_ORIGIN: ref('PreviewOrigin'), OWNER_ACTIVITY_URL: ref('OwnerActivityUrl'), OWNER_ACTIVITY_SECRET_ARN: ref('OwnerActivitySecretArn') } },
    Code: { ZipFile: code.join('\n') },
  } },
  NotifierLogs: { Type: 'AWS::Logs::LogGroup', Properties: { RetentionInDays: 30 } },
  NotificationFailureQueue: { Type: 'AWS::SQS::Queue', Properties: { MessageRetentionPeriod: 1209600, SqsManagedSseEnabled: true } },
  Notifier: { Type: 'AWS::Lambda::Function', Properties: {
    Runtime: 'nodejs22.x', Handler: 'index.handler', Role: attr('Role', 'Arn'), Timeout: 30, MemorySize: 128,
    LoggingConfig: { LogGroup: ref('NotifierLogs') },
    Environment: { Variables: { OWNER_ACTIVITY_URL: ref('OwnerActivityUrl'), OWNER_ACTIVITY_SECRET_ARN: ref('OwnerActivitySecretArn') } },
    Code: { ZipFile: notifierCode.join('\n') },
  } },
  NotificationMapping: { Type: 'AWS::Lambda::EventSourceMapping', Properties: {
    FunctionName: ref('Notifier'), EventSourceArn: attr('Records', 'StreamArn'), StartingPosition: 'LATEST', BatchSize: 1,
    BisectBatchOnFunctionError: true, MaximumRetryAttempts: 5, MaximumRecordAgeInSeconds: 86400,
    DestinationConfig: { OnFailure: { Destination: attr('NotificationFailureQueue', 'Arn') } },
  } },
  NotificationFailureAlarm: { Type: 'AWS::CloudWatch::Alarm', Properties: {
    AlarmDescription: 'Supplier owner notification entered the dead-letter queue', Namespace: 'AWS/SQS', MetricName: 'ApproximateNumberOfMessagesVisible',
    Dimensions: [{ Name: 'QueueName', Value: attr('NotificationFailureQueue', 'QueueName') }], Statistic: 'Maximum', Period: 300, EvaluationPeriods: 1, Threshold: 0, ComparisonOperator: 'GreaterThanThreshold', TreatMissingData: 'notBreaching',
  } },
  SchedulerRole: { Type: 'AWS::IAM::Role', Properties: {
    AssumeRolePolicyDocument: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: { Service: 'scheduler.amazonaws.com' }, Action: 'sts:AssumeRole' }] },
    Policies: [{ PolicyName: 'daily-owner-digest', PolicyDocument: { Version: '2012-10-17', Statement: [
      { Effect: 'Allow', Action: 'lambda:InvokeFunction', Resource: attr('Notifier', 'Arn') },
      { Effect: 'Allow', Action: 'sqs:SendMessage', Resource: attr('NotificationFailureQueue', 'Arn') },
    ] } }],
  } },
  DailyDigest: { Type: 'AWS::Scheduler::Schedule', Properties: {
    Description: 'Daily owner activity digest at 8 AM America/New_York', ScheduleExpression: 'cron(0 8 * * ? *)', ScheduleExpressionTimezone: 'America/New_York', State: 'ENABLED', FlexibleTimeWindow: { Mode: 'OFF' },
    Target: { Arn: attr('Notifier', 'Arn'), RoleArn: attr('SchedulerRole', 'Arn'), Input: '{"action":"daily_digest"}', RetryPolicy: { MaximumEventAgeInSeconds: 86400, MaximumRetryAttempts: 5 }, DeadLetterConfig: { Arn: attr('NotificationFailureQueue', 'Arn') } },
  } },
  Api: { Type: 'AWS::ApiGatewayV2::Api', Properties: { Name: sub('${AWS::StackName}-intake'), ProtocolType: 'HTTP' } },
  Integration: { Type: 'AWS::ApiGatewayV2::Integration', Properties: {
    ApiId: ref('Api'), IntegrationType: 'AWS_PROXY', IntegrationUri: attr('Intake', 'Arn'), PayloadFormatVersion: '2.0', TimeoutInMillis: 20000,
  } },
  Post: { Type: 'AWS::ApiGatewayV2::Route', Properties: { ApiId: ref('Api'), RouteKey: 'POST /supplier-submissions', Target: sub('integrations/${Integration}'), AuthorizationType: 'NONE' } },
  Options: { Type: 'AWS::ApiGatewayV2::Route', Properties: { ApiId: ref('Api'), RouteKey: 'OPTIONS /supplier-submissions', Target: sub('integrations/${Integration}'), AuthorizationType: 'NONE' } },
  Stage: { Type: 'AWS::ApiGatewayV2::Stage', Properties: { ApiId: ref('Api'), StageName: '$default', AutoDeploy: true, DefaultRouteSettings: { ThrottlingBurstLimit: 10, ThrottlingRateLimit: 2 } } },
  Invoke: { Type: 'AWS::Lambda::Permission', Properties: {
    Action: 'lambda:InvokeFunction', FunctionName: ref('Intake'), Principal: 'apigateway.amazonaws.com', SourceAccount: ref('AWS::AccountId'),
    SourceArn: sub('arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:${Api}/*/*/supplier-submissions'),
  } },
}
const template = {
  AWSTemplateFormatVersion: '2010-09-09', Description: 'AtlasEye public manufacturer intake with private AWS storage; independent of private pilot infrastructure.',
  Parameters: {
    PreviewOrigin: { Type: 'String', Default: '', AllowedPattern: '^$|^https://deploy-preview-[1-9][0-9]*--atlas-eye\\.netlify\\.app$' },
    OwnerActivityUrl: { Type: 'String', Default: 'https://nnudwaqrgtztmcrcwpxn.supabase.co/functions/v1/owner-activity', AllowedPattern: '^https://[a-z0-9-]+\\.supabase\\.co/functions/v1/owner-activity$' },
    OwnerActivitySecretArn: { Type: 'String', AllowedPattern: '^arn:aws[a-zA-Z-]*:secretsmanager:[a-z0-9-]+:[0-9]{12}:secret:[A-Za-z0-9/_+=.@-]+$' },
  },
  Resources: resources,
  Outputs: { SubmissionUrl: { Value: sub('https://${Api}.execute-api.${AWS::Region}.${AWS::URLSuffix}/supplier-submissions') }, RecordsTable: { Value: ref('Records') }, FunctionName: { Value: ref('Intake') }, NotificationFunctionName: { Value: ref('Notifier') }, NotificationFailureQueueUrl: { Value: ref('NotificationFailureQueue') }, DailyDigestSchedule: { Value: ref('DailyDigest') } },
}
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true })
fs.writeFileSync(output, JSON.stringify(template, null, 2) + '\n')
console.log(`Built supplier intake template: ${path.resolve(output)}`)
