const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))
const stream = require('stream')
const csvParser = require('csv-parser')
const promiseReflect = require('promise-reflect')
AWS.config.update({ region: process.env.REGION })

const documentClient = new AWS.DynamoDB.DocumentClient({ convertEmptyValues: true })
const dynamoDB = new AWS.DynamoDB()
const marshall = AWS.DynamoDB.Converter.marshall
const unmarshall = AWS.DynamoDB.Converter.unmarshall

/**
 *  AWS.DynamoDB.DocumentClient
 *  https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html
 *  
 *  */

const scan = (table, filterExpression, expressionAttributeValues, expressionAttributeNames) => {
    return new Promise((resolve, reject) => {
        let items = []
        const params = { TableName: table }

        if (filterExpression) params.FilterExpression = filterExpression;
        if (expressionAttributeValues) params.ExpressionAttributeValues = expressionAttributeValues;
        if (expressionAttributeNames) params.ExpressionAttributeNames = expressionAttributeNames;
        console.log('Starting scan with params:', JSON.stringify(params));
        scan(params);

        function scan(params) {
            documentClient.scan(params, (err, data) => {
                if (!err) {
                    items.push(...data.Items)
                    if (data.LastEvaluatedKey) {
                        params.ExclusiveStartKey = data.LastEvaluatedKey;
                        return scan(params)
                    }
                    else return resolve(items)
                }
                else return reject(err)
            })
        }
    })
}

const get = (table, key) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: table,
            Key: key
        }
        console.log(`Getting item: ${JSON.stringify(params)}`)
        documentClient.get(params, (err, data) => {
            if (err) {
                console.log(JSON.stringify(err))
                return reject("Unable to get object. Error JSON:", JSON.stringify(err, null, 2))
            } else return resolve(data.Item)
        })
    })
}

const put = (params) => {
    return new Promise((resolve, reject) => {
        console.log(`Putting item: ${JSON.stringify(params)}`)
        documentClient.put(params, (err, data) => {
            if (err) {
                console.error(JSON.stringify(err))
                return reject("Unable to put object. Error JSON:", JSON.stringify(err, null, 2))
            } else return resolve(data)
        })
    })
}

const query = (table, projectionExpression, keyConditionExpression, expressionAttributeValues, expressionAttributeNames, limit, indexName, exclusiveStartKey) => {
    return new Promise((resolve, reject) => {
        const params = { TableName: table }
        if (projectionExpression) params.ProjectionExpression = projectionExpression;
        if (keyConditionExpression) params.KeyConditionExpression = keyConditionExpression;
        if (expressionAttributeValues) params.ExpressionAttributeValues = expressionAttributeValues;
        if (expressionAttributeNames) params.ExpressionAttributeNames = expressionAttributeNames;
        if (limit) params.Limit = limit;
        if (indexName) params.IndexName = indexName;
        if (exclusiveStartKey) params.ExclusiveStartKey = exclusiveStartKey;

        console.log('Querying item:', JSON.stringify(params));
        documentClient.query(params, (err, data) => {
            if (err) {
                console.log("Unable to query object. Error JSON:", JSON.stringify(err, null, 2));
                return reject(err)
            } else return resolve(data)
        })
    })
}

const update = (params) => {
    return new Promise((resolve, reject) => {
        console.log(`Updating item: ${JSON.stringify(params)}`)
        documentClient.update(params, (err, data) => {
            if (err) {
                console.log("Unable to update item. Error:", JSON.stringify(err, null, 2))
                return reject(err)
            } else return resolve(data)
        })
    })
}

const deleteItem = (params) => {
    return new Promise((resolve, reject) => {
        console.log(`Deleting item: ${JSON.stringify(params)}`)
        documentClient.delete(params, (err, data) => {
            if (err) {
                console.log("Unable to delete item. Error:", JSON.stringify(err, null, 2))
                return reject(err)
            } else return resolve(data)
        })
    })
}

