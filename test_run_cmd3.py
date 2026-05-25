import sys, os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from backend.app.services.azure_service import azure_vm_service
from azure.mgmt.compute.models import RunCommandInput
client = azure_vm_service._get_client()

rg_name = azure_vm_service._get_rg_for_vm(client, 'worker-vm-1')
parameters = RunCommandInput(
    command_id='RunShellScript',
    script=['systemctl is-active distributed-node || echo "failed"']
)
poller = client.virtual_machines.begin_run_command(rg_name, 'worker-vm-1', parameters)
result = poller.result()
for v in result.value:
    print(v.message)
