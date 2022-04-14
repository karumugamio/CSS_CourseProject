const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

const moment = require('moment');
const status = require('../common/constants/statusCodes');

const utils = require('../common/utils/utils');
const dynamo = require('../common/controllers/dynamo');
const lambda = require('../common/controllers/lambda');

exports.handler = async (event, context) => {
    console.log('searchCandidate begin');
    console.log(JSON.stringify(event));
    const responseBody = {
        success: false
    };

    console.log('searchCandidate, validate headers');
    /** const requestHeadersValidation = utils.isRequestHeadersValid(event, ['env', 'token', 'tokensource']);
    if (!requestHeadersValidation.valid) {
        return utils.sendResponse(status.BadRequest, requestHeadersValidation);
    }  */

    console.log('searchCandidate, validate body');
    console.log('event.body is :::::::'+JSON.stringify(event.body));
    const requestBodyValidation = utils.isRequestBodyValid(event, ['statename', 'year']);
    if (!requestBodyValidation.valid) {
        return utils.sendResponse(status.BadRequest, requestBodyValidation);
    }
    
    const requestBody = requestBodyValidation.body;
    console.log('searchCandidate, requestBody = ' + JSON.stringify(requestBody, null, 3));

    const segment = AWSXRay.getSegment();
    let subSegment;
    let defaultConfigResponse;

    try {
        subSegment = segment.addNewSubsegment('Checking configuration');
        
        console.log('searchCandidate, candidateName = %s', process.env.APPLICATION_ID);
        console.log('searchCandidate, stateName = %s', 'affidavitdata');
        console.log('searchCandidate, year = %s', 'affidavitdata');

        subSegment.close();


        console.log('Environment::'+event.headers.env);
        console.log('Token::'+event.headers.token);
        // Setup purecloud api instance
        
        console.log('searchCandidate, getting customer and application');
        //response = await dynamo.query('affidavitdata', undefined, 'org_id = :org_id', { ':org_id': organizationId });
        // console.log('searchCandidate, get customer response = ' + JSON.stringify(response, null, 3));
        defaultConfigResponse = await dynamo.query('affidavitdata', undefined, 'contains(:id_year,id_year)', { ':id_year': [] });
        return utils.sendResponse(status.OK, responseBody);

    } catch (error) {
        console.log('searchCandidate error = %s', JSON.stringify(error, null, 3));

        responseBody.refid = context.awsRequestId;
        responseBody.message = error.body && error.body.message || error.toString(); // PureCloud api returns error.body.message
        responseBody.message = [responseBody.message,'Ref ID',context.awsRequestId].join('.');

        if (subSegment && !subSegment.isClosed()) {
            subSegment.close();
        }

        return utils.sendResponse(status.InternalServerError, responseBody);
    }
}
