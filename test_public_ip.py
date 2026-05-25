import sys, os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.app.services.azure_service import azure_vm_service
client = azure_vm_service._get_client()

from azure.mgmt.network import NetworkManagementClient
from azure.identity import ClientSecretCredential

credential = ClientSecretCredential(
    tenant_id=azure_vm_service.tenant_id,
    client_id=azure_vm_service.client_id,
    client_secret=azure_vm_service.client_secret
)
network_client = NetworkManagementClient(credential, azure_vm_service.subscription_id)

for vm in client.virtual_machines.list_all():
    print(f"VM: {vm.name}")
    try:
        # Get the network interfaces for the VM
        for nic_ref in vm.network_profile.network_interfaces:
            nic_id = nic_ref.id
            nic_name = nic_id.split('/')[-1]
            rg_name = nic_id.split('/')[4]
            nic = network_client.network_interfaces.get(rg_name, nic_name)
            for ip_config in nic.ip_configurations:
                if ip_config.public_ip_address:
                    pub_ip_id = ip_config.public_ip_address.id
                    pub_ip_name = pub_ip_id.split('/')[-1]
                    pub_ip_rg = pub_ip_id.split('/')[4]
                    pub_ip = network_client.public_ip_addresses.get(pub_ip_rg, pub_ip_name)
                    print(f"  Public IP: {pub_ip.ip_address}")
    except Exception as e:
        print(f"  Error: {e}")