const deleteItems = async (tableName, ids) => {
    const AWS_MAX_BATCH_ITEMS = 25 // AWS dynamo batch write handles maximum 25 items per batch.
    const n = Math.ceil(ids.length / AWS_MAX_BATCH_ITEMS)
    let idsIndex = 0;
    const promises = []
    for (let index = 0; index < n; index++) {
        const idsToDelete = ids.slice(idsIndex, idsIndex + AWS_MAX_BATCH_ITEMS)
        const items = idsToDelete.map((id) => ({ DeleteRequest: { Key: { id } } }))
        const params = {
            RequestItems: {
                [tableName]: items
            }
        }

        promises.push(documentClient.batchWrite(params).promise())
        idsIndex = idsIndex + AWS_MAX_BATCH_ITEMS;
    }
    const promiseReflectResponse = await Promise.all(promises.map(promiseReflect))
    const resolvedPromiseResponse = promiseReflectResponse.filter(x => x.status === 'resolved').map(x => ({ ...x.data }))
    console.log(`deleteItems.resolvedPromiseResponse:${JSON.stringify(resolvedPromiseResponse)}`)
    const rejectedPromiseResponse = promiseReflectResponse.filter(x => x.status === 'rejected').map(x => ({ ...x.error }))
    console.log(`deleteItems.rejectedPromiseResponse:${JSON.stringify(rejectedPromiseResponse)}`)
    if (rejectedPromiseResponse.length > 0) throw 'An error occured while deleting items from the database'
    return true
}

const writeItems = (params) => {
    return new Promise((resolve, reject) => {
        documentClient.batchWrite(params, (err, data) => {
            if (err) {
                console.log('error:', err)
                return reject(err)
            }
            return resolve(data)
        })
    })
}

/**
 *  AWS.DynamoDB
 *  https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB.html
 *  
 *  */

const scan2 = (table, filterExpression, expressionAttributeValues, expressionAttributeNames) => {
    return new Promise((resolve, reject) => {
        let items = []
        const params = { TableName: table }

        if (filterExpression) params.FilterExpression = filterExpression;
        if (expressionAttributeValues) params.ExpressionAttributeValues = expressionAttributeValues;
        if (expressionAttributeNames) params.ExpressionAttributeNames = expressionAttributeNames;
        console.log('Starting scan with params:', JSON.stringify(params));
        scan(params);

        function scan(params) {
            dynamoDB.scan(params, (err, data) => {
                if (!err) {
                    items.push(...data.Items)
                    if (data.LastEvaluatedKey) {
                        params.ExclusiveStartKey = data.LastEvaluatedKey;
                        return scan(params)
                    }
                    else {
                        return resolve(items)
                    }
                }
                else {
                    return reject(err)
                }
            })
        }
    })
}

const checkAndCreateTable = (tableName, writeThroughput) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName
        }
        dynamoDB.describeTable(params, (err, data) => {
            if (err) {
                if (err.code === 'ResourceNotFoundException') {
                    console.log(`Table ${tableName} does not exist. Creating table with ${writeThroughput} Write Throughput capacity`)
                    createTable(tableName, writeThroughput)
                        .then((data) => {
                            return resolve(data)
                        }).catch(err => {
                            return reject(err)
                        })
                }
                else {
                    console.log('Error in describing table', err)
                    return reject(err)
                }
            }
            else {
                console.log(`table exists. Deleting the table`)
                dynamoDB.deleteTable(params, (err, data) => {
                    if (err) {
                        console.log('Error while deleting the table:', err);
                        return reject(err)
                    }
                    else {
                        console.log('Check if table is deleted')
                        dynamoDB.waitFor('tableNotExists', params, (err) => {
                            if (err) {
                                console.log('Table still exists in database', err)
                                return reject(err)
                            }
                            else {
                                console.log('table successfully deleted')
                                createTable(tableName, writeThroughput).then((data) => {
                                    return resolve(data)
                                }).catch(err => {
                                    return reject(err)
                                })
                            }
                        })
                    }
                })
            }
        })
    })
}

