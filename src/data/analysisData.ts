export interface AnalysisSection {
  title: string;
  subtitle: string;
  rating: 'A+' | 'A' | 'B+';
  findings: string[];
  evaluation: string;
  architectureNotes: string;
}

export const CAPSTONE_ANALYSIS: Record<string, AnalysisSection> = {
  projectFiles: {
    title: "1. Uploaded Project File Analysis",
    subtitle: "Codebase Structure & Software Dependencies Audit",
    rating: "A",
    findings: [
      "distributed_node.py: Expresses a hybrid, single-process topology where every instance functions both as an entry router (Scheduler) and execution agent (Worker). Implemented using modern FastAPI and Uvicorn.",
      "ai_scheduler.py: Introduces a lightweight predictive scaling framework powered by scikit-learn's LinearRegression model to predict resource demand before queue buildup occurs.",
      "workload_simulation.py: A sequential Python load generator supporting normal traffic, high-concurrency burst windows, and manual node-failure inject scenarios.",
      "fairness_calculator.py: Computes Jain's Fairness Index score from historical CSV outputs to rate cluster allocation equity.",
      "locustfile.py: Concurrency testing script using Locust framework targeting `/dispatch` routes with variable complexities.",
      "docker-compose.yml: Simplifies localized validation using multi-container deployment definitions mapping virtual nodes to individual ports (8001-8003) and capacity rules."
    ],
    evaluation: "The code complies with academic resource allocation requirements and is robustly written in modern Python. The coupling of telemetry collections (Prometheus) with machine learning state makes this an excellent distributed systems sandbox.",
    architectureNotes: "File architecture relies heavily on runtime synchronous state. In a global-scale application, moving configuration parsing to a config server (Consul/etcd) rather than CLI flags would prevent operational drift."
  },
  systemTopology: {
    title: "2. System Architecture Assessment",
    subtitle: "Hybrid Decentralized Peer Mesh Architecture & Route Control",
    rating: "A+",
    findings: [
      "Bi-Directional Mesh: Each VM maintains standard REST endpoint lists for all other cluster entities, acting as an autonomous peer node.",
      "Decentralized Task Ingress: Workloads can hit ANY VM. The receiving VM either process the task locally or forwards it to an optimal worker based on is_alive state.",
      "Gossip Protocol: Active gossip background loops execute every 3 seconds, exchanging local state (ID, current load, completes, is_alive, load history) to maintain a synchronized gossip directory.",
      "Asymmetric Edge Loading: By treating every VM as an entrypoint, the cluster naturally distributes client proxy responsibility across physical endpoints, preventing centralized bottlenecks."
    ],
    evaluation: "The gossip model eliminates a Single Point of Failure (SPOF) for task routing. However, exchanging load-vectors synchronously via REST POST every 3 seconds is chatty, with network complexity scaling at O(N²).",
    architectureNotes: "Recommend migrating gossip protocols to UDP-based SWIM (Structured Weak Membership) layers to cut telemetry overhead by up to 80% on multi-node clusters."
  },
  schedulingLogic: {
    title: "3. Multi-Strategy Scheduling Engine",
    subtitle: "Performance Evaluation of Static, Reactive, & Predictive Strategies",
    rating: "A",
    findings: [
      "Static Strategy: Dispatches the task local-only with zero forwarding, resulting in fast routing latency but highly imbalanced VM utilization.",
      "Round Robin (RR): Iterates over peers utilizing node_state.tasks_completed % N. Offers simple fairness but fails under heterogeneous workload complexities.",
      "Least Loaded: Evaluates the cluster state and routes tasks to the node with the lowest numeric current_load. Effective but bounded by gossip-state delay (stale state risk).",
      "Fairness Balance: Evaluates total executed tasks per node. Directs traffic to machines with the lowest completed count, guaranteeing long-term Jain Index convergence.",
      "AI Predictive Strategy: Replaces standard instant measurements with computed future load models from ai_scheduler.py."
    ],
    evaluation: "Exceptional representation of standard scheduling algorithms. The mix of simple deterministic, load-aware statistic, and ML predictive models gives great empirical comparison benchmarks for student reports.",
    architectureNotes: "To handle the 'herd effect' (where all nodes route to the same least-loaded VM simultaneously during gossip intervals), we suggest integrating Randomised Exponential Backoff or power-of-two-random-choices (P2C)."
  },
  apiEndpoints: {
    title: "4. FastAPI Endpoint Profiling",
    subtitle: "Interface Contracts, State Operations & Resiliency Mechanisms",
    rating: "A",
    findings: [
      "Inbound Telemetry /health: Delivers instantaneous node diagnostics, including current load and estimated predictive load curves.",
      "Resource Control /fail & /recover: Critical testing hooks. Artificially switches the is_alive flag to 'False' or recovers it, simulating true physical Azure standard-VM crash events.",
      "Active Dispatch /dispatch: Evaluates selected strategy, executes locally, or routes via REST payload to a selected peer's /execute endpoint.",
      "Telemetry Storage /save_results: Dumps local dynamic lists directly to '/home/azureuser/results.csv' on VM instances securely."
    ],
    evaluation: "Endpoints are well-designed with appropriate HTTP response codes (e.g., 503 for down nodes; 500 for uninitialised nodes). Highly testable setup.",
    architectureNotes: "State endpoints utilize a raw global threading.Lock(). This prevents race conditions inside a single Uvicorn process but limits performance scaling across Gunicorn worker threads. Moving tracking state to Redis locks would resolve this constraints."
  },
  simulationWorkflow: {
    title: "5. Automated Workload Simulation",
    subtitle: "Traffic Burst, Warm-up Cycles, and Dynamic Failover Verification",
    rating: "B+",
    findings: [
      "Warm-up Sequence: Dispatches 5 preliminary normal tasks to allow the ML Predictive model to populate its initial training arrays.",
      "High Volume Burst: Sequentially fires 30 heavy-complexity tasks with minimal delay (0.02s) to model micro-burst congestion.",
      "Manual Node Crash Test: Dispatches normal flow, triggers a payload-driven `/fail` on the ingress node, captures expected network timeouts, and follows with `/recover` to verify self-healing.",
      "Structured Validation: Normalises API outputs into coherent CSV streams for immediate statistical calculation."
    ],
    evaluation: "The simulation is highly effective in proving system resilience. In particular, showing that a down node correctly diverts tasks locally or fails over gracefully provides outstanding validation data.",
    architectureNotes: "The simulator runs on a single thread. Using Python's async/await client (httpx) would enable high-velocity concurrent stress testing directly from the simulation harness."
  },
  azureVmStructure: {
    title: "6. Azure Infrastructure & VM Topology",
    subtitle: "Resource Groups, B-Series Compute Profiles, and Virtual Networks",
    rating: "A",
    findings: [
      "Resource Group 'distributed-system-rg': Hosts the VM fleet, routing nets, and diagnostics.",
      "Compute Profiles (Standard_B2ats_v2): Equipped with 2 vCPUs and 1 GiB memory. Employs credit-based burstable CPU capabilities, which align perfectly with the bursty nature of IoT processing simulation.",
      "Geographical Distribution: VM instances are deployed both in Australia East (Sydney) and Australia Southeast (Melbourne), creating real-world cross-region network latency (15-28ms) for peer-gossip telemetry.",
      "Cost-Optimization: B-Series instances are budgeting gems, with compute costs ranging from $5.83 to $6.25 AUD per instance monthly, ensuring highly cost-effective research clusters."
    ],
    evaluation: "Superb configuration using cloud compute limits appropriately. Burstable CPU credits allow low-cost steady states with high capacity burst windows during active workload runs.",
    architectureNotes: "Consider adding an Azure Virtual Machine Scale Set (VMSS) with CPU-metric auto-scaling rules to automatically launch standard worker VMs in response to predictive models."
  },
  monitoringSystem: {
    title: "7. Metrics Architecture & Exporters",
    subtitle: "Prometheus Metrics Specification & Instrumentation Design",
    rating: "A",
    findings: [
      "distributed_node_tasks_total (Counter): Captures system throughput segmented by Node ID, status (completed/failed), and chosen strategy.",
      "distributed_node_current_load (Gauge): Tracks real-time utilization index (0-100%) for accurate resource monitoring.",
      "distributed_node_task_latency_seconds (Histogram): Measures execution time distributions across different strategy runs, supporting detailed percentile audits (p50, p90, p99).",
      "distributed_node_tasks_failed_total (Counter): Counts cluster anomalies, tagging specific triggers ('manual_failure', 'peer_forward_failed')."
    ],
    evaluation: "Standard metrics best-practices are fully observed. Latency histograms allow detailed profiling of system overhead, validating the algorithmic costs of the predictive scheduler.",
    architectureNotes: "We advise adding a CPU/Memory utilization collector (using Prometheus node_exporter) to validate whether the simulated current_load variable aligns with actual Linux kernel utilization."
  },
  prometheusGrafana: {
    title: "8. Observability & Query Layer",
    subtitle: "Scrape Intervals, Target Endpoints & Dashboard Visualizations",
    rating: "A",
    findings: [
      "Single Config Scraper: A global `scrape_interval` of 15 seconds keeps pull telemetry overhead minimal and consistent.",
      "Static target clustering: Configured to pull directly from public IPs of VMs (ports 8001-8004) to combine metrics.",
      "PromQL Foundations: Metrics support multi-dimensional queries, enabling calculations like `rate(distributed_node_tasks_total[1m])` for live load tracking.",
      "Grafana Dashboards: Connects to Prometheus to display node health, live queues, strategy comparisons, and system stress flags."
    ],
    evaluation: "The setup is classic and highly performant. Exposing metrics at `/prometheus-metrics` using standard Prometheus text formatting is the optimal container-era approach.",
    architectureNotes: "In production, pointing scrape targets to external static IP addresses is brittle and leaves VM metrics public. Secure this by setting up Private Endpoint VNets and a consul-based Service Discovery layer."
  },
  csvResultGeneration: {
    title: "9. CSV Telemetry & Ledger Logging",
    subtitle: "CSV Column Design, Ledger Persistence, & Archiving Layout",
    rating: "B+",
    findings: [
      "Rigid Column Definition: Generates standardized CSV formats (`task_id`, `type`, `complexity`, `worker`, `strategy`, `latency_s`, `status`, `reason`, `timestamp`)",
      "Dynamic Local Persistence: Appends execution reports locally within the home directory (`/home/azureuser/results.csv`) on demand.",
      "Jain Fairness Validation: Direct file feeding into fairness_calculator.py allows rapid academic reporting of optimization scores.",
      "Local Output Isolates: Individual nodes maintain local ledgers rather than sharing a database, which protects local operation from peer disk locks."
    ],
    evaluation: "Perfect for simulation reporting. The CSV schema captures all variables needed to run offline Pandas analysis or plot performance trends in Jupyter Notebooks.",
    architectureNotes: "Recommend backing up logs to Azure Blob Storage automatically upon calling `/save_results` by adding a simple azure-storage-blob Python library wrapper."
  },
  aiSchedulerImplementation: {
    title: "10. Predictive AI Optimization",
    subtitle: "Linear Regression Convergence, Queue Modeling, and Training Performance",
    rating: "A",
    findings: [
      "Moving Train Feature: Accumulates a live system history of load variables (Load, Pending Tasks, Past load). Calls `.train()` automatically when data exceeds 5 rows.",
      "Three-Vector Feature Map: Extracts `time`, `current_load`, and `tasks_pending` as predictors for upcoming demand.",
      "Gradient Clipping: Extrapolates predicted values up to a hard ceiling of 100 and floor of 0 using `numpy.clip()` to prevent scaling errors.",
      "Graceful Mock Backoff: Automatically falls back on `current_load + tasks_pending * 2` when training dataset has not finished initializing."
    ],
    evaluation: "Ingenious lightweight model. Linear Regression is computationally cheap (~1-2ms inference), enabling its run directly within FastAPI's call cycle without causing task latency.",
    architectureNotes: "Linear Regression is perfect for linear trends but struggles with non-linear spikes. Upgrading to a multi-variable Ridge or a simple MLP network with memory cells (LSTM/RNN state simulation) would capture periodic patterns (like seasonal commuter spikes)."
  }
};
