'use strict'
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb')

module.exports.getServices = async () => {
  try {
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))
    const result = await ddb.send(
      new ScanCommand({
        TableName: process.env.DYNAMODB_TABLE,
      }),
    )

    if (!result.Count || result.Count === 0) {
      return {
        statusCode: 404,
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        total: result.Count,
        items: result.Items.map((service) => ({
        primary_key: service.primary_key,
        name: service.name,
        description: service.description,
        })),
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
