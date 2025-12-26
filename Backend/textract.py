"""
File to experiment with textract before deployment
"""


"""
NOTES:
In the real version lambda can send s3 urls rather than the entire file, triggering textract extraction


"""

import boto3
from pydantic import BaseModel, ValidationError
import logging
from typing import List, Dict, Any
import json

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

file = 'test-receipt.jpeg'

client = boto3.client('textract')


class ReceiptItem(BaseModel):
    item_name: str
    price: str # maybe change to float in the future if problems


class Receipt(BaseModel):
    store_name: str
    date: str
    items: List[ReceiptItem]
    total: str


class InvalidTextractResponse(Exception):
    """Exception raised for invalid AWS Textract response format. """
    def __init__(self, missing_field: str, 
                message='Invalid AWS Textract response format. Missing key fields:'):
        self.missing_field = missing_field
        self.message = message

        super().__init__(self.message)

    def __str__(self):
        return f"{self.message} {self.missing_field} "

def extract_single_file():
    if file:
        with open(file, 'rb') as f:
            file_byte_data = f.read()

            response: Dict = client.analyze_expense(
                Document = {
                    'Bytes': file_byte_data
                }
            )

            try:
                cleaned_text = parse_extracted_text(response)
                return cleaned_text
            except InvalidTextractResponse as e:
                # catch format errors
                logging.error(f"An error occured: {e}")
                return response
            except Exception as e:
                # general unexpected errors
                logging.error(f'An error occurred: {e}. Defaulting to raw text')
                return response


def parse_extracted_text(textract_response: Dict[str, Any]) -> str:
    """
    We can split this into general details and table entries
    Each helper method will return the stringified json of their respective parts
    Then we concat??? That seems so bad lol
    """
    
    # check structure of fields we need
    # check for 'ExpenseDocuments'
    expense_docs = get_expense_documents(textract_response)
    parsed_docs = []
    # Every expense doc has summary and listitems
    for i, doc in enumerate(expense_docs):
        summary_fields = get_summary_fields(doc)
        parsed_field = parse_summaryfields_to_str(summary_fields)

        line_item_groups = get_line_item_groups(doc)
        parsed_item_group = parse_lineitemgroup_to_str(line_item_groups)


        print(parsed_field)
        print(parsed_item_group)
        



    return {
        
    }

def get_num_documents(textract_response: Dict[str, Any]) -> str:
    # check for 'ExpenseDocuments'
    if 'DocumentMetadata' not in textract_response:
        logger.error('Textract response is not in the expected format.')
        raise InvalidTextractResponse('ExpenseDocuments') 
    return textract_response['DocumentMetadata']['Pages']


def get_expense_documents(textract_response: Dict[str, Any]) -> List:
    if 'ExpenseDocuments' not in textract_response:
        logger.error('Textract response is not in the expected format.')
        raise InvalidTextractResponse('ExpenseDocuments') 
    return textract_response['ExpenseDocuments']

def get_summary_fields(expense_doc: Dict):
    # SummaryFields: Any information found outside of a table by Amazon Textract.
    if 'SummaryFields' not in expense_doc:
        logger.error('Textract response is not in the expected format.')
        raise InvalidTextractResponse('SummaryFields') 
    return expense_doc['SummaryFields']

def get_line_item_groups(expense_doc: Dict):
    # SummaryFields: Any information found outside of a table by Amazon Textract.
    if 'LineItemGroups' not in expense_doc:
        logger.error('Textract response is not in the expected format.')
        raise InvalidTextractResponse('LineItemGroups') 
    return expense_doc['LineItemGroups']


def parse_summaryfields_to_str(summary_fields: List):
        # extract as list, then put in josn wrapping
    
    field_list = parse_summaryfields_to_list(summary_fields)
    return {
        'summary_fields': json.dumps(field_list)
    }



def parse_lineitemgroup_to_str(line_item_groups: List):
    """want item and price"""
    item_group_list = parse_lineitemgroup_to_list(line_item_groups)
    return {
        'line_items': json.dumps(item_group_list)
    }



def parse_lineitemgroup_to_list(line_item_groups: List[Dict]):
    item_list = []
    for item_group in line_item_groups:
        line_items = item_group['LineItems']
       
        # a single line has a list of fields
        for line in line_items:
            expense_fields = line['LineItemExpenseFields']

            # container to hold the data for a single expense row
            # not using default EXPENSE_ROW tag from textract beause it has uneeded data for our purpose
            row = {}
            for field in expense_fields:
                value = field['ValueDetection']['Text']
                if ((field_label := field['Type']['Text']) == 'ITEM'):
                    row['item_name'] = value
                elif field_label == 'PRICE':
                    row['price'] = (value)

            # if pydantic says the row dict is good, add it
            try:
                ReceiptItem.model_validate(row)
                item_list.append(row)
            except ValidationError as e:
                logger.info("Ruhh roh")
                pass
    return item_list


def parse_summaryfields_to_list(summary_fields: List[Dict]):
    field_list = []
    for summary in summary_fields:
        label = summary['LabelDetection']['Text']
        value = summary['ValueDetection']['Text']
        field_list.append({label: value})

    return field_list



if __name__ == '__main__':
    extract_single_file()