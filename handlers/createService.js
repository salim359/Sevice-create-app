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
