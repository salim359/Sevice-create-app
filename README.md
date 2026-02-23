# Serverless Framework Guide

## Goal
Quickly set up and deploy a simple HTTP API on AWS using Serverless Framework.

## Prerequisites

Before starting:
- Install [Node.js](https://nodejs.org) (v18.20+ recommended)
- Have an AWS account with billing enabled (free tier works for basics)
- Install AWS CLI (optional but helpful): `npm install -g aws-cli` or download from AWS
- Basic terminal knowledge

## 1. Installation

Install Serverless Framework globally:

```bash
npm install -g serverless
```

Verify:

```bash
serverless --version
```

## 2. Bootstrapping a Project (Fastest Way)

Run the interactive wizard:

```bash
serverless
```

It will guide you through everything.

## 3. Select a Template

Choose one that fits your needs. Recommendation for simple REST APIs:

**AWS / Node.js / HTTP API**

### Why AWS / Node.js / HTTP API?
- Creates a basic Lambda + API Gateway (HTTP API – cheaper & faster than REST API)
- No heavy frameworks (just plain handler functions)
- Ideal for small APIs, microservices, or quick prototypes

## 4. Name Your Project

Enter a name (lowercase letters, numbers, hyphens only – no spaces or parentheses)

Example: `first-project`

CLI will create a folder with that name and scaffold files:
- `serverless.yml` (main config)
- `handler.js` (your Lambda code)
- etc.

cd into the folder:

```bash
cd first-project
```

## 5. Authentication (Dashboard Login)

V4 CLI requires login for most workflows (free for individuals/small teams; paid only for large orgs >$2M revenue).

- Choose Login/Register (via email, GitHub, or Google)
- You'll be redirected to https://app.serverless.com to sign in/create account
- After login, CLI gets an access key (stored locally – no repeated prompts)
- Dashboard benefits: metrics, parameters, sharing (optional for basics)
- Skip if using license key (rare for beginners)

## 6. Configure AWS Credentials

**Important: Do this before deploying!**

The CLI usually detects if credentials are missing and guides you. Preferred options:

- **Best:** "Sign in with AWS Console" → opens browser for secure, temporary creds
- **Or:** Use existing IAM user keys via `aws configure`
  - Access Key ID & Secret from AWS IAM → User with Lambda, API Gateway, CloudFormation, IAM permissions
  - Avoid hardcoding keys in code!

## 7. Practical Example: Service Creation API Endpoints

### Step 1: Bootstrap the Project (if not already done)

Choose AWS / Node.js / HTTP API

Name the project: `service-create-app`

Name the app: `serviceapp`

cd to the project:

```bash
cd service-create-app
```

### Step 2: Install Dependencies

```bash
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### Step 3: Update serverless.yml

#### Adding Permissions

```yaml
provider:
  name: aws
  runtime: nodejs20.x
  iamRoleStatements:
    - Effect: "Allow"
      Action:
        - "dynamodb:PutItem"
        - "dynamodb:GetItem"
        - "dynamodb:UpdateItem"
        - "dynamodb:DeleteItem"
        - "dynamodb:Scan"
      Resource: 
        Fn::GetAtt:
          - ServiceTable
          - Arn
  environment:
    DYNAMODB_TABLE: ServiceTable
```

#### Creating Functions

```yaml
functions:
  createService:
    handler: handlers/createService.createService
    events:
      - httpApi:
          path: /createService
          method: post
  getServices:
    handler: handlers/getService.getService
    events:
      - httpApi:
          path: /services
          method: get
  updateService:
    handler: handlers/updateService.updateService
    events:
      - httpApi:
          path: /updateService/{primary_key}
          method: put
  deleteService:
    handler: handlers/deleteService.deleteService
    events: 
      - httpApi: 
          path: /deleteService/{primary_key}
          method: delete
```

#### DynamoDB Table Resource

```yaml
resources:
  Resources:
    ServiceTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ServiceTable
        AttributeDefinitions:
          - AttributeName: primary_key
            AttributeType: S
        KeySchema:
          - AttributeName: primary_key
            KeyType: HASH
        BillingMode: PAY_PER_REQUEST
```

### Step 4: Create Handlers

Create a `handlers/` folder and add the following files:

#### handlers/createService.js

```javascript
'use strict'
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb')
const { randomUUID } = require('crypto')

module.exports.createService = async (event) => {
  try {
    const body = JSON.parse(event.body)

    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
    const putParams = {
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        primary_key: randomUUID(),
        name: body.name,
        description: body.description,
      },
    }

    await ddb.send(new PutCommand(putParams))

    return {
      statusCode: 201,
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
}
```

#### handlers/getService.js

```javascript
'use strict'
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb')

module.exports.getService = async (event) => {
  try {
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
    const result = await ddb.send(
      new ScanCommand({
        TableName: process.env.DYNAMODB_TABLE,
      }),
    )

    return {
      statusCode: 200,
      body: JSON.stringify(result.Items),
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
}
```

#### handlers/updateService.js

```javascript
'use strict'
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb')

module.exports.updateService = async (event) => {
  try {
    const body = JSON.parse(event.body)
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
    
    const result = await ddb.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
          primary_key: event.pathParameters.primary_key,
        },
      }),
    )

    if (!result.Item) {
      return {
        statusCode: 404,
      }
    }

    await ddb.send(
      new UpdateCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
          primary_key: event.pathParameters.primary_key,
        },
        UpdateExpression: 'set #name = :name, #description = :description',
        ExpressionAttributeNames: {
          '#name': 'name',
          '#description': 'description',
        },
        ExpressionAttributeValues: {
          ':name': body.name,
          ':description': body.description,
        },
      }),
    )

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'The service updated successfully',
      }),
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
}
```

#### handlers/deleteService.js

```javascript
'use strict'
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, DeleteCommand, GetCommand } = require('@aws-sdk/lib-dynamodb')

