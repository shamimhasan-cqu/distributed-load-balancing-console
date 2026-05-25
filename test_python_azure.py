import os
import sys

# add backend/ to sys.path so we can import from backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from azure.identity import ClientSecretCredential
from azure.mgmt.compute import ComputeManagementClient
import logging

logging.basicConfig(level=logging.DEBUG)

tenant_id = "f8cdef31-a31e-4b4a-93e4-5f571e91255a" # Wait, I don't know the exact tenant. Let me use the service.
from backend.app.services.azure_service import azure_vm_service

print("Sub ID used: ", azure_vm_service.subscription_id)

try:
    print(azure_vm_service.list_all_vms())
except Exception as e:
    print(e)
