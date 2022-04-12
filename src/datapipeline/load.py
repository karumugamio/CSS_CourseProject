import boto3
import pandas as pd

# Get the service resource.
dynamodb = boto3.resource('dynamodb')

# Instantiate a table resource object without actually
# creating a DynamoDB table. Note that the attributes of this table
# are lazy-loaded: a request is not made nor are the attribute
# values populated until the attributes
# on the table resource are accessed or its load() method is called.
table = dynamodb.Table('affidavitdata')

# Read the csv file
df = pd.read_csv('../../Data/up/2022/uttar-pradesh_2022_candidates_MASTER.csv')

# First 5 rows
print(df.head())

# Print out some data about the table.
# This will cause a request to be made to DynamoDB and its attribute
# values will be set based on the response.
print(table.creation_date_time)

#table.put_item(
#   Item={
##        'id_year': 'janedoe',
 #       'first_name': 'Jane',
 #       'last_name': 'Doe',
 #       'age': 25,
 #       'account_type': 'standard_user',
 #   }
#)

table.pu