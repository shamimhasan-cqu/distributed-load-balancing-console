import sys, os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.services.azure_service import azure_vm_service
from azure.mgmt.compute.models import RunCommandInput

client = azure_vm_service._get_client()

try:
    parameters = RunCommandInput(
        command_id='RunShellScript',
        script=['echo "Hello from Azure!"', 'systemctl status distributed-node || true']
    )
    poller = client.virtual_machines.begin_run_command('distributed-system-rg', 'worker-vm-1', parameters)
    result = poller.result()
    print("Output:")
    for v in result.value:
        print(f"Message: {v.message}")
except Exception as e:
    import traceback
    traceback.print_exc()
