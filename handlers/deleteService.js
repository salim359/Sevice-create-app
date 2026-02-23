
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
