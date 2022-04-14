const fetch = require('node-fetch')
const crypto = require('crypto')
const tokenSources = require('../constants/tokenSources')
const lambda = require('../controllers/lambda')

const algorithm = 'aes-256-cbc'
const key = Buffer.from('907ffc8efdd5c7bf241a9ce64c3f2c1211acff32e8880338f3cccadaaa4a92c4', 'hex')
const iv = Buffer.from('31a05bab5c66a2a3fea7eecfffe92b2d', 'hex')

const encrypt = (text) => {
    if (text) {
        let iv = crypto.randomBytes(ivLength);
        let cipher = crypto.createCipheriv(algorithm, Buffer.from(encryptionKey), iv);
        let encrypted = cipher.update(text);

        encrypted = Buffer.concat([encrypted, cipher.final()]);

        return iv.toString('hex') + ':' + encrypted.toString('hex');
    }
    return text;
}

const decrypt = (text) => {
    if (text) {
        try {
            let textParts = text.split(':');
            let iv = Buffer.from(textParts.shift(), 'hex');
            let encryptedText = Buffer.from(textParts.join(':'), 'hex');
            let decipher = crypto.createDecipheriv(algorithm, Buffer.from(encryptionKey), iv);
            let decrypted = decipher.update(encryptedText);

            decrypted = Buffer.concat([decrypted, decipher.final()]);

            return decrypted.toString();
        }
        catch (err) {
            // console.log('Decrypt error: %s', err.toString());
        }
    }
    return text;
}

const sendResponse = (responseCode, responseBody) => {
    const response = {
        statusCode: responseCode,
        headers: {
            "Access-Control-Allow-Origin": "*", // Required for CORS support to work
            "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers
        },
        body: JSON.stringify(responseBody)
    }
    console.log(`Sending response: ${JSON.stringify(response)}`)
    return response
}

const isRequestHeadersValid = (event, requiredHeaders) => {
    if (!event.headers) {
        return { valid: false, message: 'Request headers not provided' }
    }
    const headers = event.headers;

    for (const header of requiredHeaders) {
        if (!headers.hasOwnProperty(header)) {
            return { valid: false, message: `invalid request headers, '${header}' missing` }
        }
    }

    if (headers.tokensource) {
        switch (headers.tokensource.toLowerCase()) {
            case tokenSources.purecloud:
                if (!headers.env) {
                    return { valid: false, message: "invalid request headers, 'env' missing" }
                }
                break
            case tokenSources.cognito:
                if (!headers.userpoolid) {
                    return { valid: false, message: "invalid request headers, 'userpoolid' missing" }
                }
                break
            default:
                return { valid: false, message: "invalid request headers, unsupported value for 'tokensource'" }
        }
    }
    return { valid: true }
}

const isRequestBodyValid = (event, requiredProperties) => {
    if (!event.body) {
        return { valid: false, message: 'Request body not provided' }
    }

    let body;
    try {
        console.log('Attempting to parse event.body')
        body = JSON.parse(event.body)
    } catch (error) {
        console.log(error);
        console.log('event:', event);
        return { valid: false, message: `Could not parse body` }
    }

    for (const property of requiredProperties) {
        if (!body.hasOwnProperty(property)) {
            return { valid: false, message: `invalid request body, '${property}' missing` }
        }
    }

    return { valid: true, body }
}

