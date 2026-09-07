import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { argv } from 'node:process'

const root = fileURLToPath(new URL('..', import.meta.url))
const output = argv[2]
if (!output) throw Error('Provide an output path for the CloudFormation template')
// CloudFormation ZipFile produces index.js. Build one CommonJS file from the tested modules.
const modules = ['contract.mjs', 'handler.mjs', 'store.mjs', 'adapter.mjs', 'index.mjs']
const code = ["const { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand } = require('@aws-sdk/client-dynamodb');", "const { createHash, randomUUID } = require('node:crypto');"]
for (const module of modules) {
  let source = fs.readFileSync(path.join(root, 'services/supplier-intake', module), 'utf8')
  source = source.replace(/^import .*\n/gm, '').replace(/^export /gm, '')
  code.push(source)
}
code.push('exports.handler = handler;')
const ref = value => ({ Ref: value })
const attr = (name, value) => ({ 'Fn::GetAtt': [name, value] })
const sub = value => ({ 'Fn::Sub': value })
const resources = {
  Records: { Type: 'AWS::DynamoDB::Table', DeletionPolicy: 'Retain', UpdateReplacePolicy: 'Retain', Properties: {
    BillingMode: 'PAY_PER_REQUEST', AttributeDefinitions: [{ AttributeName: 'pk', AttributeType: 'S' }], KeySchema: [{ AttributeName: 'pk', KeyType: 'HASH' }],
    SSESpecification: { SSEEnabled: true }, PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
    TimeToLiveSpecification: { AttributeName: 'expires_at', Enabled: true },
  } },
  Logs: { Type: 'AWS::Logs::LogGroup', Properties: { RetentionInDays: 30 } },
  Role: { Type: 'AWS::IAM::Role', Properties: {
    AssumeRolePolicyDocument: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: { Service: 'lambda.amazonaws.com' }, Action: 'sts:AssumeRole' }] },
    Policies: [{ PolicyName: 'supplier-intake-only', PolicyDocument: { Version: '2012-10-17', Statement: [
      { Effect: 'Allow', Action: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem'], Resource: attr('Records', 'Arn') },
      { Effect: 'Allow', Action: ['logs:CreateLogStream', 'logs:PutLogEvents'], Resource: attr('Logs', 'Arn') },
    ] } }],
  } },
  Intake: { Type: 'AWS::Lambda::Function', Properties: {
    Runtime: 'nodejs22.x', Handler: 'index.handler', Role: attr('Role', 'Arn'), Timeout: 15, MemorySize: 128,
    LoggingConfig: { LogGroup: ref('Logs') },
    Environment: { Variables: { SUPPLIER_TABLE: ref('Records'), SUPPLIER_PREVIEW_ORIGIN: ref('PreviewOrigin') } },
    Code: { ZipFile: code.join('\n') },
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
  Parameters: { PreviewOrigin: { Type: 'String', Default: '', AllowedPattern: '^$|^https://deploy-preview-[1-9][0-9]*--atlas-eye\\.netlify\\.app$' } },
  Resources: resources,
  Outputs: { SubmissionUrl: { Value: sub('https://${Api}.execute-api.${AWS::Region}.${AWS::URLSuffix}/supplier-submissions') }, RecordsTable: { Value: ref('Records') }, FunctionName: { Value: ref('Intake') } },
}
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true })
fs.writeFileSync(output, JSON.stringify(template, null, 2) + '\n')
console.log(`Built supplier intake template: ${path.resolve(output)}`)
