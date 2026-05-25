import os
from typing import List, Dict, Any, Optional
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    """
    Core Configuration Settings for the Distributed Resource Allocation System.
    Loads configurations from environment variables or standard system defaults.
    """
    # System Metadata
    ENV: str = Field(default="production", env="ENV")
    PROJECT_NAME: str = Field(default="Distributed Resource Allocation Engine", env="PROJECT_NAME")
    API_V1_STR: str = "/api/v1"
    
    # Network configurations
    HOST: str = Field(default="0.0.0.0", env="BIND_HOST")
    PORT: int = Field(default=9000, env="BIND_PORT")
    
    # Gossip Clustering Settings
    GOSSIP_INTERVAL_SECONDS: float = Field(default=3.0, env="GOSSIP_INTERVAL")
    PEER_TIMEOUT_SECONDS: float = Field(default=10.0, env="PEER_TIMEOUT")
    
    # Initial Peer VMs List (Excluding self)
    # Passed as comma separated list: "http://20.92.56.192:8001,http://20.213.58.22:8002"
    PEER_NODES_RAW: str = Field(
        default="http://20.92.56.192:8001,http://20.213.58.22:8002,http://20.58.185.74:8003,http://20.24.209.147:8004", 
        env="PEER_NODES"
    )

    # Core AI Predictive Scheduler Settings
    MODEL_RETRAIN_THRESHOLD: int = Field(default=5, env="MODEL_RETRAIN_THRESHOLD")
    HISTORICAL_HISTORY_LIMIT: int = Field(default=100, env="HISTORICAL_HISTORY_LIMIT")
    
    # Storage & CSV Ledgers
    CSV_OUTPUT_PATH: str = Field(default="/home/azureuser/simulation_results.csv", env="CSV_OUTPUT_PATH")
    
    # Azure Automation Configuration
    AZURE_TENANT_ID: str = Field(default="7b41c6d4-c4f7-4866-9ea8-7114764b0f1e", env="AZURE_TENANT_ID")
    AZURE_CLIENT_ID: str = Field(default="3cca09dd-71ae-47c5-83b7-51fb84333316", env="AZURE_CLIENT_ID")
    AZURE_CLIENT_SECRET: Optional[str] = Field(default=None, env="AZURE_CLIENT_SECRET")
    AZURE_RESOURCE_GROUP: str = Field(default="distributed-system-rg", env="AZURE_RESOURCE_GROUP")
    AZURE_SUBSCRIPTION_ID: str = Field(default="ff615065-f3b1-4075-94f7-2393933e9cc2", env="AZURE_SUBSCRIPTION_ID")
    
    # VM SSH configuration settings
    VM_SSH_USERNAME: str = Field(default="azureuser", env="VM_SSH_USERNAME")
    VM_SSH_PASSWORD: Optional[str] = Field(default=None, env="VM_SSH_PASSWORD")
    VM_SSH_PRIVATE_KEY_PATH: Optional[str] = Field(default=None, env="VM_SSH_PRIVATE_KEY_PATH")
    
    @property
    def peer_node_list(self) -> List[str]:
        if not self.PEER_NODES_RAW:
            return []
        return [peer.strip() for peer in self.PEER_NODES_RAW.split(",") if peer.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

settings = Settings()