const removeDuplicatesBy = (keyFn, array) => {
    var mySet = new Set();
    return array.filter(function (x) {
        var key = keyFn(x), isNew = !mySet.has(key);
        if (isNew) mySet.add(key);
        return isNew;
    });
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const isIterable = (value) => {
    return Symbol.iterator in Object(value);
}

const getEntities = (api, func, options) => {
    const entities = [];
    const pageSize = parseInt(process.env.GENESYS_CLOUD_API_PAGE_SIZE) || 100;
    let pageNumber = 1;

    const getEntitiesWorker = async () => {
        const data = await api[func]({ ...options, pageSize, pageNumber });
        console.log(`${func}, pageSize: ${pageSize}, pageNumber: ${pageNumber}, entities: ${data.entities.length}`);

        entities.push(...data.entities);
        return (pageNumber++ < data.pageCount) ? getEntitiesWorker() : entities;

    }
    return getEntitiesWorker();
}

const processElasticResource = async (url, username, password, method, headers, body) => {
    console.log('processElasticResource, url = %s', url);
    console.log('processElasticResource, method = %s', method);
    console.log('processElasticResource, headers = %s', JSON.stringify(headers, null, 3));
    console.log('processElasticResource, body = %s', body);

    const options = {
        method: method,
        headers: {
            'Authorization': 'Basic ' + Buffer.from(username + ":" + password).toString('base64'),
            ...headers
        },
        body: body
    };

    console.log('processElasticResource, options.headers = %s', JSON.stringify(options.headers, null, 3));

    const res = await fetch(url, options);

    console.log('processElasticResource, res = %s', JSON.stringify(res, null, 3));
    console.log('processElasticResource, res.status = %s', res.status);
    console.log('processElasticResource, res.statusText = %s', res.statusText);

    // No Content
    // create role
    if (res.status === 204) {
        return;
    }

    if (res.status === 503) {
        return '503';
    }

    // Not Found
    // get non existent elasticsearch user
    if (res.status === 404) {
        return;
    }

    if (!res.ok) {
        try {
            const err = await res.json();
            console.log('processElasticResource, err = %s', JSON.stringify(err, null, 3));

            throw Error(`${err.statusCode} - ${err.status} - ${err.message}`);
        }
        catch (err) {
            throw Error(res.statusText);
        }
    }

    const data = await res.json();
    console.log('processElasticResource, data = %s', JSON.stringify(data, null, 3));

    return data;
}

const fetchWrapper = async (url, init) => {
    const response = await fetch(url, init)
    const json = await response.json()
    return response.ok ? json : Promise.reject(json)
}
const camelToUnderscore = (name) => {
    return name.replace(/([A-Z])/g, "_$1").toLowerCase();
}

const strEquals = (a, b) => {
    return typeof a === 'string' && typeof b === 'string' && a.toUpperCase() === b.toUpperCase();
}

const validateToken = (environment, token) => {
    console.log(`Environment is ${environment}`);
    console.log(`Token is ${token}`);
    
    return fetch(`https://api.${environment}/api/v2/organizations/me`, {
                    method: 'GET',
                    headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `bearer ${token}`
                    }
                    }
                ).then(response => response.json())
}

const processError = async (func, error, debugInfo) => {
    console.log(`${func}, error string = ${error.toString()}`);
    console.log(`${func}, error object = ${JSON.stringify(error)}`);

    console.log(`${func}, debugInfo = ${JSON.stringify(debugInfo)}`);

    if ((process.env.NODE_ENV === 'prod' || process.env.PAGER_DUTY_DEVELOPMENT_INCIDENT_CREATION === 'on')) {

        if(error.toString()!= undefined || error.toString()!= '' ){
            debugInfo.error = error.toString();
        }else{
            debugInfo.error = error;
        }
        const payload = {
            summary: JSON.stringify(debugInfo.error),
            severity: 'critical',
            source: func,
            routing_key: process.env.PAGER_DUTY_SERVICE_LAMBDA_INTEGRATION_KEY,
            customerId: debugInfo.genesysCloudOrg,
            additionalInfo : JSON.stringify(debugInfo),
            product:process.env.PRODUCT
        };
        console.log(`${func}, TRIGGER_INCIDENT_LAMBDA = ${process.env.TRIGGER_INCIDENT_LAMBDA}, payload = ${JSON.stringify(payload, null, 3)}`);
        await lambda.callLambdaFunction(payload, { bypassheadersvalidation: true }, process.env.TRIGGER_INCIDENT_LAMBDA);
    }
    return 'ERROR PROCESSED';
}

module.exports = {
    sendResponse,
    isRequestHeadersValid,
    isRequestBodyValid,
    removeDuplicatesBy,
    sleep,
    isIterable,
    fetchWrapper,
    encrypt,
    decrypt,
    processError,
    processElasticResource,
    camelToUnderscore,
    strEquals,
    validateToken,
    getEntities
}