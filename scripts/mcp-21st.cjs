const apiKey = '21st_sk_c360c7d58ac50b46e207c498034ff02708821ce103786113c8038ee8dc6301ef';

async function call21st(method, params = {}) {
  const res = await fetch('https://21st.dev/api/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    })
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.result;
}

async function searchComponents(query) {
  return call21st('tools/call', {
    name: 'search',
    arguments: { query }
  });
}

async function getComponent(name) {
  return call21st('tools/call', {
    name: 'get_component',
    arguments: { name }
  });
}

module.exports = {
  call21st,
  searchComponents,
  getComponent
};

if (require.main === module) {
  const q = process.argv[2] || 'hero';
  searchComponents(q).then(res => console.log(JSON.stringify(res, null, 2))).catch(console.error);
}