const createTable = (tableName, writeThroughput) => {
    return new Promise((resolve, reject) => {
        dynamoDB.createTable({
            TableName: tableName,
            KeySchema: [{
                AttributeName: "row_id",
                KeyType: "HASH"
            }],
            AttributeDefinitions: [{
                AttributeName: "row_id",
                AttributeType: 'S'
            }],
            ProvisionedThroughput: {
                ReadCapacityUnits: 1,
                WriteCapacityUnits: writeThroughput,
            }
        }, (err) => {
            if (err) {
                return reject(err)
            }
            else {
                console.log(`table ${tableName} create call success`)
                dynamoDB.waitFor('tableExists', { TableName: tableName },
                    (err, data) => {
                        if (err) {
                            console.log('Table not created in database:', err)
                            return reject(err)
                        }
                        else {
                            console.log(`table ${tableName} creation complete`)
                            return resolve(`table ${tableName} creation complete`)
                        }
                    })
            }
        })
    })
}

const deleteTable = (tableName) => {
    return new Promise((resolve, reject) => {
        const tableParams = {
            TableName: tableName
        }
        console.log(`Deleting table ${tableName}`)
        dynamoDB.deleteTable(tableParams, (err, data) => {
            if (err) {
                console.log('Error in deleting the table:', err);
                if (err.code === 'ResourceNotFoundException') {
                    return resolve(true);
                } else {
                    return reject(err.message);
                }
            }
            else {
                console.log('Check if table is deleted')
                dynamoDB.waitFor('tableNotExists', tableParams, (err, data) => {
                    if (err) {
                        console.log('Table still exists in database', err)
                        return reject(err)
                    }
                    else {
                        console.log('table successfully deleted')
                        return resolve(true)
                    }
                })
            }
        })
    })
}

const getItem = (tableName, key) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            Key: key
        }
        console.log('getItem:', JSON.stringify(params))
        dynamoDB.getItem(params, (err, data) => {
            if (err) return reject(err)
            else return resolve(data)
        })
    })
}

const exportDynamoTable = (tableName) => {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('scanning table:', tableName);
            const data = await scan2(tableName)
            console.log('Scan length:', data.length)
            if (data.length === 0)
                return reject({ data: [], message: 'dynamo table is empty' })
            else {
                let allRecords = []
                allRecords.push(...data)
                //  console.log('pre_unmarshall.allRecords:', JSON.stringify(allRecords))
                allRecords = allRecords.map(record => {
                    delete record.row_id
                    return unmarshall(record)
                })

                // console.log('post_unmarshall.allRecords:', JSON.stringify(allRecords))
                return resolve({ data: allRecords })
            }
        } catch (error) {
            return reject({ data: [], message: error.message })
        }
    })
}

const importCsvIntoDynamo = async (file, table) => {
    return new Promise((resolve, reject) => {
        try {
            const results = []
            const readStream = new stream.PassThrough
            readStream.end(file)
            readStream.pipe(csvParser({
                mapHeaders: ({ header }) => header.trim()
            }))
                .on('data', (data) => results.push(data))
                .on('end', async () => {
                    const split_arrays = [], size = 25;
                    while (results.length > 0) split_arrays.push(results.splice(0, size))
                    for (let index = 0; index < split_arrays.length; index++) {
                        const batch = split_arrays[index];
                        const items = batch.map((item) => ({ PutRequest: { Item: { ...item } } }))
                        await writeItems({ RequestItems: { [table]: items } })
                    }
                    return resolve('Import successful')
                })
        } catch (error) {
            console.log('importCsvIntoDynamo.error:', error.message)
            return reject(`Import failure:`, error)
        }
    })
}

const updateTableProvisionedThroughput = async (table, read, write) => {
    return new Promise((resolve, reject) => {
        const params = {
            TableName: table,
            ProvisionedThroughput: {
                ReadCapacityUnits: read,
                WriteCapacityUnits: write
            }
        }
        dynamoDB.updateTable(params, (err, data) => {
            if (err) {
                console.log('Error updating table provisioned throughput:', err)
                return reject(err)
            }
            return resolve(`Provisioned throughput successfully updated. Read capacity units = ${read}, Write capacity units = ${write}`)
        })
    })
}

module.exports = {
    scan,
    get,
    query,
    put,
    update,
    deleteItem,
    deleteItems,
    writeItems,
    createTable,
    checkAndCreateTable,
    getItem,
    deleteTable,
    exportDynamoTable,
    writeItems,
    importCsvIntoDynamo,
    updateTableProvisionedThroughput,
}