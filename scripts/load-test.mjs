const ENDPOINT = "http://127.0.0.1:3000/api/ingest";
const TOTAL_REQUESTS = 25;
const CONCURRENCY = 5;

console.log(`Starting load test: ${TOTAL_REQUESTS} requests (${CONCURRENCY} concurrent)...`);

let passed = 0;
let rateLimited = 0;
let errors = 0;
const latencies = [];
let sampleError = null;

async function sendRequest(id) {
  const reqStart = performance.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: id, timestamp: Date.now() }),
    });
    latencies.push(performance.now() - reqStart);

    if (res.status === 200) passed++;
    else if (res.status === 429) rateLimited++;
    else {
      errors++;
      if (!sampleError) sampleError = `HTTP ${res.status}: ${await res.text()}`;
    }
  } catch (err) {
    errors++;
    if (!sampleError) sampleError = err.message;
  }
}

async function run() {
  const start = Date.now();
  const queue = Array.from({ length: TOTAL_REQUESTS }, (_, i) => i + 1);

  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length > 0) {
      const id = queue.shift();
      if (id) await sendRequest(id);
    }
  });

  await Promise.all(workers);
  const elapsed = Date.now() - start;

  latencies.sort((a, b) => a - b);
  const avg = latencies.length ? (latencies.reduce((s, v) => s + v, 0) / latencies.length).toFixed(2) : "N/A";
  const p50 = latencies.length ? latencies[Math.floor(latencies.length * 0.5)].toFixed(2) : "N/A";
  const p95 = latencies.length ? latencies[Math.floor(latencies.length * 0.95)].toFixed(2) : "N/A";

  console.log("\n================ Results ================");
  console.log(`Total Time:         ${elapsed}ms`);
  console.log(`200 OK (Admitted):   ${passed}`);
  console.log(`429 Too Many Req:   ${rateLimited}`);
  console.log(`Network / Errors:   ${errors}`);
  if (sampleError) console.log(`First Error Seen:   ${sampleError}`);
  console.log(`Avg Latency:        ${avg}ms`);
  console.log(`p50 Latency:        ${p50}ms`);
  console.log(`p95 Latency:        ${p95}ms`);
  console.log("=========================================\n");
}

run();