module.exports.deleteService = async (event) => {
  try {
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
    const result = await ddb.send(
      new GetCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
          primary_key: event.pathParameters.primary_key,
        },
      }),
    )

    if (!result.Item) {
      return {
        statusCode: 404,
      }
    }

    await ddb.send(
      new DeleteCommand({
        TableName: process.env.DYNAMODB_TABLE,
        Key: {
          primary_key: event.pathParameters.primary_key,
        },
      }),
    )

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'The service deleted successfully',
      }),
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
}
```

### Step 5: Deploy

```bash
serverless deploy
```

### Step 6: Test Your API

Use the endpoints provided in the deployment output:

```bash
# Create a service
curl -X POST https://your-api-url/createService \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Service", "description": "This is a test service"}'

# Get all services
curl https://your-api-url/services

# Update a service
curl -X PUT https://your-api-url/updateService/{primary_key} \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Service", "description": "Updated description"}'

# Delete a service
curl -X DELETE https://your-api-url/deleteService/{primary_key}
```

You can also import the included Postman collection (`Service-API.postman_collection.json`) for easier testing.

## 8. Cleanup (When Done)

```bash
serverless remove
```

This will delete:
- All Lambda functions
- API Gateway endpoints
- DynamoDB table (all the data here will be deleted)
- IAM roles
- CloudWatch logs
- All other resources created by the stack

## API Endpoints

Once deployed, you'll have these endpoints:

- **POST** `/createService` - Create a new service
- **GET** `/services` - Get all services
- **PUT** `/updateService/{primary_key}` - Update a service
- **DELETE** `/deleteService/{primary_key}` - Delete a service

## References

- [Serverless Framework Documentation](https://www.serverless.com/framework/docs/tutorial)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [DynamoDB DocumentClient](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/)
My guide 
https://docs.google.com/document/d/1VTQJ-JzGxzbFbuV0LIw1a3yM-F6o9yR3ZzqDtyC-snQ/edit?tab=t.0