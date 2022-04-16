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
        
        
        console.log('searchCandidate, stateName = %s', requestBody.statename);
        console.log('searchCandidate, year = %s', requestBody.year);

        subSegment.close();


        console.log('Environment::'+event.headers.env);
        console.log('Token::'+event.headers.token);
        // Setup purecloud api instance
        
        console.log('searchCandidate, getting customer and application');
        FilterExpression= "#electionyear = :ecyear and #stateName = :stateName";
        ExpressionAttributeNames= {"#electionyear": "electionyear","#stateName": "stateName"};
        ExpressionAttributeValues = { ":ecyear": requestBody.year,":stateName": requestBody.statename };

//        let ingestionData = await dynamoCtrler.scan(constants.AUDIT_TABLENAME,FilterExpression,ExpressionAttributeValues,ExpressionAttributeNames);

        defaultConfigResponse = await dynamo.scan(process.env.TABLE_NAME, FilterExpression,ExpressionAttributeValues,ExpressionAttributeNames);
//            'electionyear = :ecyear and stateName = :stateName', { ':ecyear': requestBody.year,':stateName' :requestBody.statename });'
        console.log(defaultConfigResponse);        

        let processedCandidateList = [];
        for (candidate of defaultConfigResponse){
            redflags={financial: {}};
            info = {};
            if(candidate.filed_itr == false && candidate.net_assets>10000){
                redflags.financial.itr = `Candidate has over ${candidate.assets} but not filed ITR`;
            }
            if(candidate.declared_pan == false && candidate.net_assets>10000){
                redflags.financial.pan = `Candidate has over ${candidate.assets} but Do not have declared PAN`;
            }
            

            if(candidate.recontest_assets_change_pct != 'NOT_AVAILABLE') {
                info.changeinAssets=`Candidate's Asset have changed by ${}% since his last election `
            }
            if(candidate.serious_criminal_cases) {
                info.criminalCases=`Candidate's got Serious criminal cases`;
            }

            candidateProcessed={redflags,info,candidate};
            processedCandidateList.push(candidateProcessed);

        }
        responseBody.candidates = processedCandidateList;
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
