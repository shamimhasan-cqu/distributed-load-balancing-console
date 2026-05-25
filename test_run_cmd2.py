import sys, os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.services.azure_service import azure_vm_service

client = azure_vm_service._get_client()

status = azure_vm_service.get_vm_status('worker-vm-1')
print(status)
