#url = 'https://822105301108.signin.aws.amazon.com/console'
#accessKeys = 'AKIA362KLMB2GURPOUVH'
#secrets = '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'


from pprint import pprint
import boto3

#boto3.set_stream_logger('botocore', level='DEBUG')


import boto3

# Get the service resource.
dynamodb = boto3.resource('dynamodb')

# Create the DynamoDB table.
table = dynamodb.create_table(
    TableName='affidavitdata',
    KeySchema=[
        {
            'AttributeName': 'id_year',
            'KeyType': 'HASH'
        }
    ],
    AttributeDefinitions=[
        {
            'AttributeName': 'id_year',
            'AttributeType': 'S'
        }
    ],
    ProvisionedThroughput={
        'ReadCapacityUnits': 5,
        'WriteCapacityUnits': 5
    }
)

# Wait until the table exists.
table.wait_until_exists()

# Print out some data about the table.
print(table.item_count)