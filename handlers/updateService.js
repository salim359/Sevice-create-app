
'use strict'
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const { DynamoDBDocumentClient, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb')

module.exports.updateService = async (event) => {
    try {  

        const body =JSON.parse(event.body)
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
                TableName:process.env.DYNAMODB_TABLE,
                Key:{
                    primary_key:event.pathParameters.primary_key
                },
                UpdateExpression:'set #name = :name , #description = :description',
                ExpressionAttributeNames:{
                    '#name':'name',
                    '#description':'description'
                },
                ExpressionAttributeValues:{
                    ':name':body.name,
                    ':description':body.description
                }
            })
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
