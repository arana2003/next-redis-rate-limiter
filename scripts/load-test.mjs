const ENDPOINT = "http://localhost:3000/api/ingest";
const TOTAL_REQUESTS = 25;
const CONCURRENCY = 5;

console.log(`Starting load test: ${TOTAL_REQUESTS} requests (${CONCURRENCY} concurrent)...`);

let passed = 0;
let rateLimited = 0;
let errors = 0;

async function sendRequest(id) {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId: id, timestamp: Date.now() }),
    });

    if (res.status === 200) passed++;
    else if (res.status === 429) rateLimited++;
    else errors++;
  } catch (err) {
    errors++;
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

  console.log("\n================ Results ================");
  console.log(`Total Time:         ${elapsed}ms`);
  console.log(`200 OK (Admitted):   ${passed}`);
  console.log(`429 Too Many Req:   ${rateLimited}`);
  console.log(`Network / Errors:   ${errors}`);
  console.log("=========================================\n");
}

run();
