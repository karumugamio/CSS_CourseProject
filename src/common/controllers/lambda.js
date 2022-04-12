const AWSXRay = require('aws-xray-sdk-core')
const AWS = AWSXRay.captureAWS(require('aws-sdk'))
AWS.config.update({ region: process.env.REGION })

const lambda = new AWS.Lambda();

/**
 * https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html
 * 
 */

const callLambdaFunction = (requestBody, requestHeaders, lambdaFunctionName) => {
    return new Promise((resolve, reject) => {
        const params = {
            FunctionName: lambdaFunctionName,
            Payload: JSON.stringify({ body: JSON.stringify(requestBody), headers: requestHeaders })
        }
        lambda.invoke(params, (error, data) => {
            if (error) {
                console.log('error', error)
                reject(error)
            }
            if (data) resolve(JSON.parse(data.Payload))
        })
    })
}

const callLambdaFunctionAsync = (requestBody, requestHeaders, lambdaFunctionName) => {
    const params = {
        FunctionName: lambdaFunctionName,
        InvocationType: 'Event',
        Payload: JSON.stringify({ body: JSON.stringify(requestBody), headers: requestHeaders })
    }
    lambda.invoke(params, (error, data) => {
        if (error) console.log('error: ', error)
    })
}


const callLambdaFNWithPayLoadAsync = ( lambdaFunctionName,payLoad) => {
    return new Promise((resolve, reject) => {
        const params = {
            FunctionName: lambdaFunctionName,
            InvocationType: 'Event',
            Payload: JSON.stringify(payLoad)
        }
        lambda.invoke(params, (error, data) => {
            if (error) {
                console.log('error', error)
                reject(error)
            }
            if (data) resolve('Lambda Async Call Success');
        })
    })
}

module.exports = {
    callLambdaFunction,
    callLambdaFunctionAsync,
    callLambdaFNWithPayLoadAsync
}