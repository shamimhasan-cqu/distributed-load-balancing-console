fetch("http://127.0.0.1:9000/api/v1/nodes").then(r => r.json()).then(console.log).catch(console.error);
